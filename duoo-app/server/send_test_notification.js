const { User, Notification } = require('./models');

async function sendTest() {
    try {
        const user = await User.findOne(); // Pega o primeiro usuário (provavelmente o Anthony)
        if (!user) {
            console.log('Nenhum usuário encontrado.');
            process.exit(1);
        }

        console.log(`Enviando notificação de teste para: ${user.name} (${user.email})...`);

        await Notification.create({
            user_id: user.id,
            title: 'Teste de Pop-up! 🚀',
            message: 'Se você está vendo isso, o novo sistema de notificações em tempo real está funcionando perfeitamente. Parabéns pela implementação!',
            type: 'achievement', // Vai mostrar o ícone de troféu
            read: false,
            notified: false // Importante: false para aparecer o popup
        });

        console.log('✅ Notificação enviada com sucesso!');
        process.exit(0);
    } catch (error) {
        console.error('Erro ao enviar:', error);
        process.exit(1);
    }
}

sendTest();
