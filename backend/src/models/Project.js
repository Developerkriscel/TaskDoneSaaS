import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null, index: true },
    name: { type: String, required: true, trim: true, index: true },
    status: { type: String, enum: ['Active', 'Paused'], default: 'Active', index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

projectSchema.index({ companyId: 1, name: 1 }, { unique: true });

export const Project = mongoose.model('Project', projectSchema);
