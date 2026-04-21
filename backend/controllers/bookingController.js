const Booking = require('../models/Booking');
const Court = require('../models/Court');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendEmail } = require('../utils/email');

// Create booking
exports.createBooking = async (req, res) => {
  try {
    const { courtId, date, startTime, endTime, paymentMethod } = req.body;

    // Validate court exists
    const court = await Court.findById(courtId);
    if (!court) {
      return res.status(404).json({
        success: false,
        message: 'Court not found'
      });
    }

    // VALIDATION: Prevent past-time bookings
    const bookingDate = new Date(date);
    const timeRegex = /(\d+):(\d+)/;
    const match = startTime.match(timeRegex);
    
    if (!match) {
      return res.status(400).json({
        success: false,
        message: 'Invalid time format'
      });
    }

    const [, hours, minutes] = match;
    bookingDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    const now = new Date();
    if (bookingDate < now) {
      return res.status(400).json({
        success: false,
        message: 'Cannot book time slots in the past'
      });
    }

    // Check if slot is already booked
    const existingBooking = await Booking.findOne({
      court: courtId,
      date,
      startTime,
      endTime,
      status: { $ne: 'cancelled' }
    });

    if (existingBooking) {
      return res.status(400).json({
        success: false,
        message: 'This time slot is already booked'
      });
    }

    // Calculate duration and cost
    const duration = calculateDuration(startTime, endTime);
    const totalCost = duration * court.pricePerHour;

    // Create booking
    const booking = new Booking({
      court: courtId,
      player: req.userId,
      date,
      startTime,
      endTime,
      duration,
      pricePerHour: court.pricePerHour,
      totalCost,
      paymentMethod,
      paymentStatus: paymentMethod === 'wallet' ? 'completed' : 'pending',
      status: 'confirmed'
    });

    await booking.save();

    // Update user wallet
    if (paymentMethod === 'wallet') {
      const user = await User.findById(req.userId);
      user.walletBalance -= totalCost;
      user.totalBookings += 1;
      await user.save();
    }

    // Update court statistics
    court.totalBookings += 1;
    court.totalRevenue += totalCost;
    await court.save();

    // Send confirmation email
    const user = await User.findById(req.userId);
    
    const emailHtml = `
      <h2>Booking Confirmation</h2>
      <p>Your booking has been confirmed!</p>
      <p><strong>Court:</strong> ${court.name}</p>
      <p><strong>Date:</strong> ${new Date(date).toDateString()}</p>
      <p><strong>Time:</strong> ${startTime} - ${endTime}</p>
      <p><strong>Total Cost:</strong> Rs. ${totalCost}</p>
    `;

    try {
      await sendEmail(user.email, 'Booking Confirmation', emailHtml);
    } catch (emailErr) {
      console.log("Email service error:", emailErr.message);
    }

    // Create notification for player
    await Notification.create({
      user: req.userId,
      type: 'booking_confirmation',
      title: 'Booking Confirmed',
      message: `Your booking for ${court.name} on ${new Date(date).toDateString()} has been confirmed.`,
      relatedEntity: {
        entityType: 'booking',
        entityId: booking._id
      }
    });

    // Notify court owner (manager) about new booking
    try {
      await Notification.create({
        user: court.owner,
        type: 'new_booking',
        title: 'New Booking Received',
        message: `New booking for "${court.name}" on ${new Date(date).toDateString()} at ${startTime}`,
        relatedEntity: {
          entityType: 'booking',
          entityId: booking._id
        }
      });
    } catch (notifyError) {
      console.log('Manager notification error:', notifyError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get user's bookings
exports.getUserBookings = async (req, res) => {
  try {
    const { status, page = 1, limit = 4 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const now = new Date();

    // Checking if a booking is past (date + time)
    const getBookingDateTime = (booking) => {
      const bookingDate = new Date(booking.date);
      const timeRegex = /(\d+):(\d+)/;
      const match = booking.startTime.match(timeRegex);
      if (match) {
        const [, hours, minutes] = match;
        bookingDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }
      return bookingDate;
    };

    let filter = { player: req.userId };

    // Fetch all bookings first to filter by date+time combination
    const allBookings = await Booking.find({ player: req.userId })
      .populate('court')
      .sort({ date: -1, startTime: -1 });

    // Categorize bookings by their full date+time
    const upcoming = [];
    const past = [];
    const cancelled = [];

    for (const booking of allBookings) {
      if (booking.status === 'cancelled') {
        cancelled.push(booking);
      } else {
        const bookingDateTime = getBookingDateTime(booking);
        if (bookingDateTime > now) {
          upcoming.push(booking);
        } else {
          past.push(booking);
        }
      }
    }

    // Apply status filter for pagination
    let filteredBookings = allBookings;
    if (status && status !== 'all') {
      if (status === 'upcoming') {
        filteredBookings = upcoming;
      } else if (status === 'past') {
        filteredBookings = past;
      } else if (status === 'cancelled') {
        filteredBookings = cancelled;
      }
    }

    // Paginate the filtered results
    const paginatedBookings = filteredBookings.slice(skip, skip + parseInt(limit));

    res.json({
      success: true,
      bookings: paginatedBookings,
      pagination: {
        total: filteredBookings.length,
        pages: Math.ceil(filteredBookings.length / limit),
        currentPage: parseInt(page)
      },
      stats: {
        total: allBookings.length,
        upcoming: upcoming.length,
        completed: past.length,
        cancelled: cancelled.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get booking details
exports.getBookingById = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id)
      .populate('court')
      .populate('player', 'fullName email phone');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.player._id.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this booking'
      });
    }

    res.json({
      success: true,
      booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Cancel booking
exports.cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const booking = await Booking.findById(id).populate('court');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    const bookingDateTime = new Date(`${booking.date} ${booking.startTime}`);
    const currentTime = new Date();
    const hoursUntilBooking = (bookingDateTime - currentTime) / (1000 * 60 * 60);

    if (hoursUntilBooking < 2) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel booking less than 2 hours before'
      });
    }

    const refundAmount = booking.totalCost * 0.8;

    booking.status = 'cancelled';
    booking.cancelledBy = 'player';
    booking.cancellationReason = reason;
    booking.cancellationDate = Date.now();
    booking.refundAmount = refundAmount;

    await booking.save();

    const user = await User.findById(req.userId);
    user.walletBalance += refundAmount;
    await user.save();

    await Notification.create({
      user: req.userId,
      type: 'booking_cancelled',
      title: 'Booking Cancelled',
      message: `Your booking has been cancelled. Refund of Rs. ${refundAmount} has been credited.`,
      relatedEntity: {
        entityType: 'booking',
        entityId: booking._id
      }
    });

    // Notify court owner (manager) about cancelled booking
    try {
      await Notification.create({
        user: booking.court.owner,
        type: 'booking_cancelled',
        title: 'Booking Cancelled',
        message: `A booking for "${booking.court.name}" on ${new Date(booking.date).toDateString()} at ${booking.startTime} has been cancelled.`,
        relatedEntity: {
          entityType: 'booking',
          entityId: booking._id
        }
      });
    } catch (notifyError) {
      console.log('Manager cancellation notification error:', notifyError.message);
    }

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      refundAmount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Reschedule booking 
exports.rescheduleBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { newDate, newStartTime, newEndTime } = req.body;

    // First, fetch the booking to verify ownership and get current details
    const existingBooking = await Booking.findById(id).populate('court');

    if (!existingBooking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Authorization check: Only the booking owner can reschedule
    if (existingBooking.player.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to reschedule this booking'
      });
    }

    // VALIDATION: Prevent rescheduling to past-time
    const newBookingDate = new Date(newDate);
    const timeRegex = /(\d+):(\d+)/;
    const match = newStartTime.match(timeRegex);
    
    if (!match) {
      return res.status(400).json({
        success: false,
        message: 'Invalid time format'
      });
    }

    const [, hours, minutes] = match;
    newBookingDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    const now = new Date();
    if (newBookingDate < now) {
      return res.status(400).json({
        success: false,
        message: 'Cannot reschedule to a time in the past'
      });
    }

    // Check if new slot is already booked by another booking
    const conflictingBooking = await Booking.findOne({
      court: existingBooking.court,
      date: newDate,
      startTime: newStartTime,
      endTime: newEndTime,
      status: { $ne: 'cancelled' },
      _id: { $ne: id }  
    });

    if (conflictingBooking) {
      return res.status(400).json({
        success: false,
        message: 'Selected time slot is not available'
      });
    }

    // Prepare reschedule history entry
    const rescheduleEntry = {
      fromDate: existingBooking.date,
      fromStartTime: existingBooking.startTime,
      fromEndTime: existingBooking.endTime,
      toDate: newDate,
      toStartTime: newStartTime,
      toEndTime: newEndTime,
      rescheduledAt: Date.now(),
      rescheduledBy: 'player'
    };

    // UPDATE the existing booking 
    const updatedBooking = await Booking.findByIdAndUpdate(
      id,
      {
        $set: {
          date: newDate,
          startTime: newStartTime,
          endTime: newEndTime,
          updatedAt: Date.now()
        },
        $push: {
          rescheduleHistory: rescheduleEntry
        }
      },
      { new: true, runValidators: true }
    );

    // Send notification for reschedule to player
    try {
      await Notification.create({
        user: req.userId,
        type: 'booking_rescheduled',
        title: 'Booking Rescheduled',
        message: `Your booking for ${existingBooking.court?.name || 'court'} has been rescheduled to ${new Date(newDate).toDateString()} at ${newStartTime} - ${newEndTime}`,
        relatedEntity: {
          entityType: 'booking',
          entityId: updatedBooking._id
        }
      });
    } catch (notifyError) {
      console.log('Reschedule notification error:', notifyError.message);
    }

    res.json({
      success: true,
      message: 'Booking rescheduled successfully',
      booking: updatedBooking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Add review to booking
exports.addReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Ensure the player is authorized
    if (booking.player.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to review this booking'
      });
    }

    // Allow reviews if date is in past
    const bookingDate = new Date(booking.date);
    const today = new Date();
    if (booking.status !== 'completed' && bookingDate >= today) {
      return res.status(400).json({
        success: false,
        message: 'Can only review completed bookings'
      });
    }

    // Update the review object inside the Booking document
    booking.review = {
      rating: Number(rating),
      comment: comment,
      reviewedAt: Date.now()
    };

    await booking.save();

    // Recalculate Court statistics (Average Rating)
    const allReviews = await Booking.find({
      court: booking.court,
      'review.rating': { $exists: true }
    });

    const avgRating = allReviews.reduce((sum, b) => sum + b.review.rating, 0) / allReviews.length;

    await Court.findByIdAndUpdate(booking.court, {
      averageRating: avgRating,
      totalReviews: allReviews.length
    });

    res.json({
      success: true,
      message: 'Review added successfully',
      booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get booked time slots for a court on a specific date
exports.getBookedSlots = async (req, res) => {
  try {
    const { courtId, date } = req.query;

    if (!courtId || !date) {
      return res.status(400).json({
        success: false,
        message: 'Court ID and date are required'
      });
    }

    // Find all non-cancelled bookings for this court on the given date
    const bookings = await Booking.find({
      court: courtId,
      date: {
        $gte: new Date(date),
        $lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000)
      },
      status: { $ne: 'cancelled' }
    });

    const bookedSlots = bookings.map(booking => ({
      startTime: booking.startTime,
      endTime: booking.endTime
    }));

    res.json({
      success: true,
      bookedSlots
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ========== UPDATE PAYMENT STATUS (ADMIN ONLY) ==========
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus } = req.body;

    const booking = await Booking.findById(id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    booking.paymentStatus = paymentStatus;
    booking.updatedAt = Date.now();
    await booking.save();

    res.json({
      success: true,
      message: 'Payment status updated successfully',
      booking
    });
  } catch (error) {
    console.error('Update payment status error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Helper function
function calculateDuration(startTime, endTime) {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  const startTotalMin = startHour * 60 + startMin;
  const endTotalMin = endHour * 60 + endMin;

  return (endTotalMin - startTotalMin) / 60;
}