import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  fileName: { type: String, required: true, trim: true },
  mimeType: { type: String, default: 'application/octet-stream' },
  dataBase64: { type: String, required: true }, // Base64 encoded file data
  sizeBytes: { type: Number, required: true },
  sizeMB: { type: Number, required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  relatedType: { type: String, enum: ['delegation', 'workRequest', 'checklist', 'fms', 'other'], default: 'other' },
  relatedId: { type: mongoose.Schema.Types.ObjectId, default: null }
}, { timestamps: true });

attachmentSchema.index({ companyId: 1, createdAt: -1 });

export const Attachment = mongoose.model('Attachment', attachmentSchema);
