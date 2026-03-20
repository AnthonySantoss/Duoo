const { sequelize } = require('./models');

async function migrate() {
    try {
        // SQLite
        await sequelize.query("ALTER TABLE UserConfigs ADD COLUMN daily_reminder_enabled BOOLEAN DEFAULT false;");
    } catch (error) {
        console.log("daily_reminder_enabled:", error.message);
    }

    try {
        await sequelize.query("ALTER TABLE UserConfigs ADD COLUMN daily_reminder_hour INTEGER DEFAULT 20;");
    } catch (error) {
        console.log("daily_reminder_hour:", error.message);
    }
    
    console.log("Migration script finished!");
    process.exit(0);
}

migrate();
