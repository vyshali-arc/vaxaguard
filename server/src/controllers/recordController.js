const ImmunizationRecord = require('../models/ImmunizationRecord');
const VaccineSchedule = require('../models/VaccineSchedule');
const VaccineDefinition = require('../models/VaccineDefinition');
const Dependent = require('../models/Dependent');
const { generateImmunizationPdf } = require('../services/pdfService');
const { logAction } = require('../services/auditService');

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

// @desc    Get vaccination records
// @route   GET /api/records
// @access  Private
async function getRecords(req, res, next) {
  try {
    const { dependentId, vaccineId } = req.query;

    let query = {};

    if (dependentId) {
      const dep = await verifyDependentAccess(dependentId, req.user);
      if (!dep) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
      query.dependentId = dependentId;
    } else {
      // Find all dependents owned by user
      const userDeps = await Dependent.find({
        accountOwnerId: req.user._id,
        status: { $ne: 'archived' }
      }).select('_id');
      const depIds = userDeps.map(d => d._id);
      query.dependentId = { $in: depIds };
    }

    if (vaccineId) {
      query.vaccineDefinitionId = vaccineId;
    }

    const records = await ImmunizationRecord.find(query)
      .populate('dependentId', 'name relationship dateOfBirth gender ageInYears')
      .populate('vaccineDefinitionId', 'name code diseaseTarget')
      .sort({ administeredAt: -1 });

    res.json({
      success: true,
      count: records.length,
      data: records
    });
  } catch (err) {
    next(err);
  }
}

// @desc    Create a new vaccination record
// @route   POST /api/records
// @access  Private
async function createRecord(req, res, next) {
  try {
    const {
      dependentId,
      vaccineDefinitionId,
      vaccineName,
      doseNumber,
      administeredAt,
      clinic,
      healthcareProfessional,
      batchNumber,
      verificationStatus,
      notes
    } = req.body;

    if (!dependentId || !administeredAt || !clinic) {
      return res.status(400).json({
        success: false,
        message: 'Dependent, date administered, and clinic/hospital are required'
      });
    }

    const dependent = await verifyDependentAccess(dependentId, req.user);
    if (!dependent) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Require vaccineDefinitionId and fetch its definition
    if (!vaccineDefinitionId) {
      return res.status(400).json({
        success: false,
        message: 'Vaccine definition ID is required.'
      });
    }
    const def = await VaccineDefinition.findById(vaccineDefinitionId);
    if (!def) {
      return res.status(400).json({
        success: false,
        message: 'Vaccine definition ID is required.'
      });
    }
    const vacDefId = def._id;
    const vacName = vaccineName || def.name;

    // Handle certificate file upload if present
    let certificateUrl = null;
    let certificateFilename = null;
    let certificateMimeType = null;

    if (req.file) {
      certificateUrl = `/api/documents/${req.file.filename}`;
      certificateFilename = req.file.originalname;
      certificateMimeType = req.file.mimetype;
    }

    // Determine verification status
    // Healthcare professionals can mark as verified; regular users are self-reported unless doctor verifies
    let status = 'self_reported';
    if (req.user.role === 'healthcare_pro' || verificationStatus === 'verified_by_doctor') {
      status = 'verified_by_doctor';
    }

    // Ensure a valid vaccineDefinitionId is present
    if (!vacDefId) {
      return res.status(400).json({
        success: false,
        message: 'Vaccine definition ID is required. Please select a vaccine from the list.'
      });
    }

    const record = await ImmunizationRecord.create({
      dependentId,
      vaccineDefinitionId: vacDefId,
      vaccineName: vacName || 'Standard Immunization',
      doseNumber: parseInt(doseNumber || '1', 10),
      administeredAt: new Date(administeredAt),
      clinic: clinic.trim(),
      healthcareProfessional: healthcareProfessional?.trim() || '',
      batchNumber: batchNumber?.trim() || '',
      verificationStatus: status,
      certificateUrl,
      certificateFilename,
      certificateMimeType,
      notes: notes || '',
      createdBy: req.user._id
    });

    // Automatically update or link the matching schedule dose to 'completed'
    if (vacDefId) {
      let schedule = await VaccineSchedule.findOne({
        dependentId,
        vaccineDefinitionId: vacDefId,
        doseNumber: record.doseNumber
      });

      if (schedule) {
        schedule.status = 'completed';
        schedule.linkedRecordId = record._id;
        schedule.completedAt = record.administeredAt;
        await schedule.save();
      }
    }

    await logAction({
      userId: req.user._id,
      action: 'VACCINATION_RECORDED',
      targetType: 'ImmunizationRecord',
      targetId: record._id,
      details: { vaccine: record.vaccineName, dose: record.doseNumber, clinic: record.clinic },
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Vaccination record added and schedule marked completed successfully',
      data: record
    });
  } catch (err) {
    next(err);
  }
}

// @desc    Download Printable Immunization Card PDF
// @route   GET /api/records/dependent/:dependentId/pdf
// @access  Private
async function downloadRecordPdf(req, res, next) {
  try {
    const { dependentId } = req.params;
    const dependent = await verifyDependentAccess(dependentId, req.user);

    if (!dependent) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const records = await ImmunizationRecord.find({ dependentId }).sort({ administeredAt: 1 });
    const schedules = await VaccineSchedule.find({ dependentId }).sort({ dueDate: 1 });

    const pdfBuffer = await generateImmunizationPdf({ dependent, records, schedules });

    const safeName = dependent.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Immunization-Card-${safeName}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getRecords,
  createRecord,
  downloadRecordPdf
};
