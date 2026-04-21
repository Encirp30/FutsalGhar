const Court = require('../models/Court');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const User = require('../models/User');

// Get all courts with filters
exports.getAllCourts = async (req, res) => {
  try {
    const { type, city, minPrice, maxPrice, search, page = 1, limit = 10 } = req.query;

    let filter = { status: 'open' };

    if (type) filter.type = type;
    if (city) filter['location.city'] = city;
    if (minPrice || maxPrice) {
      filter.pricePerHour = {};
      if (minPrice) filter.pricePerHour.$gte = minPrice;
      if (maxPrice) filter.pricePerHour.$lte = maxPrice;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'location.address': { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const courts = await Court.find(filter)
      .populate('owner', 'fullName phone')
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Court.countDocuments(filter);

    res.json({
      success: true,
      data: courts,
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

// Get single court with availability
exports.getCourtById = async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    const court = await Court.findById(id).populate('owner', 'fullName phone email');

    if (!court) {
      return res.status(404).json({
        success: false,
        message: 'Court not found'
      });
    }

    // Get available time slots
    let availability = [];

    if (date) {
      const bookings = await Booking.find({
        court: id,
        date: new Date(date),
        status: { $ne: 'cancelled' }
      }).select('startTime endTime');

      // Generate all time slots (9 AM to 9 PM)
      availability = generateTimeSlots(court.openingTime, court.closingTime, bookings);
    }

    res.json({
      success: true,
      court,
      availability
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create court (for managers)
exports.createCourt = async (req, res) => {
  try {
    const {
      name, description, type, location, images, facilities,
      pricePerHour, openingTime, closingTime
    } = req.body;

    const court = new Court({
      name,
      description,
      type,
      location,
      images,
      facilities,
      pricePerHour,
      openingTime,
      closingTime,
      owner: req.userId
    });

    await court.save();

    // NOTIFICATION: Notify manager that court was created
    try {
      await Notification.create({
        user: req.userId,
        type: 'court_created',
        title: 'Court Created',
        message: `Your court "${name}" has been created successfully.`,
        relatedEntity: {
          entityType: 'court',
          entityId: court._id
        }
      });

      // Notify all admins about new court
      const admins = await User.find({ role: 'admin' });
      for (const admin of admins) {
        await Notification.create({
          user: admin._id,
          type: 'new_court_created',
          title: 'New Court Created',
          message: `A new court "${name}" has been created by ${req.userId}`,
          relatedEntity: {
            entityType: 'court',
            entityId: court._id
          }
        });
      }
    } catch (notifyError) {
      console.log('Notification error:', notifyError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Court created successfully',
      court
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update court (for managers and admins)
exports.updateCourt = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const court = await Court.findById(id);

    if (!court) {
      return res.status(404).json({
        success: false,
        message: 'Court not found'
      });
    }

    // Check if user is admin OR the court owner
    const isAdmin = req.userRole === 'admin';
    const isOwner = court.owner.toString() === req.userId.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this court'
      });
    }

    // Check if status is being updated
    const oldStatus = court.status;
    const newStatus = updates.status;

    Object.keys(updates).forEach(key => {
      if (key !== 'owner') {
        court[key] = updates[key];
      }
    });

    court.updatedAt = Date.now();
    await court.save();

    // Notify manager if court status changed
    if (oldStatus && newStatus && oldStatus !== newStatus) {
      try {
        await Notification.create({
          user: court.owner,
          type: 'court_status_updated',
          title: 'Court Status Updated',
          message: `Your court "${court.name}" is now ${newStatus === 'open' ? 'Open' : 'Closed'}.`,
          relatedEntity: {
            entityType: 'court',
            entityId: court._id
          }
        });
      } catch (notifyError) {
        console.log('Notification error:', notifyError.message);
      }
    }

    res.json({
      success: true,
      message: 'Court updated successfully',
      court
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get manager's courts (or all courts for admin)
exports.getManagerCourts = async (req, res) => {
  try {
    let courts;
    
    // If admin, return all courts
    if (req.userRole === 'admin') {
      courts = await Court.find().populate('owner', 'fullName phone');
    } else {
      // If manager, return only their courts
      courts = await Court.find({ owner: req.userId }).populate('owner', 'fullName phone');
    }

    res.json({
      success: true,
      courts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Block time slot
exports.blockTimeSlot = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, startTime, endTime, reason } = req.body;

    const court = await Court.findById(id);

    if (!court) {
      return res.status(404).json({
        success: false,
        message: 'Court not found'
      });
    }

    // Create a blocked booking
    const booking = new Booking({
      court: id,
      player: null,
      date,
      startTime,
      endTime,
      duration: calculateDuration(startTime, endTime),
      pricePerHour: 0,
      totalCost: 0,
      paymentStatus: 'completed',
      status: 'blocked',
      notes: `Blocked: ${reason}`
    });

    await booking.save();

    res.json({
      success: true,
      message: 'Time slot blocked successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.deleteCourt = async (req, res) => {
  try {
    const { id } = req.params;
    const court = await Court.findById(id);

    if (!court) {
      return res.status(404).json({
        success: false,
        message: 'Court not found'
      });
    }

    // Check if user is admin OR the court owner
    const isAdmin = req.userRole === 'admin';
    const isOwner = court.owner.toString() === req.userId.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this court'
      });
    }

    const courtName = court.name;
    await Court.findByIdAndDelete(id);

    // Notify manager that court was deleted
    try {
      await Notification.create({
        user: court.owner,
        type: 'court_deleted',
        title: 'Court Deleted',
        message: `Your court "${courtName}" has been deleted.`,
        relatedEntity: {
          entityType: 'court',
          entityId: id
        }
      });

      // Notify all admins about court deletion
      const admins = await User.find({ role: 'admin' });
      for (const admin of admins) {
        await Notification.create({
          user: admin._id,
          type: 'court_deleted',
          title: 'Court Deleted',
          message: `Court "${courtName}" has been deleted.`,
          relatedEntity: {
            entityType: 'court',
            entityId: id
          }
        });
      }
    } catch (notifyError) {
      console.log('Notification error:', notifyError.message);
    }

    res.json({
      success: true,
      message: 'Court deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all courts for manager (including closed courts)
exports.getAllCourtsForManager = async (req, res) => {
  try {
    const courts = await Court.find().populate('owner', 'fullName phone');
    
    res.json({
      success: true,
      data: courts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Helper function to generate time slots
function generateTimeSlots(openingTime, closingTime, bookings) {
  const slots = [];
  const [openHour, openMin] = openingTime.split(':').map(Number);
  const [closeHour, closeMin] = closingTime.split(':').map(Number);

  let currentHour = openHour;
  let currentMin = openMin;

  while (currentHour < closeHour || (currentHour === closeHour && currentMin < closeMin)) {
    const startTime = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
    currentHour = currentMin === 30 ? currentHour + 1 : currentHour;
    currentMin = currentMin === 30 ? 0 : 30;
    const endTime = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;

    // Check if slot is booked
    const isBooked = bookings.some(b => 
      (b.startTime <= startTime && startTime < b.endTime)
    );

    slots.push({
      startTime,
      endTime,
      isAvailable: !isBooked
    });
  }

  return slots;
}

// Helper function to calculate duration
function calculateDuration(startTime, endTime) {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  const startTotalMin = startHour * 60 + startMin;
  const endTotalMin = endHour * 60 + endMin;

  return (endTotalMin - startTotalMin) / 60;
}