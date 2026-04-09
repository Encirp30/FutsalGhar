const express = require('express');
const { auth } = require('../middleware/auth');
const challengeController = require('../controllers/challengeController');

const router = express.Router();

// Protected routes
router.post('/', auth, challengeController.sendChallenge);
router.get('/incoming', auth, challengeController.getIncomingChallenges);
router.get('/outgoing', auth, challengeController.getOutgoingChallenges);
router.put('/:id/accept', auth, challengeController.acceptChallenge);
router.put('/:id/reject', auth, challengeController.rejectChallenge);
router.put('/:id/cancel', auth, challengeController.cancelChallenge);
router.put('/:id/propose-dates', auth, challengeController.proposeAlternativeDates);

module.exports = router;
