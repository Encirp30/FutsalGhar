const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const crypto = require('crypto');
const Notification = require('../models/Notification');
const { storeOTP, verifyOTP } = require('../utils/otp');
const { sendEmail } = require('../utils/email');

// Register user
exports.register = async (req, res) => {
  try {
    console.log('Registration request body:', req.body);
    
    const { username, email, password, confirmPassword, role, referralCode } = req.body;

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

    // Handle referral code
    if (referralCode) {
      try {
        const Referral = require('../models/Referral');
        const referral = await Referral.findOne({ 
          referralCode: referralCode,
          status: 'pending'
        });
        
        if (referral) {
          referral.referredUser = user._id;
          referral.status = 'joined';
          referral.joinedAt = Date.now();
          await referral.save();
          
          // Add reward to referrer's wallet
          const referrer = await User.findById(referral.referrer);
          if (referrer) {
            referrer.walletBalance = (referrer.walletBalance || 0) + 500;
            await referrer.save();
          }
        }
      } catch (refError) {
        console.log('Referral handling error:', refError.message);
      }
    }

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

// ========== OTP FUNCTIONS ==========

// Send OTP to email for verification
exports.sendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    
    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }
    
    const otp = storeOTP(email);
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #3b82f6;">FutsalGhar - Email Verification</h2>
        <p>Your OTP for registration is:</p>
        <div style="font-size: 32px; font-weight: bold; color: #1e293b; background: #f1f5f9; padding: 15px; text-align: center; letter-spacing: 5px; border-radius: 8px;">
          ${otp}
        </div>
        <p>This OTP is valid for 5 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <hr style="margin: 20px 0; border-color: #e2e8f0;">
        <p style="font-size: 12px; color: #64748b;">FutsalGhar - Your Futsal Platform</p>
      </div>
    `;
    
    await sendEmail(email, 'FutsalGhar - Email Verification OTP', emailHtml);
    
    res.json({ success: true, message: 'OTP sent to your email' });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Verify OTP
exports.verifyOTPCode = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }
    
    const isValid = verifyOTP(email, otp);
    
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }
    
    res.json({ success: true, message: 'OTP verified successfully' });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};