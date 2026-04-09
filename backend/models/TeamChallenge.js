const mongoose = require('mongoose');

const teamChallengeSchema = new mongoose.Schema({
  // Teams involved
  challengingTeam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  challengedTeam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  
  // Proposed match details
  proposedDate: Date,
  proposedStartTime: String,
  proposedEndTime: String,
  
  // Court preference
  preferredCourt: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Court'
  },
  
  // Challenge message
  message: String,
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'cancelled', 'match_scheduled'],
    default: 'pending'
  },
  
  // Response details
  responseMessage: String,
  respondedAt: Date,
  respondedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Match reference (if accepted and scheduled)
  match: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match'
  },
  
  // Alternative dates proposed by challenged team
  alternativeDates: [{
    date: Date,
    startTime: String,
    endTime: String
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

teamChallengeSchema.index({ challengingTeam: 1 });
teamChallengeSchema.index({ challengedTeam: 1 });
teamChallengeSchema.index({ status: 1 });

module.exports = mongoose.model('TeamChallenge', teamChallengeSchema);
