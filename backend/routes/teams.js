const express = require('express');
const { auth } = require('../middleware/auth');
const teamController = require('../controllers/teamController');

const router = express.Router();

// Public routes
router.get('/', teamController.getPublicTeams);
router.get('/:id', teamController.getTeamById);

// Protected routes
router.post('/', auth, teamController.createTeam);
router.get('/user/teams', auth, teamController.getUserTeams);
router.post('/:id/join-request', auth, teamController.sendJoinRequest);
router.put('/:id', auth, teamController.updateTeam);
router.delete('/:id', auth, teamController.deleteTeam);
router.put('/:id/roster', auth, teamController.updateTeamRoster);
router.put('/:id/remove-player/:playerId', auth, teamController.removePlayer);
router.put('/:id/leave', auth, teamController.leaveTeam);

// ✅ FIXED: Join request routes - using PUT to match frontend API calls
router.put('/:id/join-request/:requestId/approve', auth, teamController.approveJoinRequest);
router.put('/:id/join-request/:requestId/reject', auth, teamController.rejectJoinRequest);

module.exports = router;