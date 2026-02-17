const { sequelize } = require('./models');
const { QueryTypes } = require('sequelize');

async function migrate() {
    console.log('--- Iniciando Migração de Feb 16 (Features: Simulador, Desafios, Alertas) ---');

    try {
        // 1. Criar Tabela UserConfigs se não existir
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS UserConfigs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id UUID NOT NULL UNIQUE,
                large_transaction_limit DECIMAL(10, 2) DEFAULT 500.00,
                weekly_report_day INTEGER DEFAULT 0,
                weekly_report_hour INTEGER DEFAULT 20,
                notifications_enabled BOOLEAN DEFAULT 1,
                createdAt DATETIME NOT NULL,
                updatedAt DATETIME NOT NULL
            )
        `, { type: QueryTypes.RAW });
        console.log('✅ Tabela UserConfigs verificada/criada');

        // 2. Colunas em Challenges
        const challengeCols = [
            { name: 'target_amount', type: 'DECIMAL(10, 2)' },
            { name: 'category', type: 'STRING' },
            { name: 'duration_days', type: 'INTEGER DEFAULT 30' },
            { name: 'points', type: 'INTEGER DEFAULT 100' },
            { name: 'icon', type: 'STRING DEFAULT "Trophy"' },
            { name: 'is_custom', type: 'BOOLEAN DEFAULT 0' },
            { name: 'user_id', type: 'UUID' }
        ];

        for (const col of challengeCols) {
            try {
                await sequelize.query(`ALTER TABLE Challenges ADD COLUMN ${col.name} ${col.type}`, { type: QueryTypes.RAW });
                console.log(`✅ Coluna ${col.name} adicionada a Challenges`);
            } catch (e) {
                console.log(`ℹ️ Coluna ${col.name} em Challenges já existe ou erro ignorável.`);
            }
        }

        // 3. Colunas em Goals
        try {
            await sequelize.query('ALTER TABLE Goals ADD COLUMN is_event_bucket BOOLEAN DEFAULT 0', { type: QueryTypes.RAW });
            console.log('✅ Coluna is_event_bucket adicionada a Goals');
        } catch (e) {
            console.log('ℹ️ Coluna is_event_bucket em Goals já existe.');
        }

        // 4. Colunas em Transactions
        try {
            await sequelize.query('ALTER TABLE Transactions ADD COLUMN goal_id INTEGER', { type: QueryTypes.RAW });
            console.log('✅ Coluna goal_id adicionada a Transactions');
        } catch (e) {
            console.log('ℹ️ Coluna goal_id em Transactions já existe.');
        }

        console.log('--- Migração concluída com sucesso ---');
    } catch (error) {
        console.error('❌ Erro crítico na migração:', error);
    } finally {
        process.exit();
    }
}

migrate();
