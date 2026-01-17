const express = require('express');
const router = express.Router();
const pluggyController = require('../controllers/pluggyController');
const authMiddleware = require('../middleware/authMiddleware');

// Get connect token (protected route)
router.get('/connect-token', authMiddleware, pluggyController.getConnectToken);

// Sync item data (protected route)
router.post('/sync-item', authMiddleware, pluggyController.syncItem);

// Get connected items (protected route)
router.get('/connected-items', authMiddleware, pluggyController.getConnectedItems);

// Disconnect item (protected route)
router.delete('/disconnect/:itemId', authMiddleware, pluggyController.disconnectItem);

// Webhook endpoint (public - Pluggy will call this)
router.post('/webhook', pluggyController.handleWebhook);

module.exports = router;
