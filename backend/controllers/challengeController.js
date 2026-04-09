const TeamChallenge = require('../models/TeamChallenge');
const Team = require('../models/Team');
const Match = require('../models/Match');
const Notification = require('../models/Notification');
const User = require('../models/User');

// Send challenge
exports.sendChallenge = async (req, res) => {
  try {
    const { challengedTeamId, proposedDate, proposedStartTime, proposedEndTime, preferredCourt, message } = req.body;

    // Get user's team
    const userTeam = await Team.findOne({ captain: req.userId });

    if (!userTeam) {
      return res.status(400).json({
        success: false,
        message: 'You must be a team captain to send challenges'
      });
    }

    const challenge = new TeamChallenge({
      challengingTeam: userTeam._id,
      challengedTeam: challengedTeamId,
      proposedDate,
      proposedStartTime,
      proposedEndTime,
      preferredCourt,
      message,
      status: 'pending'
    });

    await challenge.save();

    // Notify challenged team captain
    const challengedTeam = await Team.findById(challengedTeamId);
    const challengedCaptain = await User.findById(challengedTeam.captain);

    await Notification.create({
      user: challengedTeam.captain,
      type: 'challenge_received',
      title: 'Team Challenge Received',
      message: `${userTeam.name} has challenged your team to a match`,
      relatedEntity: {
        entityType: 'challenge',
        entityId: challenge._id
      }
    });

    res.status(201).json({
      success: true,
      message: 'Challenge sent successfully',
      challenge
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get incoming challenges
exports.getIncomingChallenges = async (req, res) => {
  try {
    const userTeam = await Team.findOne({ captain: req.userId });

    if (!userTeam) {
      return res.status(400).json({
        success: false,
        message: 'No team found'
      });
    }

    const challenges = await TeamChallenge.find({ challengedTeam: userTeam._id })
      .populate('challengingTeam', 'name captain')
      .populate('challengingTeam.captain', 'fullName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      challenges
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get outgoing challenges
exports.getOutgoingChallenges = async (req, res) => {
  try {
    const userTeam = await Team.findOne({ captain: req.userId });

    if (!userTeam) {
      return res.status(400).json({
        success: false,
        message: 'No team found'
      });
    }

    const challenges = await TeamChallenge.find({ challengingTeam: userTeam._id })
      .populate('challengedTeam', 'name captain')
      .populate('challengedTeam.captain', 'fullName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      challenges
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Accept challenge
exports.acceptChallenge = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, startTime, endTime } = req.body;

    const challenge = await TeamChallenge.findById(id);

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    const userTeam = await Team.findOne({ captain: req.userId });

    if (!userTeam || userTeam._id.toString() !== challenge.challengedTeam.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to accept this challenge'
      });
    }

    // Create match
    const match = new Match({
      teamA: challenge.challengingTeam,
      teamB: challenge.challengedTeam,
      court: challenge.preferredCourt,
      scheduledDate: date || challenge.proposedDate,
      startTime: startTime || challenge.proposedStartTime,
      endTime: endTime || challenge.proposedEndTime,
      status: 'scheduled'
    });

    await match.save();

    // Update challenge
    challenge.status = 'accepted';
    challenge.match = match._id;
    challenge.respondedAt = Date.now();
    challenge.respondedBy = req.userId;

    await challenge.save();

    // Notify challenging team
    const challengingTeam = await Team.findById(challenge.challengingTeam);
    await Notification.create({
      user: challengingTeam.captain,
      type: 'challenge_accepted',
      title: 'Challenge Accepted',
      message: `${userTeam.name} has accepted your challenge`,
      relatedEntity: {
        entityType: 'challenge',
        entityId: challenge._id
      }
    });

    res.json({
      success: true,
      message: 'Challenge accepted and match scheduled',
      match
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Reject challenge
exports.rejectChallenge = async (req, res) => {
  try {
    const { id } = req.params;

    const challenge = await TeamChallenge.findById(id);

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    const userTeam = await Team.findOne({ captain: req.userId });

    if (!userTeam || userTeam._id.toString() !== challenge.challengedTeam.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to reject this challenge'
      });
    }

    challenge.status = 'rejected';
    challenge.respondedAt = Date.now();
    challenge.respondedBy = req.userId;

    await challenge.save();

    // Notify challenging team
    const challengingTeam = await Team.findById(challenge.challengingTeam);
    await Notification.create({
      user: challengingTeam.captain,
      type: 'challenge_rejected',
      title: 'Challenge Rejected',
      message: `${userTeam.name} has rejected your challenge`,
      relatedEntity: {
        entityType: 'challenge',
        entityId: challenge._id
      }
    });

    res.json({
      success: true,
      message: 'Challenge rejected'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Propose alternative dates
exports.proposeAlternativeDates = async (req, res) => {
  try {
    const { id } = req.params;
    const { dates } = req.body; // Array of {date, startTime, endTime}

    const challenge = await TeamChallenge.findById(id);

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    challenge.alternativeDates = dates;
    await challenge.save();

    res.json({
      success: true,
      message: 'Alternative dates proposed'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Cancel challenge
exports.cancelChallenge = async (req, res) => {
  try {
    const { id } = req.params;

    const challenge = await TeamChallenge.findById(id);

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    const userTeam = await Team.findOne({ captain: req.userId });

    if (!userTeam || userTeam._id.toString() !== challenge.challengingTeam.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this challenge'
      });
    }

    challenge.status = 'cancelled';
    await challenge.save();

    res.json({
      success: true,
      message: 'Challenge cancelled'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
