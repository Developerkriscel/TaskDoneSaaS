import mongoose from 'mongoose';

const platformAuditSchema = new mongoose.Schema(
  {
    actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    actorName: { type: String, trim: true, default: 'Unknown' },
    actorEmail: { type: String, trim: true, lowercase: true, default: '' },
    action: { type: String, required: true, trim: true, index: true },
    entityType: { type: String, trim: true, default: 'Platform' },
    entityId: { type: String, trim: true, default: '' },
    targetCompanyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null, index: true },
    targetCompanyName: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['Success', 'Blocked', 'Rejected'], default: 'Success', index: true },
    details: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

platformAuditSchema.index({ createdAt: -1, action: 1 });

export const PlatformAudit = mongoose.model('PlatformAudit', platformAuditSchema);