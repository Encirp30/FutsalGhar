const express = require('express');
const { auth, authorize } = require('../middleware/auth');
const courtController = require('../controllers/courtController');

const router = express.Router();

// Public routes
router.get('/', courtController.getAllCourts);
router.get('/:id', courtController.getCourtById);

// Manager routes
router.post('/', auth, authorize('manager', 'admin'), courtController.createCourt);
router.put('/:id', auth, authorize('manager', 'admin'), courtController.updateCourt);
router.get('/manager/courts', auth, authorize('manager'), courtController.getManagerCourts);
router.post('/:id/block-slot', auth, authorize('manager', 'admin'), courtController.blockTimeSlot);

// FIXED: Added the DELETE route
router.delete('/:id', auth, authorize('manager', 'admin'), courtController.deleteCourt);

module.exports = router;