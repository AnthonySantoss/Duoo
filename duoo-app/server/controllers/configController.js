const { UserConfig } = require('../models');

exports.getConfig = async (req, res) => {
    try {
        const userId = req.user.id;
        let config = await UserConfig.findOne({ where: { user_id: userId } });

        if (!config) {
            config = await UserConfig.create({ user_id: userId });
        }

        // Se for modo conjunto, tentar buscar/mesclar com o parceiro? 
        // Por simplificação, cada usuário tem sua config ou o casal compartilha se for conjunto.
        // Vamos permitir configs individuais por enquanto.

        res.json(config);
    } catch (error) {
        console.error('Error fetching config:', error);
        res.status(500).json({ error: 'Erro ao buscar configurações' });
    }
};

exports.updateConfig = async (req, res) => {
    try {
        const userId = req.user.id;
        const { large_transaction_limit, weekly_report_day, weekly_report_hour, notifications_enabled, daily_reminder_enabled, daily_reminder_hour } = req.body;

        let config = await UserConfig.findOne({ where: { user_id: userId } });

        if (!config) {
            config = await UserConfig.create({
                user_id: userId,
                large_transaction_limit,
                weekly_report_day,
                weekly_report_hour,
                notifications_enabled,
                daily_reminder_enabled,
                daily_reminder_hour
            });
        } else {
            await config.update({
                large_transaction_limit,
                weekly_report_day,
                weekly_report_hour,
                notifications_enabled,
                daily_reminder_enabled,
                daily_reminder_hour
            });
        }

        res.json(config);
    } catch (error) {
        console.error('Error updating config:', error);
        res.status(500).json({ error: 'Erro ao salvar configurações' });
    }
};
