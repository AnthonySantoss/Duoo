const express = require('express');
const router = express.Router();
const importController = require('../controllers/importController');
const authMiddleware = require('../middleware/authMiddleware');
const { upload } = importController;

router.use(authMiddleware);

router.post('/preview', authMiddleware, upload.single('file'), importController.previewStatement);
router.post('/confirm', authMiddleware, importController.confirmStatement);
router.post('/upload', importController.uploadMiddleware, importController.uploadStatement);

module.exports = router;
