const AuditLog = require('../models/AuditLog');

async function logAction({ userId, organizationId = null, action, targetType, targetId = null, details = {}, ipAddress = null }) {
  try {
    await AuditLog.create({
      userId,
      organizationId,
      action,
      targetType,
      targetId,
      details,
      ipAddress
    });
  } catch (err) {
    console.error('AuditLog creation failed:', err.message);
  }
}

module.exports = { logAction };
