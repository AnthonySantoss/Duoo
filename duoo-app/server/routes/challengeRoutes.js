const express = require('express');
const router = express.Router();
const challengeController = require('../controllers/challengeController');
const auth = require('../middleware/authMiddleware');

router.get('/', auth, challengeController.getChallenges);
router.post('/', auth, challengeController.createChallenge);
router.put('/:id', auth, challengeController.updateChallenge);
router.post('/start', auth, challengeController.startChallenge);

module.exports = router;
