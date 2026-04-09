const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
  // Referrer (who sent the invitation)
  referrer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Referred user
  referredUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Referral code
  referralCode: {
    type: String,
    unique: true,
    required: true
  },
  
  // Email/Phone of referred person (before they sign up)
  referredEmail: String,
  referredPhone: String,
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'joined', 'active', 'expired'],
    default: 'pending'
  },
  
  // Referral reward
  rewardAmount: {
    type: Number,
    default: 0
  },
  rewardStatus: {
    type: String,
    enum: ['pending', 'earned', 'withdrawn'],
    default: 'pending'
  },
  
  // Expiry date
  expiryDate: Date,
  
  // Share channel
  sharedVia: {
    type: String,
    enum: ['whatsapp', 'facebook', 'twitter', 'email', 'link_copy'],
    default: 'link_copy'
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  joinedAt: Date,
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

referralSchema.index({ referrer: 1 });
referralSchema.index({ referralCode: 1 });
referralSchema.index({ status: 1 });

module.exports = mongoose.model('Referral', referralSchema);
