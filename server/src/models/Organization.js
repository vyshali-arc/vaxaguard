const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
      maxlength: [150, 'Name cannot exceed 150 characters']
    },
    type: {
      type: String,
      enum: ['orphanage', 'shelter', 'ngo', 'child_care_institution', 'community_clinic', 'other'],
      default: 'orphanage'
    },
    registrationNumber: {
      type: String,
      trim: true
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true
    },
    contactPhone: {
      type: String,
      trim: true
    },
    address: {
      street: String,
      city: String,
      state: String,
      country: {
        type: String,
        default: 'India'
      },
      pincode: String
    },
    authorizedCoordinatorIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Organization', organizationSchema);
