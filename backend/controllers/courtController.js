const Court = require('../models/Court');
const Booking = require('../models/Booking');

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

// Update court (for managers)
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

    // Verify ownership
    if (court.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this court'
      });
    }

    Object.keys(updates).forEach(key => {
      if (key !== 'owner') {
        court[key] = updates[key];
      }
    });

    court.updatedAt = Date.now();
    await court.save();

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

// Get manager's courts
exports.getManagerCourts = async (req, res) => {
  try {
    const courts = await Court.find({ owner: req.userId });

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

// FIXED: Added deleteCourt function
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

    // Verify ownership
    if (court.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this court'
      });
    }

    await Court.findByIdAndDelete(id);

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