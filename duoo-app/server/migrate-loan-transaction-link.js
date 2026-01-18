const { sequelize, Loan } = require('./models');

async function migrate() {
    try {
        console.log('🔄 Starting migration to add linked_transaction_id to loans table...');

        // SQLite não suporta IF NOT EXISTS em ALTER TABLE
        // Tentamos adicionar e ignoramos erro se já existir
        try {
            await sequelize.query(`
                ALTER TABLE Loans 
                ADD COLUMN linked_transaction_id INTEGER
            `);
            console.log('✅ Column added successfully!');
        } catch (error) {
            if (error.message.includes('duplicate column name')) {
                console.log('ℹ️  Column already exists, skipping...');
            } else {
                throw error;
            }
        }

        console.log('✅ Migration completed successfully!');
        console.log('📊 Column "linked_transaction_id" is ready in Loans table.');

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
