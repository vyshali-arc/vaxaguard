const Dependent = require('../models/Dependent');
const VaccineSchedule = require('../models/VaccineSchedule');
const { generateScheduleForDependent } = require('../services/scheduleEngine');
const { logAction } = require('../services/auditService');

// @desc    Get all dependents/family members for the current user
// @route   GET /api/dependents
// @access  Private
async function getDependents(req, res, next) {
  try {
    const { category, search, relationship } = req.query;

    const query = {
      accountOwnerId: req.user._id,
      status: { $ne: 'archived' }
    };

    if (search) {
      query.name = { $regex: search.trim(), $options: 'i' };
    }

    if (relationship && relationship !== 'all') {
      query.relationship = relationship;
    }

    const dependents = await Dependent.find(query).sort({ createdAt: 1 });

    // Calculate dynamic progress stats for each member
    const results = await Promise.all(
      dependents.map(async (dep) => {
        const depObj = dep.toJSON();

        // Filter by age category if specified
        if (category && category !== 'all') {
          if (depObj.ageCategory.toLowerCase() !== category.toLowerCase()) {
            return null;
          }
        }

        const totalSchedules = await VaccineSchedule.countDocuments({ dependentId: dep._id });
        const completedSchedules = await VaccineSchedule.countDocuments({
          dependentId: dep._id,
          status: 'completed'
        });

        const percentage = totalSchedules > 0 ? Math.round((completedSchedules / totalSchedules) * 100) : 0;

        return {
          ...depObj,
          stats: {
            total: totalSchedules,
            completed: completedSchedules,
            percentage
          }
        };
      })
    );

    // Filter out nulls from category filter
    const filteredResults = results.filter(Boolean);

    res.json({
      success: true,
      count: filteredResults.length,
      data: filteredResults
    });
  } catch (err) {
    next(err);
  }
}

// @desc    Get single dependent by ID
// @route   GET /api/dependents/:id
// @access  Private
async function getDependentById(req, res, next) {
  try {
    const dependent = await Dependent.findById(req.params.id);

    if (!dependent) {
      return res.status(404).json({
        success: false,
        message: 'Family member not found'
      });
    }

    // Ownership check: must be owner or belong to the same organization
    const isOwner = dependent.accountOwnerId.toString() === req.user._id.toString();
    const isOrgMember = dependent.organizationId && req.user.organizationId &&
                        dependent.organizationId.toString() === req.user.organizationId.toString();

    if (!isOwner && !isOrgMember && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to view this record'
      });
    }

    const total = await VaccineSchedule.countDocuments({ dependentId: dependent._id });
    const completed = await VaccineSchedule.countDocuments({ dependentId: dependent._id, status: 'completed' });
    const upcoming = await VaccineSchedule.countDocuments({ dependentId: dependent._id, status: 'upcoming' });
    const dueSoon = await VaccineSchedule.countDocuments({ dependentId: dependent._id, status: 'due_soon' });
    const overdue = await VaccineSchedule.countDocuments({ dependentId: dependent._id, status: 'overdue' });

    res.json({
      success: true,
      data: {
        ...dependent.toJSON(),
        stats: {
          total,
          completed,
          upcoming,
          dueSoon,
          overdue,
          percentage: total > 0 ? Math.round((completed / total) * 100) : 0
        }
      }
    });
  } catch (err) {
    next(err);
  }
}

// @desc    Create a new family member/dependent
// @route   POST /api/dependents
// @access  Private
async function createDependent(req, res, next) {
  try {
    const { name, dateOfBirth, gender, relationship, jurisdiction, notes } = req.body;

    if (!name || !dateOfBirth) {
      return res.status(400).json({
        success: false,
        message: 'Name and date of birth are required'
      });
    }

    const dependent = await Dependent.create({
      name: name.trim(),
      dateOfBirth: new Date(dateOfBirth),
      gender: gender || 'Male',
      relationship: relationship || 'Child',
      jurisdiction: jurisdiction || 'Indian National Immunization Schedule (UIP)',
      accountOwnerId: req.user._id,
      notes: notes || ''
    });

    // Auto-generate vaccination schedules based on DOB and jurisdiction rules
    await generateScheduleForDependent(dependent);

    await logAction({
      userId: req.user._id,
      action: 'DEPENDENT_CREATED',
      targetType: 'Dependent',
      targetId: dependent._id,
      details: { name: dependent.name, relationship: dependent.relationship },
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Family member registered and immunization schedule generated successfully',
      data: dependent
    });
  } catch (err) {
    next(err);
  }
}

// @desc    Update dependent profile
// @route   PUT /api/dependents/:id
// @access  Private
async function updateDependent(req, res, next) {
  try {
    const dependent = await Dependent.findById(req.params.id);

    if (!dependent) {
      return res.status(404).json({
        success: false,
        message: 'Family member not found'
      });
    }

    // Ownership check
    if (dependent.accountOwnerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You cannot update this profile'
      });
    }

    const { name, dateOfBirth, gender, relationship, jurisdiction, notes } = req.body;

    const dobChanged = dateOfBirth && new Date(dateOfBirth).getTime() !== new Date(dependent.dateOfBirth).getTime();

    if (name) dependent.name = name.trim();
    if (dateOfBirth) dependent.dateOfBirth = new Date(dateOfBirth);
    if (gender) dependent.gender = gender;
    if (relationship) dependent.relationship = relationship;
    if (jurisdiction) dependent.jurisdiction = jurisdiction;
    if (notes !== undefined) dependent.notes = notes;

    await dependent.save();

    // If DOB changed, re-evaluate and regenerate schedules
    if (dobChanged) {
      await generateScheduleForDependent(dependent);
    }

    await logAction({
      userId: req.user._id,
      action: 'DEPENDENT_UPDATED',
      targetType: 'Dependent',
      targetId: dependent._id,
      details: { name: dependent.name, dobChanged },
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: dependent
    });
  } catch (err) {
    next(err);
  }
}

// @desc    Archive a dependent profile
// @route   DELETE /api/dependents/:id
// @access  Private
async function archiveDependent(req, res, next) {
  try {
    const dependent = await Dependent.findById(req.params.id);

    if (!dependent) {
      return res.status(404).json({
        success: false,
        message: 'Family member not found'
      });
    }

    if (dependent.accountOwnerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    dependent.status = 'archived';
    await dependent.save();

    await logAction({
      userId: req.user._id,
      action: 'DEPENDENT_ARCHIVED',
      targetType: 'Dependent',
      targetId: dependent._id,
      details: { name: dependent.name },
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Profile archived successfully'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDependents,
  getDependentById,
  createDependent,
  updateDependent,
  archiveDependent
};
