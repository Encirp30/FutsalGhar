const Match = require('../models/Match');
const Team = require('../models/Team');
const Tournament = require('../models/Tournament');
const User = require('../models/User');
const Notification = require('../models/Notification');

// Helper function to update player statistics
const updatePlayerStats = async (teamId, playerId, statsToAdd) => {
  if (!playerId) return;
  
  const team = await Team.findById(teamId);
  if (!team) return;
  
  const playerIndex = team.players.findIndex(p => {
    const pId = p.player || p._id;
    return pId && pId.toString() === playerId.toString();
  });
  
  if (playerIndex === -1) return;
  
  const player = team.players[playerIndex];
  
  if (statsToAdd.goals) player.goals = (player.goals || 0) + statsToAdd.goals;
  if (statsToAdd.assists) player.assists = (player.assists || 0) + statsToAdd.assists;
  if (statsToAdd.yellowCards) player.yellowCards = (player.yellowCards || 0) + statsToAdd.yellowCards;
  if (statsToAdd.redCards) player.redCards = (player.redCards || 0) + statsToAdd.redCards;
  if (statsToAdd.matchesPlayed) player.matchesPlayed = (player.matchesPlayed || 0) + statsToAdd.matchesPlayed;
  
  team.markModified('players');
  await team.save();
};

// Helper to extract player ID from various formats
const extractPlayerId = (playerData) => {
  if (!playerData) return null;
  if (typeof playerData === 'string') return playerData;
  if (typeof playerData === 'object') {
    if (playerData._id) return playerData._id;
    if (playerData.id) return playerData.id;
    if (playerData.player) return playerData.player;
  }
  return null;
};

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

    if (tournament) {
      await Tournament.findByIdAndUpdate(tournament, {
        $push: { matches: match._id }
      });
    }

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
// Get match details
exports.getMatchById = async (req, res) => {
  try {
    const { id } = req.params;

    const match = await Match.findById(id)
      .populate('tournament', 'name')
      .populate('teamA', 'name')
      .populate('teamB', 'name')
      .populate('court', 'name location')
      .populate({
        path: 'goalScorers.player',
        select: 'fullName username'
      })
      .populate({
        path: 'goalScorers.assistBy',
        select: 'fullName username'
      })
      .populate({
        path: 'cards.player',
        select: 'fullName username'
      })
      .populate({
        path: 'manOfTheMatch',
        select: 'fullName username'
      });

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

// Update match result (Manual entry by Manager/Admin) - WITH FIXED PLAYER STATS (ALL PLAYERS GET MATCHES PLAYED)
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

    // Check if already completed (don't update stats twice)
    const isNewCompletion = match.status !== 'completed';
    
    // Store team IDs for player stats updates
    const teamAId = match.teamA;
    const teamBId = match.teamB;
    
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
    match.updatedAt = Date.now();

    await match.save();

    // ========== UPDATE PLAYER STATISTICS ==========
    if (isNewCompletion) {
      // Track which players have already had matchesPlayed incremented
      const playersUpdatedForMatches = new Set();
      
      // 1. Update goal scorers (goals + matchesPlayed)
      for (const goal of (goalScorers || [])) {
        const playerId = extractPlayerId(goal.player);
        if (playerId) {
          let teamId = null;
          if (goal.team === 'teamA') teamId = teamAId;
          if (goal.team === 'teamB') teamId = teamBId;
          
          if (teamId) {
            if (!playersUpdatedForMatches.has(playerId.toString())) {
              await updatePlayerStats(teamId, playerId, { matchesPlayed: 1, goals: 1 });
              playersUpdatedForMatches.add(playerId.toString());
            } else {
              await updatePlayerStats(teamId, playerId, { goals: 1 });
            }
          }
        }
        
        // Update assist provider
        const assistId = extractPlayerId(goal.assistBy);
        if (assistId) {
          let teamId = null;
          if (goal.team === 'teamA') teamId = teamAId;
          if (goal.team === 'teamB') teamId = teamBId;
          
          if (teamId) {
            if (!playersUpdatedForMatches.has(assistId.toString())) {
              await updatePlayerStats(teamId, assistId, { matchesPlayed: 1, assists: 1 });
              playersUpdatedForMatches.add(assistId.toString());
            } else {
              await updatePlayerStats(teamId, assistId, { assists: 1 });
            }
          }
        }
      }
      
      // 2. Update cards (cards + matchesPlayed)
      for (const card of (cards || [])) {
        const playerId = extractPlayerId(card.player);
        if (playerId) {
          let teamId = null;
          if (card.team === 'teamA') teamId = teamAId;
          if (card.team === 'teamB') teamId = teamBId;
          
          if (teamId) {
            const statsToAdd = {};
            if (card.cardType === 'yellow') statsToAdd.yellowCards = 1;
            if (card.cardType === 'red') statsToAdd.redCards = 1;
            
            if (!playersUpdatedForMatches.has(playerId.toString())) {
              statsToAdd.matchesPlayed = 1;
              await updatePlayerStats(teamId, playerId, statsToAdd);
              playersUpdatedForMatches.add(playerId.toString());
            } else {
              await updatePlayerStats(teamId, playerId, statsToAdd);
            }
          }
        }
      }
      
      // 3. CRITICAL FIX: ALL players in both teams get matchesPlayed +1
      // Get all players from both teams
      const teamA = await Team.findById(teamAId);
      const teamB = await Team.findById(teamBId);
      
      // Update ALL Team A players
      if (teamA && teamA.players) {
        for (const player of teamA.players) {
          const playerId = extractPlayerId(player.player || player._id);
          if (playerId && !playersUpdatedForMatches.has(playerId.toString())) {
            await updatePlayerStats(teamAId, playerId, { matchesPlayed: 1 });
            playersUpdatedForMatches.add(playerId.toString());
          }
        }
      }
      
      // Update ALL Team B players
      if (teamB && teamB.players) {
        for (const player of teamB.players) {
          const playerId = extractPlayerId(player.player || player._id);
          if (playerId && !playersUpdatedForMatches.has(playerId.toString())) {
            await updatePlayerStats(teamBId, playerId, { matchesPlayed: 1 });
            playersUpdatedForMatches.add(playerId.toString());
          }
        }
      }
    }
    
    // ========== UPDATE TEAM STATISTICS ==========
    const teamA = await Team.findById(teamAId);
    const teamB = await Team.findById(teamBId);

    if (teamA) {
      teamA.totalMatches += 1;
      if (teamAScore > teamBScore) {
        teamA.wins += 1;
      } else if (teamAScore < teamBScore) {
        teamA.losses += 1;
      } else {
        teamA.draws += 1;
      }
      teamA.goalsFor += teamAScore;
      teamA.goalsAgainst += teamBScore;
      await teamA.save();
    }

    if (teamB) {
      teamB.totalMatches += 1;
      if (teamBScore > teamAScore) {
        teamB.wins += 1;
      } else if (teamBScore < teamAScore) {
        teamB.losses += 1;
      } else {
        teamB.draws += 1;
      }
      teamB.goalsFor += teamBScore;
      teamB.goalsAgainst += teamAScore;
      await teamB.save();
    }

    // Send notifications
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
    console.error('Update match result error:', error);
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
      stats.goals += match.goalScorers.filter(g => g.player?.toString() === playerId).length;
      stats.assists += match.goalScorers.filter(a => a.assistBy?.toString() === playerId).length;
      const playerCards = match.cards.filter(c => c.player?.toString() === playerId);
      stats.yellowCards += playerCards.filter(c => c.cardType === 'yellow').length;
      stats.redCards += playerCards.filter(c => c.cardType === 'red').length;
      if (match.manOfTheMatch?.toString() === playerId) {
        stats.manOfTheMatch += 1;
      }
      const rating = match.playerRatings.find(r => r.player?.toString() === playerId);
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

// Delete match (for managers/admins)
exports.deleteMatch = async (req, res) => {
  try {
    const { id } = req.params;
    
    const match = await Match.findById(id);
    
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }
    
    if (match.tournament) {
      await Tournament.findByIdAndUpdate(match.tournament, {
        $pull: { matches: match._id }
      });
    }
    
    await match.deleteOne();
    
    return res.json({
      success: true,
      message: 'Match deleted successfully'
    });
  } catch (error) {
    console.error('Delete match error:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ========== UPGRADED: Scoreboard Webhook Integration with Detailed Events ==========
exports.webhookUpdateMatchResult = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      teamAScore, 
      teamBScore, 
      status, 
      apiKey,
      goalScorers = [],
      cards = [],
      manOfTheMatch = null
    } = req.body;
    
    const validApiKey = process.env.SCOREBOARD_API_KEY || 'futsal_scoreboard_secret_key_2024';
    
    if (!apiKey || apiKey !== validApiKey) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or missing API key'
      });
    }
    
    const match = await Match.findById(id);
    
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }
    
    if (match.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Match is already completed. Cannot update via webhook.'
      });
    }
    
    // Store team IDs for player stats
    const teamAId = match.teamA;
    const teamBId = match.teamB;
    const isNewCompletion = match.status !== 'completed';
    
    if (teamAScore !== undefined) match.teamAScore = teamAScore;
    if (teamBScore !== undefined) match.teamBScore = teamBScore;
    
    // Process goal scorers if provided
    if (goalScorers && goalScorers.length > 0) {
      match.goalScorers = goalScorers.map(g => ({
        player: g.player,
        minute: parseInt(g.minute) || 0,
        assistBy: g.assistBy || null,
        team: g.team
      }));
    }
    
    // Process cards if provided
    if (cards && cards.length > 0) {
      match.cards = cards.map(c => ({
        player: c.player,
        cardType: c.cardType,
        minute: parseInt(c.minute) || 0,
        team: c.team,
        reason: c.reason || ''
      }));
    }
    
    // Process man of the match if provided
    if (manOfTheMatch) {
      match.manOfTheMatch = manOfTheMatch;
    }
    
    const shouldComplete = status === 'completed';
    
    if (shouldComplete) {
      match.status = 'completed';
      match.resultEnteredBy = null;
      match.resultType = 'regular_time';
      match.updatedAt = Date.now();
      
      await match.save();
      
      // ========== UPDATE PLAYER STATISTICS FOR WEBHOOK ==========
      if (isNewCompletion) {
        const playersUpdatedForMatches = new Set();
        
        // Update goal scorers
        for (const goal of (goalScorers || [])) {
          const playerId = extractPlayerId(goal.player);
          if (playerId) {
            let teamId = null;
            if (goal.team === 'teamA') teamId = teamAId;
            if (goal.team === 'teamB') teamId = teamBId;
            
            if (teamId) {
              if (!playersUpdatedForMatches.has(playerId.toString())) {
                await updatePlayerStats(teamId, playerId, { matchesPlayed: 1, goals: 1 });
                playersUpdatedForMatches.add(playerId.toString());
              } else {
                await updatePlayerStats(teamId, playerId, { goals: 1 });
              }
            }
          }
          
          const assistId = extractPlayerId(goal.assistBy);
          if (assistId) {
            let teamId = null;
            if (goal.team === 'teamA') teamId = teamAId;
            if (goal.team === 'teamB') teamId = teamBId;
            
            if (teamId) {
              if (!playersUpdatedForMatches.has(assistId.toString())) {
                await updatePlayerStats(teamId, assistId, { matchesPlayed: 1, assists: 1 });
                playersUpdatedForMatches.add(assistId.toString());
              } else {
                await updatePlayerStats(teamId, assistId, { assists: 1 });
              }
            }
          }
        }
        
        // Update cards
        for (const card of (cards || [])) {
          const playerId = extractPlayerId(card.player);
          if (playerId) {
            let teamId = null;
            if (card.team === 'teamA') teamId = teamAId;
            if (card.team === 'teamB') teamId = teamBId;
            
            if (teamId) {
              const statsToAdd = {};
              if (card.cardType === 'yellow') statsToAdd.yellowCards = 1;
              if (card.cardType === 'red') statsToAdd.redCards = 1;
              
              if (!playersUpdatedForMatches.has(playerId.toString())) {
                statsToAdd.matchesPlayed = 1;
                await updatePlayerStats(teamId, playerId, statsToAdd);
                playersUpdatedForMatches.add(playerId.toString());
              } else {
                await updatePlayerStats(teamId, playerId, statsToAdd);
              }
            }
          }
        }
        
        // CRITICAL FIX: ALL players in both teams get matchesPlayed +1
        const teamA = await Team.findById(teamAId);
        const teamB = await Team.findById(teamBId);
        
        // Update ALL Team A players
        if (teamA && teamA.players) {
          for (const player of teamA.players) {
            const playerId = extractPlayerId(player.player || player._id);
            if (playerId && !playersUpdatedForMatches.has(playerId.toString())) {
              await updatePlayerStats(teamAId, playerId, { matchesPlayed: 1 });
              playersUpdatedForMatches.add(playerId.toString());
            }
          }
        }
        
        // Update ALL Team B players
        if (teamB && teamB.players) {
          for (const player of teamB.players) {
            const playerId = extractPlayerId(player.player || player._id);
            if (playerId && !playersUpdatedForMatches.has(playerId.toString())) {
              await updatePlayerStats(teamBId, playerId, { matchesPlayed: 1 });
              playersUpdatedForMatches.add(playerId.toString());
            }
          }
        }
      }
      
      // Update team statistics
      const teamA = await Team.findById(teamAId);
      const teamB = await Team.findById(teamBId);
      
      if (teamA) {
        teamA.totalMatches += 1;
        if (match.teamAScore > match.teamBScore) {
          teamA.wins += 1;
        } else if (match.teamAScore < match.teamBScore) {
          teamA.losses += 1;
        } else {
          teamA.draws += 1;
        }
        teamA.goalsFor += match.teamAScore;
        teamA.goalsAgainst += match.teamBScore;
        await teamA.save();
      }
      
      if (teamB) {
        teamB.totalMatches += 1;
        if (match.teamBScore > match.teamAScore) {
          teamB.wins += 1;
        } else if (match.teamBScore < match.teamAScore) {
          teamB.losses += 1;
        } else {
          teamB.draws += 1;
        }
        teamB.goalsFor += match.teamBScore;
        teamB.goalsAgainst += match.teamAScore;
        await teamB.save();
      }
      
      // Send notifications
      try {
        const teamAData = await Team.findById(match.teamA).populate('captain');
        const teamBData = await Team.findById(match.teamB).populate('captain');
        
        const resultMessage = match.teamAScore > match.teamBScore 
          ? `${teamAData?.name || 'Team A'} won the match ${match.teamAScore} - ${match.teamBScore}`
          : match.teamBScore > match.teamAScore
          ? `${teamBData?.name || 'Team B'} won the match ${match.teamBScore} - ${match.teamAScore}`
          : `Match ended in a draw ${match.teamAScore} - ${match.teamBScore}`;
        
        if (teamAData && teamAData.captain) {
          await Notification.create({
            user: teamAData.captain._id,
            type: 'match_result',
            title: 'Match Result Updated (Scoreboard)',
            message: resultMessage,
            relatedEntity: {
              entityType: 'match',
              entityId: match._id
            }
          });
        }
        
        if (teamBData && teamBData.captain) {
          await Notification.create({
            user: teamBData.captain._id,
            type: 'match_result',
            title: 'Match Result Updated (Scoreboard)',
            message: resultMessage,
            relatedEntity: {
              entityType: 'match',
              entityId: match._id
            }
          });
        }
      } catch (notifyError) {
        console.log('Webhook match result notification error:', notifyError.message);
      }
    } else {
      match.updatedAt = Date.now();
      await match.save();
    }
    
    res.json({
      success: true,
      message: shouldComplete ? 'Match result updated and completed via webhook' : 'Match scores updated via webhook',
      match: {
        _id: match._id,
        teamAScore: match.teamAScore,
        teamBScore: match.teamBScore,
        status: match.status,
        goalScorers: match.goalScorers,
        cards: match.cards,
        manOfTheMatch: match.manOfTheMatch
      }
    });
    
  } catch (error) {
    console.error('Webhook update match error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};