const { sequelize, Goal } = require('./models');

async function debugGoal() {
    try {
        await sequelize.authenticate();
        console.log('DB connected');

        const goals = await Goal.findAll();
        for (const goal of goals) {
            console.log(`Goal: ${goal.title} (ID: ${goal.id})`);
            console.log(`  current_amount: ${goal.current_amount} (${typeof goal.current_amount})`);
            console.log(`  accumulated_yield: ${goal.accumulated_yield} (${typeof goal.accumulated_yield})`);
            console.log('-------------------');
        }
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

debugGoal();
