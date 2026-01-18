const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loanController');
const authenticate = require('../middleware/authMiddleware');

router.use(authenticate);

router.get('/', loanController.getLoans);
router.post('/', loanController.createLoan);
router.post('/:id/pay', loanController.payInstallment);

// Novas rotas para vinculação de transações
router.get('/compatible-transactions', loanController.getCompatibleTransactions);
router.put('/:id/link-transaction', loanController.linkTransaction);

module.exports = router;
