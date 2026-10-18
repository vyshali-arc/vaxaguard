const VaccineDefinition = require('../models/VaccineDefinition');
const VaccineSchedule = require('../models/VaccineSchedule');
const ImmunizationRecord = require('../models/ImmunizationRecord');

const DUE_SOON_DAYS = parseInt(process.env.DUE_SOON_DAYS || '14', 10);

/**
 * Determine dynamic status based on due date and completion state.
 */
function evaluateStatus(dueDate, completedAt, linkedRecordId) {
  if (completedAt || linkedRecordId) {
    return 'completed';
  }

  const now = new Date();
  const due = new Date(dueDate);

  // Set times to midnight for fair date comparison
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dueMidnight = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();

  const diffDays = Math.round((dueMidnight - nowMidnight) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return 'overdue';
  } else if (diffDays <= DUE_SOON_DAYS) {
    return 'due_soon';
  } else {
    return 'upcoming';
  }
}

/**
 * Generate or sync vaccination schedules for a dependent based on DOB & jurisdiction.
 */
async function generateScheduleForDependent(dependent) {
  if (!dependent || !dependent.dateOfBirth) {
    throw new Error('Dependent with a valid dateOfBirth is required');
  }

  const birthDate = new Date(dependent.dateOfBirth);
  const ageYears = dependent.ageInYears;

  // Query relevant active vaccines
  let targetGroups = ['child', 'all'];
  if (ageYears >= 60) {
    targetGroups = ['senior', 'adult', 'all'];
  } else if (ageYears >= 18) {
    targetGroups = ['adult', 'all'];
  }

  const vaccines = await VaccineDefinition.find({
    active: true,
    applicableAgeGroups: { $in: targetGroups }
  });

  const schedulesCreated = [];

  for (const vaccine of vaccines) {
    for (const dose of vaccine.doses) {
      // Calculate projected dueDate from birth date and offset days
      const dueDate = new Date(birthDate.getTime() + dose.offsetDaysFromBirth * 24 * 60 * 60 * 1000);

      // Check if schedule already exists
      let schedule = await VaccineSchedule.findOne({
        dependentId: dependent._id,
        vaccineDefinitionId: vaccine._id,
        doseNumber: dose.doseNumber
      });

      if (!schedule) {
        // Check if an immunization record was already logged for this dose
        const existingRecord = await ImmunizationRecord.findOne({
          dependentId: dependent._id,
          vaccineDefinitionId: vaccine._id,
          doseNumber: dose.doseNumber
        });

        const status = existingRecord
          ? 'completed'
          : evaluateStatus(dueDate, null, null);

        schedule = await VaccineSchedule.create({
          dependentId: dependent._id,
          vaccineDefinitionId: vaccine._id,
          vaccineName: vaccine.name,
          doseNumber: dose.doseNumber,
          recommendedTiming: dose.recommendedAgeText,
          dueDate,
          status,
          linkedRecordId: existingRecord ? existingRecord._id : null,
          completedAt: existingRecord ? existingRecord.administeredAt : null,
          notes: dose.notes || ''
        });

        schedulesCreated.push(schedule);
      } else if (schedule.status !== 'completed') {
        // Re-evaluate overdue / due soon status
        const newStatus = evaluateStatus(schedule.dueDate, schedule.completedAt, schedule.linkedRecordId);
        if (newStatus !== schedule.status) {
          schedule.status = newStatus;
          await schedule.save();
        }
      }
    }
  }

  return schedulesCreated;
}

/**
 * Re-calculate statuses for all active non-completed schedules.
 */
async function refreshAllScheduleStatuses() {
  const openSchedules = await VaccineSchedule.find({
    status: { $in: ['upcoming', 'due_soon', 'overdue'] },
    linkedRecordId: null
  });

  let updatedCount = 0;
  for (const schedule of openSchedules) {
    const currentStatus = evaluateStatus(schedule.dueDate, null, null);
    if (currentStatus !== schedule.status) {
      schedule.status = currentStatus;
      await schedule.save();
      updatedCount++;
    }
  }

  return updatedCount;
}

module.exports = {
  evaluateStatus,
  generateScheduleForDependent,
  refreshAllScheduleStatuses,
  DUE_SOON_DAYS
};
