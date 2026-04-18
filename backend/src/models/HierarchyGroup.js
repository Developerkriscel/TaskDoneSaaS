import mongoose from 'mongoose';

const hierarchyGroupSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null, index: true },
    adminUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    employeeUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }],
    legacyAdminName: String,
    legacyEmployeeNames: [String]
  },
  { timestamps: true }
);

hierarchyGroupSchema.index({ companyId: 1, adminUser: 1 }, { unique: true });

export const HierarchyGroup = mongoose.model('HierarchyGroup', hierarchyGroupSchema);
