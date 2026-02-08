const { sequelize } = require('./models');

async function fixConstraint() {
    const transaction = await sequelize.transaction();
    try {
        console.log('--- Fixing Notifications Constraint ---');

        // 0. Cleanup from any failed previous attempts
        await sequelize.query("DROP TABLE IF EXISTS notifications_old;", { transaction });

        // 1. Rename old table
        await sequelize.query("ALTER TABLE notifications RENAME TO notifications_old;", { transaction });

        // 2. Create new table with updated CHECK constraint
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS "notifications" (
                "id" INTEGER PRIMARY KEY AUTOINCREMENT,
                "user_id" CHAR(36) NOT NULL REFERENCES "Users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
                "title" VARCHAR(255) NOT NULL,
                "message" TEXT NOT NULL,
                "type" TEXT DEFAULT 'info' CHECK( "type" IN ('achievement', 'budget_alert', 'goal_progress', 'transaction', 'invoice', 'info', 'note') ),
                "link" VARCHAR(255),
                "read" TINYINT(1) DEFAULT 0,
                "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `, { transaction });

        // 3. Copy data
        // We select the columns explicitly to ensure mapping is correct
        await sequelize.query(`
            INSERT INTO notifications (id, user_id, title, message, type, link, read, created_at)
            SELECT id, user_id, title, message, type, link, read, created_at FROM notifications_old;
        `, { transaction });

        // 4. Drop old table
        await sequelize.query("DROP TABLE notifications_old;", { transaction });

        await transaction.commit();
        console.log('✅ Notifications table constraint updated successfully.');
        process.exit(0);
    } catch (error) {
        await transaction.rollback();
        console.error('❌ Error fixing constraint:', error);
        process.exit(1);
    }
}

fixConstraint();
