const express = require('express');
const { auth } = require('../middleware/auth');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

const router = express.Router();

// Protected routes
router.get('/dashboard', auth, userController.getDashboard);
router.get('/notifications', auth, userController.getNotifications);
router.put('/notifications/:id/read', auth, userController.markNotificationAsRead);
router.put('/notifications/mark-all-read', auth, userController.markAllNotificationsAsRead);
router.get('/statistics', auth, userController.getUserStatistics);
router.get('/upcoming-matches', auth, userController.getUpcomingMatches);
router.get('/booking-trends', auth, userController.getBookingTrends);

// Profile update route - uses authController
router.put('/profile', auth, authController.updateProfile);
router.get('/profile', auth, authController.getCurrentUser);

// Get user by ID (for viewing player profiles)
router.get('/:id', auth, userController.getUserById);

// Delete user account (for managers/admins/players)
router.delete('/me', auth, authController.deleteAccount);

module.exports = router;