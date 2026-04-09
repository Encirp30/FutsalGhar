const Booking = require('../models/Booking');
const Court = require('../models/Court');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const WithdrawalRequest = require('../models/WithdrawalRequest');
const Notification = require('../models/Notification');

// Get manager's bookings
exports.getManagerBookings = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    // Get all courts owned by manager
    const courts = await Court.find({ owner: req.userId }).select('_id');
    const courtIds = courts.map(c => c._id);

    let filter = { court: { $in: courtIds } };

    if (status) filter.status = status;

    const skip = (page - 1) * limit;

    const bookings = await Booking.find(filter)
      .populate('court', 'name')
      .populate('player', 'fullName email phone')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ date: -1 });

    const total = await Booking.countDocuments(filter);

    res.json({
      success: true,
      bookings,
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

// Confirm booking
exports.confirmBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id).populate('court');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Verify ownership
    const court = booking.court;
    if (court.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to confirm this booking'
      });
    }

    booking.status = 'confirmed';
    await booking.save();

    res.json({
      success: true,
      message: 'Booking confirmed',
      booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Mark booking as completed
exports.completeBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id).populate('court');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Verify ownership
    if (booking.court.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to complete this booking'
      });
    }

    booking.status = 'completed';
    await booking.save();

    // Create transaction record
    await Transaction.create({
      user: booking.court.owner,
      type: 'booking',
      amount: booking.totalCost,
      paymentMethod: booking.paymentMethod,
      status: 'completed',
      reference: {
        referenceType: 'booking',
        referenceId: booking._id
      },
      description: `Booking payment for court ${booking.court.name}`
    });

    // Add to manager's wallet
    const manager = await User.findById(req.userId);
    manager.walletBalance += booking.totalCost;
    await manager.save();

    res.json({
      success: true,
      message: 'Booking marked as completed',
      booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get manager revenue
exports.getManagerRevenue = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Get all courts owned by manager
    const courts = await Court.find({ owner: req.userId }).select('_id');
    const courtIds = courts.map(c => c._id);

    const filter = {
      court: { $in: courtIds },
      status: 'completed',
      paymentStatus: 'completed'
    };

    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const bookings = await Booking.find(filter);

    const totalRevenue = bookings.reduce((sum, b) => sum + b.totalCost, 0);
    const totalBookings = bookings.length;

    // Calculate daily revenue
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

    res.json({
      success: true,
      revenue: {
        totalRevenue,
        totalBookings,
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

// Get manager wallet
exports.getManagerWallet = async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    res.json({
      success: true,
      wallet: {
        balance: user.walletBalance,
        totalEarnings: user.walletBalance // Can be enhanced to track separately
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Request withdrawal
exports.requestWithdrawal = async (req, res) => {
  try {
    const { amount, bankAccount, accountHolder, bankName, bankCode } = req.body;

    const user = await User.findById(req.userId);

    if (user.walletBalance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient wallet balance'
      });
    }

    const request = new WithdrawalRequest({
      manager: req.userId,
      amount,
      bankAccount: {
        accountNumber: bankAccount,
        accountHolder,
        bankName,
        bankCode
      }
    });

    await request.save();

    res.status(201).json({
      success: true,
      message: 'Withdrawal request submitted',
      request
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
    const requests = await WithdrawalRequest.find({ manager: req.userId })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      requests
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get transaction history
exports.getTransactionHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;

    const transactions = await Transaction.find({ user: req.userId })
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Transaction.countDocuments({ user: req.userId });

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

// Get court utilization rate
exports.getCourtUtilization = async (req, res) => {
  try {
    const { courtId, startDate, endDate } = req.query;

    const court = await Court.findById(courtId);

    if (!court) {
      return res.status(404).json({
        success: false,
        message: 'Court not found'
      });
    }

    // Verify ownership
    if (court.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this court'
      });
    }

    const filter = {
      court: courtId,
      status: { $ne: 'cancelled' }
    };

    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const bookings = await Booking.find(filter);

    // Calculate utilization percentage
    const [openHour, openMin] = court.openingTime.split(':').map(Number);
    const [closeHour, closeMin] = court.closingTime.split(':').map(Number);

    const totalHours = (closeHour - openHour) + ((closeMin - openMin) / 60);
    const bookedHours = bookings.reduce((sum, b) => sum + b.duration, 0);
    const utilizationRate = ((bookedHours / totalHours) * 100).toFixed(2);

    res.json({
      success: true,
      utilization: {
        utilizationRate,
        totalHours,
        bookedHours,
        totalBookings: bookings.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
