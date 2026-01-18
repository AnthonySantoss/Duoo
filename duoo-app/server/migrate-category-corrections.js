const { sequelize, TransactionCorrection } = require('./models');

async function migrate() {
    try {
        console.log('🔄 Starting migration for transaction_corrections table...');

        // Sincronizar apenas a tabela TransactionCorrection
        await TransactionCorrection.sync({ force: false });

        console.log('✅ Migration completed successfully!');
        console.log('📊 Table "transaction_corrections" is ready.');

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
