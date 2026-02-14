const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loanController');
const authenticate = require('../middleware/authMiddleware');

router.use(authenticate);

router.get('/', loanController.getLoans);
router.post('/', loanController.createLoan);
router.get('/search/compatible-transactions', loanController.getCompatibleTransactions);
router.post('/:id/pay', loanController.payInstallment);
router.put('/:id/link-transaction', loanController.linkTransaction);

module.exports = router;
