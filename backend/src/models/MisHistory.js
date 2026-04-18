import mongoose from 'mongoose';

const misHistorySchema = new mongoose.Schema(
  {
    timestamp: { type: Date, default: Date.now, index: true },
    weekId: { type: String, required: true, index: true },
    employeeUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category: { type: String, required: true, index: true },
    kpiName: { type: String, required: true },
    score: { type: Number, required: true },
    totalTasks: { type: Number, default: 0 },
    done: { type: Number, default: 0 },
    pending: { type: Number, default: 0 },
    delayed: { type: Number, default: 0 },
    onTime: { type: Number, default: 0 },
    nextWeekTarget: { type: Number, default: null },
    metadata: {
      employeeNameSnapshot: String
    }
  },
  { timestamps: true }
);

misHistorySchema.index({ employeeUser: 1, weekId: 1, category: 1 });

export const MisHistory = mongoose.model('MisHistory', misHistorySchema);
