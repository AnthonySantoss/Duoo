const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { capturedTransactionSchema } = require('../validation/capturedTransactionSchemas');
const controller = require('../controllers/capturedTransactionController');

router.use(authMiddleware);
router.post('/', validate(capturedTransactionSchema), controller.create);

module.exports = router;
