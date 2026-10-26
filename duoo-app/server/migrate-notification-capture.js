const { DataTypes } = require('sequelize');
const { sequelize } = require('./models');

const transactionIndex = 'idx_transactions_user_source_external_unique';
const capturedIndex = 'idx_captured_tx_user_hash';

function fieldNames(index) {
    return (index.fields || []).map(field => field.attribute || field.name).filter(Boolean);
}

async function removeLegacyGlobalUniqueness(queryInterface) {
    if (sequelize.getDialect() === 'postgres') {
        const [constraints] = await sequelize.query(`
            SELECT tc.constraint_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
             AND tc.constraint_schema = kcu.constraint_schema
            WHERE tc.constraint_type = 'UNIQUE'
              AND tc.table_name = 'Transactions'
              AND tc.table_schema = current_schema()
            GROUP BY tc.constraint_name
            HAVING COUNT(*) = 1 AND MAX(kcu.column_name) = 'source_external_id'
        `);
        for (const { constraint_name: name } of constraints) {
            await queryInterface.removeConstraint('Transactions', name);
        }
    }

    const indexes = await queryInterface.showIndex('Transactions');
    for (const index of indexes) {
        const fields = fieldNames(index);
        if (index.unique && fields.length === 1 && fields[0] === 'source_external_id') {
            await queryInterface.removeIndex('Transactions', index.name).catch(() => undefined);
        }
    }
}

async function ensureUniqueIndex(queryInterface, table, name, fields) {
    const indexes = await queryInterface.showIndex(table);
    const current = indexes.find(index => index.name === name);
    if (current && current.unique && fieldNames(current).join(',') === fields.join(',')) return;
    if (current) await queryInterface.removeIndex(table, name);
    await queryInterface.addIndex(table, fields, { name, unique: true });
}

async function migrateNotificationCapture() {
    const queryInterface = sequelize.getQueryInterface();
    const transactionColumns = await queryInterface.describeTable('Transactions');
    const columns = {
        capture_source: DataTypes.STRING(32),
        source_external_id: DataTypes.STRING(128),
        source_package: DataTypes.STRING(160),
        capture_confidence: DataTypes.DECIMAL(5, 4)
    };

    for (const [name, type] of Object.entries(columns)) {
        if (!transactionColumns[name]) await queryInterface.addColumn('Transactions', name, { type, allowNull: true });
    }

    await removeLegacyGlobalUniqueness(queryInterface);
    await ensureUniqueIndex(queryInterface, 'Transactions', transactionIndex, ['user_id', 'source_external_id']);

    const tables = await queryInterface.showAllTables();
    if (tables.map(String).includes('captured_transactions')) {
        await sequelize.query(`
            DELETE FROM captured_transactions
            WHERE notification_hash IS NOT NULL
              AND id NOT IN (
                  SELECT MIN(id)
                  FROM captured_transactions
                  WHERE notification_hash IS NOT NULL
                  GROUP BY user_id, notification_hash
              )
        `);
        await ensureUniqueIndex(queryInterface, 'captured_transactions', capturedIndex, ['user_id', 'notification_hash']);
    }

    console.log('Notification capture migration completed.');
}

module.exports = migrateNotificationCapture;

if (require.main === module) {
    migrateNotificationCapture()
        .then(() => sequelize.close())
        .catch(async error => {
            console.error('Notification capture migration failed:', error);
            await sequelize.close();
            process.exitCode = 1;
        });
}
