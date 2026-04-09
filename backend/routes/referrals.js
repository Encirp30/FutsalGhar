const express = require('express');
const { auth } = require('../middleware/auth');
const referralController = require('../controllers/referralController');

const router = express.Router();

// Public routes
router.post('/verify', referralController.registerWithReferral);

// Protected routes
router.get('/link', auth, referralController.getReferralLink);
router.post('/send-invite', auth, referralController.sendInvite);
router.post('/share', auth, referralController.shareReferralLink);
router.get('/stats', auth, referralController.getReferralStats);
router.get('/history', auth, referralController.getReferralHistory);
router.post('/update-status', referralController.updateReferralStatus);

module.exports = router;
