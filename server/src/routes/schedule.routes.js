const express = require('express');
const router = express.Router();
const {
  getSchedulesByDependent,
  regenerateSchedule,
  updateSchedule
} = require('../controllers/scheduleController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/dependent/:dependentId', getSchedulesByDependent);
router.post('/dependent/:dependentId/regenerate', regenerateSchedule);
router.put('/:id', updateSchedule);

module.exports = router;
