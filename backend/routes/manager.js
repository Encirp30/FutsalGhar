const express = require('express');
const { auth, authorize } = require('../middleware/auth');
const managerController = require('../controllers/managerController');

const router = express.Router();

// Manager-only routes
router.use(auth);
router.use(authorize('manager', 'admin'));

// Booking management
router.get('/bookings', managerController.getManagerBookings);
router.put('/bookings/:id/confirm', managerController.confirmBooking);
router.put('/bookings/:id/complete', managerController.completeBooking);

// Revenue management
router.get('/revenue', managerController.getManagerRevenue);
router.get('/wallet', managerController.getManagerWallet);
router.post('/withdrawal-request', managerController.requestWithdrawal);
router.get('/withdrawals', managerController.getWithdrawalRequests);

// Transaction history
router.get('/transactions', managerController.getTransactionHistory);

// Analytics
router.get('/court-utilization', managerController.getCourtUtilization);

module.exports = router;
