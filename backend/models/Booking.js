const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  court: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Court',
    required: true
  },
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Booking details
  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: String, // HH:MM format
    required: true
  },
  endTime: {
    type: String, // HH:MM format
    required: true
  },
  duration: {
    type: Number, // in hours
    required: true
  },
  
  // Cost details
  pricePerHour: {
    type: Number,
    required: true
  },
  totalCost: {
    type: Number,
    required: true
  },
  
  // Payment
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'esewa', 'khalti', 'wallet'],
    default: 'cash'
  },
  transactionId: String,
  
  // Booking status
  status: {
    type: String,
    enum: ['confirmed', 'cancelled', 'completed', 'pending'],
    default: 'pending'
  },
  
  // Cancellation details
  cancelledBy: String, // 'player', 'manager', 'admin'
  cancellationReason: String,
  cancellationDate: Date,
  refundAmount: Number,
  
  // Notes
  notes: String,
  
  // Review (after booking is completed)
  review: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    reviewedAt: Date
  },
  
  // Reschedule history
  rescheduleHistory: [{
    fromDate: Date,
    fromStartTime: String,
    fromEndTime: String,
    toDate: Date,
    toStartTime: String,
    toEndTime: String,
    rescheduledAt: Date,
    rescheduledBy: String
  }],
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
bookingSchema.index({ court: 1, date: 1 });
bookingSchema.index({ player: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ paymentStatus: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
