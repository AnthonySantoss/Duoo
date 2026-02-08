const { sequelize } = require('./models');

async function migrate() {
    try {
        console.log('--- Migrando Banco de Dados (Sequelize) ---');

        // Add notes to Transactions
        try {
            await sequelize.query("ALTER TABLE Transactions ADD COLUMN notes TEXT");
            console.log('✅ Coluna "notes" adicionada em Transactions.');
        } catch (e) {
            if (e.message.includes('duplicate column name')) {
                console.log('✅ Coluna "notes" já existe em Transactions.');
            } else {
                console.error('❌ Erro em Transactions:', e.message);
            }
        }

        // Add notes to CreditCardPurchases
        try {
            await sequelize.query("ALTER TABLE CreditCardPurchases ADD COLUMN notes TEXT");
            console.log('✅ Coluna "notes" adicionada em CreditCardPurchases.');
        } catch (e) {
            if (e.message.includes('duplicate column name')) {
                console.log('✅ Coluna "notes" já existe em CreditCardPurchases.');
            } else {
                console.error('❌ Erro em CreditCardPurchases:', e.message);
            }
        }

        console.log('Fim da migração.');
        process.exit(0);
    } catch (error) {
        console.error('Erro fatal:', error);
        process.exit(1);
    }
}

migrate();
