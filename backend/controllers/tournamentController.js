const Tournament = require('../models/Tournament');
const Team = require('../models/Team');
const Match = require('../models/Match');
const User = require('../models/User');
const Notification = require('../models/Notification');

// Create tournament
exports.createTournament = async (req, res) => {
  try {
    const {
      name, description, venue, startDate, endDate, format,
      maxTeams, priceDistribution, entryFee, rulesDescription
    } = req.body;

    const tournament = new Tournament({
      name,
      description,
      venue,
      startDate,
      endDate,
      format: format || 'knockout',
      maxTeams,
      priceDistribution,
      entryFee: entryFee || 0,
      rulesDescription,
      organizer: req.userId,
      status: 'registration_open'
    });

    await tournament.save();

    res.status(201).json({
      success: true,
      message: 'Tournament created successfully',
      tournament
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all tournaments
exports.getAllTournaments = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    let filter = {};

    if (status) filter.status = status;

    const skip = (page - 1) * limit;

    const tournaments = await Tournament.find(filter)
      .populate('organizer', 'fullName email')
      .populate('registeredTeams.team', 'name captain')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ startDate: -1 });

    const total = await Tournament.countDocuments(filter);

    res.json({
      success: true,
      tournaments,
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

// Get tournament details
exports.getTournamentById = async (req, res) => {
  try {
    const { id } = req.params;

    const tournament = await Tournament.findById(id)
      .populate('organizer', 'fullName email phone')
      .populate('registeredTeams.team', 'name captain players')
      .populate('matches')
      .populate('winner runnerUp thirdPlace', 'name');

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    res.json({
      success: true,
      tournament
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Register team for tournament
exports.registerTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const { teamId } = req.body;

    const tournament = await Tournament.findById(id);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    if (tournament.status !== 'registration_open') {
      return res.status(400).json({
        success: false,
        message: 'Registration is closed for this tournament'
      });
    }

    // Check if already registered
    const isRegistered = tournament.registeredTeams.some(
      rt => rt.team.toString() === teamId
    );

    if (isRegistered) {
      return res.status(400).json({
        success: false,
        message: 'Team is already registered'
      });
    }

    const team = await Team.findById(teamId);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Verify team captain
    if (team.captain.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only team captain can register'
      });
    }

    // Check if max teams reached
    if (tournament.registeredTeams.length >= tournament.maxTeams) {
      return res.status(400).json({
        success: false,
        message: 'Tournament is full'
      });
    }

    // Add team to tournament
    tournament.registeredTeams.push({
      team: teamId,
      status: 'approved'
    });

    await tournament.save();

    // Notify team
    await Notification.create({
      user: req.userId,
      type: 'tournament_registration_approved',
      title: 'Tournament Registration Confirmed',
      message: `Your team has been registered for ${tournament.name}`,
      relatedEntity: {
        entityType: 'tournament',
        entityId: tournament._id
      }
    });

    res.json({
      success: true,
      message: 'Team registered successfully',
      tournament
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update tournament status
exports.updateTournamentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const tournament = await Tournament.findById(id);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    tournament.status = status;
    tournament.updatedAt = Date.now();

    await tournament.save();

    res.json({
      success: true,
      message: 'Tournament status updated',
      tournament
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Declare winner
exports.declareWinner = async (req, res) => {
  try {
    const { id } = req.params;
    const { winnerId, runnerUpId, thirdPlaceId } = req.body;

    const tournament = await Tournament.findById(id);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    tournament.winner = winnerId;
    tournament.runnerUp = runnerUpId;
    tournament.thirdPlace = thirdPlaceId;
    tournament.status = 'completed';

    await tournament.save();

    res.json({
      success: true,
      message: 'Winner declared',
      tournament
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get team tournaments
exports.getTeamTournaments = async (req, res) => {
  try {
    const { teamId } = req.query;

    const tournaments = await Tournament.find({
      'registeredTeams.team': teamId
    })
      .populate('organizer', 'fullName')
      .populate('winner runnerUp', 'name');

    res.json({
      success: true,
      tournaments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
