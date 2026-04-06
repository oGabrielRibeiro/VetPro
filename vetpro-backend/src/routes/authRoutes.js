const express = require('express');

const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');
const twoFactorRoutes = require('./twoFactorAuth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/recover', authController.recoverPassword);
router.get('/me', authMiddleware, authController.me);
router.put('/profile', authMiddleware, authController.updateProfile);
router.delete('/account', authMiddleware, authController.deleteAccount);

router.post('/refresh', authController.refreshToken);
router.post('/logout', authMiddleware, authController.logout);
router.use('/', twoFactorRoutes);

module.exports = router;
