const app = require('./app');
const { sequelize } = require('./models');
const challengeController = require('./controllers/challengeController');
const { scheduleYieldJob } = require('./services/yieldService');
const notificationService = require('./services/notificationService');

const PORT = process.env.PORT || 5000;

// Schedule daily notification checks
function scheduleNotificationJobs() {
    // Check invoices and goals every hour at minute 0
    const checkInterval = 60 * 60 * 1000; // 1 hour in milliseconds

    // Initial check after 10 seconds to let database sync
    setTimeout(() => {
        console.log('📧 Running initial notification checks...');
        notificationService.checkUpcomingInvoices();
        notificationService.checkGoalProgress();
    }, 10000);

    // Then check every hour
    setInterval(() => {
        const now = new Date();
        const hour = now.getHours();
        const day = now.getDay(); // 0 = Sunday

        // Only run full check at 9 AM, 1 PM, and 6 PM local time
        if ([9, 13, 18].includes(hour)) {
            console.log('📧 Running scheduled notification checks...');
            notificationService.checkUpcomingInvoices();
            notificationService.checkGoalProgress();
            challengeController.updateProgress();
        }

        // Weekly Health Report: Sundays at 8 PM (20:00)
        if (day === 0 && hour === 20) {
            console.log('📊 Running weekly health reports...');
            notificationService.sendWeeklyReports();
        }
    }, checkInterval);

    console.log('✅ Notification jobs scheduled');
}

sequelize.sync({ force: false }).then(() => {
    console.log('Database synced');

    // Iniciar agendador de rendimentos
    scheduleYieldJob();

    // Iniciar agendador de notificações
    scheduleNotificationJobs();

    // Seed challenges
    challengeController.seedChallenges();

    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT}`);
    });
}).catch(err => {
    console.error('Database sync failed:', err);
});
