const express = require('express');
const router = express.Router();
const achievementController = require('../controllers/achievementController');
const authMiddleware = require('../middleware/authMiddleware');

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// Listar todas as conquistas
router.get('/', achievementController.getAllAchievements);

// Verificar e desbloquear novas conquistas
router.post('/check', achievementController.checkAchievements);

// Marcar conquistas como vistas
router.post('/mark-seen', achievementController.markAsSeen);

// Buscar conquistas novas (não vistas)
router.get('/new', achievementController.getNewAchievements);

// Estatísticas do usuário
router.get('/stats', achievementController.getUserStats);

module.exports = router;
