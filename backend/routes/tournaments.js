const express = require('express');
const { auth, authorize } = require('../middleware/auth');
const tournamentController = require('../controllers/tournamentController');

const router = express.Router();

// Public routes
router.get('/', tournamentController.getAllTournaments);
router.get('/:id', tournamentController.getTournamentById);

// Protected routes
router.post('/', auth, authorize('manager', 'admin'), tournamentController.createTournament);
router.post('/:id/register', auth, tournamentController.registerTeam);
router.get('/team/tournaments', auth, tournamentController.getTeamTournaments);

// Admin/Organizer routes
router.put('/:id/status', auth, authorize('admin', 'manager'), tournamentController.updateTournamentStatus);
router.put('/:id/declare-winner', auth, authorize('admin', 'manager'), tournamentController.declareWinner);

// NEW: Update tournament details (for managers/admins)
router.put('/:id', auth, authorize('manager', 'admin'), tournamentController.updateTournament);

// Delete tournament (for managers/admins)
router.delete('/:id', auth, authorize('manager', 'admin'), tournamentController.deleteTournament);

module.exports = router;