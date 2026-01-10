const express = require('express');
const router = express.Router();
const simulationController = require('../controllers/simulationController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);
router.get('/', simulationController.getSimulationData);
router.post('/', simulationController.saveSimulation);

module.exports = router;
