const { User, Notification } = require('./models');

async function sendTest() {
    try {
        const user = await User.findOne(); // Pega o primeiro usuário (provavelmente o Anthony)
        if (!user) {
            console.log('Nenhum usuário encontrado.');
            process.exit(1);
        }

        console.log(`Enviando notificação de teste para: ${user.name} (${user.email})...`);

        const notificationService = require('./services/notificationService');

        await notificationService.createNotification(
            user.id,
            'Teste de Mobile! 📱🚀',
            'Se você está vendo isso, as notificações push no celular estão funcionando, mesmo com o app fechado!',
            'achievement',
            '/dashboard'
        );

        console.log('✅ Notificação enviada com sucesso!');
        process.exit(0);
    } catch (error) {
        console.error('Erro ao enviar:', error);
        process.exit(1);
    }
}

sendTest();
