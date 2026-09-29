const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const schemas = require('../validation/authSchemas');

router.post('/register', validate(schemas.register), authController.register);
router.post('/login', validate(schemas.login), authController.login);
router.post('/logout', authController.logout);
router.post('/forgot-password', validate(schemas.forgotPassword), authController.forgotPassword);
router.post('/reset-password', validate(schemas.resetPassword), authController.resetPassword);
router.get('/google', authController.googleStart);
router.get('/google/callback', authController.googleCallback);
router.get('/me', authMiddleware, authController.getMe);

// Rotas de configurações (protegidas)
router.put('/profile', authMiddleware, validate(schemas.profile), authController.updateProfile);
router.put('/password', authMiddleware, validate(schemas.changePassword), authController.changePassword);
router.delete('/account', authMiddleware, authController.deleteAccount);

module.exports = router;
