const { Notification, User } = require('../models');
const { Op } = require('sequelize');

/**
 * Busca notificações do usuário
 */
exports.getUserNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 20, offset = 0 } = req.query;

        const notifications = await Notification.findAll({
            where: { user_id: userId },
            order: [['created_at', 'DESC']],
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

        const notification = await Notification.create({
            user_id: user.partner_id,
            title: `Recado de ${user.name} ❤️`,
            message,
            type: 'note',
            read: false
        });

        res.status(201).json(notification);
    } catch (error) {
        console.error('Error sending note to partner:', error);
        res.status(500).json({ error: 'Failed to send note' });
    }
};

module.exports = exports;
