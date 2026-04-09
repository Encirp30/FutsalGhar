const mongoose = require('mongoose');

const courtSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide court name']
  },
  description: {
    type: String
  },
  type: {
    type: String,
    enum: ['indoor', 'outdoor'],
    required: true
  },
  location: {
    address: {
      type: String,
      required: true
    },
    city: String,
    district: String,
    latitude: Number,
    longitude: Number
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  images: [String],
  facilities: [String], // ['changeRoom', 'parking', 'lighting', etc]
  
  // Pricing
  pricePerHour: {
    type: Number,
    required: true
  },
  specialPricing: [{
    day: String, // 'monday', 'saturday', etc
    morningRate: Number, // 6-12
    afternoonRate: Number, // 12-18
    eveningRate: Number // 18-24
  }],
  
  // Availability settings
  openingTime: {
    type: String,
    default: '09:00' // 24-hour format
  },
  closingTime: {
    type: String,
    default: '21:00'
  },
  
  // Status
  status: {
    type: String,
    enum: ['open', 'closed', 'maintenance'],
    default: 'open'
  },
  
  // Blocked dates (holidays, maintenance)
  closedDates: [{
    date: Date,
    reason: String
  }],
  
  // Ratings and reviews
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  
  // Statistics
  totalBookings: {
    type: Number,
    default: 0
  },
  totalRevenue: {
    type: Number,
    default: 0
  },
  
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

// Index for location-based queries
courtSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });
courtSchema.index({ owner: 1 });

module.exports = mongoose.model('Court', courtSchema);
