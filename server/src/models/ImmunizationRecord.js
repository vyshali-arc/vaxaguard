const mongoose = require('mongoose');

const immunizationRecordSchema = new mongoose.Schema(
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
    administeredAt: {
      type: Date,
      required: [true, 'Administration date is required']
    },
    clinic: {
      type: String,
      required: [true, 'Clinic or hospital name is required'],
      trim: true
    },
    healthcareProfessional: {
      type: String,
      trim: true,
      default: ''
    },
    batchNumber: {
      type: String,
      trim: true,
      default: ''
    },
    verificationStatus: {
      type: String,
      enum: ['self_reported', 'verified_by_doctor'],
      default: 'self_reported'
    },
    certificateUrl: {
      type: String,
      default: null
    },
    certificateFilename: {
      type: String,
      default: null
    },
    certificateMimeType: {
      type: String,
      default: null
    },
    notes: {
      type: String,
      default: ''
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes
immunizationRecordSchema.index({ dependentId: 1, administeredAt: -1 });
immunizationRecordSchema.index({ dependentId: 1, vaccineDefinitionId: 1, doseNumber: 1 });

module.exports = mongoose.model('ImmunizationRecord', immunizationRecordSchema);
