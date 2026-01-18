const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// Alert Settings
router.get('/', alertController.getAlerts);
router.post('/', alertController.createAlert);
router.put('/:id', alertController.updateAlert);
router.delete('/:id', alertController.deleteAlert);

// Notifications
router.get('/notifications', alertController.getNotifications);
router.put('/notifications/read-all', alertController.markAllAsRead);
router.put('/notifications/:id/read', alertController.markAsRead);

module.exports = router;
