const { Notification, User, PushSubscription } = require('../models');
const { Op } = require('sequelize');
const notificationService = require('../services/notificationService');

/**
 * Busca notificações do usuário
 */
exports.getUserNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 20, offset = 0 } = req.query;

        const notifications = await Notification.findAll({
            where: { user_id: userId },
            order: [['id', 'DESC']], // Using ID is safer and usually matches time order
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.json(notifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
};

/**
 * Marca notificação como lida
 */
exports.markAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const notificationId = req.params.id;

        const notification = await Notification.findOne({
            where: {
                id: notificationId,
                user_id: userId
            }
        });

        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        await notification.update({ read: true });

        res.json({ success: true, notification });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
};

/**
 * Marca todas as notificações como lidas
 */
exports.markAllAsRead = async (req, res) => {
    try {
        const userId = req.user.id;

        await Notification.update(
            { read: true },
            {
                where: {
                    user_id: userId,
                    read: false
                }
            }
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
};

/**
 * Deleta uma notificação
 */
exports.deleteNotification = async (req, res) => {
    try {
        const userId = req.user.id;
        const notificationId = req.params.id;

        const notification = await Notification.findOne({
            where: {
                id: notificationId,
                user_id: userId
            }
        });

        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        await notification.destroy();

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ error: 'Failed to delete notification' });
    }
};

/**
 * Cria uma nova notificação
 */
exports.createNotification = async (req, res) => {
    try {
        const userId = req.user.id;
        const { title, message, type = 'info', link = null } = req.body;

        if (!title || !message) {
            return res.status(400).json({ error: 'Title and message are required' });
        }

        const notification = await Notification.create({
            user_id: userId,
            title,
            message,
            type,
            link,
            read: false
        });

        res.status(201).json(notification);
    } catch (error) {
        console.error('Error creating notification:', error);
        res.status(500).json({ error: 'Failed to create notification' });
    }
};

/**
 * Envia uma nota para o parceiro
 */
exports.sendToPartner = async (req, res) => {
    try {
        const userId = req.user.id;
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const user = await User.findByPk(userId);
        if (!user.partner_id) {
            return res.status(400).json({ error: 'You do not have a linked partner' });
        }

        const notification = await notificationService.createNotification(
            user.partner_id,
            `Recado de ${user.name} ❤️`,
            message,
            'note',
            '/dashboard'
        );

        res.status(201).json(notification);
    } catch (error) {
        console.error('Error sending note to partner:', error);
        res.status(500).json({ error: 'Failed to send note' });
    }
};

/**
 * Marca uma notificação como "mostrada" (notified)
 */
exports.markAsNotified = async (req, res) => {
    try {
        const userId = req.user.id;
        const notificationId = req.params.id;

        const notification = await Notification.findOne({
            where: {
                id: notificationId,
                user_id: userId
            }
        });

        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        await notification.update({ notified: true });

        res.json({ success: true });
    } catch (error) {
        console.error('Error marking notification as notified:', error);
        res.status(500).json({ error: 'Failed to mark notification as notified' });
    }
};

/**
 * Salva uma nova inscrição para push notifications
 */
exports.subscribe = async (req, res) => {
    try {
        const userId = req.user.id;
        const { subscription, deviceType } = req.body;

        if (!subscription) {
            return res.status(400).json({ error: 'Subscription data is required' });
        }

        // Criar ou atualizar a inscrição
        const subscriptionData = JSON.stringify(subscription);

        // Verificar se já existe essa inscrição para esse usuário
        const [pushSub, created] = await PushSubscription.findOrCreate({
            where: {
                user_id: userId,
                subscription_data: subscriptionData
            },
            defaults: {
                device_type: deviceType
            }
        });

        if (!created) {
            await pushSub.update({ device_type: deviceType });
        }

        res.status(201).json({ success: true, pushSub });
    } catch (error) {
        console.error('Error saving push subscription:', error);
        res.status(500).json({ error: 'Failed to save push subscription' });
    }
};

/**
 * Remove uma inscrição de push notifications
 */
exports.unsubscribe = async (req, res) => {
    try {
        const userId = req.user.id;
        const { subscription } = req.body;

        if (!subscription) {
            return res.status(400).json({ error: 'Subscription data is required' });
        }

        const subscriptionData = JSON.stringify(subscription);

        await PushSubscription.destroy({
            where: {
                user_id: userId,
                subscription_data: subscriptionData
            }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error removing push subscription:', error);
        res.status(500).json({ error: 'Failed to remove push subscription' });
    }
};

module.exports = exports;
