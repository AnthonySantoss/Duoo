const express = require('express');
const router = express.Router();
const importController = require('../controllers/importController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);
router.post('/upload', importController.uploadMiddleware, importController.importFile);

module.exports = router;
