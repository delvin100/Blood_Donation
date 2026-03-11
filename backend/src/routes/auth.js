const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/register', authController.register);
router.get('/check-username', authController.checkUsername);
router.post('/login', authController.login);
router.post('/google', authController.googleAuth);
router.post('/complete-profile', authMiddleware, authController.completeProfile);
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-otp', authController.verifyOTP);
router.post('/reset-password', authController.resetPassword);

module.exports = router;
