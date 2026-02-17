const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');
const auth = require('../middleware/authMiddleware');

router.use(auth);

router.get('/', configController.getConfig);
router.put('/', configController.updateConfig);

module.exports = router;
