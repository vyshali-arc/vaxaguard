const Notification = require('../models/Notification');
const nodemailer = require('nodemailer');

let transporter = null;

// Configure Nodemailer if SMTP settings are present
if (process.env.SMTP_HOST && process.env.SMTP_USER) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

/**
 * Create an idempotent in-app notification and optionally send email.
 */
async function createNotification({
  recipientId,
  dependentId,
  scheduleId,
  type,
  title,
  message,
  deduplicationKey,
  recipientEmail = null
}) {
  try {
    // Check for duplicate key if provided
    if (deduplicationKey) {
      const existing = await Notification.findOne({ deduplicationKey });
      if (existing) {
        return existing;
      }
    }

    const notification = await Notification.create({
      recipientId,
      dependentId,
      scheduleId,
      type,
      title,
      message,
      deduplicationKey,
      scheduledFor: new Date(),
      sentAt: new Date()
    });

    // Send email if configured and recipient email is provided
    if (transporter && recipientEmail) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_FROM || '"VaxaGuard Alerts" <no-reply@vaxaguard.org>',
          to: recipientEmail,
          subject: `[VaxaGuard Alert] ${title}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
              <h2 style="color: #0284c7; margin-top: 0;">VaxaGuard Immunization Tracker</h2>
              <div style="padding: 16px; background-color: #f8fafc; border-radius: 8px; margin: 16px 0;">
                <h3 style="margin-top: 0; color: #0f172a;">${title}</h3>
                <p style="color: #334155; line-height: 1.5;">${message}</p>
              </div>
              <p style="font-size: 12px; color: #94a3b8;">
                This is an automated notification from VaxaGuard. Always verify with your doctor or healthcare coordinator.
              </p>
            </div>
          `
        });
      } catch (mailErr) {
        console.warn(`[Notification] Email dispatch failed gracefully: ${mailErr.message}`);
      }
    }

    return notification;
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate key race condition caught safely
      return await Notification.findOne({ deduplicationKey });
    }
    console.error('Failed to create notification:', err);
    throw err;
  }
}

module.exports = {
  createNotification
};
