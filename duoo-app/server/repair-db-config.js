const sequelize = require('./config/database');
const { QueryTypes } = require('sequelize');

async function repair() {
    console.log('Creating UserConfigs table...');

    try {
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS UserConfigs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id UUID NOT NULL UNIQUE,
                large_transaction_limit DECIMAL(10, 2) DEFAULT 500.00,
                weekly_report_day INTEGER DEFAULT 0,
                weekly_report_hour INTEGER DEFAULT 20,
                notifications_enabled BOOLEAN DEFAULT 1,
                createdAt DATETIME NOT NULL,
                updatedAt DATETIME NOT NULL
            )
        `, { type: QueryTypes.RAW });
        console.log('UserConfigs table created/verified');

        console.log('Repair finished.');
    } catch (err) {
        console.error('Repair failed:', err);
    } finally {
        process.exit();
    }
}

repair();
