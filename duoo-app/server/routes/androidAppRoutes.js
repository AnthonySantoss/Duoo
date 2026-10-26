const express = require('express');
const controller = require('../controllers/androidAppController');

const router = express.Router();

router.get('/latest', controller.latest);
router.get('/download', controller.download);

module.exports = router;
