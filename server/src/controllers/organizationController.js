const Organization = require('../models/Organization');
const Dependent = require('../models/Dependent');
const VaccineSchedule = require('../models/VaccineSchedule');
const { generateScheduleForDependent, evaluateStatus } = require('../services/scheduleEngine');
const { logAction } = require('../services/auditService');

// Helper to get coordinator's organization
async function getCoordinatorOrg(user) {
  if (user.organizationId) {
    return await Organization.findById(user.organizationId);
  }
  return await Organization.findOne({ authorizedCoordinatorIds: user._id });
}

// @desc    Get organization profile & high-level stats
// @route   GET /api/organizations/current
// @access  Private (NGO Coordinator / Admin)
async function getCurrentOrganization(req, res, next) {
  try {
    let org = await getCoordinatorOrg(req.user);

    if (!org) {
      // Auto-create a default organization for NGO coordinators if none exists
      if (req.user.role === 'ngo_coordinator') {
        org = await Organization.create({
          name: req.user.organizationName || 'Community Child Care Institution',
          type: 'orphanage',
          contactEmail: req.user.email,
          authorizedCoordinatorIds: [req.user._id]
        });
        req.user.organizationId = org._id;
        await req.user.save();
      } else {
        return res.status(404).json({ success: false, message: 'No organization linked to this account' });
      }
    }

    const totalBeneficiaries = await Dependent.countDocuments({
      organizationId: org._id,
      status: 'active'
    });

    res.json({
      success: true,
      data: {
        ...org.toJSON(),
        stats: {
          totalBeneficiaries
        }
      }
    });
  } catch (err) {
    next(err);
  }
}

// @desc    Get beneficiaries under organization care
// @route   GET /api/organizations/beneficiaries
// @access  Private (Coordinator)
async function getBeneficiaries(req, res, next) {
  try {
    const org = await getCoordinatorOrg(req.user);
    if (!org) {
      return res.status(403).json({ success: false, message: 'Organization access required' });
    }

    const { status, search } = req.query;

    const query = {
      organizationId: org._id,
      status: 'active'
    };

    if (search) {
      query.name = { $regex: search.trim(), $options: 'i' };
    }

    const beneficiaries = await Dependent.find(query).sort({ createdAt: -1 });

    // For each beneficiary, find their next upcoming/due dose and evaluate status
    const list = await Promise.all(
      beneficiaries.map(async (child) => {
        // Find next non-completed schedule
        const nextSchedule = await VaccineSchedule.findOne({
          dependentId: child._id,
          status: { $ne: 'completed' }
        }).sort({ dueDate: 1 });

        let childStatus = 'Completed';
        let nextVaccineName = 'All Completed';
        let dueDate = null;

        if (nextSchedule) {
          const freshStatus = evaluateStatus(nextSchedule.dueDate, null, null);
          if (freshStatus === 'due_soon') childStatus = 'Due Soon';
          else if (freshStatus === 'overdue') childStatus = 'Overdue';
          else childStatus = 'Upcoming';

          nextVaccineName = `${nextSchedule.vaccineName} - Dose ${nextSchedule.doseNumber}`;
          dueDate = nextSchedule.dueDate;
        }

        return {
          id: child._id,
          _id: child._id,
          name: child.name,
          dateOfBirth: child.dateOfBirth,
          ageInYears: child.ageInYears,
          gender: child.gender,
          relationship: child.relationship,
          beneficiaryCode: child.beneficiaryCode || `BEN-${child._id.toString().slice(-4).toUpperCase()}`,
          nextVaccine: nextVaccineName,
          dueDate,
          status: childStatus
        };
      })
    );

    // Apply status filter if provided
    let filtered = list;
    if (status && status !== 'all') {
      filtered = list.filter(item => item.status.toLowerCase().replace(/\s+/g, '') === status.toLowerCase().replace(/\s+/g, ''));
    }

    res.json({
      success: true,
      count: filtered.length,
      data: filtered
    });
  } catch (err) {
    next(err);
  }
}

// @desc    Add a beneficiary under organization care
// @route   POST /api/organizations/beneficiaries
// @access  Private (Coordinator)
async function addBeneficiary(req, res, next) {
  try {
    const org = await getCoordinatorOrg(req.user);
    if (!org) {
      return res.status(403).json({ success: false, message: 'Organization authorization required' });
    }

    const { name, dateOfBirth, gender, notes, beneficiaryCode } = req.body;

    if (!name || !dateOfBirth) {
      return res.status(400).json({ success: false, message: 'Name and date of birth are required' });
    }

    const child = await Dependent.create({
      name: name.trim(),
      dateOfBirth: new Date(dateOfBirth),
      gender: gender || 'Male',
      relationship: 'Beneficiary',
      jurisdiction: 'Indian National Immunization Schedule (UIP)',
      accountOwnerId: req.user._id,
      organizationId: org._id,
      beneficiaryCode: beneficiaryCode || `BEN-${Date.now().toString().slice(-4)}`,
      notes: notes || ''
    });

    // Auto-generate immunization schedule
    await generateScheduleForDependent(child);

    await logAction({
      userId: req.user._id,
      organizationId: org._id,
      action: 'BENEFICIARY_ADMITTED',
      targetType: 'Dependent',
      targetId: child._id,
      details: { name: child.name, code: child.beneficiaryCode },
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Beneficiary added and immunization schedule initialized',
      data: child
    });
  } catch (err) {
    next(err);
  }
}

// @desc    Handover care / transfer responsibility
// @route   POST /api/organizations/beneficiaries/:id/handover
// @access  Private (Coordinator)
async function handoverCare(req, res, next) {
  try {
    const org = await getCoordinatorOrg(req.user);
    if (!org) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const child = await Dependent.findOne({
      _id: req.params.id,
      organizationId: org._id
    });

    if (!child) {
      return res.status(404).json({ success: false, message: 'Beneficiary record not found' });
    }

    const { handoverReason, adoptiveParentName, transferNotes } = req.body;

    child.status = 'transferred';
    child.notes += `\n[Care Handover on ${new Date().toLocaleDateString()}]: ${handoverReason || 'Adoption/Transfer'} to ${adoptiveParentName || 'External Guardian'}. ${transferNotes || ''}`;
    await child.save();

    await logAction({
      userId: req.user._id,
      organizationId: org._id,
      action: 'CARE_HANDOVER',
      targetType: 'Dependent',
      targetId: child._id,
      details: { reason: handoverReason, guardian: adoptiveParentName },
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Care handover completed and audit record logged',
      data: child
    });
  } catch (err) {
    next(err);
  }
}

// @desc    Get aggregate vaccination report for organization
// @route   GET /api/organizations/report
// @access  Private (Coordinator)
async function getAggregateReport(req, res, next) {
  try {
    const org = await getCoordinatorOrg(req.user);
    if (!org) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const totalChildren = await Dependent.countDocuments({ organizationId: org._id, status: 'active' });

    const beneficiaries = await Dependent.find({ organizationId: org._id, status: 'active' }).select('_id');
    const childIds = beneficiaries.map(b => b._id);

    const totalDoses = await VaccineSchedule.countDocuments({ dependentId: { $in: childIds } });
    const completedDoses = await VaccineSchedule.countDocuments({ dependentId: { $in: childIds }, status: 'completed' });
    const dueSoonDoses = await VaccineSchedule.countDocuments({ dependentId: { $in: childIds }, status: 'due_soon' });
    const overdueDoses = await VaccineSchedule.countDocuments({ dependentId: { $in: childIds }, status: 'overdue' });

    const coveragePercentage = totalDoses > 0 ? Math.round((completedDoses / totalDoses) * 100) : 0;

    res.json({
      success: true,
      data: {
        organizationName: org.name,
        totalChildren,
        totalDoses,
        completedDoses,
        dueSoonDoses,
        overdueDoses,
        coveragePercentage,
        generatedAt: new Date()
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCurrentOrganization,
  getBeneficiaries,
  addBeneficiary,
  handoverCare,
  getAggregateReport
};
