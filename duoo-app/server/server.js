const app = require('./app');
const { sequelize } = require('./models');
const { scheduleYieldJob } = require('./services/yieldService');

const PORT = process.env.PORT || 5000;

// Register Stats Route if not already in app.js (likely handled there, but let's check app.js first)
// Wait, routes are usually in app.js, let's check app.js.


sequelize.sync({ force: false }).then(() => {
    console.log('Database synced');

    // Iniciar agendador de rendimentos
    scheduleYieldJob();

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}).catch(err => {
    console.error('Database sync failed:', err);
});
