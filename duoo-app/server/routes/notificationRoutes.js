const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middleware/authMiddleware');

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// Listar notificações do usuário
router.get('/', notificationController.getUserNotifications);

// Marcar notificação como lida
router.put('/:id/read', notificationController.markAsRead);

// Marcar notificação como "mostrada" (popup)
router.put('/:id/notified', notificationController.markAsNotified);

// Marcar todas como lidas
router.put('/read-all', notificationController.markAllAsRead);

// Deletar notificação
router.delete('/:id', notificationController.deleteNotification);

// Criar notificação (para testes ou sistema interno)
router.post('/', notificationController.createNotification);

// Enviar recado para parceiro
router.post('/send-to-partner', notificationController.sendToPartner);

// Push Notifications (WebPush)
router.post('/push/subscribe', notificationController.subscribe);
router.post('/push/unsubscribe', notificationController.unsubscribe);

module.exports = router;
