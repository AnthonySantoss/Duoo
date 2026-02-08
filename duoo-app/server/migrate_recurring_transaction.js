const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, '../database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');
    }
});

db.serialize(() => {
    db.run("ALTER TABLE Recurrings ADD COLUMN transaction_id INTEGER", (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('Coluna transaction_id já existe.');
            } else {
                console.error('Erro ao adicionar coluna:', err.message);
            }
        } else {
            console.log('Coluna transaction_id adicionada com sucesso.');
        }
    });
});

db.close();
