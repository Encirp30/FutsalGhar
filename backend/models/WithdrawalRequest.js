const mongoose = require('mongoose');

const withdrawalRequestSchema = new mongoose.Schema({
  // Manager requesting withdrawal
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Withdrawal amount
  amount: {
    type: Number,
    required: true
  },
  
  // Bank details
  bankAccount: {
    accountNumber: String,
    accountHolder: String,
    bankName: String,
    bankCode: String
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed'],
    default: 'pending'
  },
  
  // Approval details
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvalDate: Date,
  approvalNotes: String,
  
  // Rejection details (if applicable)
  rejectionReason: String,
  rejectedAt: Date,
  
  // Completion details
  completionDate: Date,
  transactionId: String,
  
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

withdrawalRequestSchema.index({ manager: 1 });
withdrawalRequestSchema.index({ status: 1 });
withdrawalRequestSchema.index({ createdAt: 1 });

module.exports = mongoose.model('WithdrawalRequest', withdrawalRequestSchema);
