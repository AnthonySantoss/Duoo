const express = require('express');
const router = express.Router();
const challengeController = require('../controllers/challengeController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);
router.get('/', challengeController.getChallenges);
router.post('/', challengeController.createChallenge);

module.exports = router;
