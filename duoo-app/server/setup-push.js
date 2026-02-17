const { sequelize } = require('./models');

async function createPushSubscriptionsTable() {
    try {
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS push_subscriptions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                subscription_data TEXT NOT NULL,
                device_type TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `);

        console.log('✅ Push subscriptions table created successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating push subscriptions table:', error);
        process.exit(1);
    }
}

createPushSubscriptionsTable();
