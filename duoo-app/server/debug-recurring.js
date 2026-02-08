const { sequelize, Recurring, User } = require('./models');
const { Op } = require('sequelize');

async function debugRecurring() {
    try {
        const items = await Recurring.findAll({
            order: [['date', 'ASC'], ['id', 'ASC']]
        });

        console.log(`Found ${items.length} total recurring items.`);

        items.forEach(item => {
            console.log(`ID: ${item.id} | Title: ${item.title} | Amount: ${item.amount} | Date: ${item.date} | Type: ${item.type}`);
        });

    } catch (error) {
        console.error('Error querying Recurring:', error);
    } finally {
        await sequelize.close();
    }
}

debugRecurring();
