const { sequelize, Goal } = require('./models');
const { Op } = require('sequelize');

async function fixNan() {
    try {
        await sequelize.authenticate();
        console.log('DB connected');

        const goals = await Goal.findAll();
        for (const goal of goals) {
            let changed = false;

            // Check current_amount
            if (isNaN(parseFloat(goal.current_amount)) || goal.current_amount === 'NaN') {
                console.log(`Fixing current_amount for Goal ${goal.id} (${goal.title})`);
                goal.current_amount = 5000; // Valor seguro para teste
                changed = true;
            }

            // Check accumulated_yield
            if (isNaN(parseFloat(goal.accumulated_yield)) || goal.accumulated_yield === 'NaN') {
                console.log(`Fixing accumulated_yield for Goal ${goal.id} (${goal.title})`);
                goal.accumulated_yield = 0;
                changed = true;
            }

            if (changed) {
                await goal.save();
                console.log(`Goal ${goal.title} fixed.`);
            }
        }

        console.log('Done fixing NaNs.');
        process.exit(0);
    } catch (error) {
        console.error('Error fixing NaNs:', error);
        process.exit(1);
    }
}

fixNan();
