const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const crypto = require('crypto');
const Notification = require('../models/Notification');

// Register user
exports.register = async (req, res) => {
  try {
    console.log('Registration request body:', req.body);
    
    const { username, email, password, confirmPassword, role } = req.body;

    if (!username || !email || !password || !confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide all required fields' 
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Passwords do not match' 
      });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      const message = existingUser.email === email ? 'Email already registered' : 'Username already taken';
      return res.status(400).json({ 
        success: false, 
        message 
      });
    }

    // Set role (default to 'user', can be 'manager' if specified)
    const userRole = role === 'manager' ? 'manager' : 'user';

    const user = new User({
      username,
      email,
      password,
      role: userRole,
      profile: {
        fullName: username
      }
    });

    await user.save();
    console.log('User created successfully:', user._id);

    // Notify all admins when a new manager registers
    if (userRole === 'manager') {
      try {
        const admins = await User.find({ role: 'admin' });
        for (const admin of admins) {
          await Notification.create({
            user: admin._id,
            type: 'new_manager_registered',
            title: 'New Manager Registered',
            message: `A new manager "${username}" has registered on the platform.`,
            relatedEntity: {
              entityType: 'user',
              entityId: user._id
            }
          });
        }
      } catch (notifyError) {
        console.log('Manager registration notification error:', notifyError.message);
      }
    }

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    console.log('Login request:', req.body);
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide username and password' 
      });
    }

    const user = await User.findOne({ 
      $or: [{ username }, { email: username }] 
    }).select('+password');

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    if (!user.isActive) {
      return res.status(403).json({ 
        success: false, 
        message: 'Account is disabled. Please contact support.' 
      });
    }

    const token = generateToken(user._id, user.role);
    console.log('Login successful:', user.username);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Get current user
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    console.log('Returning user profile:', {
      username: user.username,
      profile: user.profile
    });
    res.json({
      success: true,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Request password reset
exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpire = Date.now() + 30 * 60 * 1000;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset link sent to email'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Reset password
exports.resetPassword = async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: resetTokenHash,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update Profile
exports.updateProfile = async (req, res) => {
  try {
    console.log('Update profile request body:', req.body);
    console.log('User ID from token:', req.userId);

    const { fullName, phone, location, bio, skillLevel, preferredPosition, favoriteTeam } = req.body;

    const user = await User.findById(req.userId);
    
    if (!user) {
      console.log('User not found for ID:', req.userId);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('Current user profile before update:', user.profile);

    if (!user.profile) {
      user.profile = {};
    }

    if (fullName !== undefined && fullName !== '') user.profile.fullName = fullName;
    if (phone !== undefined) user.profile.phone = phone;
    if (location !== undefined) user.profile.location = location;
    if (bio !== undefined) user.profile.bio = bio;
    if (skillLevel !== undefined) user.profile.skillLevel = skillLevel;
    if (preferredPosition !== undefined) user.profile.preferredPosition = preferredPosition;
    if (favoriteTeam !== undefined) user.profile.favoriteTeam = favoriteTeam;

    user.markModified('profile');
    await user.save();

    console.log('Profile updated successfully for user:', user.username);
    console.log('Updated profile:', user.profile);

    const updatedUser = await User.findById(req.userId);
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser.toJSON()
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    const user = await User.findById(req.userId).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New passwords do not match'
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete user account
exports.deleteAccount = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Prevent deletion of admin accounts by non-admins
    if (user.role === 'admin' && req.userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin accounts cannot be deleted'
      });
    }
    
    await user.deleteOne();
    
    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete account error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};