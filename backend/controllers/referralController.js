const Referral = require('../models/Referral');
const User = require('../models/User');
const Notification = require('../models/Notification');
const crypto = require('crypto');
const { sendEmail } = require('../utils/email');

// Generate referral code
const generateReferralCode = () => {
  return crypto.randomBytes(8).toString('hex').toUpperCase();
};

// Get or create referral link
exports.getReferralLink = async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user.referralCode) {
      user.referralCode = generateReferralCode();
      await user.save();
    }

    const referralLink = `${process.env.FRONTEND_URL}/register?ref=${user.referralCode}`;

    res.json({
      success: true,
      referralCode: user.referralCode,
      referralLink
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Send invite via email
exports.sendInvite = async (req, res) => {
  try {
    const { email, message = '' } = req.body;
    const user = await User.findById(req.userId);

    if (!user.referralCode) {
      user.referralCode = generateReferralCode();
      await user.save();
    }

    const referralLink = `${process.env.FRONTEND_URL}/register?ref=${user.referralCode}`;

    const emailHtml = `
      <h2>Join FutsalPro!</h2>
      <p>${user.fullName} has invited you to join FutsalPro - your ultimate futsal platform.</p>
      ${message && `<p>"${message}"</p>`}
      <p><a href="${referralLink}">Click here to register</a></p>
      <p>Using this link, you'll get special benefits!</p>
    `;

    await sendEmail(email, 'Join FutsalPro - Exclusive Invite from ' + user.fullName, emailHtml);

    // Create referral record
    const referral = new Referral({
      referrer: req.userId,
      referredEmail: email,
      referralCode: user.referralCode,
      status: 'pending',
      sharedVia: 'email',
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    });

    await referral.save();

    res.json({
      success: true,
      message: 'Invite sent successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Share referral link with social media
exports.shareReferralLink = async (req, res) => {
  try {
    const { platform } = req.body;
    const user = await User.findById(req.userId);

    if (!user.referralCode) {
      user.referralCode = generateReferralCode();
      await user.save();
    }

    const referralLink = `${process.env.FRONTEND_URL}/register?ref=${user.referralCode}`;

    // Create referral record for tracking
    const referral = new Referral({
      referrer: req.userId,
      referralCode: user.referralCode,
      status: 'pending',
      sharedVia: platform || 'link_copy',
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });

    await referral.save();

    const shareUrls = {
      whatsapp: `https://api.whatsapp.com/send?text=Join%20FutsalPro%3A%20${encodeURIComponent(referralLink)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(referralLink)}&text=Join%20FutsalPro%20with%20me`,
      email: `mailto:?subject=Join%20FutsalPro&body=${encodeURIComponent(referralLink)}`
    };

    res.json({
      success: true,
      referralLink,
      shareUrl: shareUrls[platform] || referralLink
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get referral statistics
exports.getReferralStats = async (req, res) => {
  try {
    const referrals = await Referral.find({ referrer: req.userId });

    const totalInvites = referrals.length;
    const joinedFriends = referrals.filter(r => r.status === 'joined').length;
    const pendingInvites = referrals.filter(r => r.status === 'pending').length;

    // Calculate rewards
    const rewardsEarned = joinedFriends * 500; // 500 per referral

    res.json({
      success: true,
      stats: {
        totalInvites,
        joinedFriends,
        pendingInvites,
        rewardsEarned
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get referral history
exports.getReferralHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;

    const referrals = await Referral.find({ referrer: req.userId })
      .populate('referredUser', 'fullName email')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Referral.countDocuments({ referrer: req.userId });

    res.json({
      success: true,
      referrals,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: parseInt(page)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Register with referral code
exports.registerWithReferral = async (req, res) => {
  try {
    const { referralCode } = req.body;

    if (!referralCode) {
      return res.status(400).json({
        success: false,
        message: 'Referral code is required'
      });
    }

    const referral = await Referral.findOne({ referralCode });

    if (!referral) {
      return res.status(400).json({
        success: false,
        message: 'Invalid referral code'
      });
    }

    // Check if referral has expired
    if (referral.expiryDate < Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'Referral code has expired'
      });
    }

    res.json({
      success: true,
      referrer: referral.referrer,
      message: 'Valid referral code'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update referral status after user registration
exports.updateReferralStatus = async (req, res) => {
  try {
    const { referralCode, newUserId } = req.body;

    const referral = await Referral.findOneAndUpdate(
      { referralCode },
      {
        referredUser: newUserId,
        status: 'joined',
        joinedAt: Date.now()
      },
      { new: true }
    );

    if (referral) {
      // Add reward to referrer's wallet
      const referrer = await User.findById(referral.referrer);
      referrer.walletBalance += 500; // 500 reward points
      await referrer.save();

      // ✅ ADDED: Notification for referral joined and reward earned
      try {
        // Get the new user's info
        const newUser = await User.findById(newUserId);
        
        // Notify referrer that someone joined using their link
        await Notification.create({
          user: referral.referrer,
          type: 'referral_joined',
          title: 'Friend Joined!',
          message: `${newUser?.fullName || newUser?.username || 'Someone'} joined using your referral link!`,
          relatedEntity: {
            entityType: 'user',
            entityId: newUserId
          }
        });

        // Notify referrer about reward earned
        await Notification.create({
          user: referral.referrer,
          type: 'reward_earned',
          title: 'Reward Earned! 🎁',
          message: `You earned 500 points for referring ${newUser?.fullName || newUser?.username || 'a friend'}!`,
          relatedEntity: {
            entityType: 'user',
            entityId: newUserId
          }
        });
      } catch (notifyError) {
        console.log('Referral notification error:', notifyError.message);
      }
    }

    res.json({
      success: true,
      message: 'Referral status updated',
      referral
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};