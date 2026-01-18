const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const authMiddleware = require('../middleware/authMiddleware');

// Corrigir categoria de uma transação
router.put('/transactions/:id/correct-category', authMiddleware, categoryController.correctCategory);

// Obter correções do usuário
router.get('/corrections', authMiddleware, categoryController.getUserCorrections);

// Deletar uma correção
router.delete('/corrections/:id', authMiddleware, categoryController.deleteCorrection);

// Obter estatísticas de categorização
router.get('/category-stats', authMiddleware, categoryController.getCategoryStats);

module.exports = router;
