const { BudgetAlert, AlertNotification } = require('../models');

// --- ALERT SETTINGS ---

exports.getAlerts = async (req, res) => {
    try {
        const alerts = await BudgetAlert.findAll({
            where: { user_id: req.user.id }
        });
        res.json(alerts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createAlert = async (req, res) => {
    try {
        const { alert_type, category, threshold_amount, threshold_percentage, notification_method } = req.body;

        const alert = await BudgetAlert.create({
            user_id: req.user.id,
            alert_type,
            category,
            threshold_amount,
            threshold_percentage,
            notification_method
        });

        res.status(201).json(alert);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateAlert = async (req, res) => {
    try {
        const { id } = req.params;
        const alert = await BudgetAlert.findOne({
            where: { id, user_id: req.user.id }
        });

        if (!alert) {
            return res.status(404).json({ error: 'Alert not found' });
        }

        await alert.update(req.body);
        res.json(alert);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteAlert = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await BudgetAlert.destroy({
            where: { id, user_id: req.user.id }
        });

        if (!deleted) {
            return res.status(404).json({ error: 'Alert not found' });
        }

        res.json({ message: 'Alert deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- NOTIFICATIONS ---

exports.getNotifications = async (req, res) => {
    try {
        const notifications = await AlertNotification.findAll({
            where: { user_id: req.user.id },
            order: [['createdAt', 'DESC']],
            limit: 50
        });

        const unreadCount = await AlertNotification.count({
            where: { user_id: req.user.id, is_read: false }
        });

        res.json({ notifications, unreadCount });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await AlertNotification.findOne({
            where: { id, user_id: req.user.id }
        });

        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        notification.is_read = true;
        await notification.save();
        res.json(notification);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.markAllAsRead = async (req, res) => {
    try {
        await AlertNotification.update(
            { is_read: true },
            { where: { user_id: req.user.id, is_read: false } }
        );
        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
