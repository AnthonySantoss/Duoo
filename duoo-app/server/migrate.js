const { sequelize } = require('./models');

async function migrate() {
    try {
        // Adicionar novas colunas à tabela Goals se não existirem
        await sequelize.query(`
            ALTER TABLE Goals ADD COLUMN is_yielding BOOLEAN DEFAULT 0;
        `).catch(() => console.log('Column is_yielding already exists'));

        await sequelize.query(`
            ALTER TABLE Goals ADD COLUMN cdi_percentage DECIMAL(5, 2);
        `).catch(() => console.log('Column cdi_percentage already exists'));

        await sequelize.query(`
            ALTER TABLE Goals ADD COLUMN bank_name VARCHAR(255);
        `).catch(() => console.log('Column bank_name already exists'));

        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
