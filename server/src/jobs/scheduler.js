const cron = require('node-cron');
const VaccineSchedule = require('../models/VaccineSchedule');
const Dependent = require('../models/Dependent');
const User = require('../models/User');
const { refreshAllScheduleStatuses, evaluateStatus } = require('../services/scheduleEngine');
const { createNotification } = require('../services/notificationService');

/**
 * Scan for upcoming and overdue vaccines and dispatch idempotent alerts.
 */
async function runReminderJob() {
  console.log('⏰ [Scheduler] Running automated vaccination reminder and schedule scan...');
  try {
    // 1. Refresh statuses
    const updatedCount = await refreshAllScheduleStatuses();
    console.log(`[Scheduler] Refreshed ${updatedCount} schedule statuses.`);

    // 2. Find all pending due_soon or overdue schedules
    const pendingSchedules = await VaccineSchedule.find({
      status: { $in: ['due_soon', 'overdue'] },
      linkedRecordId: null
    }).populate('dependentId');

    let createdCount = 0;

    for (const sch of pendingSchedules) {
      if (!sch.dependentId) continue;

      const dependent = sch.dependentId;
      const ownerId = dependent.accountOwnerId;
      if (!ownerId) continue;

      const owner = await User.findById(ownerId);
      if (!owner) continue;

      // Check if user disabled notifications in preferences
      if (owner.preferences && owner.preferences.emailNotifications === false && owner.preferences.smsNotifications === false) {
        // Still can receive in-app alerts
      }

      const dueStr = new Date(sch.dueDate).toISOString().slice(0, 10);
      const dedupKey = `remind_${owner._id}_${sch._id}_${sch.status}_${dueStr}`;

      const isOverdue = sch.status === 'overdue';
      const title = isOverdue
        ? `Overdue: ${sch.vaccineName} for ${dependent.name}`
        : `Vaccination Reminder: ${sch.vaccineName} due soon for ${dependent.name}`;

      const message = isOverdue
        ? `Vaccination ${sch.vaccineName} (Dose ${sch.doseNumber}) was due on ${new Date(sch.dueDate).toLocaleDateString()}. Please schedule an appointment.`
        : `${dependent.name} is due for ${sch.vaccineName} (Dose ${sch.doseNumber}) on ${new Date(sch.dueDate).toLocaleDateString()}.`;

      await createNotification({
        recipientId: owner._id,
        dependentId: dependent._id,
        scheduleId: sch._id,
        type: isOverdue ? 'overdue' : 'due_soon',
        title,
        message,
        deduplicationKey: dedupKey,
        recipientEmail: owner.email
      });

      createdCount++;
    }

    console.log(`[Scheduler] Reminder job completed. Processed ${pendingSchedules.length} eligible doses, generated ${createdCount} idempotent notifications.`);
  } catch (err) {
    console.error('[Scheduler Error] Error in reminder job:', err);
  }
}

/**
 * Start the cron scheduler.
 */
function startScheduler() {
  const cronPattern = process.env.SCHEDULER_CRON || '0 8 * * *'; // Default 8:00 AM daily
  console.log(`⏰ Initializing Vaccine Due Date Scheduler with cron pattern: "${cronPattern}"`);

  cron.schedule(cronPattern, () => {
    runReminderJob();
  });
}

module.exports = {
  startScheduler,
  runReminderJob
};
