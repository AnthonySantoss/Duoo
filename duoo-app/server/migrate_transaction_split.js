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
    db.run("ALTER TABLE Transactions ADD COLUMN split_with_partner BOOLEAN DEFAULT 0", (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('Coluna split_with_partner já existe.');
            } else {
                console.error('Erro ao adicionar coluna split_with_partner:', err.message);
            }
        } else {
            console.log('Coluna split_with_partner adicionada com sucesso.');
        }
    });

    db.run("ALTER TABLE Transactions ADD COLUMN split_amount DECIMAL(10, 2)", (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('Coluna split_amount já existe.');
            } else {
                console.error('Erro ao adicionar coluna split_amount:', err.message);
            }
        } else {
            console.log('Coluna split_amount adicionada com sucesso.');
        }
    });
});

db.close();
