const { sequelize, Notification } = require('./models');

async function migrate() {
    try {
        console.log('--- Marcando notificações antigas como "notified" ---');

        const count = await Notification.count({ where: { notified: false } });
        console.log(`Encontradas ${count} notificações antigas não "mostradas".`);

        if (count > 0) {
            await Notification.update({ notified: true }, { where: { notified: false } });
            console.log('✅ Todas as antigas foram marcadas como "mostradas".');
        } else {
            console.log('✅ Nenhuma antiga encontrada.');
        }

        console.log('Migration concluída.');
        process.exit(0);
    } catch (error) {
        console.error('Erro fatal:', error);
        process.exit(1);
    }
}

migrate();
