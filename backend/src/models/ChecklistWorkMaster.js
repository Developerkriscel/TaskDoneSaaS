import mongoose from 'mongoose';

const checklistWorkMasterSchema = new mongoose.Schema(
  {
    legacyTaskId: { type: Number, index: true },
    delegatedByUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    delegatedToUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    taskDescription: { type: String, required: true, trim: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', index: true },
    taskFrequency: {
      type: String,
      enum: ['Daily', 'Weekly', 'Fortnightly', 'Monthly', 'Quarterly', 'Yearly'],
      required: true,
      index: true
    },
    startDate: { type: Date, required: true, index: true },
    dayDate: String,
    attachmentRequired: { type: String, default: '' },
    isActive: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);

checklistWorkMasterSchema.index({ delegatedToUser: 1, taskDescription: 1, project: 1, taskFrequency: 1 });

export const ChecklistWorkMaster = mongoose.model('ChecklistWorkMaster', checklistWorkMasterSchema);
