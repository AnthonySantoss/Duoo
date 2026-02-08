const sequelize = require('./config/database');

async function migrate() {
    try {
        console.log('Adicionando coluna wallet_id à tabela Recurrings...');
        await sequelize.query('ALTER TABLE Recurrings ADD COLUMN wallet_id INTEGER REFERENCES Wallets(id);');
        console.log('Coluna adicionada com sucesso!');
    } catch (e) {
        if (e.message.includes('duplicate column name')) {
            console.log('A coluna wallet_id já existe.');
        } else {
            console.error('Erro ao migrar:', e);
        }
    } finally {
        process.exit();
    }
}
migrate();
