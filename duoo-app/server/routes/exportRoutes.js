const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);
router.get('/csv', exportController.exportCSV);
router.get('/pdf', exportController.exportPDF);

module.exports = router;
