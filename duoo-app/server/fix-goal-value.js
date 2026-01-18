const { sequelize, Goal } = require('./models');
const { Op } = require('sequelize');

async function fixValue() {
    try {
        await sequelize.authenticate();
        console.log('DB connected');

        // Buscar metas com valor próximo a 5002.76 (margem de erro pq é float)
        const goals = await Goal.findAll({
            where: {
                current_amount: {
                    [Op.between]: [5002, 5003]
                }
            }
        });

        for (const goal of goals) {
            console.log(`Adjusting Goal ${goal.title} (ID: ${goal.id}) from ${goal.current_amount} to ~502.76`);
            // Preservar o rendimento (decimal)
            // Se o valor é 5002.76, e queremos 502.76, subtraimos 4500.
            goal.current_amount = goal.current_amount - 4500;
            await goal.save();
            console.log(`✅ New amount: ${goal.current_amount}`);
        }

        console.log('Done.');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

fixValue();
