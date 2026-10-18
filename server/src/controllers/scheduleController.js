const VaccineSchedule = require('../models/VaccineSchedule');
const Dependent = require('../models/Dependent');
const { evaluateStatus, generateScheduleForDependent } = require('../services/scheduleEngine');

// Helper to check dependent access
async function verifyDependentAccess(dependentId, user) {
  const dependent = await Dependent.findById(dependentId);
  if (!dependent) return null;

  const isOwner = dependent.accountOwnerId.toString() === user._id.toString();
  const isOrgMember = dependent.organizationId && user.organizationId &&
                      dependent.organizationId.toString() === user.organizationId.toString();

  if (!isOwner && !isOrgMember && user.role !== 'admin') {
    return false;
  }
  return dependent;
}

// @desc    Get vaccination schedules for a dependent
// @route   GET /api/schedules/dependent/:dependentId
// @access  Private
async function getSchedulesByDependent(req, res, next) {
  try {
    const { dependentId } = req.params;
    const { status } = req.query;

    const dependent = await verifyDependentAccess(dependentId, req.user);
    if (dependent === null) {
      return res.status(404).json({ success: false, message: 'Person not found' });
    }
    if (dependent === false) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const query = { dependentId };
    if (status && status !== 'all') {
      query.status = status;
    }

    const schedules = await VaccineSchedule.find(query)
      .populate('vaccineDefinitionId', 'name code diseaseTarget description')
      .populate('linkedRecordId')
      .sort({ dueDate: 1 });

    // Ensure status is up-to-date with current date
    const updatedSchedules = await Promise.all(
      schedules.map(async (sch) => {
        if (sch.status !== 'completed') {
          const freshStatus = evaluateStatus(sch.dueDate, sch.completedAt, sch.linkedRecordId);
          if (freshStatus !== sch.status) {
            sch.status = freshStatus;
            await sch.save();
          }
        }
        return sch;
      })
    );

    res.json({
      success: true,
      count: updatedSchedules.length,
      data: updatedSchedules
    });
  } catch (err) {
    next(err);
  }
}

// @desc    Regenerate/sync schedule for a dependent
// @route   POST /api/schedules/dependent/:dependentId/regenerate
// @access  Private
async function regenerateSchedule(req, res, next) {
  try {
    const { dependentId } = req.params;
    const dependent = await verifyDependentAccess(dependentId, req.user);

    if (!dependent) {
      return res.status(404).json({ success: false, message: 'Person not found or unauthorized' });
    }

    const created = await generateScheduleForDependent(dependent);

    res.json({
      success: true,
      message: `Schedule synced successfully. ${created.length} new entries created.`,
      newCount: created.length
    });
  } catch (err) {
    next(err);
  }
}

// @desc    Update single schedule entry notes or status
// @route   PUT /api/schedules/:id
// @access  Private
async function updateSchedule(req, res, next) {
  try {
    const schedule = await VaccineSchedule.findById(req.params.id);
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Schedule entry not found' });
    }

    const dependent = await verifyDependentAccess(schedule.dependentId, req.user);
    if (!dependent) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { notes } = req.body;
    if (notes !== undefined) {
      schedule.notes = notes;
    }

    await schedule.save();

    res.json({
      success: true,
      message: 'Schedule entry updated',
      data: schedule
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSchedulesByDependent,
  regenerateSchedule,
  updateSchedule
};
