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

    // Notify all admins about new tournament
    try {
      const admins = await User.find({ role: 'admin' });
      for (const admin of admins) {
        await Notification.create({
          user: admin._id,
          type: 'tournament_created',
          title: 'New Tournament Created',
          message: `A new tournament "${name}" has been created.`,
          relatedEntity: {
            entityType: 'tournament',
            entityId: tournament._id
          }
        });
      }
    } catch (notifyError) {
      console.log('Tournament creation notification error:', notifyError.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Tournament created successfully',
      tournament
    });
  } catch (error) {
    return res.status(500).json({
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

    return res.json({
      success: true,
      tournaments,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: parseInt(page)
      }
    });
  } catch (error) {
    return res.status(500).json({
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

    return res.json({
      success: true,
      tournament
    });
  } catch (error) {
    return res.status(500).json({
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

    // Notify team captain
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

    // Notify tournament organizer (manager) about team registration
    try {
      await Notification.create({
        user: tournament.organizer,
        type: 'team_registered_for_tournament',
        title: 'Team Registered for Tournament',
        message: `Team "${team.name}" has registered for "${tournament.name}".`,
        relatedEntity: {
          entityType: 'tournament',
          entityId: tournament._id
        }
      });
    } catch (notifyError) {
      console.log('Team registration notification error:', notifyError.message);
    }

    return res.json({
      success: true,
      message: 'Team registered successfully',
      tournament
    });
  } catch (error) {
    return res.status(500).json({
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

    return res.json({
      success: true,
      message: 'Tournament status updated',
      tournament
    });
  } catch (error) {
    return res.status(500).json({
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

    return res.json({
      success: true,
      message: 'Winner declared',
      tournament
    });
  } catch (error) {
    return res.status(500).json({
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

    return res.json({
      success: true,
      tournaments
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update tournament details (for managers/admins)
exports.updateTournament = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, description, venue, startDate, endDate, registrationDeadline,
      format, maxTeams, entryFee, priceDistribution, rulesDescription, status
    } = req.body;

    const tournament = await Tournament.findById(id);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    // Only allow updates if tournament is not completed
    if (tournament.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit a completed tournament'
      });
    }

    // Update fields
    if (name !== undefined) tournament.name = name;
    if (description !== undefined) tournament.description = description;
    if (venue !== undefined) tournament.venue = venue;
    if (startDate !== undefined) tournament.startDate = new Date(startDate);
    if (endDate !== undefined) tournament.endDate = new Date(endDate);
    if (registrationDeadline !== undefined) tournament.registrationDeadline = new Date(registrationDeadline);
    if (format !== undefined) tournament.format = format;
    if (maxTeams !== undefined) tournament.maxTeams = maxTeams;
    if (entryFee !== undefined) tournament.entryFee = entryFee;
    if (priceDistribution !== undefined) tournament.priceDistribution = priceDistribution;
    if (rulesDescription !== undefined) tournament.rulesDescription = rulesDescription;
    if (status !== undefined && tournament.status !== 'ongoing') tournament.status = status;

    tournament.updatedAt = Date.now();
    await tournament.save();

    // Notify registered teams about the update
    try {
      for (const registeredTeam of tournament.registeredTeams) {
        const team = await Team.findById(registeredTeam.team);
        if (team && team.captain) {
          await Notification.create({
            user: team.captain,
            type: 'general',
            title: 'Tournament Updated',
            message: `Tournament "${tournament.name}" details have been updated. Please check the new information.`,
            relatedEntity: {
              entityType: 'tournament',
              entityId: tournament._id
            }
          });
        }
      }
    } catch (notifyError) {
      console.log('Tournament update notification error:', notifyError.message);
    }

    return res.json({
      success: true,
      message: 'Tournament updated successfully',
      tournament
    });
  } catch (error) {
    console.error('Update tournament error:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete tournament (for managers/admins)
exports.deleteTournament = async (req, res) => {
  try {
    const { id } = req.params;
    
    const tournament = await Tournament.findById(id);
    
    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }
    
    // Only allow deletion if tournament is not completed or ongoing
    if (tournament.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete a completed tournament'
      });
    }
    
    // Optional: Also delete associated matches? (commented out - decide if you want this)
    // if (tournament.matches && tournament.matches.length > 0) {
    //   await Match.deleteMany({ _id: { $in: tournament.matches } });
    // }
    
    await tournament.deleteOne();
    
    return res.json({
      success: true,
      message: 'Tournament deleted successfully'
    });
  } catch (error) {
    console.error('Delete tournament error:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};