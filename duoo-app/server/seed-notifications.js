const { sequelize } = require('./models');

async function seedNotifications() {
    try {
        // Get first user ID
        const [users] = await sequelize.query('SELECT id FROM users LIMIT 1');

        if (users.length === 0) {
            console.log('⚠️  No users found. Please create a user first.');
            process.exit(0);
        }

        const userId = users[0].id;

        // Insert sample notifications
        await sequelize.query(`
            INSERT INTO notifications (user_id, title, message, type, read, created_at)
            VALUES 
                (?, 'Bem-vindo ao Duoo! 🎉', 'Parabéns por criar sua conta! Explore todas as funcionalidades do app.', 'info', 0, datetime('now')),
                (?, 'Meta de Economia Atingida! 🎯', 'Você atingiu 50% da sua meta "Viagem 2024". Continue assim!', 'goal_progress', 0, datetime('now', '-2 hours')),
                (?, 'Alerta de Orçamento ⚠️', 'Você já gastou 80% do orçamento de Alimentação este mês.', 'budget_alert', 1, datetime('now', '-1 day')),
                (?, 'Nova Conquista Desbloqueada! 🏆', 'Você desbloqueou a conquista "Primeiro Passo" por criar sua primeira meta.', 'achievement', 1, datetime('now', '-2 days')),
                (?, 'Fatura do Cartão Próxima 💳', 'A fatura do seu cartão Nubank vence em 3 dias. Valor: R$ 1.234,56', 'invoice', 0, datetime('now', '-3 hours'))
        `, { replacements: [userId, userId, userId, userId, userId] });

        console.log('✅ Sample notifications created successfully!');
        console.log(`📧 Created 5 notifications for user ID: ${userId}`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating notifications:', error);
        process.exit(1);
    }
}

seedNotifications();
