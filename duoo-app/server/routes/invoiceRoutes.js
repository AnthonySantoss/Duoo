const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', invoiceController.getInvoices);
router.get('/current-month', invoiceController.getCurrentMonthTotal);
router.post('/', invoiceController.upsertInvoice);
router.delete('/:id', invoiceController.deleteInvoice);

module.exports = router;
