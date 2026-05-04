import { asyncHandler } from '../utils/asyncHandler.js';
import { FmsFlow } from '../models/FmsFlow.js';
import { User } from '../models/User.js';
import { HierarchyGroup } from '../models/HierarchyGroup.js';
import { AppSetting } from '../models/AppSetting.js';

const FLOW_ROLES = new Set(['Employee', 'Admin', 'Super Admin']);
const STEP_FIELD_TYPES = new Set(['text', 'number', 'date', 'dropdown', 'boolean', 'file']);
const SHEET_IMPORT_SESSIONS = new Map();

function getCompanySheetConfigKey(companyId = '') {
  return `fms_sheet_configs::${String(companyId || '')}`;
}

async function getSheetConfigsForCompany(companyId = '') {
  const key = getCompanySheetConfigKey(companyId);
  const setting = await AppSetting.findOne({ key }).lean();
  const list = Array.isArray(setting?.value) ? setting.value : [];
  return list
    .filter((x) => x && typeof x === 'object')
    .map((x) => ({
      id: String(x.id || '').trim(),
      name: String(x.name || '').trim(),
      sheetUrl: String(x.sheetUrl || '').trim(),
      sheetId: String(x.sheetId || '').trim(),
      gid: String(x.gid || '0').trim(),
      createdAt: x.createdAt || null,
      updatedAt: x.updatedAt || null
    }))
    .filter((x) => x.id && x.name && x.sheetId);
}

function normalizeRole(value = '') {
  const v = String(value).trim().toLowerCase();
  if (v === 'super admin' || v === 'superadmin') return 'Super Admin';
  if (v === 'admin') return 'Admin';
  return 'Employee';
}

function addHours(date, hours = 0) {
  if (!date || !Number(hours)) return null;
  return new Date(new Date(date).getTime() + Number(hours) * 60 * 60 * 1000);
}

function getStepRuntime(step = {}) {
  const dueAt = step.dueAt || addHours(step.assignedAt, step.tatHours);
  const isOpen = ['in_progress', 'escalated'].includes(String(step.status || '').toLowerCase());
  const overdue = Boolean(isOpen && dueAt && new Date(dueAt).getTime() < Date.now());
  return {
    dueAt,
    tatStatus: overdue ? 'Overdue' : (dueAt ? 'On Track' : 'No TAT'),
    overdue
  };
}

function enrichFlowRuntime(flow) {
  if (!flow) return flow;
  const raw = typeof flow.toObject === 'function' ? flow.toObject() : flow;
  return {
    ...raw,
    steps: (raw.steps || []).map((step) => ({ ...step, runtime: getStepRuntime(step) }))
  };
}

function canUserAccessFlow(flow = {}, user = {}, visibleIds = new Set()) {
  if (String(user.role || '').trim() === 'Super Admin') return true;
  if (String(flow.createdBy || '') === String(user._id || '')) return true;
  return (flow.steps || []).some((s) => s?.assignedUser && visibleIds.has(String(s.assignedUser)));
}

function sanitizeViewMode(value = '') {
  const mode = String(value || '').trim().toLowerCase();
  return mode === 'current' ? 'current' : 'live';
}

function filterEventsByStepLimit(events = [], stepLimit = Number.POSITIVE_INFINITY) {
  if (!Number.isFinite(stepLimit)) return events || [];
  return (events || []).filter((e) => {
    const payload = e?.payload && typeof e.payload === 'object' ? e.payload : {};
    const refs = [payload.step, payload.nextStep, payload.stepIndex]
      .map((n) => Number(n))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (!refs.length) return true;
    return refs.some((n) => n <= stepLimit);
  });
}

function buildFlowForViewer(flow = {}, user = {}, options = {}) {
  const viewMode = sanitizeViewMode(options.viewMode);
  const raw = typeof flow.toObject === 'function' ? flow.toObject() : flow;
  const normalizedRole = String(user.role || '').trim().toLowerCase();
  const currentStepIndex = Math.max(0, Number(raw.currentStep || 0));
  let stepLimit = Number.POSITIVE_INFINITY;
  const steps = Array.isArray(raw.steps) ? raw.steps : [];

  const happenedStepStatuses = new Set(['completed', 'rework', 'skipped']);
  const lastHappenedIndex = steps.reduce((acc, s, idx) => {
    const st = String(s?.status || '').trim().toLowerCase();
    return happenedStepStatuses.has(st) ? idx : acc;
  }, -1);

  if (normalizedRole === 'employee') {
    const ownStepIndex = steps.findIndex((s) => String(s?.assignedUser || '') === String(user._id || ''));
    if (ownStepIndex >= 0) {
      stepLimit = Math.min(currentStepIndex, ownStepIndex) + 1;
    } else {
      stepLimit = currentStepIndex + 1;
    }
  } else if (viewMode === 'current') {
    // "Current Progress" should show only what has already happened, not future or currently open step.
    stepLimit = Math.max(0, lastHappenedIndex + 1);
  }

  const visibleSteps = Number.isFinite(stepLimit) ? steps.slice(0, Math.max(stepLimit, 0)) : steps;
  const visibleEvents = filterEventsByStepLimit(raw.events || [], stepLimit);

  return {
    ...raw,
    steps: visibleSteps,
    events: visibleEvents,
    viewMeta: {
      mode: viewMode,
      stepLimit: Number.isFinite(stepLimit) ? stepLimit : null
    }
  };
}

async function getVisibleUsersForFlow(user) {
  const normalizedRole = String(user.role || '').trim().toLowerCase();
  const companyUsers = await User.find({ companyId: user.companyId, status: 'Active' })
    .select('_id name role roleName status')
    .lean();

  if (normalizedRole === 'super admin') {
    return companyUsers;
  }
  if (normalizedRole === 'employee') {
    return companyUsers.filter((u) => String(u._id) === String(user._id));
  }

  const self = companyUsers.find((u) => String(u._id) === String(user._id));
  if (!self) return [];
  const group = await HierarchyGroup.findOne({ companyId: user.companyId, adminUser: self._id }).select('employeeUsers').lean();
  const ids = new Set([String(self._id), ...((group?.employeeUsers || []).map((x) => String(x)))]);
  return companyUsers.filter((u) => ids.has(String(u._id)));
}

function parseJsonFromText(text) {
  try {
    return JSON.parse(text);
  } catch {
    const first = text.indexOf('{');
    const last = text.lastIndexOf('}');
    if (first >= 0 && last > first) {
      try {
        return JSON.parse(text.slice(first, last + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function sanitizeFieldId(value = '', fallback = 'field') {
  const id = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return id || fallback;
}

function normalizeFormSchema(schema = [], stepIndex = 0) {
  if (!Array.isArray(schema)) return [];
  const seen = new Set();
  return schema
    .map((field, idx) => {
      const cleanType = STEP_FIELD_TYPES.has(String(field?.type || '').trim().toLowerCase())
        ? String(field.type).trim().toLowerCase()
        : 'text';
      const fallbackId = `step_${stepIndex + 1}_field_${idx + 1}`;
      const id = sanitizeFieldId(field?.id || field?.label || fallbackId, fallbackId);
      if (seen.has(id)) return null;
      seen.add(id);
      return {
        id,
        label: String(field?.label || `Field ${idx + 1}`).trim(),
        type: cleanType,
        required: Boolean(field?.required),
        defaultValue: field?.defaultValue ?? '',
        validationRules: typeof field?.validationRules === 'object' && field?.validationRules ? field.validationRules : {},
        options: Array.isArray(field?.options) ? field.options.map((x) => String(x || '').trim()).filter(Boolean) : []
      };
    })
    .filter(Boolean);
}

function normalizeFieldList(list = []) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  return list
    .map((x) => sanitizeFieldId(x, ''))
    .filter((x) => x && !seen.has(x) && (seen.add(x) || true));
}

function safeDataObject(value) {
  return (value && typeof value === 'object' && !Array.isArray(value)) ? value : {};
}

function isEqualValue(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function validateStructuredFields(formSchema = [], rawFields = {}) {
  const fields = (rawFields && typeof rawFields === 'object') ? rawFields : {};
  const out = {};
  const errors = [];
  formSchema.forEach((field) => {
    const key = String(field.id || '').trim();
    if (!key) return;
    let value = fields[key];
    if ((value === undefined || value === null || value === '') && field.defaultValue !== undefined && field.defaultValue !== null && field.defaultValue !== '') {
      value = field.defaultValue;
    }
    if (field.required && (value === undefined || value === null || value === '')) {
      errors.push(`${field.label || key} is required`);
      return;
    }
    if (value === undefined) return;
    if (field.type === 'number' && value !== '' && value !== null) {
      const n = Number(value);
      if (!Number.isFinite(n)) {
        errors.push(`${field.label || key} must be a valid number`);
        return;
      }
      value = n;
    }
    if (field.type === 'boolean') value = Boolean(value);
    if (field.type === 'dropdown' && Array.isArray(field.options) && field.options.length > 0 && value !== '') {
      const allowed = new Set(field.options.map((x) => String(x).toLowerCase()));
      if (!allowed.has(String(value).toLowerCase())) {
        errors.push(`${field.label || key} must match one of dropdown options`);
        return;
      }
    }
    out[key] = value;
  });
  return { fields: out, errors };
}

function createFlowContext(flow = {}) {
  const stepsData = (flow.steps || []).map((s) => ({
    sequence: s.sequence,
    title: s.title,
    description: s.description,
    role: s.role,
    actionType: s.actionType,
    status: s.status,
    assignedTo: s.assignedUserName || '',
    assignedAt: s.assignedAt || null,
    submittedAt: s.submittedAt || null,
    formSchema: s.formSchema || [],
    responseFields: s.responseFields || {},
    responseText: s.responseText || '',
    remarks: s.remarks || ''
  }));
  const timeline = (flow.events || []).map((e) => ({
    at: e.at || null,
    actor: e.actorName || '',
    type: e.eventType || '',
    message: e.message || '',
    payload: e.payload || {}
  }));
  return {
    intent: flow.intent || '',
    dataObject: safeDataObject(flow.dataObject),
    stepsData,
    stepsHistory: stepsData,
    timeline,
    decisions: (flow.aiContext?.decisions || [])
  };
}

function parseGoogleSheetUrl(sheetUrl = '') {
  const input = String(sheetUrl || '').trim();
  const matchId = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  const gidMatch = input.match(/[#&?]gid=([0-9]+)/);
  return {
    sheetId: matchId?.[1] || '',
    gid: gidMatch?.[1] || '0'
  };
}

function parseCsvLine(line = '') {
  const cells = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"' && line[i + 1] === '"') {
      current += '"';
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  cells.push(current);
  return cells.map((x) => String(x || '').trim());
}

function parseCsvText(csvText = '') {
  const lines = String(csvText || '').split(/\r?\n/).filter((x) => String(x).trim() !== '');
  if (!lines.length) return { columns: [], rows: [] };
  const columns = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((line, idx) => {
    const values = parseCsvLine(line);
    const obj = {};
    columns.forEach((col, i) => { obj[col] = values[i] ?? ''; });
    return { rowIndex: idx, values: obj, status: 'Pending', error: '' };
  });
  return { columns, rows };
}

async function readFmsSheetRows(sheetUrl = '') {
  const { sheetId, gid } = parseGoogleSheetUrl(sheetUrl);
  if (!sheetId) {
    const err = new Error('Invalid Google Sheet URL');
    err.statusCode = 400;
    throw err;
  }

  const candidates = [
    `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid || '0'}`,
    `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid || '0'}`
  ];
  let csvText = '';
  for (const url of candidates) {
    try {
      const upstream = await fetch(url);
      if (!upstream.ok) continue;
      const body = await upstream.text();
      if (String(body || '').trim()) {
        csvText = body;
        break;
      }
    } catch {
      // try next candidate
    }
  }

  if (!csvText) {
    const err = new Error('Unable to read sheet. Make sure it is shared as Anyone with link (Viewer).');
    err.statusCode = 400;
    throw err;
  }

  const parsed = parseCsvText(csvText);
  if (!parsed.columns.length) {
    const err = new Error('No columns found in sheet');
    err.statusCode = 400;
    throw err;
  }

  return { sheetId, gid: gid || '0', columns: parsed.columns, rows: parsed.rows };
}

function normalizeMapKey(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function buildSheetFieldMapping(columns = [], template = {}, requestedMapping = {}) {
  const cleanRequested = (requestedMapping && typeof requestedMapping === 'object') ? requestedMapping : {};
  const firstStep = Array.isArray(template.steps) ? template.steps[0] : null;
  const fields = Array.isArray(firstStep?.formSchema) ? firstStep.formSchema : [];
  const fieldByNormalized = new Map();
  fields.forEach((field) => {
    const id = String(field?.id || '').trim();
    if (!id) return;
    fieldByNormalized.set(normalizeMapKey(id), id);
    fieldByNormalized.set(normalizeMapKey(field?.label || ''), id);
  });

  const mapping = {};
  columns.forEach((columnName) => {
    const direct = String(cleanRequested[columnName] || '').trim();
    if (direct) {
      mapping[columnName] = direct;
      return;
    }
    const byName = fieldByNormalized.get(normalizeMapKey(columnName));
    if (byName) mapping[columnName] = byName;
  });
  return mapping;
}

function buildPrefillFromSheetRow(row = {}, mapping = {}) {
  const out = {};
  Object.entries(mapping || {}).forEach(([columnName, fieldId]) => {
    const cleanField = String(fieldId || '').trim();
    if (!cleanField) return;
    out[cleanField] = row.values?.[columnName] ?? '';
  });
  return out;
}

function buildFlowInstanceName(templateName = 'FMS Flow', rowIndex = 0, row = {}, customTemplate = '') {
  const values = row?.values && typeof row.values === 'object' ? row.values : {};
  const base = String(customTemplate || '').trim() || `${templateName} - Row ${rowIndex + 1}`;
  return base.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    const cleanKey = String(key || '').trim();
    return values[cleanKey] ?? values[Object.keys(values).find((x) => normalizeMapKey(x) === normalizeMapKey(cleanKey))] ?? '';
  }).trim() || `${templateName} - Row ${rowIndex + 1}`;
}

async function createFmsFlowInstanceFromTemplate({ template, row, rowIndex, mapping, req, flowName = '', prefillOverride = null, eventType = 'flow_created_from_sheet' }) {
  const prefill = (prefillOverride && typeof prefillOverride === 'object')
    ? prefillOverride
    : buildPrefillFromSheetRow(row, mapping);
  const now = new Date();
  const clonedSteps = template.steps.map((s, i) => {
    const obj = typeof s.toObject === 'function' ? s.toObject() : s;
    return {
      ...obj,
      status: i === 0 ? 'in_progress' : 'pending',
      assignedAt: i === 0 ? now : null,
      dueAt: i === 0 ? addHours(now, obj.tatHours) : null,
      escalatedAt: null,
      escalatedByName: '',
      completedBy: null,
      completedByName: '',
      completedAt: null,
      submittedAt: null,
      responseText: '',
      responseLinks: [],
      responseFiles: [],
      responseFields: {},
      remarks: '',
      prefillFields: i === 0 ? prefill : {}
    };
  });

  const name = buildFlowInstanceName(template.name, rowIndex, row, flowName);
  const flow = await FmsFlow.create({
    companyId: req.user.companyId,
    name,
    intent: template.intent || '',
    createdBy: req.user._id,
    createdByName: req.user.name,
    status: 'active',
    currentStep: 0,
    dataObject: prefill,
    steps: clonedSteps,
    aiContext: {
      intent: template.intent || '',
      dataObject: prefill,
      stepsData: clonedSteps.map((s) => ({
        sequence: s.sequence,
        title: s.title,
        description: s.description,
        status: s.status,
        prefillFields: s.prefillFields || {}
      })),
      stepsHistory: clonedSteps.map((s) => ({
        sequence: s.sequence,
        title: s.title,
        description: s.description,
        status: s.status,
        prefillFields: s.prefillFields || {}
      })),
      timeline: [],
      decisions: [{ type: eventType, at: new Date().toISOString(), rowIndex, mapping }]
    },
    source: {
      mode: template.source?.mode === 'ai' ? 'ai' : 'manual',
      model: template.source?.model || ''
    },
    events: [{
      actorUser: req.user._id,
      actorName: req.user.name,
      eventType,
      message: `Flow created from sheet row ${rowIndex + 1}`,
      payload: {
        rowIndex,
        mappedFields: prefill,
        sourceValues: row.values || {}
      }
    }]
  });

  return { flow, prefill };
}

function getImportSessionKey(user, sessionId) {
  return `${String(user.companyId)}::${String(user._id)}::${String(sessionId)}`;
}

async function callMistralJson({ prompt = '', maxTokens = 900, temperature = 0.2 }) {
  const apiKey = process.env.MISTRAL_API_KEY;
  const model = process.env.MISTRAL_MODEL || 'mistral-small-latest';
  if (!apiKey || apiKey === 'your_mistral_api_key_here') {
    throw new Error('AI service not configured. Set MISTRAL_API_KEY in .env');
  }
  const upstream = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  if (!upstream.ok) {
    const txt = await upstream.text();
    let msg = 'Mistral API error';
    try {
      const parsed = JSON.parse(txt);
      msg = parsed?.error?.message || parsed?.message || msg;
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  const json = await upstream.json();
  const content = json?.choices?.[0]?.message?.content || '';
  return parseJsonFromText(String(content || '')) || {};
}

function validateAndNormalizeSteps(rawSteps = []) {
  const cleaned = (Array.isArray(rawSteps) ? rawSteps : [])
    .map((s, idx) => ({
      sequence: Number(s.sequence || idx + 1),
      title: String(s.title || `Step ${idx + 1}`).trim(),
      description: String(s.description || '').trim(),
      tatHours: Math.max(0, Number(s.tatHours || 0)),
      assignmentMode: ['role', 'user'].includes(String(s.assignmentMode || '').trim().toLowerCase())
        ? String(s.assignmentMode).trim().toLowerCase()
        : 'user',
      nextOnComplete: Math.max(0, Number(s.nextOnComplete || 0)),
      nextOnReject: Math.max(0, Number(s.nextOnReject || 0)),
      formSchema: normalizeFormSchema(s.formSchema || [], idx),
      editableFields: normalizeFieldList(s.editableFields || []),
      readonlyFields: normalizeFieldList(s.readonlyFields || []),
      role: normalizeRole(s.role),
      actionType: ['submit', 'review', 'approve'].includes(String(s.actionType || '').trim().toLowerCase())
        ? String(s.actionType).trim().toLowerCase()
        : (normalizeRole(s.role) === 'Employee' ? 'submit' : 'review')
    }))
    .filter((s) => s.title);

  cleaned.sort((a, b) => a.sequence - b.sequence);
  cleaned.forEach((s, i) => { s.sequence = i + 1; });

  if (!cleaned.length) {
    return [{
      sequence: 1,
      title: 'Submit Request',
      description: 'Employee submits request',
      tatHours: 0,
      assignmentMode: 'user',
      nextOnComplete: 0,
      nextOnReject: 0,
      formSchema: [],
      role: 'Employee',
      actionType: 'submit'
    }];
  }

  return cleaned.map((s) => ({
    ...s,
    editableFields: s.editableFields.length ? s.editableFields : (s.formSchema || []).map((f) => String(f.id || '').trim()).filter(Boolean),
    role: FLOW_ROLES.has(s.role) ? s.role : 'Employee'
  }));
}

function findAssigneeForStep(ref = {}, step = {}, visibleUsers = [], visibleMap = new Map()) {
  let assignee = null;
  if (ref.userId && visibleMap.has(ref.userId)) {
    assignee = visibleMap.get(ref.userId);
  } else if (ref.userName) {
    assignee = visibleUsers.find((u) => String(u.name || '').trim().toLowerCase() === ref.userName.toLowerCase()) || null;
  }

  if (!assignee && step.assignmentMode === 'role') {
    assignee = visibleUsers.find((u) => normalizeRole(u.roleName || u.role) === step.role) || null;
  }

  return assignee;
}

export const generateFmsFlowDraft = asyncHandler(async (req, res) => {
  const { intent = '', flowName = '' } = req.body || {};
  if (!String(intent).trim()) {
    return res.status(400).json({ success: false, error: 'Intent is required' });
  }

  const prompt = [
    'Convert intent to JSON workflow steps only.',
    'Output JSON object with shape:',
    '{ "name": "...", "steps":[{"sequence":1,"title":"","description":"","tatHours":24,"assignmentMode":"user|role","role":"Employee|Admin|Super Admin","actionType":"submit|review|approve","nextOnComplete":0,"nextOnReject":0,"formSchema":[{"id":"customer_name","label":"Customer Name","type":"text","required":true,"defaultValue":"","validationRules":{},"options":[]}]}] }',
    'No markdown. No extra text.',
    `Intent: ${intent}`
  ].join('\n');
  let parsed = {};
  try {
    parsed = await callMistralJson({ prompt, maxTokens: 1100, temperature: 0.2 });
  } catch (err) {
    return res.status(503).json({ success: false, error: err?.message || 'AI draft generation failed' });
  }
  const steps = validateAndNormalizeSteps(parsed.steps || []);

  res.json({
    success: true,
    draft: {
      name: String(parsed.name || flowName || 'AI Generated Flow').trim(),
      intent: String(intent).trim(),
      steps,
      source: { mode: 'ai', model: process.env.MISTRAL_MODEL || 'mistral-small-latest' }
    }
  });
});

export const createFmsFlow = asyncHandler(async (req, res) => {
  const user = req.user;
  const { name = '', intent = '', steps = [], assignments = [], source = { mode: 'manual', model: '' } } = req.body || {};
  if (!user?.companyId) return res.status(400).json({ success: false, error: 'Company scope required' });

  const visibleUsers = await getVisibleUsersForFlow(user);
  const visibleMap = new Map(visibleUsers.map((u) => [String(u._id), u]));
  const normalizedSteps = validateAndNormalizeSteps(steps).map((s) => ({ ...s, status: 'pending' }));

  const assignmentMap = new Map((Array.isArray(assignments) ? assignments : []).map((a) => [Number(a.stepIndex), {
    userId: String(a.userId || '').trim(),
    userName: String(a.userName || '').trim(),
    backupUserName: String(a.backupUserName || '').trim()
  }]));
  for (let i = 0; i < normalizedSteps.length; i += 1) {
    const ref = assignmentMap.get(i) || {};
    const assignee = findAssigneeForStep(ref, normalizedSteps[i], visibleUsers, visibleMap);
    if (!assignee) {
      return res.status(400).json({ success: false, error: `Invalid assignment for step ${i + 1}` });
    }
    normalizedSteps[i].assignedUser = assignee._id;
    normalizedSteps[i].assignedUserName = assignee.name;
    if (ref.backupUserName) {
      const backup = visibleUsers.find((u) => String(u.name || '').trim().toLowerCase() === ref.backupUserName.toLowerCase()) || null;
      if (backup) {
        normalizedSteps[i].backupUser = backup._id;
        normalizedSteps[i].backupUserName = backup.name;
      }
    }
  }

  const flow = await FmsFlow.create({
    companyId: user.companyId,
    name: String(name || 'Untitled Flow').trim(),
    intent: String(intent || '').trim(),
    createdBy: user._id,
    createdByName: user.name,
    status: 'ready',
    dataObject: {},
    steps: normalizedSteps,
    aiContext: {
      intent: String(intent || '').trim(),
      stepsData: normalizedSteps.map((s) => ({
        sequence: s.sequence,
        title: s.title,
        description: s.description,
        role: s.role,
        actionType: s.actionType,
        tatHours: Number(s.tatHours || 0),
        formSchema: s.formSchema || []
      })),
      stepsHistory: normalizedSteps.map((s) => ({
        sequence: s.sequence,
        title: s.title,
        description: s.description,
        role: s.role,
        actionType: s.actionType,
        tatHours: Number(s.tatHours || 0),
        formSchema: s.formSchema || []
      })),
      timeline: [],
      decisions: []
    },
    source: {
      mode: source?.mode === 'ai' ? 'ai' : 'manual',
      model: String(source?.model || '')
    },
    events: [{
      actorUser: user._id,
      actorName: user.name,
      eventType: 'flow_created',
      message: 'Flow created and finalized',
      payload: {
        totalSteps: normalizedSteps.length,
        firstStepTitle: normalizedSteps[0]?.title || '',
        firstStepDescription: normalizedSteps[0]?.description || '',
        firstAssignedUserName: normalizedSteps[0]?.assignedUserName || ''
      }
    }]
  });

  res.json({ success: true, flow });
});

export const listFmsFlows = asyncHandler(async (req, res) => {
  const user = req.user;
  const visibleUsers = await getVisibleUsersForFlow(user);
  const visibleIds = new Set(visibleUsers.map((u) => String(u._id)));

  const rows = await FmsFlow.find({ companyId: user.companyId }).sort({ createdAt: -1 }).lean();
  const filtered = rows.filter((f) => {
    if (String(user.role || '').trim() === 'Super Admin') return true;
    if (String(f.createdBy) === String(user._id)) return true;
    return (f.steps || []).some((s) => s?.assignedUser && visibleIds.has(String(s.assignedUser)));
  });
  res.json({ success: true, flows: filtered.map(enrichFlowRuntime) });
});

export const getFmsFlowDetail = asyncHandler(async (req, res) => {
  const user = req.user;
  const flow = await FmsFlow.findOne({ _id: req.params.flowId, companyId: user.companyId }).lean();
  if (!flow) return res.status(404).json({ success: false, error: 'Flow not found' });
  const visibleUsers = await getVisibleUsersForFlow(user);
  const visibleIds = new Set(visibleUsers.map((u) => String(u._id)));
  if (!canUserAccessFlow(flow, user, visibleIds)) {
    return res.status(403).json({ success: false, error: 'You do not have access to this flow' });
  }
  const viewMode = sanitizeViewMode(req.query?.viewMode);
  const filtered = buildFlowForViewer(flow, user, { viewMode });
  res.json({ success: true, flow: enrichFlowRuntime(filtered) });
});

export const startFmsFlow = asyncHandler(async (req, res) => {
  const flow = await FmsFlow.findOne({ _id: req.params.flowId, companyId: req.user.companyId });
  if (!flow) return res.status(404).json({ success: false, error: 'Flow not found' });
  if (!flow.steps.length) return res.status(400).json({ success: false, error: 'Flow has no steps' });

  flow.status = 'active';
  flow.currentStep = 0;
  const now = new Date();
  flow.steps = flow.steps.map((s, i) => ({
    ...s.toObject(),
    status: i === 0 ? 'in_progress' : 'pending',
    assignedAt: i === 0 ? now : (s.assignedAt || null),
    dueAt: i === 0 ? addHours(now, s.tatHours) : (s.dueAt || null)
  }));
  const current = flow.steps[0];
  flow.events.push({
    actorUser: req.user._id,
    actorName: req.user.name,
    eventType: 'flow_started',
    message: 'Flow execution started',
    payload: {
      step: current?.sequence || 1,
      title: current?.title || '',
      description: current?.description || '',
      tatHours: Number(current?.tatHours || 0),
      assignedTo: current?.assignedUserName || ''
    }
  });
  await flow.save();
  res.json({ success: true, flow });
});

export const actionFmsFlowStep = asyncHandler(async (req, res) => {
  const { action = 'complete', remarks = '', response = {} } = req.body || {};
  const flow = await FmsFlow.findOne({ _id: req.params.flowId, companyId: req.user.companyId });
  if (!flow) return res.status(404).json({ success: false, error: 'Flow not found' });
  if (flow.status !== 'active') return res.status(400).json({ success: false, error: 'Flow is not active' });

  const index = Number(flow.currentStep || 0);
  const step = flow.steps[index];
  if (!step) return res.status(400).json({ success: false, error: 'Invalid current step' });
  if (String(step.assignedUser || '') !== String(req.user._id)) {
    return res.status(403).json({ success: false, error: 'You are not assigned to this step' });
  }

  if (action === 'rework' || action === 'reject') {
    step.status = 'rework';
    step.remarks = String(remarks || '').trim();
    const branchIndex = Number(step.nextOnReject || 0) > 0 ? Number(step.nextOnReject) - 1 : index - 1;
    const prev = Math.max(branchIndex, 0);
    flow.currentStep = prev;
    if (flow.steps[prev]) {
      flow.steps[prev].status = 'in_progress';
      flow.steps[prev].assignedAt = new Date();
      flow.steps[prev].dueAt = addHours(flow.steps[prev].assignedAt, flow.steps[prev].tatHours);
    }
    flow.events.push({
      actorUser: req.user._id,
      actorName: req.user.name,
      eventType: 'step_rework',
      message: `Step ${step.sequence} sent back`,
      payload: {
        step: step.sequence,
        title: step.title,
        description: step.description,
        tatHours: Number(step.tatHours || 0),
        assignedTo: flow.steps[prev]?.assignedUserName || '',
        remarks: step.remarks
      }
    });
  } else {
    const responseText = String(response?.text || '').trim();
    const responseLinks = Array.isArray(response?.links)
      ? response.links.map((x) => String(x || '').trim()).filter(Boolean)
      : [];
    const responseFiles = Array.isArray(response?.files)
      ? response.files
        .map((f) => ({
          name: String(f?.name || '').trim(),
          mimeType: String(f?.mimeType || '').trim(),
          dataUrl: String(f?.dataUrl || '').trim()
        }))
        .filter((f) => f.name || f.dataUrl)
      : [];
    const normalizedSchema = normalizeFormSchema(step.formSchema || [], index);
    const dataObject = safeDataObject(flow.dataObject);
    const editableSet = new Set(normalizeFieldList(step.editableFields || normalizedSchema.map((f) => f.id)));
    const incomingFields = (response?.fields && typeof response.fields === 'object') ? response.fields : {};
    const nonEditable = Object.keys(incomingFields).filter((k) => !editableSet.has(sanitizeFieldId(k, '')));
    if (nonEditable.length) {
      return res.status(400).json({ success: false, error: `Non-editable fields attempted: ${nonEditable.join(', ')}` });
    }

    const editableIncoming = {};
    Object.entries(incomingFields).forEach(([k, v]) => {
      const key = sanitizeFieldId(k, '');
      if (key && editableSet.has(key)) editableIncoming[key] = v;
    });

    const mergeCandidate = { ...dataObject, ...editableIncoming };
    const { fields: validatedFields, errors: fieldErrors } = validateStructuredFields(normalizedSchema, mergeCandidate);
    if (fieldErrors.length) return res.status(400).json({ success: false, error: fieldErrors.join('; ') });

    const changedFields = [];
    Object.keys(validatedFields).forEach((key) => {
      if (!editableSet.has(key)) return;
      const oldValue = dataObject[key];
      const newValue = validatedFields[key];
      if (!isEqualValue(oldValue, newValue)) changedFields.push({ field: key, oldValue, newValue });
      mergeCandidate[key] = newValue;
    });
    flow.dataObject = mergeCandidate;

    step.status = 'completed';
    step.completedBy = req.user._id;
    step.completedByName = req.user.name;
    step.completedAt = new Date();
    step.submittedAt = step.completedAt;
    step.remarks = String(remarks || '').trim();
    step.responseFields = Object.fromEntries(changedFields.map((x) => [x.field, x.newValue]));
    step.responseText = responseText;
    step.responseLinks = responseLinks;
    step.responseFiles = responseFiles;

    const branchIndex = Number(step.nextOnComplete || 0) > 0 ? Number(step.nextOnComplete) - 1 : index + 1;
    const next = Math.max(0, branchIndex);
    if (flow.steps[next]) {
      flow.currentStep = next;
      flow.steps[next].status = 'in_progress';
      flow.steps[next].assignedAt = new Date();
      flow.steps[next].dueAt = addHours(flow.steps[next].assignedAt, flow.steps[next].tatHours);
      flow.events.push({
        actorUser: req.user._id,
        actorName: req.user.name,
        eventType: 'step_completed',
        message: `Step ${step.sequence} completed; moved to step ${flow.steps[next].sequence}`,
        payload: {
          step: step.sequence,
          title: step.title,
          description: step.description,
          tatHours: Number(step.tatHours || 0),
          assignedAt: step.assignedAt || null,
          submittedAt: step.submittedAt || null,
          nextStep: flow.steps[next]?.sequence || null,
          nextTitle: flow.steps[next]?.title || '',
          nextDescription: flow.steps[next]?.description || '',
          nextTatHours: Number(flow.steps[next]?.tatHours || 0),
          nextAssignedTo: flow.steps[next]?.assignedUserName || '',
          nextAssignedAt: flow.steps[next]?.assignedAt || null,
          remarks: step.remarks,
          changedFields,
          dataObjectSnapshot: flow.dataObject,
          responseFields: step.responseFields || {},
          responseText: step.responseText,
          responseLinksCount: step.responseLinks.length,
          responseFilesCount: step.responseFiles.length
        }
      });
    } else {
      flow.status = 'completed';
      flow.events.push({
        actorUser: req.user._id,
        actorName: req.user.name,
        eventType: 'flow_completed',
        message: 'Flow completed',
        payload: {
          step: step.sequence,
          title: step.title,
          description: step.description,
          tatHours: Number(step.tatHours || 0),
          assignedAt: step.assignedAt || null,
          submittedAt: step.submittedAt || null,
          remarks: step.remarks,
          changedFields,
          dataObjectSnapshot: flow.dataObject,
          responseFields: step.responseFields || {},
          responseText: step.responseText,
          responseLinksCount: step.responseLinks.length,
          responseFilesCount: step.responseFiles.length
        }
      });
    }
  }

  flow.aiContext = createFlowContext(flow);

  await flow.save();
  res.json({ success: true, flow });
});

export const monitorFmsFlow = asyncHandler(async (req, res) => {
  const user = req.user;
  const flow = await FmsFlow.findOne({ _id: req.params.flowId, companyId: user.companyId }).lean();
  if (!flow) return res.status(404).json({ success: false, error: 'Flow not found' });
  const visibleUsers = await getVisibleUsersForFlow(user);
  const visibleIds = new Set(visibleUsers.map((u) => String(u._id)));
  if (!canUserAccessFlow(flow, user, visibleIds)) {
    return res.status(403).json({ success: false, error: 'You do not have access to this flow' });
  }
  const viewMode = sanitizeViewMode(req.query?.viewMode);
  const filtered = buildFlowForViewer(flow, user, { viewMode });

  const summary = {
    totalSteps: filtered.steps.length,
    completedSteps: filtered.steps.filter((s) => s.status === 'completed').length,
    reworkCount: filtered.events.filter((e) => e.eventType === 'step_rework').length,
    pendingSteps: filtered.steps.filter((s) => s.status === 'pending' || s.status === 'in_progress').length
  };

  res.json({ success: true, flow: enrichFlowRuntime(filtered), summary, events: filtered.events || [] });
});

export const updateFmsFlow = asyncHandler(async (req, res) => {
  const user = req.user;
  const role = String(user?.role || '').trim();
  if (!['Admin', 'Super Admin'].includes(role)) {
    return res.status(403).json({ success: false, error: 'Only Admin/Super Admin can edit flows' });
  }

  const flow = await FmsFlow.findOne({ _id: req.params.flowId, companyId: user.companyId });
  if (!flow) return res.status(404).json({ success: false, error: 'Flow not found' });

  const {
    name = flow.name,
    intent = flow.intent,
    steps = flow.steps || [],
    assignments = [],
    status = flow.status,
    currentStep = flow.currentStep
  } = req.body || {};

  const visibleUsers = await getVisibleUsersForFlow(user);
  const visibleMap = new Map(visibleUsers.map((u) => [String(u._id), u]));
  const normalizedSteps = validateAndNormalizeSteps(steps);
  const assignmentMap = new Map((Array.isArray(assignments) ? assignments : []).map((a) => [Number(a.stepIndex), {
    userId: String(a.userId || '').trim(),
    userName: String(a.userName || '').trim(),
    backupUserName: String(a.backupUserName || '').trim()
  }]));

  for (let i = 0; i < normalizedSteps.length; i += 1) {
    const ref = assignmentMap.get(i) || {};
    const assignee = findAssigneeForStep(ref, normalizedSteps[i], visibleUsers, visibleMap);
    if (!assignee) return res.status(400).json({ success: false, error: `Invalid assignment for step ${i + 1}` });
    normalizedSteps[i].assignedUser = assignee._id;
    normalizedSteps[i].assignedUserName = assignee.name;
    if (ref.backupUserName) {
      const backup = visibleUsers.find((u) => String(u.name || '').trim().toLowerCase() === ref.backupUserName.toLowerCase()) || null;
      if (backup) {
        normalizedSteps[i].backupUser = backup._id;
        normalizedSteps[i].backupUserName = backup.name;
      }
    }
  }

  let nextStatus = ['ready', 'active', 'paused', 'completed', 'draft'].includes(String(status || '').toLowerCase())
    ? String(status).toLowerCase()
    : flow.status;
  let nextCurrent = Math.max(0, Math.min(Number(currentStep || 0), Math.max(normalizedSteps.length - 1, 0)));
  const now = new Date();

  let updatedSteps = normalizedSteps.map((s, i) => ({
    ...s,
    status: nextStatus === 'active' ? (i === nextCurrent ? 'in_progress' : 'pending') : (nextStatus === 'completed' ? 'completed' : 'pending'),
    assignedAt: nextStatus === 'active' && i === nextCurrent ? now : null,
    submittedAt: nextStatus === 'completed' ? now : null
  }));

  // Keep completed step evidence from previous version when sequence+title match.
  const oldMap = new Map((flow.steps || []).map((s) => [`${s.sequence}::${s.title}`, s]));
  updatedSteps = updatedSteps.map((s) => {
    const old = oldMap.get(`${s.sequence}::${s.title}`);
    if (!old) return s;
    if (String(old.status || '').toLowerCase() !== 'completed') return s;
    return {
      ...s,
      status: nextStatus === 'completed' ? 'completed' : s.status,
      completedBy: old.completedBy || null,
      completedByName: old.completedByName || '',
      completedAt: old.completedAt || null,
      remarks: old.remarks || '',
      responseText: old.responseText || '',
      responseFields: old.responseFields || {},
      prefillFields: old.prefillFields || {},
      responseLinks: old.responseLinks || [],
      responseFiles: old.responseFiles || [],
      assignedAt: old.assignedAt || s.assignedAt || null,
      submittedAt: old.submittedAt || old.completedAt || s.submittedAt || null
    };
  });

  flow.name = String(name || flow.name).trim();
  flow.intent = String(intent || '').trim();
  flow.status = nextStatus;
  flow.currentStep = nextCurrent;
  flow.steps = updatedSteps;
  flow.aiContext = {
    ...(flow.aiContext || {}),
    intent: flow.intent,
    dataObject: safeDataObject(flow.dataObject),
    stepsData: updatedSteps.map((s) => ({
      sequence: s.sequence,
      title: s.title,
      description: s.description,
      role: s.role,
      actionType: s.actionType,
      status: s.status,
      tatHours: Number(s.tatHours || 0),
      formSchema: s.formSchema || []
    })),
    stepsHistory: updatedSteps.map((s) => ({
      sequence: s.sequence,
      title: s.title,
      description: s.description,
      role: s.role,
      actionType: s.actionType,
      status: s.status,
      tatHours: Number(s.tatHours || 0),
      formSchema: s.formSchema || []
    }))
  };
  flow.events.push({
    actorUser: user._id,
    actorName: user.name,
    eventType: 'flow_updated',
    message: 'Flow definition updated by admin',
    payload: { status: flow.status, currentStep: flow.currentStep, totalSteps: updatedSteps.length }
  });

  await flow.save();
  res.json({ success: true, flow });
});

export const manageFmsFlow = asyncHandler(async (req, res) => {
  const user = req.user;
  const role = String(user?.role || '').trim();
  if (!['Admin', 'Super Admin'].includes(role)) {
    return res.status(403).json({ success: false, error: 'Only Admin/Super Admin can manage flows' });
  }

  const { action = '' } = req.body || {};
  const flow = await FmsFlow.findOne({ _id: req.params.flowId, companyId: user.companyId });
  if (!flow) return res.status(404).json({ success: false, error: 'Flow not found' });

  const now = new Date();
  const act = String(action || '').trim().toLowerCase();

  if (['delete', 'delete_flow', 'remove', 'remove_flow'].includes(act)) {
    await flow.deleteOne();
    return res.json({ success: true, deleted: true, flowId: String(req.params.flowId) });
  }
  if (!flow.steps.length) return res.status(400).json({ success: false, error: 'Flow has no steps' });
  if (act === 'start' || act === 'resume') {
    flow.status = 'active';
    const idx = Math.max(0, Math.min(Number(flow.currentStep || 0), flow.steps.length - 1));
    flow.currentStep = idx;
    flow.steps = flow.steps.map((s, i) => ({
      ...s.toObject(),
      status: i < idx && String(s.status) === 'completed' ? 'completed' : (i === idx ? 'in_progress' : 'pending'),
      assignedAt: i === idx ? now : s.assignedAt || null,
      dueAt: i === idx ? addHours(now, s.tatHours) : s.dueAt || null
    }));
  } else if (act === 'pause') {
    flow.status = 'paused';
  } else if (act === 'restart') {
    flow.status = 'active';
    flow.currentStep = 0;
    flow.steps = flow.steps.map((s, i) => ({
      ...s.toObject(),
      status: i === 0 ? 'in_progress' : 'pending',
      completedBy: null,
      completedByName: '',
      completedAt: null,
      remarks: '',
      responseText: '',
      responseLinks: [],
      responseFiles: [],
      assignedAt: i === 0 ? now : null,
      dueAt: i === 0 ? addHours(now, s.tatHours) : null,
      submittedAt: null
    }));
  } else if (act === 'force_complete') {
    flow.status = 'completed';
    flow.steps = flow.steps.map((s) => ({
      ...s.toObject(),
      status: 'completed',
      completedBy: s.completedBy || user._id,
      completedByName: s.completedByName || user.name,
      completedAt: s.completedAt || now,
      submittedAt: s.submittedAt || s.completedAt || now
    }));
  } else if (act === 'skip') {
    const idx = Math.max(0, Math.min(Number(req.body.stepIndex ?? flow.currentStep ?? 0), flow.steps.length - 1));
    flow.steps[idx].status = 'skipped';
    flow.steps[idx].remarks = String(req.body.remarks || 'Skipped by admin').trim();
    const next = Math.min(idx + 1, flow.steps.length - 1);
    flow.currentStep = next;
    flow.status = next === idx ? 'completed' : 'active';
    if (flow.steps[next] && next !== idx) {
      flow.steps[next].status = 'in_progress';
      flow.steps[next].assignedAt = now;
      flow.steps[next].dueAt = addHours(now, flow.steps[next].tatHours);
    }
  } else if (act === 'escalate') {
    const idx = Math.max(0, Math.min(Number(req.body.stepIndex ?? flow.currentStep ?? 0), flow.steps.length - 1));
    flow.steps[idx].status = 'escalated';
    flow.steps[idx].escalatedAt = now;
    flow.steps[idx].escalatedByName = user.name;
    flow.steps[idx].remarks = String(req.body.remarks || 'Escalated by admin').trim();
  } else if (act === 'reassign') {
    const idx = Math.max(0, Math.min(Number(req.body.stepIndex ?? flow.currentStep ?? 0), flow.steps.length - 1));
    const nextUserName = String(req.body.userName || '').trim();
    const visibleUsers = await getVisibleUsersForFlow(user);
    const assignee = visibleUsers.find((u) => String(u.name || '').trim().toLowerCase() === nextUserName.toLowerCase());
    if (!assignee) return res.status(400).json({ success: false, error: 'Invalid reassignment user' });
    flow.steps[idx].assignedUser = assignee._id;
    flow.steps[idx].assignedUserName = assignee.name;
    flow.steps[idx].assignedAt = now;
    flow.steps[idx].dueAt = addHours(now, flow.steps[idx].tatHours);
    if (idx === Number(flow.currentStep || 0)) flow.steps[idx].status = 'in_progress';
  } else {
    return res.status(400).json({ success: false, error: 'Invalid manage action' });
  }

  flow.events.push({
    actorUser: user._id,
    actorName: user.name,
    eventType: 'flow_admin_action',
    message: `Admin action applied: ${act}`,
    payload: { action: act, status: flow.status, currentStep: flow.currentStep }
  });
  await flow.save();
  res.json({ success: true, flow });
});

export const listFmsSheetConfigs = asyncHandler(async (req, res) => {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ success: false, error: 'Company scope required' });
  const configs = await getSheetConfigsForCompany(companyId);
  res.json({ success: true, configs });
});

export const saveFmsSheetConfig = asyncHandler(async (req, res) => {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ success: false, error: 'Company scope required' });
  const { id = '', name = '', sheetUrl = '' } = req.body || {};
  const cfgName = String(name || '').trim();
  const cfgUrl = String(sheetUrl || '').trim();
  if (!cfgName) return res.status(400).json({ success: false, error: 'Config name is required' });
  if (!cfgUrl) return res.status(400).json({ success: false, error: 'Sheet URL is required' });
  const { sheetId, gid } = parseGoogleSheetUrl(cfgUrl);
  if (!sheetId) return res.status(400).json({ success: false, error: 'Invalid Google Sheet URL' });

  const key = getCompanySheetConfigKey(companyId);
  const existing = await getSheetConfigsForCompany(companyId);
  const normalizedName = cfgName.toLowerCase();
  const targetId = String(id || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`).trim();
  const duplicate = existing.find((x) => x.name.toLowerCase() === normalizedName && x.id !== targetId);
  if (duplicate) return res.status(409).json({ success: false, error: 'Config name already exists' });

  const now = new Date().toISOString();
  const next = existing.filter((x) => x.id !== targetId);
  next.push({
    id: targetId,
    name: cfgName,
    sheetUrl: cfgUrl,
    sheetId,
    gid: gid || '0',
    createdAt: existing.find((x) => x.id === targetId)?.createdAt || now,
    updatedAt: now
  });

  await AppSetting.findOneAndUpdate(
    { key },
    { $set: { value: next, updatedBy: req.user?._id || null } },
    { upsert: true, new: true }
  );
  res.json({ success: true, configs: next });
});

export const deleteFmsSheetConfig = asyncHandler(async (req, res) => {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ success: false, error: 'Company scope required' });
  const configId = String(req.params.configId || '').trim();
  if (!configId) return res.status(400).json({ success: false, error: 'Config id is required' });

  const key = getCompanySheetConfigKey(companyId);
  const existing = await getSheetConfigsForCompany(companyId);
  const next = existing.filter((x) => x.id !== configId);
  if (next.length === existing.length) return res.status(404).json({ success: false, error: 'Config not found' });

  await AppSetting.findOneAndUpdate(
    { key },
    { $set: { value: next, updatedBy: req.user?._id || null } },
    { upsert: true, new: true }
  );
  res.json({ success: true, configs: next });
});

export const importFmsSheetPreview = asyncHandler(async (req, res) => {
  const { sheetUrl = '' } = req.body || {};
  const parsed = await readFmsSheetRows(sheetUrl);

  const sessionId = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const key = getImportSessionKey(req.user, sessionId);
  SHEET_IMPORT_SESSIONS.set(key, {
    sessionId,
    createdAt: new Date().toISOString(),
    sheetUrl: String(sheetUrl || '').trim(),
    sheetId: parsed.sheetId,
    gid: parsed.gid || '0',
    columns: parsed.columns,
    mapping: {},
    rows: parsed.rows
  });

  res.json({
    success: true,
    session: {
      sessionId,
      columns: parsed.columns,
      mapping: {},
      rows: parsed.rows
    }
  });
});

export const suggestFmsSheetMapping = asyncHandler(async (req, res) => {
  const { columns = [], formSchema = [] } = req.body || {};
  if (!Array.isArray(columns) || !columns.length) {
    return res.status(400).json({ success: false, error: 'columns are required' });
  }
  const normalizedSchema = normalizeFormSchema(formSchema, 0);
  const prompt = [
    'Map spreadsheet columns to workflow form fields.',
    'Return only JSON with shape: {"mapping":{"Column Name":"field_id_or_empty"}}',
    `Columns: ${JSON.stringify(columns)}`,
    `Form Fields: ${JSON.stringify(normalizedSchema.map((f) => ({ id: f.id, label: f.label, type: f.type })))}`
  ].join('\n');

  let parsed = {};
  try {
    parsed = await callMistralJson({ prompt, maxTokens: 600, temperature: 0.1 });
  } catch (err) {
    return res.status(503).json({ success: false, error: err?.message || 'Mapping suggestion failed' });
  }
  const mapping = (parsed?.mapping && typeof parsed.mapping === 'object') ? parsed.mapping : {};
  res.json({ success: true, mapping });
});

export const mapFmsSheetSession = asyncHandler(async (req, res) => {
  const { sessionId = '' } = req.params;
  const { mapping = {} } = req.body || {};
  const key = getImportSessionKey(req.user, sessionId);
  const session = SHEET_IMPORT_SESSIONS.get(key);
  if (!session) return res.status(404).json({ success: false, error: 'Import session not found' });
  session.mapping = (mapping && typeof mapping === 'object') ? mapping : {};
  SHEET_IMPORT_SESSIONS.set(key, session);
  res.json({ success: true, session: { sessionId: session.sessionId, columns: session.columns, mapping: session.mapping, rows: session.rows } });
});

export const getFmsSheetSession = asyncHandler(async (req, res) => {
  const { sessionId = '' } = req.params;
  const key = getImportSessionKey(req.user, sessionId);
  const session = SHEET_IMPORT_SESSIONS.get(key);
  if (!session) return res.status(404).json({ success: false, error: 'Import session not found' });
  res.json({ success: true, session: { sessionId: session.sessionId, columns: session.columns, mapping: session.mapping, rows: session.rows } });
});

export const prefillFmsSheetRow = asyncHandler(async (req, res) => {
  const { sessionId = '', rowIndex = '0' } = req.params;
  const key = getImportSessionKey(req.user, sessionId);
  const session = SHEET_IMPORT_SESSIONS.get(key);
  if (!session) return res.status(404).json({ success: false, error: 'Import session not found' });
  const idx = Math.max(0, Number(rowIndex || 0));
  const row = session.rows[idx];
  if (!row) return res.status(404).json({ success: false, error: 'Row not found' });

  const mapped = {};
  Object.entries(session.mapping || {}).forEach(([columnName, fieldId]) => {
    const cleanField = String(fieldId || '').trim();
    if (!cleanField) return;
    mapped[cleanField] = row.values?.[columnName] ?? '';
  });

  const prompt = [
    'Normalize imported row values for a form prefill.',
    'Return only JSON with shape: {"fields":{"field_id":"value"}}.',
    `Fields: ${JSON.stringify(mapped)}`
  ].join('\n');
  let normalized = {};
  try {
    const ai = await callMistralJson({ prompt, maxTokens: 500, temperature: 0.1 });
    normalized = (ai?.fields && typeof ai.fields === 'object') ? ai.fields : mapped;
  } catch {
    normalized = mapped;
  }
  res.json({ success: true, prefill: { rowIndex: idx, fields: normalized } });
});

export const createFlowFromSheetRow = asyncHandler(async (req, res) => {
  const { sessionId = '', rowIndex = '0' } = req.params;
  const { templateFlowId = '', flowName = '', prefillFields = null } = req.body || {};
  const key = getImportSessionKey(req.user, sessionId);
  const session = SHEET_IMPORT_SESSIONS.get(key);
  if (!session) return res.status(404).json({ success: false, error: 'Import session not found' });

  const idx = Math.max(0, Number(rowIndex || 0));
  const row = session.rows[idx];
  if (!row) return res.status(404).json({ success: false, error: 'Row not found' });
  if (String(row.status || '').toLowerCase() === 'added') {
    return res.status(400).json({ success: false, error: 'Row already added' });
  }
  row.status = 'Pending';
  row.error = '';
  session.rows[idx] = row;
  SHEET_IMPORT_SESSIONS.set(key, session);

  const template = await FmsFlow.findOne({ _id: templateFlowId, companyId: req.user.companyId });
  if (!template) {
    row.status = 'Error';
    row.error = 'Template flow not found';
    session.rows[idx] = row;
    SHEET_IMPORT_SESSIONS.set(key, session);
    return res.status(404).json({ success: false, error: 'Template flow not found' });
  }
  if (!Array.isArray(template.steps) || !template.steps.length) {
    row.status = 'Error';
    row.error = 'Template has no steps';
    session.rows[idx] = row;
    SHEET_IMPORT_SESSIONS.set(key, session);
    return res.status(400).json({ success: false, error: 'Template has no steps' });
  }

  const prefill = (prefillFields && typeof prefillFields === 'object')
    ? prefillFields
    : buildPrefillFromSheetRow(row, session.mapping || {});

  let flow = null;
  try {
    const result = await createFmsFlowInstanceFromTemplate({
      template,
      row: { ...row, values: { ...(row.values || {}) } },
      rowIndex: idx,
      mapping: session.mapping || {},
      req,
      flowName: flowName || `${template.name} - Row ${idx + 1}`,
      prefillOverride: prefill,
      eventType: 'flow_created_from_sheet'
    });
    flow = result.flow;
  } catch (err) {
    row.status = 'Error';
    row.error = err?.message || 'Flow creation failed';
    session.rows[idx] = row;
    SHEET_IMPORT_SESSIONS.set(key, session);
    return res.status(500).json({ success: false, error: row.error });
  }

  row.status = 'Added';
  row.error = '';
  session.rows[idx] = row;
  SHEET_IMPORT_SESSIONS.set(key, session);

  res.json({ success: true, flowId: flow._id, rowStatus: row.status, prefill });
});

export const createFmsFlowsFromSheet = asyncHandler(async (req, res) => {
  const {
    templateFlowId = '',
    templateId = '',
    sheetUrl = '',
    mapping = {},
    flowNameTemplate = '',
    limit = 500
  } = req.body || {};
  const cleanTemplateId = String(templateFlowId || templateId || '').trim();
  if (!cleanTemplateId) {
    return res.status(400).json({ success: false, error: 'templateFlowId is required' });
  }
  if (!String(sheetUrl || '').trim()) {
    return res.status(400).json({ success: false, error: 'Google Sheet URL is required' });
  }

  const template = await FmsFlow.findOne({ _id: cleanTemplateId, companyId: req.user.companyId });
  if (!template) return res.status(404).json({ success: false, error: 'Template flow not found' });
  if (!Array.isArray(template.steps) || !template.steps.length) {
    return res.status(400).json({ success: false, error: 'Template has no steps' });
  }

  const sheet = await readFmsSheetRows(sheetUrl);
  const finalMapping = buildSheetFieldMapping(sheet.columns, template, mapping);
  if (!Object.keys(finalMapping).length) {
    return res.status(400).json({
      success: false,
      error: 'No sheet columns could be mapped to template fields',
      columns: sheet.columns
    });
  }

  const maxRows = Math.max(1, Math.min(Number(limit) || 500, 1000));
  const rows = sheet.rows.slice(0, maxRows);
  const created = [];
  const errors = [];

  for (const row of rows) {
    const rowIndex = Number(row.rowIndex || 0);
    try {
      const { flow, prefill } = await createFmsFlowInstanceFromTemplate({
        template,
        row,
        rowIndex,
        mapping: finalMapping,
        req,
        flowName: flowNameTemplate,
        eventType: 'flow_created_from_sheet_bulk'
      });
      created.push({
        flowId: flow._id,
        rowIndex,
        name: flow.name,
        prefill
      });
    } catch (err) {
      errors.push({
        rowIndex,
        error: err?.message || 'Flow creation failed'
      });
    }
  }

  res.json({
    success: true,
    createdCount: created.length,
    skippedCount: Math.max(0, sheet.rows.length - rows.length),
    errorCount: errors.length,
    totalRows: sheet.rows.length,
    mapping: finalMapping,
    created,
    errors
  });
});

export const aiAssistFmsStep = asyncHandler(async (req, res) => {
  const { flowId = '' } = req.params;
  const { mode = 'analyze_submission', formData = {}, notes = '', rowData = {}, fileText = '' } = req.body || {};
  const flow = await FmsFlow.findOne({ _id: flowId, companyId: req.user.companyId }).lean();
  if (!flow) return res.status(404).json({ success: false, error: 'Flow not found' });
  const currentStep = flow.steps?.[Number(flow.currentStep || 0)] || null;
  const context = createFlowContext(flow);

  const prompt = [
    'You are workflow assistant. Never auto-execute or change workflow state.',
    'Return only JSON.',
    `Mode: ${String(mode || 'analyze_submission')}`,
    `Flow Context: ${JSON.stringify(context)}`,
    `Current Step: ${JSON.stringify(currentStep || {})}`,
    `Form Data: ${JSON.stringify(formData || {})}`,
    `Notes: ${String(notes || '')}`,
    `Row Data: ${JSON.stringify(rowData || {})}`,
    `File Text: ${String(fileText || '')}`,
    'Expected JSON shape:',
    '{"summary":"","issues":[],"suggestedAction":"approve|reject|send_back|none","fieldSuggestions":{},"noteSuggestion":"","proposedChanges":{"addStep":null,"skipStep":null,"modifyForm":null}}'
  ].join('\n');

  let analysis = {};
  try {
    analysis = await callMistralJson({ prompt, maxTokens: 1100, temperature: 0.2 });
  } catch (err) {
    return res.status(503).json({ success: false, error: err?.message || 'AI assist failed' });
  }

  res.json({
    success: true,
    analysis: {
      summary: String(analysis?.summary || '').trim(),
      issues: Array.isArray(analysis?.issues) ? analysis.issues : [],
      suggestedAction: String(analysis?.suggestedAction || 'none'),
      fieldSuggestions: (analysis?.fieldSuggestions && typeof analysis.fieldSuggestions === 'object') ? analysis.fieldSuggestions : {},
      noteSuggestion: String(analysis?.noteSuggestion || ''),
      proposedChanges: analysis?.proposedChanges || {}
    }
  });
});

export const fmsFlowAnalytics = asyncHandler(async (req, res) => {
  const rows = await FmsFlow.find({ companyId: req.user.companyId }).lean();
  const stats = {
    totalFlows: rows.length,
    activeFlows: 0,
    completedFlows: 0,
    totalSteps: 0,
    completedSteps: 0,
    overdueSteps: 0,
    reworkCount: 0,
    skippedSteps: 0,
    escalatedSteps: 0,
    avgCompletionHours: 0,
    bottlenecks: []
  };
  const stepBuckets = new Map();
  let completionHours = 0;
  let completionCount = 0;

  rows.forEach((flow) => {
    if (flow.status === 'active') stats.activeFlows += 1;
    if (flow.status === 'completed') stats.completedFlows += 1;
    stats.reworkCount += (flow.events || []).filter((e) => e.eventType === 'step_rework').length;
    (flow.steps || []).forEach((step) => {
      stats.totalSteps += 1;
      const runtime = getStepRuntime(step);
      if (runtime.overdue) stats.overdueSteps += 1;
      if (step.status === 'completed') stats.completedSteps += 1;
      if (step.status === 'skipped') stats.skippedSteps += 1;
      if (step.status === 'escalated') stats.escalatedSteps += 1;
      if (step.assignedAt && (step.submittedAt || step.completedAt)) {
        const hours = (new Date(step.submittedAt || step.completedAt).getTime() - new Date(step.assignedAt).getTime()) / 36e5;
        if (Number.isFinite(hours) && hours >= 0) {
          completionHours += hours;
          completionCount += 1;
        }
      }
      const key = `${step.title || 'Untitled'}::${step.assignedUserName || 'Unassigned'}`;
      const bucket = stepBuckets.get(key) || { title: step.title || 'Untitled', assignedTo: step.assignedUserName || 'Unassigned', open: 0, overdue: 0, completed: 0 };
      if (['pending', 'in_progress', 'escalated'].includes(step.status)) bucket.open += 1;
      if (runtime.overdue) bucket.overdue += 1;
      if (step.status === 'completed') bucket.completed += 1;
      stepBuckets.set(key, bucket);
    });
  });

  stats.avgCompletionHours = completionCount ? Number((completionHours / completionCount).toFixed(2)) : 0;
  stats.bottlenecks = Array.from(stepBuckets.values())
    .sort((a, b) => (b.overdue + b.open) - (a.overdue + a.open))
    .slice(0, 8);
  res.json({ success: true, stats });
});
