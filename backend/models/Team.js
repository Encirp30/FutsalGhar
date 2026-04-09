const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide team name']
  },
  
  teamLogo: String,
  
  // Team management
  captain: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  players: [{
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    name: {
      type: String
    },
    position: {
      type: String,
      enum: ['goalkeeper', 'defender', 'midfielder', 'forward', 'striker'],
      lowercase: true
    },
    jerseyNumber: Number,
    isCaptain: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Team details
  level: {
    type: String,
    enum: ['beginner', 'recreational', 'intermediate', 'competitive', 'professional'],
    default: 'recreational'
  },
  
  bio: String,
  
  // Visibility
  visibility: {
    type: String,
    enum: ['public', 'private'],
    default: 'public'
  },
  
  // Join requests
  joinRequests: [{
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: String,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    requestedAt: {
      type: Date,
      default: Date.now
    },
    respondedAt: Date
  }],
  
  // Statistics
  totalMatches: {
    type: Number,
    default: 0
  },
  wins: {
    type: Number,
    default: 0
  },
  losses: {
    type: Number,
    default: 0
  },
  draws: {
    type: Number,
    default: 0
  },
  goalsFor: {
    type: Number,
    default: 0
  },
  goalsAgainst: {
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

teamSchema.index({ captain: 1 });
teamSchema.index({ visibility: 1 });
teamSchema.index({ 'players.player': 1 });

module.exports = mongoose.model('Team', teamSchema);
