const express = require('express');
const { auth, authorize } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

const router = express.Router();

// Admin-only routes
router.use(auth);
router.use(authorize('admin'));

// User management
router.get('/users', adminController.getAllUsers);
router.put('/users/:id/role', adminController.updateUserRole);
router.put('/users/:id/disable', adminController.disableUser);
router.put('/users/:id/enable', adminController.enableUser);
router.delete('/users/:id', adminController.deleteUser);

// Court management
router.get('/courts', adminController.getAllCourts);
router.delete('/courts/:id', adminController.deleteCourt);
router.post('/courts/assign', adminController.assignCourtToManager);

// Booking management
router.get('/bookings', adminController.getAllBookings);

// System statistics
router.get('/statistics', adminController.getSystemStatistics);

// Transaction management
router.get('/transactions', adminController.getAllTransactions);

// Withdrawal management
router.get('/withdrawals', adminController.getWithdrawalRequests);
router.put('/withdrawals/:id/approve', adminController.approveWithdrawal);
router.put('/withdrawals/:id/reject', adminController.rejectWithdrawal);

// Revenue reports
router.get('/revenue-report', adminController.getRevenueReport);

module.exports = router;
