const mongoose = require('mongoose');

const vaccineScheduleSchema = new mongoose.Schema(
  {
    dependentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Dependent',
      required: [true, 'Dependent reference is required']
    },
    vaccineDefinitionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VaccineDefinition',
      required: [true, 'Vaccine definition reference is required']
    },
    vaccineName: {
      type: String,
      required: true
    },
    doseNumber: {
      type: Number,
      required: true
    },
    recommendedTiming: {
      type: String,
      required: true
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required']
    },
    status: {
      type: String,
      enum: ['completed', 'upcoming', 'due_soon', 'overdue', 'needs_review'],
      default: 'upcoming'
    },
    linkedRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ImmunizationRecord',
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    },
    notes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for rapid lookups and unique dose tracking per dependent
vaccineScheduleSchema.index({ dependentId: 1, vaccineDefinitionId: 1, doseNumber: 1 }, { unique: true });
vaccineScheduleSchema.index({ dependentId: 1, status: 1 });
vaccineScheduleSchema.index({ dueDate: 1, status: 1 });

module.exports = mongoose.model('VaccineSchedule', vaccineScheduleSchema);
