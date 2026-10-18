const express = require('express');
const router = express.Router();
const {
  getDependents,
  getDependentById,
  createDependent,
  updateDependent,
  archiveDependent
} = require('../controllers/dependentController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getDependents)
  .post(createDependent);

router.route('/:id')
  .get(getDependentById)
  .put(updateDependent)
  .delete(archiveDependent);

module.exports = router;
