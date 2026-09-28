const express = require('express');
const router = express.Router();
const creditCardController = require('../controllers/creditCardController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// Credit card routes
router.get('/', creditCardController.getCreditCards);
router.post('/', creditCardController.createCreditCard);
router.put('/:id', creditCardController.updateCreditCard);
router.delete('/:id', creditCardController.deleteCreditCard);

const creditCardImportController = require('../controllers/creditCardImportController');
router.post('/:credit_card_id/import/preview', creditCardImportController.uploadMiddleware, creditCardImportController.preview);
router.post('/:credit_card_id/import/confirm', creditCardImportController.confirm);

// Purchase routes
router.post('/:credit_card_id/purchases', creditCardController.addPurchase);
router.get('/:credit_card_id/purchases', creditCardController.getPurchases);
router.put('/purchases/:id', creditCardController.updatePurchase);
router.delete('/purchases/:id', creditCardController.deletePurchase);

module.exports = router;
