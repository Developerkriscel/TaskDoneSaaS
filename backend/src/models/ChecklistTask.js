import mongoose from 'mongoose';

const checklistTaskSchema = new mongoose.Schema(
  {
    legacyTaskId: { type: Number, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    delegatedByUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    description: { type: String, required: true, trim: true },
    frequency: {
      type: String,
      enum: ['Daily', 'Weekly', 'Fortnightly', 'Monthly', 'Quarterly', 'Yearly', 'Adhoc'],
      default: 'Adhoc',
      index: true
    },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', index: true },
    planDate: { type: Date, required: true, index: true },
    actualDate: { type: Date, index: true },
    autoDone: { type: Boolean, default: false },
    attachmentUrls: [String],
    remarks: String,
    attachmentRequired: { type: String, default: '' },
    totalDelay: { type: Number, default: 0 },
    onTimeStatus: { type: String, default: 'On Time', index: true },
    approvalStatus: { type: String, default: 'Pending', index: true },
    telegramId: String,
    sourceType: { type: String, enum: ['Generated', 'Manual'], default: 'Manual', index: true }
  },
  { timestamps: true }
);

checklistTaskSchema.index({ user: 1, planDate: 1, description: 1 });
checklistTaskSchema.index({ approvalStatus: 1, planDate: 1 });

export const ChecklistTask = mongoose.model('ChecklistTask', checklistTaskSchema);
