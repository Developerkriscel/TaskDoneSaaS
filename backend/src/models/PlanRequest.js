import mongoose from 'mongoose';

const planRequestSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    companyName: { type: String, required: true, trim: true },
    requestedPlan: { type: String, required: true, trim: true },
    requestedByName: { type: String, trim: true, default: '' },
    requestedByEmail: { type: String, trim: true, lowercase: true, default: '' },
    note: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending', index: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    finalizedPlan: { type: String, trim: true, default: '' },
    finalizedExpiryDate: { type: Date, default: null },
    rejectionReason: { type: String, trim: true, default: '' }
  },
  { timestamps: true }
);

planRequestSchema.index({ status: 1, createdAt: -1 });

export const PlanRequest = mongoose.model('PlanRequest', planRequestSchema);