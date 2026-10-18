const express = require('express');
const router = express.Router();
const { getAllVaccines, getVaccineById } = require('../controllers/vaccineController');

router.get('/', getAllVaccines);
router.get('/:id', getVaccineById);

module.exports = router;
