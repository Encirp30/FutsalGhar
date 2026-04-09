const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide tournament name']
  },
  
  description: String,
  
  // Location
  venue: {
    court: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Court'
    },
    address: String,
    city: String
  },
  
  // Organizer/Manager
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Tournament details
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  
  format: {
    type: String,
    enum: ['knockout', 'round_robin', 'league'],
    default: 'knockout'
  },
  
  // Team registration
  maxTeams: {
    type: Number,
    required: true
  },
  registeredTeams: [{
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team'
    },
    registeredAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    }
  }],
  
  // Prize pool
  totalPrizePool: Number,
  prizeDistribution: {
    firstPlace: Number,
    secondPlace: Number,
    thirdPlace: Number
  },
  
  // Entry fee
  entryFee: {
    type: Number,
    default: 0
  },
  
  // Rules
  rulesDescription: String,
  
  // Status
  status: {
    type: String,
    enum: ['registration_open', 'registration_closed', 'ongoing', 'completed', 'cancelled'],
    default: 'registration_open'
  },
  
  // Bracket/Schedule
  matches: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match'
  }],
  
  // Winner
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  runnerUp: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  thirdPlace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
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

tournamentSchema.index({ organizer: 1 });
tournamentSchema.index({ status: 1 });
tournamentSchema.index({ startDate: 1 });

module.exports = mongoose.model('Tournament', tournamentSchema);
