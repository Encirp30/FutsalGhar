const express = require('express');
const { auth } = require('../middleware/auth');
const bookingController = require('../controllers/bookingController');

const router = express.Router();

// Public routes
router.get('/booked-slots', bookingController.getBookedSlots);

// Protected routes (must be logged in)
router.post('/', auth, bookingController.createBooking);
router.get('/my-bookings', auth, bookingController.getUserBookings);
router.get('/:id', auth, bookingController.getBookingById);
router.put('/:id/cancel', auth, bookingController.cancelBooking);
router.put('/:id/reschedule', auth, bookingController.rescheduleBooking);
router.post('/:id/review', auth, bookingController.addReview);

module.exports = router;
