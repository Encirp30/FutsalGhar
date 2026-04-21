const User = require('../models/User');
const Court = require('../models/Court');
const Booking = require('../models/Booking');
const Tournament = require('../models/Tournament');
const Transaction = require('../models/Transaction');
const WithdrawalRequest = require('../models/WithdrawalRequest');

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const { role, page = 1, limit = 10 } = req.query;

    let filter = {};

    if (role) filter.role = role;

    const skip = (page - 1) * limit;

    const users = await User.find(filter)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      users,
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

// Update user role
exports.updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const user = await User.findByIdAndUpdate(id, { role }, { new: true });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User role updated',
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Disable user account
exports.disableUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndUpdate(id, { isActive: false }, { new: true });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User account disabled',
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Enable user account
exports.enableUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndUpdate(id, { isActive: true }, { new: true });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User account enabled',
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Assign court to manager
exports.assignCourtToManager = async (req, res) => {
  try {
    const { courtId, managerId } = req.body;

    const court = await Court.findByIdAndUpdate(courtId, { owner: managerId }, { new: true });

    if (!court) {
      return res.status(404).json({
        success: false,
        message: 'Court not found'
      });
    }

    res.json({
      success: true,
      message: 'Court assigned to manager',
      court
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all courts
exports.getAllCourts = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;

    const courts = await Court.find()
      .populate('owner', 'fullName email phone')
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Court.countDocuments();

    res.json({
      success: true,
      courts,
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

// Delete court
exports.deleteCourt = async (req, res) => {
  try {
    const { id } = req.params;

    const court = await Court.findByIdAndDelete(id);

    if (!court) {
      return res.status(404).json({
        success: false,
        message: 'Court not found'
      });
    }

    res.json({
      success: true,
      message: 'Court deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get system statistics
exports.getSystemStatistics = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalManagers = await User.countDocuments({ role: 'manager' });
    const totalPlayers = await User.countDocuments({ role: 'user' });
    const totalCourts = await Court.countDocuments();
    const totalBookings = await Booking.countDocuments();
    const totalTournaments = await Tournament.countDocuments();

    const totalRevenue = await Booking.aggregate([
      { $match: { paymentStatus: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalCost' } } }
    ]);

    const recentBookings = await Booking.find({ paymentStatus: 'completed' })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      statistics: {
        totalUsers,
        totalManagers,
        totalPlayers,
        totalCourts,
        totalBookings,
        totalTournaments,
        totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
        recentBookings
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all transactions
exports.getAllTransactions = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    let filter = {};

    if (status) filter.status = status;

    const skip = (page - 1) * limit;

    const transactions = await Transaction.find(filter)
      .populate('user', 'fullName email')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Transaction.countDocuments(filter);

    res.json({
      success: true,
      transactions,
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

// Get withdrawal requests
exports.getWithdrawalRequests = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    let filter = {};

    if (status) filter.status = status;

    const skip = (page - 1) * limit;

    const requests = await WithdrawalRequest.find(filter)
      .populate('manager', 'fullName email phone')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await WithdrawalRequest.countDocuments(filter);

    res.json({
      success: true,
      requests,
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

// Approve withdrawal request
exports.approveWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const request = await WithdrawalRequest.findByIdAndUpdate(
      id,
      {
        status: 'approved',
        approvedBy: req.userId,
        approvalDate: Date.now(),
        approvalNotes: notes
      },
      { new: true }
    );

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal request not found'
      });
    }

    res.json({
      success: true,
      message: 'Withdrawal request approved',
      request
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Reject withdrawal request
exports.rejectWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const request = await WithdrawalRequest.findByIdAndUpdate(
      id,
      {
        status: 'rejected',
        rejectionReason: reason,
        rejectedAt: Date.now()
      },
      { new: true }
    );

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal request not found'
      });
    }

    res.json({
      success: true,
      message: 'Withdrawal request rejected',
      request
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get revenue report
exports.getRevenueReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const filter = {
      paymentStatus: 'completed',
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    const dailyRevenue = await Booking.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$totalCost' },
          bookings: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const totalRevenue = dailyRevenue.reduce((sum, day) => sum + day.revenue, 0);

    res.json({
      success: true,
      report: {
        totalRevenue,
        dailyRevenue
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete user account - Admin only
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Prevent admin from deleting themselves
    if (user._id.toString() === req.userId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }
    
    await user.deleteOne();
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all bookings across all courts
exports.getAllBookings = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    let filter = {};

    if (status && status !== 'all') {
      if (status === 'upcoming') {
        filter.date = { $gte: new Date() };
        filter.status = { $ne: 'cancelled' };
      } else if (status === 'completed') {
        filter.status = 'completed';
      } else if (status === 'cancelled') {
        filter.status = 'cancelled';
      }
    }

    const skip = (page - 1) * limit;

    const bookings = await Booking.find(filter)
      .populate('court', 'name location')
      .populate('player', 'username email profile.fullName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Booking.countDocuments(filter);

    // Calculate total revenue from completed bookings
    const totalRevenue = await Booking.aggregate([
      { $match: { paymentStatus: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalCost' } } }
    ]);

    res.json({
      success: true,
      bookings,
      totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: parseInt(page)
      }
    });
  } catch (error) {
    console.error('Get all bookings error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};