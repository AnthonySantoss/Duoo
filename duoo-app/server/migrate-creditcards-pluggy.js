const sequelize = require('./config/database');

async function addColumnIfNotExists(tableName, columnName, columnType) {
    try {
        await sequelize.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`);
        console.log(`✅ Added ${columnName} to ${tableName}`);
    } catch (error) {
        if (error.message.includes('duplicate column name')) {
            console.log(`ℹ️  ${columnName} already exists in ${tableName}`);
        } else {
            throw error;
        }
    }
}

async function runMigration() {
    try {
        console.log('Running CreditCard Pluggy migration...\n');

        // Add fields to CreditCards table
        await addColumnIfNotExists('CreditCards', 'pluggy_account_id', 'VARCHAR(255)');
        await addColumnIfNotExists('CreditCards', 'pluggy_item_id', 'VARCHAR(255)');
        await addColumnIfNotExists('CreditCards', 'bank_name', 'VARCHAR(255)');
        await addColumnIfNotExists('CreditCards', 'last_sync', 'DATETIME');

        console.log('\n✅ CreditCard migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        process.exit(1);
    }
}

runMigration();
