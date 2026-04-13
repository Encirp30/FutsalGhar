const Team = require('../models/Team');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendEmail } = require('../utils/email');

// Create team
exports.createTeam = async (req, res) => {
  try {
    const { name, bio, level, visibility, players: requestPlayers } = req.body;

    // Check if team name already exists
    const existingTeam = await Team.findOne({ name });
    if (existingTeam) {
      return res.status(400).json({
        message: 'Team name already exists'
      });
    }

    // Validate minimum 6 players required
    if (!Array.isArray(requestPlayers) || requestPlayers.length < 6) {
      return res.status(400).json({
        message: 'A team must have a minimum of 6 players.'
      });
    }

    // Validate unique jersey numbers across the team
    if (Array.isArray(requestPlayers) && requestPlayers.length > 0) {
      const jerseyNumbers = requestPlayers
        .map(p => p.jerseyNumber)
        .filter(num => num !== null && num !== undefined && num !== 0);
      
      const uniqueJerseys = new Set(jerseyNumbers);
      if (uniqueJerseys.size !== jerseyNumbers.length) {
        return res.status(400).json({
          message: 'Each player must have a unique jersey number.'
        });
      }
    }

    // Process players array - support both registered users and guest players
    let processedPlayers = [];
    let captainId = req.userId; // Default captain is the authenticated user

    if (Array.isArray(requestPlayers) && requestPlayers.length > 0) {
      processedPlayers = requestPlayers.map((p) => {
        const playerObj = {
          position: p.position ? p.position.toLowerCase() : 'forward',
          jerseyNumber: Number(p.jerseyNumber) || 0,
          isCaptain: p.isCaptain || false,
          isActive: p.isActive !== false // Default to true
        };

        // Validate ObjectId: Check if id is a valid 24-char hex string
        const isValidObjectId = (id) => {
          if (!id || typeof id !== 'string') return false;
          if (id.length !== 24) return false;
          return /^[a-f0-9]{24}$/.test(id);
        };

        // Map id to player field if it's a valid ObjectId, otherwise use name
        const playerId = p.id || p.player;
        if (isValidObjectId(playerId)) {
          playerObj.player = playerId;
          playerObj.name = p.name || 'Player';
        } else {
          playerObj.name = p.name || 'Guest Player';
          playerObj.player = null; // Explicitly set to null for guests
        }

        // Track captain from players array
        if (p.isCaptain) {
          captainId = isValidObjectId(playerId) ? playerId : req.userId;
        }

        return playerObj;
      });
    } else {
      // If no players provided, add the authenticated user as captain
      processedPlayers = [{
        name: 'Captain',
        position: 'forward',
        jerseyNumber: 0,
        isCaptain: true,
        isActive: true,
        player: req.userId
      }];
    }

    const team = new Team({
      name,
      bio,
      level: level || 'recreational',
      visibility: visibility || 'public',
      captain: captainId,
      players: processedPlayers
    });

    await team.save();

    // Update user team count with error handling
    try {
      await User.findByIdAndUpdate(
        req.userId, 
        { $inc: { teamsJoined: 1 } }, 
        { new: true }
      ).catch(err => {
        console.log('User update skipped:', err.message);
      });
    } catch (userError) {
      console.log('User update error:', userError.message);
    }

    // Create notification with error handling
    try {
      await Notification.create({
        user: req.userId,
        type: 'team_created',
        title: 'Team Created',
        message: `Your team "${name}" has been created successfully.`,
        relatedEntity: {
          entityType: 'team',
          entityId: team._id
        }
      });
    } catch (notificationError) {
      console.log('Notification creation skipped:', notificationError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Team created successfully',
      team
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

// Get all public teams
exports.getPublicTeams = async (req, res) => {
  try {
    const { search, level, page = 1, limit = 10 } = req.query;

    let filter = { visibility: 'public' };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } }
      ];
    }

    if (level) filter.level = level;

    const skip = (page - 1) * limit;

    const teams = await Team.find(filter)
      .populate('captain', 'username profile')
      .populate('players.player', 'fullName skillLevel preferredPosition')
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Team.countDocuments(filter);

    res.json({
      success: true,
      data: teams,
      teams,
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

// Get team details
exports.getTeamById = async (req, res) => {
  try {
    const { id } = req.params;

    const team = await Team.findById(id)
      .populate('captain', 'username profile email')
      .populate('players.player', 'fullName skillLevel preferredPosition')
      .populate('joinRequests.player', 'fullName email phone')
      .lean();

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    res.json({
      success: true,
      team
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get user's teams
exports.getUserTeams = async (req, res) => {
  try {
    const teams = await Team.find({
      $or: [
        { captain: req.userId },
        { 'players.player': req.userId }
      ]
    })
      .populate('captain', 'username profile')
      .populate('players.player', 'username profile')
      .lean();

    res.json({
      success: true,
      data: teams,
      teams
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Send join request - FIXED
exports.sendJoinRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    // Check if user is authenticated
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const team = await Team.findById(id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Check if already a member - FIXED: handle null player values
    const isMember = team.players.some(p => {
      if (!p.player) return false;
      return p.player.toString() === req.userId.toString();
    });
    
    if (isMember) {
      return res.status(400).json({
        success: false,
        message: 'You are already a member of this team'
      });
    }

    // Check if request already exists - FIXED: handle null player values
    const existingRequest = team.joinRequests.find(r => {
      if (!r.player) return false;
      return r.player.toString() === req.userId.toString() && r.status === 'pending';
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'Join request already sent'
      });
    }

    team.joinRequests.push({
      player: req.userId,
      message: message || '',
      status: 'pending',
      requestedAt: Date.now()
    });

    await team.save();

    // Notify captain
    const captain = await User.findById(team.captain);
    const player = await User.findById(req.userId);

    await Notification.create({
      user: team.captain,
      type: 'team_join_request',
      title: 'Join Request',
      message: `${player?.profile?.fullName || player?.username || 'A player'} requested to join your team "${team.name}"`,
      relatedEntity: {
        entityType: 'team',
        entityId: team._id
      }
    });

    res.json({
      success: true,
      message: 'Join request sent successfully'
    });
  } catch (error) {
    console.error('Send join request error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Approve join request (captain only) - FULLY FIXED
exports.approveJoinRequest = async (req, res) => {
  try {
    const { id, requestId } = req.params;

    const team = await Team.findById(id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    if (team.captain.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only captain can approve requests'
      });
    }

    // Find the request index
    const requestIndex = team.joinRequests.findIndex(r => r._id.toString() === requestId);

    if (requestIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    const request = team.joinRequests[requestIndex];

    // Get player details to get their name
    const playerDetails = await User.findById(request.player);

    // Calculate next jersey number
    const nextJerseyNumber = team.players.length + 1;

    // Add player to team with proper name
    team.players.push({
      player: request.player,
      name: playerDetails?.profile?.fullName || playerDetails?.username || 'Player',
      position: 'forward',
      jerseyNumber: nextJerseyNumber,
      isActive: true
    });

    // Remove the request from joinRequests array
    team.joinRequests.splice(requestIndex, 1);

    await team.save();

    // Notify player
    const player = await User.findById(request.player);
    if (player) {
      player.teamsJoined += 1;
      await player.save();
    }

    await Notification.create({
      user: request.player,
      type: 'team_join_approved',
      title: 'Join Request Approved',
      message: `Your request to join ${team.name} has been approved!`,
      relatedEntity: {
        entityType: 'team',
        entityId: team._id
      }
    });

    res.json({
      success: true,
      message: 'Join request approved',
      team: team
    });
  } catch (error) {
    console.error('Approve join request error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Reject join request (captain only) - FIXED to remove request
exports.rejectJoinRequest = async (req, res) => {
  try {
    const { id, requestId } = req.params;

    const team = await Team.findById(id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    if (team.captain.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only captain can reject requests'
      });
    }

    // Find the request index
    const requestIndex = team.joinRequests.findIndex(r => r._id.toString() === requestId);

    if (requestIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    const request = team.joinRequests[requestIndex];

    // Remove the request from joinRequests array
    team.joinRequests.splice(requestIndex, 1);

    await team.save();

    // Notify player
    await Notification.create({
      user: request.player,
      type: 'team_join_rejected',
      title: 'Join Request Rejected',
      message: `Your request to join ${team.name} has been rejected.`,
      relatedEntity: {
        entityType: 'team',
        entityId: team._id
      }
    });

    res.json({
      success: true,
      message: 'Join request rejected',
      team: team
    });
  } catch (error) {
    console.error('Reject join request error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update team (captain only) - FIXED to allow players array update
exports.updateTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const team = await Team.findById(id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    if (team.captain.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only captain can update team'
      });
    }

    // FIXED: Allow updating 'players' field
    // Removed 'players' from the excluded list so it can be updated
    Object.keys(updates).forEach(key => {
      if (!['captain', 'joinRequests'].includes(key)) {
        team[key] = updates[key];
      }
    });

    team.updatedAt = Date.now();
    await team.save();

    // Return updated team with populated fields
    const updatedTeam = await Team.findById(id)
      .populate('captain', 'username profile email')
      .populate('players.player', 'fullName skillLevel preferredPosition')
      .lean();

    res.json({
      success: true,
      message: 'Team updated successfully',
      team: updatedTeam
    });
  } catch (error) {
    console.error('Update team error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Remove player from team (captain only)
exports.removePlayer = async (req, res) => {
  try {
    const { id, playerId } = req.params;

    const team = await Team.findById(id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Check authorization: captain or admin
    const user = await User.findById(req.userId);
    if (team.captain.toString() !== req.userId.toString() && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only captain or admin can remove players'
      });
    }

    // Remove player by index - handles both registered and guest players
    const initialLength = team.players.length;
    team.players = team.players.filter((p, index) => {
      // Try to match by player ObjectId first (registered users)
      if (p.player && p.player.toString() === playerId) {
        return false;
      }
      // Match by array index if playerId is numeric (for guest players)
      if (playerId === String(index)) {
        return false;
      }
      return true;
    });

    if (team.players.length === initialLength) {
      return res.status(404).json({
        success: false,
        message: 'Player not found in team'
      });
    }

    // Update player team count only if it was a registered user
    if (playerId && !isNaN(playerId) === false) {
      await User.findByIdAndUpdate(playerId, { $inc: { teamsJoined: -1 } }).catch(() => {
        console.log('User update skipped');
      });
    }

    await team.save();

    res.json({
      success: true,
      message: 'Player removed from team',
      team
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update player roster (captain, manager, or admin) - FIXED to allow manager
exports.updateTeamRoster = async (req, res) => {
  try {
    const { id } = req.params;
    const { playerIndex, name, position, jerseyNumber, isActive, goals, assists, matchesPlayed, yellowCards, redCards } = req.body;

    const team = await Team.findById(id);

    if (!team) {
      return res.status(404).json({
        message: 'Team not found'
      });
    }

    // Check authorization: captain, manager, or admin
    const user = await User.findById(req.userId);
    const isCaptain = team.captain.toString() === req.userId.toString();
    const isManagerOrAdmin = user.role === 'manager' || user.role === 'admin';

    if (!isCaptain && !isManagerOrAdmin) {
      return res.status(403).json({
        message: 'Only captain, manager, or admin can update roster'
      });
    }

    // Validate playerIndex
    if (playerIndex === undefined || playerIndex === null) {
      return res.status(400).json({
        message: 'Player index is required'
      });
    }

    if (playerIndex < 0 || playerIndex >= team.players.length) {
      return res.status(400).json({
        message: 'Invalid player index'
      });
    }

    // Check for unique jersey number (excluding current player)
    if (jerseyNumber && jerseyNumber !== 0) {
      const duplicateJersey = team.players.some((p, idx) => 
        idx !== playerIndex && p.jerseyNumber === Number(jerseyNumber)
      );

      if (duplicateJersey) {
        return res.status(400).json({
          message: 'Another player already has this jersey number'
        });
      }
    }

    // Update player fields
    if (name !== undefined) team.players[playerIndex].name = name;
    if (position !== undefined) team.players[playerIndex].position = position.toLowerCase();
    if (jerseyNumber !== undefined) team.players[playerIndex].jerseyNumber = Number(jerseyNumber);
    if (isActive !== undefined) team.players[playerIndex].isActive = isActive;
    
    // Update stats fields
    if (goals !== undefined) team.players[playerIndex].goals = Number(goals);
    if (assists !== undefined) team.players[playerIndex].assists = Number(assists);
    if (matchesPlayed !== undefined) team.players[playerIndex].matchesPlayed = Number(matchesPlayed);
    if (yellowCards !== undefined) team.players[playerIndex].yellowCards = Number(yellowCards);
    if (redCards !== undefined) team.players[playerIndex].redCards = Number(redCards);

    team.updatedAt = Date.now();
    await team.save();

    res.json({
      success: true,
      message: 'Player updated successfully',
      team
    });
  } catch (error) {
    console.error('Update team roster error:', error);
    res.status(500).json({
      message: error.message
    });
  }
};

// Leave team
exports.leaveTeam = async (req, res) => {
  try {
    const { id } = req.params;

    const team = await Team.findById(id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Check if user is a member
    const isMember = team.players.some(p => p.player.toString() === req.userId.toString());

    if (!isMember) {
      return res.status(400).json({
        success: false,
        message: 'You are not a member of this team'
      });
    }

    // Cannot leave if captain
    if (team.captain.toString() === req.userId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Captain cannot leave the team. Transfer captaincy first.'
      });
    }

    team.players = team.players.filter(p => p.player.toString() !== req.userId.toString());
    await team.save();

    // Update team count
    await User.findByIdAndUpdate(req.userId, { $inc: { teamsJoined: -1 } });

    res.json({
      success: true,
      message: 'Left team successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete team (captain only)
exports.deleteTeam = async (req, res) => {
  try {
    const { id } = req.params;

    const team = await Team.findById(id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Only captain can delete team
    if (team.captain.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the team captain can delete this team'
      });
    }

    // Delete the team
    await Team.findByIdAndDelete(id);

    // Update all team members' team count
    if (team.players && team.players.length > 0) {
      const playerIds = team.players
        .filter(p => p.player)
        .map(p => p.player.toString());
      
      if (playerIds.length > 0) {
        await User.updateMany(
          { _id: { $in: playerIds } },
          { $inc: { teamsJoined: -1 } }
        ).catch(err => console.log('User update skipped:', err.message));
      }
    }

    res.json({
      success: true,
      message: 'Team deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};