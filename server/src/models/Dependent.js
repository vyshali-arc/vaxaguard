const mongoose = require('mongoose');

const dependentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required']
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      default: 'Male'
    },
    relationship: {
      type: String,
      enum: ['Self', 'Child', 'Spouse', 'Parent', 'Senior', 'Beneficiary', 'Ward', 'Other'],
      default: 'Child'
    },
    jurisdiction: {
      type: String,
      default: 'Indian National Immunization Schedule (UIP)'
    },
    accountOwnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Account owner reference is required']
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null
    },
    // Useful for institutional care beneficiaries
    beneficiaryCode: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ['active', 'archived', 'transferred'],
      default: 'active'
    },
    notes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for calculating age in years
dependentSchema.virtual('ageInYears').get(function () {
  if (!this.dateOfBirth) return 0;
  const now = new Date();
  const birth = new Date(this.dateOfBirth);
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? age : 0;
});

// Virtual for category (Child, Adult, Senior)
dependentSchema.virtual('ageCategory').get(function () {
  const years = this.ageInYears;
  if (years < 18) return 'Child';
  if (years < 60) return 'Adult';
  return 'Senior';
});

// Indexing for rapid queries
dependentSchema.index({ accountOwnerId: 1, status: 1 });
dependentSchema.index({ organizationId: 1, status: 1 });

module.exports = mongoose.model('Dependent', dependentSchema);
