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
    console.log('Running Pluggy migration...\n');

    // Add fields to Wallets table
    await addColumnIfNotExists('Wallets', 'pluggy_item_id', 'VARCHAR(255)');
    await addColumnIfNotExists('Wallets', 'pluggy_account_id', 'VARCHAR(255)');
    await addColumnIfNotExists('Wallets', 'bank_name', 'VARCHAR(255)');
    await addColumnIfNotExists('Wallets', 'last_sync', 'DATETIME');

    console.log('');

    // Add fields to Transactions table
    await addColumnIfNotExists('Transactions', 'pluggy_transaction_id', 'VARCHAR(255)');
    await addColumnIfNotExists('Transactions', 'pluggy_account_id', 'VARCHAR(255)');

    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
