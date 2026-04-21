const User = require('../models/User');
const Booking = require('../models/Booking');
const Team = require('../models/Team');
const Match = require('../models/Match');
const Notification = require('../models/Notification');

// ================= DASHBOARD =================
exports.getDashboard = async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    const totalBookings = await Booking.countDocuments({ player: req.userId });

    const upcomingBookings = await Booking.countDocuments({
      player: req.userId,
      date: { $gte: new Date() },
      status: 'confirmed'
    });

    const teams = await Team.countDocuments({
      $or: [
        { captain: req.userId },
        { 'players.player': req.userId }
      ]
    });

    const matches = await Match.countDocuments({
      $or: [
        { 'playerRatings.player': req.userId },
        { 'goalScorers.player': req.userId }
      ]
    });

    const recentBookings = await Booking.find({ player: req.userId })
      .populate('court', 'name location')
      .sort({ createdAt: -1 })
      .limit(5);

    const notifications = await Notification.find({
      user: req.userId,
      isRead: false
    }).limit(5);

    res.json({
      success: true,
      dashboard: {
        user: user.toJSON(),
        statistics: {
          totalBookings,
          upcomingBookings,
          teamsJoined: teams,
          matchesPlayed: matches,
          walletBalance: user.walletBalance
        },
        recentBookings,
        notifications
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= NOTIFICATIONS =================
exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const notifications = await Notification.find({ user: req.userId })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Notification.countDocuments({ user: req.userId });

    res.json({
      success: true,
      notifications,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: parseInt(page)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.markNotificationAsRead = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true, readAt: Date.now() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    res.json({ success: true, notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.markAllNotificationsAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.userId, isRead: false },
      { isRead: true, readAt: Date.now() }
    );

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= STATISTICS =================
exports.getUserStatistics = async (req, res) => {
  try {
    const bookings = await Booking.find({ player: req.userId });

    const totalSpent = bookings.reduce(
      (sum, b) => sum + (b.paymentStatus === 'completed' ? b.totalCost : 0),
      0
    );

    const upcomingBookings = bookings.filter(
      b => b.date >= new Date() && b.status === 'confirmed'
    ).length;

    const pastBookings = bookings.filter(
      b => b.date < new Date() && b.status !== 'cancelled'
    ).length;

    const teamsCreated = await Team.countDocuments({ captain: req.userId });
    const teamsJoined = await Team.countDocuments({ 'players.player': req.userId });

    const matches = await Match.find({ 'playerRatings.player': req.userId });

    let totalGoals = 0, totalAssists = 0, manOfTheMatch = 0, avgRating = 0;
    const ratings = [];

    matches.forEach(match => {
      totalGoals += match.goalScorers.filter(g => g.player.toString() === req.userId).length;
      totalAssists += match.goalScorers.filter(a => a.assistBy?.toString() === req.userId).length;

      if (match.manOfTheMatch?.toString() === req.userId) manOfTheMatch++;

      const rating = match.playerRatings.find(r => r.player.toString() === req.userId);
      if (rating) ratings.push(rating.rating);
    });

    if (ratings.length) {
      avgRating = (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2);
    }

    res.json({
      success: true,
      statistics: {
        bookings: {
          total: bookings.length,
          upcoming: upcomingBookings,
          past: pastBookings,
          cancelled: bookings.filter(b => b.status === 'cancelled').length,
          totalSpent
        },
        teams: { created: teamsCreated, joined: teamsJoined },
        matches: { played: matches.length, goals: totalGoals, assists: totalAssists, manOfTheMatch, avgRating }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= MATCHES =================
exports.getUpcomingMatches = async (req, res) => {
  try {
    const userTeams = await Team.find({
      $or: [
        { captain: req.userId },
        { 'players.player': req.userId }
      ]
    }).select('_id');

    const teamIds = userTeams.map(t => t._id);

    const matches = await Match.find({
      $or: [{ teamA: { $in: teamIds } }, { teamB: { $in: teamIds } }],
      scheduledDate: { $gte: new Date() },
      status: { $ne: 'cancelled' }
    })
      .populate('teamA', 'name')
      .populate('teamB', 'name')
      .populate('court', 'name location')
      .sort({ scheduledDate: 1 });

    res.json({ success: true, matches });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= TRENDS =================
exports.getBookingTrends = async (req, res) => {
  try {
    const { months = 6 } = req.query;

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months));

    const trends = await Booking.aggregate([
      {
        $match: {
          player: require('mongoose').Types.ObjectId(req.userId),
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          bookings: { $sum: 1 },
          revenue: { $sum: '$totalCost' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({ success: true, trends });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= UPDATE PROFILE =================
exports.updateProfile = async (req, res) => {
  try {
    const { profile } = req.body;

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent crash if profile doesn't exist
    if (!user.profile) {
      user.profile = {};
    }

    if (profile) {
      if (profile.fullName !== undefined) user.profile.fullName = profile.fullName;
      if (profile.phone !== undefined) user.profile.phone = profile.phone;
      if (profile.location !== undefined) user.profile.location = profile.location;
      if (profile.bio !== undefined) user.profile.bio = profile.bio;
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: user.toJSON()
    });

  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};