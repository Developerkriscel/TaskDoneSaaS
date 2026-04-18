import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    roleName: { type: String, required: true, trim: true },
    permissions: {
      canViewAllTasks: { type: Boolean, default: false },
      canCreateTasks: { type: Boolean, default: false },
      canApproveTasks: { type: Boolean, default: false },
      canViewMIS: { type: Boolean, default: false }
    },
    isSystemRole: { type: Boolean, default: false }
  },
  { timestamps: true }
);

roleSchema.index({ companyId: 1, roleName: 1 }, { unique: true });

export const Role = mongoose.model('Role', roleSchema);
