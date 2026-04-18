import mongoose from 'mongoose';

const delegationTaskSchema = new mongoose.Schema(
  {
    legacyTaskId: { type: Number, index: true },
    delegatedByUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    delegatedToUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    description: { type: String, required: true, trim: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', index: true },
    targetDate: { type: Date, index: true },
    attachmentUrls: [String],
    status: { type: String, default: 'Pending', index: true },
    revisionDate: Date,
    revisionRemarks: String,
    attachmentByDoer: [String],
    finalRemarksByDoer: String,
    actionDate: Date,
    reworkRemark: String,
    rating: Number,
    finalRemarks: String,
    approvalDate: Date,
    finalDate: Date,
    delay: { type: Number, default: 0 },
    totalDelays: { type: Number, default: 0 },
    onTimeStatus: { type: String, default: 'On Time', index: true },
    priority: { type: String, default: 'Medium', index: true },
    metadata: {
      emailId: String,
      source: String
    }
  },
  { timestamps: true }
);

delegationTaskSchema.index({ delegatedToUser: 1, status: 1, targetDate: 1 });
delegationTaskSchema.index({ delegatedByUser: 1, status: 1 });

export const DelegationTask = mongoose.model('DelegationTask', delegationTaskSchema);
