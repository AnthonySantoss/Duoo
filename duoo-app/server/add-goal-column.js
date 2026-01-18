const { sequelize } = require('./models');

async function update() {
    try {
        await sequelize.authenticate();
        console.log('DB connected');

        // Check if column exists, if not add it
        try {
            await sequelize.getQueryInterface().addColumn('Goals', 'accumulated_yield', {
                type: sequelize.Sequelize.DECIMAL(10, 2),
                defaultValue: 0.00
            });
            console.log('✅ Column accumulated_yield added to Goals table');
        } catch (error) {
            if (error.message.includes('Duplicate column name')) {
                console.log('ℹ️ Column accumulated_yield already exists');
            } else {
                console.error('⚠️ Error adding column:', error.message);
            }
        }

    } catch (e) {
        console.error('Fatal error:', e);
    } finally {
        process.exit();
    }
}
update();
