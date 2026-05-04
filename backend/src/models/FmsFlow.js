import mongoose from 'mongoose';

const formFieldSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    type: { type: String, enum: ['text', 'number', 'date', 'dropdown', 'boolean', 'file'], default: 'text' },
    required: { type: Boolean, default: false },
    defaultValue: { type: mongoose.Schema.Types.Mixed, default: '' },
    validationRules: { type: mongoose.Schema.Types.Mixed, default: {} },
    options: { type: [String], default: [] }
  },
  { _id: false }
);

const flowStepSchema = new mongoose.Schema(
  {
    sequence: { type: Number, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    tatHours: { type: Number, default: 0, min: 0 },
    role: { type: String, enum: ['Employee', 'Admin', 'Super Admin'], required: true },
    actionType: { type: String, enum: ['submit', 'review', 'approve'], default: 'submit' },
    status: { type: String, enum: ['pending', 'in_progress', 'completed', 'rework', 'skipped', 'escalated'], default: 'pending' },
    assignmentMode: { type: String, enum: ['user', 'role'], default: 'user' },
    nextOnComplete: { type: Number, default: 0 },
    nextOnReject: { type: Number, default: 0 },
    formSchema: { type: [formFieldSchema], default: [] },
    editableFields: { type: [String], default: [] },
    readonlyFields: { type: [String], default: [] },
    assignedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    assignedUserName: { type: String, default: '' },
    backupUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    backupUserName: { type: String, default: '' },
    assignedAt: { type: Date, default: null },
    dueAt: { type: Date, default: null },
    escalatedAt: { type: Date, default: null },
    escalatedByName: { type: String, default: '' },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    completedByName: { type: String, default: '' },
    completedAt: { type: Date, default: null },
    submittedAt: { type: Date, default: null },
    remarks: { type: String, default: '' },
    prefillFields: { type: mongoose.Schema.Types.Mixed, default: {} },
    responseFields: { type: mongoose.Schema.Types.Mixed, default: {} },
    responseText: { type: String, default: '' },
    responseLinks: { type: [String], default: [] },
    responseFiles: {
      type: [{
        name: { type: String, default: '' },
        mimeType: { type: String, default: '' },
        dataUrl: { type: String, default: '' }
      }],
      default: []
    }
  },
  { _id: false }
);

const flowEventSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    actorUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    actorName: { type: String, default: '' },
    eventType: { type: String, required: true },
    message: { type: String, default: '' },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { _id: false }
);

const fmsFlowSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    name: { type: String, required: true, trim: true },
    intent: { type: String, default: '', trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    createdByName: { type: String, required: true, trim: true },
    status: { type: String, enum: ['draft', 'ready', 'active', 'completed', 'paused'], default: 'draft', index: true },
    currentStep: { type: Number, default: 0 },
    dataObject: { type: mongoose.Schema.Types.Mixed, default: {} },
    steps: { type: [flowStepSchema], default: [] },
    events: { type: [flowEventSchema], default: [] },
    aiContext: {
      intent: { type: String, default: '' },
      stepsData: { type: [mongoose.Schema.Types.Mixed], default: [] },
      stepsHistory: { type: [mongoose.Schema.Types.Mixed], default: [] },
      timeline: { type: [mongoose.Schema.Types.Mixed], default: [] },
      decisions: { type: [mongoose.Schema.Types.Mixed], default: [] }
    },
    source: {
      mode: { type: String, enum: ['manual', 'ai'], default: 'manual' },
      model: { type: String, default: '' }
    }
  },
  { timestamps: true }
);

fmsFlowSchema.index({ companyId: 1, createdAt: -1 });

export const FmsFlow = mongoose.model('FmsFlow', fmsFlowSchema);
