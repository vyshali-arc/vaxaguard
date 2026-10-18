const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient is required']
    },
    dependentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Dependent',
      default: null
    },
    scheduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VaccineSchedule',
      default: null
    },
    type: {
      type: String,
      enum: ['due_soon', 'overdue', 'upcoming', 'handover', 'system'],
      default: 'due_soon'
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    scheduledFor: {
      type: Date,
      default: Date.now
    },
    sentAt: {
      type: Date,
      default: Date.now
    },
    readAt: {
      type: Date,
      default: null
    },
    // Used by scheduler to guarantee idempotent notifications without duplicate spam
    deduplicationKey: {
      type: String,
      unique: true,
      sparse: true
    }
  },
  {
    timestamps: true
  }
);

notificationSchema.index({ recipientId: 1, readAt: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
