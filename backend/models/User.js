const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Please provide a username'],
    unique: true
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    match: [/.+@.+\..+/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 6,
    select: false
  },

  // Role-based access
  role: {
    type: String,
    enum: ['user', 'manager', 'admin'],
    default: 'user'
  },

  // Courts managed by managers
  courts: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Court'
    }
  ],

  // Wallet/Balance
  walletBalance: {
    type: Number,
    default: 0
  },

  // Email verification
  isVerified: {
    type: Boolean,
    default: false
  },

  // Account status
  isActive: {
    type: Boolean,
    default: true
  },

  // Nested profile object
  profile: {
    fullName: String,
    phone: String,
    location: String,
    bio: String,
    skillLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'professional']
    },
    preferredPosition: String,
    favoriteTeam: String,
    avatar: String
  },

  // Referral system
  referralCode: {
    type: String,
    sparse: true  // ✅ fixed - allows multiple null values
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Password reset
  passwordResetToken: String,
  passwordResetExpires: Date,

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// ✅ Fixed - async pre-save hook without next()
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare password
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to get user without sensitive fields
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpire;
  return obj;
};

module.exports = mongoose.model('User', userSchema);