const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth'); 
const authController = require('../controllers/authController');

// All routes must point to a VALID function in the controller
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.requestPasswordReset);
router.post('/reset-password', authController.resetPassword);

router.get('/me', auth, authController.getCurrentUser);
router.put('/profile', auth, authController.updateProfile);
router.post('/change-password', auth, authController.changePassword);

module.exports = router;