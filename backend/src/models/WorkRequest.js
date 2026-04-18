import mongoose from 'mongoose';

const workRequestSchema = new mongoose.Schema(
  {
    legacyRequestId: { type: Number, index: true },
    requestedByUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    requestForUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    description: { type: String, required: true, trim: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', index: true },
    deadline: { type: Date, index: true },
    notes: String,
    attachmentUrls: [String],
    status: { type: String, default: 'Pending', index: true },
    expectedCompletion: Date,
    remarksByDoer: String,
    attachmentByDoer: [String],
    finalRemarks: String,
    completionDate: Date,
    delayDays: { type: Number, default: 0 },
    onTimeStatus: { type: String, default: 'On Time', index: true }
  },
  { timestamps: true }
);

workRequestSchema.index({ requestForUser: 1, status: 1, deadline: 1 });
workRequestSchema.index({ requestedByUser: 1, status: 1 });

export const WorkRequest = mongoose.model('WorkRequest', workRequestSchema);
