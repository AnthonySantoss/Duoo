const express = require('express');
const router = express.Router();
const partnerController = require('../controllers/partnerController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/code', authMiddleware, partnerController.getMyLinkCode);
router.post('/link', authMiddleware, partnerController.linkPartner);
router.post('/unlink', authMiddleware, partnerController.unlinkPartner);
router.get('/summary', authMiddleware, partnerController.getPartnerSummary);

module.exports = router;
