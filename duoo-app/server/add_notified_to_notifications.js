const { sequelize } = require('./models');

async function migrate() {
    try {
        console.log('--- Adicionando coluna "notified" em Notifications ---');

        try {
            await sequelize.query("ALTER TABLE notifications ADD COLUMN notified TINYINT(1) DEFAULT 0");
            console.log('✅ Coluna "notified" adicionada com sucesso.');
        } catch (e) {
            if (e.message.includes('duplicate column name')) {
                console.log('✅ Coluna "notified" já existe.');
            } else {
                console.error('❌ Erro ao adicionar coluna:', e.message);
            }
        }

        console.log('Migration concluída.');
        process.exit(0);
    } catch (error) {
        console.error('Erro fatal:', error);
        process.exit(1);
    }
}

migrate();
