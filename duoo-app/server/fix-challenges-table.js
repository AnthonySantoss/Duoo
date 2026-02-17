const { sequelize } = require('./models');
const { QueryTypes } = require('sequelize');

async function fix() {
    console.log('--- Corrigindo Tabela Challenges (SQLite Fix v2) ---');

    try {
        const result = await sequelize.query('PRAGMA table_info(Challenges)', { type: QueryTypes.RAW });
        // Em algumas versões do sequelize/sqlite, o resultado pode vir aninhado
        const columns = Array.isArray(result[0]) ? result[0] : result;

        console.log('Colunas encontradas:', columns.map(c => c.name).join(', '));

        const startDateCol = columns.find(col => col.name === 'start_date');

        if (startDateCol) {
            console.log(`⚠️ Coluna start_date encontrada (notnull: ${startDateCol.notnull}). Removendo...`);

            await sequelize.query('PRAGMA foreign_keys=OFF', { type: QueryTypes.RAW });

            await sequelize.query(`
                CREATE TABLE Challenges_temp (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title VARCHAR(255) NOT NULL,
                    description TEXT NOT NULL,
                    type TEXT NOT NULL,
                    target_amount DECIMAL(10, 2),
                    category VARCHAR(255),
                    duration_days INTEGER DEFAULT 30,
                    points INTEGER DEFAULT 100,
                    icon VARCHAR(255) DEFAULT 'Trophy',
                    is_custom BOOLEAN DEFAULT 0,
                    user_id UUID,
                    createdAt DATETIME NOT NULL,
                    updatedAt DATETIME NOT NULL
                )
            `, { type: QueryTypes.RAW });

            await sequelize.query(`
                INSERT INTO Challenges_temp (id, title, description, type, target_amount, category, duration_days, points, icon, is_custom, user_id, createdAt, updatedAt)
                SELECT id, title, description, type, target_amount, category, duration_days, points, icon, is_custom, user_id, createdAt, updatedAt
                FROM Challenges
            `, { type: QueryTypes.RAW });

            await sequelize.query('DROP TABLE Challenges', { type: QueryTypes.RAW });
            await sequelize.query('ALTER TABLE Challenges_temp RENAME TO Challenges', { type: QueryTypes.RAW });

            await sequelize.query('PRAGMA foreign_keys=ON', { type: QueryTypes.RAW });

            console.log('✅ Tabela Challenges corrigida com sucesso!');
        } else {
            console.log('✅ Tabela Challenges não possui a coluna start_date. Tudo OK.');
        }

    } catch (error) {
        console.error('❌ Erro crítico ao corrigir Challenges:', error);
    } finally {
        process.exit();
    }
}

fix();
