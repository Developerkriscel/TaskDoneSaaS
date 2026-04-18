import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    number: { type: String, trim: true },
    userId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['Super Admin', 'Admin', 'App Admin', 'Employee'], required: true, index: true },
    roleName: { type: String, trim: true, index: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null, index: true },
    isAppAdmin: { type: Boolean, default: false, index: true },
    photoUrl: { type: String, default: '' },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active', index: true },
    legacy: {
      sourceSheet: String,
      sourceRow: Number,
      legacyTaskUserName: String
    }
  },
  { timestamps: true }
);

userSchema.index({ role: 1, status: 1 });
userSchema.index({ companyId: 1, roleName: 1, status: 1 });

export const User = mongoose.model('User', userSchema);
