const { sequelize } = require('./models');

async function fixConstraint() {
    const transaction = await sequelize.transaction();
    try {
        console.log('--- Verificando constraint de notificações ---');

        const [tableRows] = await sequelize.query(
            "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'notifications';",
            { transaction }
        );
        const [columns] = await sequelize.query('PRAGMA table_info(notifications);', { transaction });
        const tableSql = tableRows[0]?.sql || '';
        const hasReminderType = tableSql.includes("'reminder'");
        const hasNotifiedColumn = columns.some((column) => column.name === 'notified');

        if (hasReminderType && hasNotifiedColumn) {
            await transaction.commit();
            console.log('✅ Constraint de notificações já está atualizada.');
            process.exit(0);
        }

        await sequelize.query('DROP TABLE IF EXISTS notifications_old;', { transaction });
        await sequelize.query('ALTER TABLE notifications RENAME TO notifications_old;', { transaction });

        await sequelize.query(`
            CREATE TABLE notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id CHAR(36) NOT NULL REFERENCES Users (id) ON DELETE CASCADE ON UPDATE CASCADE,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                type TEXT DEFAULT 'info' CHECK(type IN ('achievement', 'budget_alert', 'goal_progress', 'transaction', 'invoice', 'info', 'note', 'reminder')),
                link VARCHAR(255),
                read TINYINT(1) DEFAULT 0,
                notified TINYINT(1) DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `, { transaction });

        const notifiedValue = hasNotifiedColumn ? 'notified' : '0';
        await sequelize.query(`
            INSERT INTO notifications (id, user_id, title, message, type, link, read, notified, created_at)
            SELECT id, user_id, title, message, type, link, read, ${notifiedValue}, created_at
            FROM notifications_old;
        `, { transaction });

        await sequelize.query('DROP TABLE notifications_old;', { transaction });
        await transaction.commit();
        console.log('✅ Constraint atualizada; tipo reminder habilitado.');
        process.exit(0);
    } catch (error) {
        await transaction.rollback();
        console.error('❌ Erro ao atualizar constraint de notificações:', error);
        process.exit(1);
    }
}

fixConstraint();
