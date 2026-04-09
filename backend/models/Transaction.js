const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  // User involved
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Transaction type
  type: {
    type: String,
    enum: ['booking', 'tournament_entry', 'referral_reward', 'withdrawal', 'refund'],
    required: true
  },
  
  // Amount
  amount: {
    type: Number,
    required: true
  },
  
  // Payment method
  paymentMethod: {
    type: String,
    enum: ['esewa', 'khalti', 'wallet', 'bank_transfer'],
    required: true
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  
  // Reference to related entity
  reference: {
    referenceType: {
      type: String,
      enum: ['booking', 'tournament_entry', 'referral', 'withdrawal']
    },
    referenceId: mongoose.Schema.Types.ObjectId
  },
  
  // Payment gateway details
  transactionId: String,
  gateway: String, // 'esewa', 'khalti', etc
  gatewayResponse: mongoose.Schema.Types.Mixed,
  
  // Description
  description: String,
  
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

transactionSchema.index({ user: 1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ createdAt: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
