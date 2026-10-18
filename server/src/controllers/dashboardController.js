const Dependent = require('../models/Dependent');
const VaccineSchedule = require('../models/VaccineSchedule');
const ImmunizationRecord = require('../models/ImmunizationRecord');
const { evaluateStatus } = require('../services/scheduleEngine');

// @desc    Get aggregated dashboard stats and lists
// @route   GET /api/dashboard/summary
// @access  Private
async function getDashboardSummary(req, res, next) {
  try {
    const user = req.user;

    // Find all active dependents accessible by this user
    let dependentQuery = { status: 'active' };
    if (user.role === 'ngo_coordinator' && user.organizationId) {
      dependentQuery.organizationId = user.organizationId;
    } else {
      dependentQuery.accountOwnerId = user._id;
    }

    const dependents = await Dependent.find(dependentQuery).select('_id name relationship dateOfBirth gender');
    const dependentIds = dependents.map(d => d._id);

    const totalMembers = dependents.length;

    if (totalMembers === 0) {
      return res.json({
        success: true,
        data: {
          totalMembers: 0,
          completedCount: 0,
          upcomingCount: 0,
          dueSoonCount: 0,
          overdueCount: 0,
          totalSchedules: 0,
          completionPercentage: 0,
          upcomingList: [],
          recentRecords: []
        }
      });
    }

    // Refresh and fetch all schedules
    const allSchedules = await VaccineSchedule.find({
      dependentId: { $in: dependentIds }
    }).populate('dependentId', 'name relationship dateOfBirth gender ageInYears');

    let completedCount = 0;
    let upcomingCount = 0;
    let dueSoonCount = 0;
    let overdueCount = 0;

    const upcomingList = [];

    const now = new Date();
    const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    for (const sch of allSchedules) {
      if (sch.status === 'completed') {
        completedCount++;
      } else {
        const freshStatus = evaluateStatus(sch.dueDate, sch.completedAt, sch.linkedRecordId);
        if (freshStatus !== sch.status) {
          sch.status = freshStatus;
          await sch.save();
        }

        if (freshStatus === 'due_soon') {
          dueSoonCount++;
        } else if (freshStatus === 'overdue') {
          overdueCount++;
        } else {
          upcomingCount++;
        }

        // Add to upcoming list
        const dueMidnight = new Date(sch.dueDate).getTime();
        const diffDays = Math.round((dueMidnight - nowMidnight) / (1000 * 60 * 60 * 24));

        let dueText = '';
        if (diffDays < 0) {
          dueText = `Overdue by ${Math.abs(diffDays)} days`;
        } else if (diffDays === 0) {
          dueText = 'Due Today';
        } else if (diffDays === 1) {
          dueText = 'Due Tomorrow';
        } else if (diffDays <= 7) {
          dueText = `Due in ${diffDays} days`;
        } else if (diffDays <= 14) {
          dueText = 'Due in 2 weeks';
        } else {
          const weeks = Math.round(diffDays / 7);
          dueText = `Due in ${weeks} weeks`;
        }

        upcomingList.push({
          scheduleId: sch._id,
          dependentId: sch.dependentId?._id,
          dependentName: sch.dependentId?.name,
          relationship: sch.dependentId?.relationship,
          vaccineName: sch.vaccineName,
          doseNumber: sch.doseNumber,
          dueDate: sch.dueDate,
          dueText,
          diffDays,
          status: freshStatus
        });
      }
    }

    // Sort upcoming list by dueDate ascending (earliest first)
    upcomingList.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    const totalSchedules = allSchedules.length;
    const completionPercentage = totalSchedules > 0 ? Math.round((completedCount / totalSchedules) * 100) : 0;

    // Fetch recent immunization records
    const recentRecords = await ImmunizationRecord.find({
      dependentId: { $in: dependentIds }
    })
      .populate('dependentId', 'name relationship')
      .sort({ administeredAt: -1 })
      .limit(6);

    res.json({
      success: true,
      data: {
        totalMembers,
        completedCount,
        upcomingCount,
        dueSoonCount,
        overdueCount,
        totalSchedules,
        completionPercentage,
        upcomingList: upcomingList.slice(0, 10), // Top 10 upcoming/due-soon
        recentRecords
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboardSummary
};
