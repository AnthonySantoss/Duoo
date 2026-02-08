const { sequelize, Recurring } = require('./models');

async function syncRecurring() {
    try {
        console.log('Force syncing Recurring table...');
        await Recurring.sync({ force: true });
        console.log('Recurring table synced successfully.');
    } catch (error) {
        console.error('Error syncing Recurring table:', error);
    } finally {
        await sequelize.close();
    }
}

syncRecurring();
