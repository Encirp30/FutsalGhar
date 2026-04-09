const Match = require('../models/Match');
const Team = require('../models/Team');
const Tournament = require('../models/Tournament');
const User = require('../models/User');
const Notification = require('../models/Notification');

// Create match
exports.createMatch = async (req, res) => {
  try {
    const {
      tournament, teamA, teamB, court, scheduledDate,
      startTime, endTime
    } = req.body;

    const match = new Match({
      tournament,
      teamA,
      teamB,
      court,
      scheduledDate,
      startTime,
      endTime,
      status: 'scheduled'
    });

    await match.save();

    // Add match to tournament
    if (tournament) {
      await Tournament.findByIdAndUpdate(tournament, {
        $push: { matches: match._id }
      });
    }

    // ✅ ADDED: Notify both teams about scheduled match
    try {
      const teamAData = await Team.findById(teamA).populate('captain');
      const teamBData = await Team.findById(teamB).populate('captain');

      if (teamAData && teamAData.captain) {
        await Notification.create({
          user: teamAData.captain._id,
          type: 'match_scheduled',
          title: 'Match Scheduled',
          message: `Your team ${teamAData.name} has a match against ${teamBData?.name || 'opponent'} on ${new Date(scheduledDate).toLocaleDateString()}`,
          relatedEntity: {
            entityType: 'match',
            entityId: match._id
          }
        });
      }

      if (teamBData && teamBData.captain) {
        await Notification.create({
          user: teamBData.captain._id,
          type: 'match_scheduled',
          title: 'Match Scheduled',
          message: `Your team ${teamBData.name} has a match against ${teamAData?.name || 'opponent'} on ${new Date(scheduledDate).toLocaleDateString()}`,
          relatedEntity: {
            entityType: 'match',
            entityId: match._id
          }
        });
      }
    } catch (notifyError) {
      console.log('Match schedule notification error:', notifyError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Match created successfully',
      match
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all matches
exports.getAllMatches = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    let filter = {};

    if (status) filter.status = status;

    const skip = (page - 1) * limit;

    const matches = await Match.find(filter)
      .populate('tournament', 'name')
      .populate('teamA', 'name')
      .populate('teamB', 'name')
      .populate('court', 'name location')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ scheduledDate: -1 });

    const total = await Match.countDocuments(filter);

    res.json({
      success: true,
      matches,
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

// Get match details
exports.getMatchById = async (req, res) => {
  try {
    const { id } = req.params;

    const match = await Match.findById(id)
      .populate('tournament', 'name')
      .populate('teamA', 'name players')
      .populate('teamB', 'name players')
      .populate('court', 'name location')
      .populate('goalScorers.player', 'fullName')
      .populate('goalScorers.assistBy', 'fullName')
      .populate('cards.player', 'fullName')
      .populate('playerRatings.player', 'fullName')
      .populate('manOfTheMatch', 'fullName');

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    res.json({
      success: true,
      match
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update match result
exports.updateMatchResult = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      teamAScore, teamBScore, goalScorers, cards, playerRatings,
      manOfTheMatch, teamAFormation, teamBFormation, resultType, penaltyDetails
    } = req.body;

    const match = await Match.findById(id);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    // Update match results
    match.teamAScore = teamAScore;
    match.teamBScore = teamBScore;
    match.goalScorers = goalScorers || [];
    match.cards = cards || [];
    match.playerRatings = playerRatings || [];
    match.manOfTheMatch = manOfTheMatch;
    match.teamAFormation = teamAFormation;
    match.teamBFormation = teamBFormation;
    match.resultType = resultType || 'regular_time';

    if (resultType === 'penalties') {
      match.penaltyDetails = penaltyDetails;
    }

    match.status = 'completed';
    match.resultEnteredBy = req.userId;

    await match.save();

    // Update team statistics
    const teamA = await Team.findById(match.teamA);
    const teamB = await Team.findById(match.teamB);

    teamA.totalMatches += 1;
    teamB.totalMatches += 1;

    if (teamAScore > teamBScore) {
      teamA.wins += 1;
      teamB.losses += 1;
    } else if (teamBScore > teamAScore) {
      teamB.wins += 1;
      teamA.losses += 1;
    } else {
      teamA.draws += 1;
      teamB.draws += 1;
    }

    teamA.goalsFor += teamAScore;
    teamA.goalsAgainst += teamBScore;
    teamB.goalsFor += teamBScore;
    teamB.goalsAgainst += teamAScore;

    await teamA.save();
    await teamB.save();

    // ✅ ADDED: Notify both teams about match result
    try {
      const winner = teamAScore > teamBScore ? teamA : (teamBScore > teamAScore ? teamB : null);
      const resultMessage = winner 
        ? `${winner.name} won the match ${teamAScore} - ${teamBScore}`
        : `Match ended in a draw ${teamAScore} - ${teamBScore}`;

      if (teamA && teamA.captain) {
        await Notification.create({
          user: teamA.captain,
          type: 'match_result',
          title: 'Match Result Updated',
          message: resultMessage,
          relatedEntity: {
            entityType: 'match',
            entityId: match._id
          }
        });
      }

      if (teamB && teamB.captain) {
        await Notification.create({
          user: teamB.captain,
          type: 'match_result',
          title: 'Match Result Updated',
          message: resultMessage,
          relatedEntity: {
            entityType: 'match',
            entityId: match._id
          }
        });
      }
    } catch (notifyError) {
      console.log('Match result notification error:', notifyError.message);
    }

    res.json({
      success: true,
      message: 'Match result updated successfully',
      match
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get team matches
exports.getTeamMatches = async (req, res) => {
  try {
    const { teamId, status } = req.query;

    let filter = {
      $or: [
        { teamA: teamId },
        { teamB: teamId }
      ]
    };

    if (status) filter.status = status;

    const matches = await Match.find(filter)
      .populate('teamA', 'name')
      .populate('teamB', 'name')
      .populate('court', 'name')
      .sort({ scheduledDate: -1 });

    res.json({
      success: true,
      matches
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get player statistics
exports.getPlayerStatistics = async (req, res) => {
  try {
    const { playerId } = req.query;

    // Find all matches where player played
    const matches = await Match.find({
      $or: [
        { 'goalScorers.player': playerId },
        { 'cards.player': playerId },
        { 'playerRatings.player': playerId }
      ]
    });

    let stats = {
      totalMatches: 0,
      goals: 0,
      assists: 0,
      yellowCards: 0,
      redCards: 0,
      manOfTheMatch: 0,
      averageRating: 0
    };

    let totalRating = 0;
    let ratingCount = 0;

    matches.forEach(match => {
      // Count goals
      stats.goals += match.goalScorers.filter(g => g.player.toString() === playerId).length;

      // Count assists
      stats.assists += match.goalScorers.filter(a => a.assistBy?.toString() === playerId).length;

      // Count cards
      const playerCards = match.cards.filter(c => c.player.toString() === playerId);
      stats.yellowCards += playerCards.filter(c => c.cardType === 'yellow').length;
      stats.redCards += playerCards.filter(c => c.cardType === 'red').length;

      // Check if man of match
      if (match.manOfTheMatch?.toString() === playerId) {
        stats.manOfTheMatch += 1;
      }

      // Get ratings
      const rating = match.playerRatings.find(r => r.player.toString() === playerId);
      if (rating) {
        totalRating += rating.rating;
        ratingCount += 1;
      }
    });

    stats.totalMatches = matches.length;
    stats.averageRating = ratingCount > 0 ? (totalRating / ratingCount).toFixed(2) : 0;

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};