const { sequelize } = require('./models');
const { QueryTypes } = require('sequelize');

async function migrate() {
    console.log('--- Adicionando target_type em Challenges ---');

    try {
        await sequelize.query('ALTER TABLE Challenges ADD COLUMN target_type VARCHAR(255) DEFAULT "expense"', { type: QueryTypes.RAW });
        console.log('✅ Coluna target_type adicionada com sucesso.');
    } catch (error) {
        console.log('ℹ️ Coluna target_type já existe ou erro ignorável.');
    } finally {
        process.exit();
    }
}

migrate();
