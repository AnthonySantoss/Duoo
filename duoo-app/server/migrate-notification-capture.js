const { sequelize } = require('./models');

async function migrate() {
    const columns = [
        ['capture_source', 'VARCHAR(32)'],
        ['source_external_id', 'VARCHAR(128)'],
        ['source_package', 'VARCHAR(160)'],
        ['capture_confidence', 'DECIMAL(5, 4)']
    ];

    try {
        for (const [name, type] of columns) {
            await sequelize.query(`ALTER TABLE Transactions ADD COLUMN ${name} ${type};`)
                .catch(() => undefined);
        }

        await sequelize.query(
            'CREATE UNIQUE INDEX IF NOT EXISTS transactions_source_external_id ON Transactions (source_external_id);'
        );
        console.log('Notification capture migration completed.');
    } finally {
        await sequelize.close();
    }
}

migrate().catch(error => {
    console.error('Notification capture migration failed:', error);
    process.exitCode = 1;
});
