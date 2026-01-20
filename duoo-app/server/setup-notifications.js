const { sequelize } = require('./models');

async function createNotificationsTable() {
    try {
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                type TEXT CHECK(type IN ('achievement', 'budget_alert', 'goal_progress', 'transaction', 'invoice', 'info')) DEFAULT 'info',
                link TEXT,
                read INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `);

        // Create indexes
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
        `);

        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);
        `);

        console.log('✅ Notifications table created successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating notifications table:', error);
        process.exit(1);
    }
}

createNotificationsTable();
