const VaccineDefinition = require('../models/VaccineDefinition');

// @desc    Get all vaccines in directory with filters
// @route   GET /api/vaccines
// @access  Public (or Private)
async function getAllVaccines(req, res, next) {
  try {
    const { search, ageGroup, jurisdiction } = req.query;

    const query = { active: true };

    if (search) {
      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { diseaseTarget: { $regex: search.trim(), $options: 'i' } },
        { code: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    if (ageGroup && ageGroup !== 'all') {
      query.applicableAgeGroups = { $in: [ageGroup.toLowerCase(), 'all'] };
    }

    if (jurisdiction) {
      query.jurisdiction = { $regex: jurisdiction.trim(), $options: 'i' };
    }

    const vaccines = await VaccineDefinition.find(query).sort({ code: 1, name: 1 });

    res.json({
      success: true,
      count: vaccines.length,
      data: vaccines
    });
  } catch (err) {
    next(err);
  }
}

// @desc    Get single vaccine definition by ID
// @route   GET /api/vaccines/:id
// @access  Public
async function getVaccineById(req, res, next) {
  try {
    const vaccine = await VaccineDefinition.findById(req.params.id);

    if (!vaccine) {
      return res.status(404).json({
        success: false,
        message: 'Vaccine definition not found'
      });
    }

    res.json({
      success: true,
      data: vaccine
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllVaccines,
  getVaccineById
};
