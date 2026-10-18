const mongoose = require('mongoose');

const doseDefinitionSchema = new mongoose.Schema({
  doseNumber: {
    type: Number,
    required: true
  },
  doseLabel: {
    type: String, // e.g. "Dose 1", "Booster 1"
    required: true
  },
  recommendedAgeText: {
    type: String, // e.g. "At birth", "6 weeks", "9 months"
    required: true
  },
  offsetDaysFromBirth: {
    type: Number, // Days from date of birth to calculate projected due date
    required: true
  },
  minIntervalDaysFromPrevDose: {
    type: Number,
    default: 28
  },
  notes: String
});

const vaccineDefinitionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Vaccine name is required'],
      unique: true,
      trim: true
    },
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },
    diseaseTarget: {
      type: String,
      required: [true, 'Target disease is required'],
      trim: true
    },
    description: {
      type: String,
      required: true
    },
    applicableAgeGroups: [
      {
        type: String,
        enum: ['child', 'adult', 'senior', 'all']
      }
    ],
    jurisdiction: {
      type: String,
      default: 'Indian National Immunization Schedule (UIP)'
    },
    doses: [doseDefinitionSchema],
    sourceReference: {
      type: String,
      default: 'Universal Immunization Programme (UIP), MoHFW, Govt of India'
    },
    sourceReviewedAt: {
      type: Date,
      default: () => new Date('2026-01-01')
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

vaccineDefinitionSchema.index({ code: 1 });
vaccineDefinitionSchema.index({ applicableAgeGroups: 1 });

module.exports = mongoose.model('VaccineDefinition', vaccineDefinitionSchema);
