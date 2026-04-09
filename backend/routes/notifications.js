const express = require('express');
const { auth } = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

const router = express.Router();

// All routes require authentication
router.get('/', auth, notificationController.getNotifications);
router.put('/:id/read', auth, notificationController.markAsRead);
router.put('/mark-all-read', auth, notificationController.markAllAsRead);  // ← Make sure this matches
router.delete('/:id', auth, notificationController.deleteNotification);

module.exports = router;