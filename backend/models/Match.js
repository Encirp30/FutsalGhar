const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  // Tournament reference
  tournament: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament'
  },
  
  // Teams
  teamA: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  teamB: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  
  // Court details
  court: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Court'
  },
  
  // Match schedule
  scheduledDate: {
    type: Date,
    required: true
  },
  startTime: String,
  endTime: String,
  
  // Match score
  teamAScore: {
    type: Number,
    default: 0
  },
  teamBScore: {
    type: Number,
    default: 0
  },
  
  // Match details
  duration: Number, // in minutes
  
  // Match events
  goalScorers: [{
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    minute: Number,
    team: String, // 'teamA' or 'teamB'
    assistBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  cards: [{
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    team: String, // 'teamA' or 'teamB'
    cardType: {
      type: String,
      enum: ['yellow', 'red']
    },
    minute: Number,
    reason: String
  }],
  
  // Player ratings
  playerRatings: [{
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    team: String, // 'teamA' or 'teamB'
    rating: {
      type: Number,
      min: 1,
      max: 10
    }
  }],
  
  // Team formations
  teamAFormation: String, // e.g., '3-2-1'
  teamBFormation: String,
  
  // Man of the match
  manOfTheMatch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Match status
  status: {
    type: String,
    enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  
  // Result type
  resultType: {
    type: String,
    enum: ['regular_time', 'extra_time', 'penalties'],
    default: 'regular_time'
  },
  
  // Penalty details (if applicable)
  penaltyDetails: {
    teamAPenalty: Number,
    teamBPenalty: Number
  },
  
  // Notes
  notes: String,
  
  // Referee
  referee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Match result entered by
  resultEnteredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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

matchSchema.index({ tournament: 1 });
matchSchema.index({ teamA: 1, teamB: 1 });
matchSchema.index({ scheduledDate: 1 });
matchSchema.index({ status: 1 });

module.exports = mongoose.model('Match', matchSchema);
