const express = require('express');
const { auth, authorize } = require('../middleware/auth');
const matchController = require('../controllers/matchController');

const router = express.Router();

// Public routes
router.get('/', matchController.getAllMatches);
router.get('/:id', matchController.getMatchById);
router.get('/team/matches', matchController.getTeamMatches);
router.get('/player/statistics', matchController.getPlayerStatistics);

// Protected routes (manager/admin)
router.post('/', auth, authorize('manager', 'admin'), matchController.createMatch);
router.put('/:id/result', auth, authorize('manager', 'admin'), matchController.updateMatchResult);

module.exports = router;
