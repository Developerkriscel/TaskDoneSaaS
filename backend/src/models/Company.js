import mongoose from 'mongoose';

const enabledFeaturesSchema = new mongoose.Schema(
  {
    dashboard: { type: Boolean, default: true },
    checklists: { type: Boolean, default: true },
    delegation: { type: Boolean, default: true },
    workRequest: { type: Boolean, default: true },
    fmsSystem: { type: Boolean, default: true },
    trackStatus: { type: Boolean, default: true },
    mis: { type: Boolean, default: true },
    reports: { type: Boolean, default: true }
  },
  { _id: false }
);

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, index: true },
    code: { type: String, required: true, unique: true, trim: true, uppercase: true, index: true },
    status: { type: String, enum: ['Active', 'Frozen', 'Expired'], default: 'Active', index: true },
    planName: { type: String, default: 'Starter' },
    planExpiryDate: { type: Date, default: null, index: true },
    graceUntil: { type: Date, default: null },
    monthlyRate: { type: Number, default: 4999 },
    maxUsers: { type: Number, default: 25 },
    contactPerson: { type: String, trim: true, default: '' },
    contactEmail: { type: String, trim: true, lowercase: true, default: '' },
    contactPhone: { type: String, trim: true, default: '' },
    domain: { type: String, trim: true, lowercase: true, default: '' },
    superAdminEmail: { type: String, trim: true, lowercase: true, default: '' },
    superAdminUserId: { type: String, trim: true, default: '' },
    enabledFeatures: { type: enabledFeaturesSchema, default: () => ({}) },
    lastReminderAt: { type: Date, default: null },
    fmsConfig: {
      sheetId: { type: String, default: '' },
      range: { type: String, default: 'FMS!A2:M' },
      serviceAccountJson: { type: String, default: '' }
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true }
);

companySchema.index({ status: 1, planExpiryDate: 1 });

export const Company = mongoose.model('Company', companySchema);
