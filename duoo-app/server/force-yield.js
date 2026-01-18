const { processDailyYields } = require('./services/yieldService');
const { sequelize } = require('./models');

async function forceYield() {
    try {
        console.log('🚀 Forcing daily yield processing...');
        await sequelize.authenticate();
        console.log('✅ Database connected.');

        await processDailyYields();

        console.log('🏁 Yield processing finished.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error forcing yield:', error);
        process.exit(1);
    }
}

forceYield();
