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
        console.log('Running Goals Pluggy migration...\n');

        // Add fields to Goals table
        await addColumnIfNotExists('Goals', 'pluggy_investment_id', 'VARCHAR(255)');
        await addColumnIfNotExists('Goals', 'pluggy_item_id', 'VARCHAR(255)');
        await addColumnIfNotExists('Goals', 'name', 'VARCHAR(255)');
        await addColumnIfNotExists('Goals', 'deadline', 'DATETIME');
        await addColumnIfNotExists('Goals', 'category', 'VARCHAR(255)');

        console.log('\n✅ Goals migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        process.exit(1);
    }
}

runMigration();
