import bcrypt from 'bcryptjs';
import { Company } from '../models/Company.js';
import { PlanRequest } from '../models/PlanRequest.js';
import { PlatformAudit } from '../models/PlatformAudit.js';
import { Role } from '../models/Role.js';
import { User } from '../models/User.js';
import { AppSetting } from '../models/AppSetting.js';
import { ApiError } from '../utils/ApiError.js';
import { recordPlatformAudit } from './platformAuditService.js';
import { composeProfessionalEmailTemplate, resetMailTransportCache, sendEmail } from './notificationService.js';

const PLAN_CATALOG = {
  Basic: { monthlyRate: 4999, maxUsers: 25 },
  Professional: { monthlyRate: 9999, maxUsers: 75 },
  Enterprise: { monthlyRate: 19999, maxUsers: 250 },
  Starter: { monthlyRate: 4999, maxUsers: 25 },
  Growth: { monthlyRate: 9999, maxUsers: 75 }
};

const DEFAULT_COMPANY_FEATURES = {
  dashboard: true,
  checklists: true,
  delegation: true,
  workRequest: true,
  fmsSystem: true,
  trackStatus: true,
  mis: true,
  reports: true
};

const DEFAULT_ROLE_DEFINITIONS = [
  {
    roleName: 'Super Admin',
    permissions: {
      canViewAllTasks: true,
      canCreateTasks: true,
      canApproveTasks: true,
      canViewMIS: true
    },
    isSystemRole: true
  },
  {
    roleName: 'Admin',
    permissions: {
      canViewAllTasks: false,
      canCreateTasks: true,
      canApproveTasks: true,
      canViewMIS: true
    },
    isSystemRole: true
  },
  {
    roleName: 'Employee',
    permissions: {
      canViewAllTasks: false,
      canCreateTasks: false,
      canApproveTasks: false,
      canViewMIS: false
    },
    isSystemRole: true
  }
];

const NOTIFICATION_SETTINGS_KEY = 'platformNotificationSettings';
function getCompanyNotificationKey(companyId) {
  return `${NOTIFICATION_SETTINGS_KEY}:${String(companyId || '').trim()}`;
}

function normalizePlanName(planName = 'Basic') {
  const value = String(planName || 'Basic').trim();
  return value || 'Basic';
}

function deriveMonthlyRate(planName, monthlyRate) {
  if (Number.isFinite(Number(monthlyRate)) && Number(monthlyRate) >= 0) {
    return Number(monthlyRate);
  }
  return PLAN_CATALOG[planName]?.monthlyRate || PLAN_CATALOG.Basic.monthlyRate;
}

function deriveMaxUsers(planName, maxUsers) {
  if (Number.isFinite(Number(maxUsers)) && Number(maxUsers) > 0) {
    return Number(maxUsers);
  }
  return PLAN_CATALOG[planName]?.maxUsers || PLAN_CATALOG.Basic.maxUsers;
}

function endOfToday() {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  return now;
}

function plusDays(days, fromDate = new Date()) {
  return new Date(fromDate.getTime() + days * 24 * 60 * 60 * 1000);
}

function plusYears(years, fromDate = new Date()) {
  const value = new Date(fromDate);
  value.setFullYear(value.getFullYear() + years);
  return value;
}

function normalizeEnabledFeatures(enabledFeatures = {}) {
  const source = enabledFeatures && typeof enabledFeatures === 'object' ? enabledFeatures : {};
  return {
    dashboard: source.dashboard !== false,
    checklists: source.checklists !== false,
    delegation: source.delegation !== false,
    workRequest: source.workRequest !== false,
    fmsSystem: source.fmsSystem !== false,
    trackStatus: source.trackStatus !== false,
    mis: source.mis !== false,
    reports: source.reports !== false
  };
}

function getEffectiveCompanyStatus(company) {
  if (!company) {
    return 'Expired';
  }
  if (company.status === 'Frozen') {
    return 'Frozen';
  }
  const now = new Date();
  const graceUntil = company.graceUntil ? new Date(company.graceUntil) : null;
  const expiry = company.planExpiryDate ? new Date(company.planExpiryDate) : null;
  if (graceUntil && graceUntil >= now) {
    return 'Active';
  }
  if (expiry && expiry < now) {
    return 'Expired';
  }
  return company.status || 'Active';
}

async function getCompanyUserCountMap() {
  const rows = await User.aggregate([
    { $match: { companyId: { $ne: null } } },
    { $group: { _id: '$companyId', totalUsers: { $sum: 1 } } }
  ]);
  return new Map(rows.map((row) => [String(row._id), row.totalUsers]));
}

function serializeCompany(company, totalUsers = 0) {
  const effectiveStatus = getEffectiveCompanyStatus(company);
  return {
    ...company,
    status: effectiveStatus,
    totalUsers,
    usagePercent: company.maxUsers ? Math.min(100, Math.round((totalUsers / company.maxUsers) * 100)) : 0,
    monthlyRate: Number(company.monthlyRate || 0),
    maxUsers: Number(company.maxUsers || 0),
    enabledFeatures: normalizeEnabledFeatures(company.enabledFeatures || DEFAULT_COMPANY_FEATURES)
  };
}

export async function seedDefaultRoles(companyId) {
  await Promise.all(
    DEFAULT_ROLE_DEFINITIONS.map((item) =>
      Role.findOneAndUpdate(
        { companyId, roleName: item.roleName },
        { ...item, companyId },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
    )
  );
}

export async function getPlatformStats() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const companies = await Company.find().lean();
  const userCount = await User.countDocuments({ companyId: { $ne: null } });
  const active = companies.filter((company) => getEffectiveCompanyStatus(company) === 'Active');
  const frozenOrExpired = companies.filter((company) => ['Frozen', 'Expired'].includes(getEffectiveCompanyStatus(company)));
  const newThisMonth = companies.filter((company) => company.createdAt >= monthStart).length;
  const mrr = active.reduce((sum, company) => sum + Number(company.monthlyRate || 0), 0);
  const churnBase = companies.length || 1;
  const churnRate = Number(((frozenOrExpired.length / churnBase) * 100).toFixed(1));

  return {
    success: true,
    metrics: {
      totalCompanies: companies.length,
      activeCompanies: active.length,
      frozenExpiredCompanies: frozenOrExpired.length,
      totalUsers: userCount,
      mrr,
      churnRate,
      newThisMonth
    }
  };
}

export async function listCompanies(search = '') {
  const filter = search
    ? {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { code: { $regex: search, $options: 'i' } },
          { contactPerson: { $regex: search, $options: 'i' } },
          { contactEmail: { $regex: search, $options: 'i' } }
        ]
      }
    : {};
  const [companies, userCountMap] = await Promise.all([Company.find(filter).sort({ createdAt: -1 }).lean(), getCompanyUserCountMap()]);
  return {
    success: true,
    companies: companies.map((company) => serializeCompany(company, userCountMap.get(String(company._id)) || 0))
  };
}

export async function createCompany(payload = {}, actor = null) {
  const name = String(payload.name || '').trim();
  const code = String(payload.code || '').trim().toUpperCase();
  const planName = normalizePlanName(payload.planName || 'Basic');
  const companyExpiry = payload.planExpiryDate ? new Date(payload.planExpiryDate) : plusYears(1);
  const contactPerson = String(payload.contactPerson || '').trim();
  const contactEmail = String(payload.contactEmail || payload.superAdminEmail || '').trim().toLowerCase();
  const contactPhone = String(payload.contactPhone || '').trim();
  const domain = String(payload.domain || `${code.toLowerCase()}.taskdone.local`).trim().toLowerCase();
  const superAdminName = String(payload.superAdminName || contactPerson || 'Super Admin').trim();
  const superAdminEmail = String(payload.superAdminEmail || contactEmail).trim().toLowerCase();
  const superAdminUserId = String(payload.superAdminUserId || `${code}-ADMIN`).trim();
  const adminPassword = String(payload.adminPassword || '').trim();

  if (!name || !code || !superAdminEmail || !adminPassword) {
    throw new ApiError(400, 'name, code, superAdminEmail and adminPassword are required');
  }
  if (adminPassword.length < 8) {
    throw new ApiError(400, 'adminPassword must be at least 8 characters');
  }

  const [companyExists, emailExists, userIdExists] = await Promise.all([
    Company.findOne({ $or: [{ name }, { code }] }).lean(),
    User.findOne({ email: superAdminEmail }).lean(),
    User.findOne({ userId: superAdminUserId }).lean()
  ]);
  if (companyExists) {
    throw new ApiError(409, 'Company name or code already exists');
  }
  if (emailExists) {
    throw new ApiError(409, 'Super Admin email already exists');
  }
  if (userIdExists) {
    throw new ApiError(409, 'Super Admin userId already exists');
  }

  const company = await Company.create({
    name,
    code,
    status: 'Active',
    planName,
    planExpiryDate: companyExpiry,
    monthlyRate: deriveMonthlyRate(planName, payload.monthlyRate),
    maxUsers: deriveMaxUsers(planName, payload.maxUsers),
    contactPerson,
    contactEmail,
    contactPhone,
    domain,
    superAdminEmail,
    superAdminUserId,
    enabledFeatures: normalizeEnabledFeatures(payload.enabledFeatures || DEFAULT_COMPANY_FEATURES),
    createdBy: actor?._id || null
  });

  await seedDefaultRoles(company._id);

  const passwordHash = await bcrypt.hash(adminPassword, 10);
  const superAdmin = await User.create({
    name: superAdminName,
    userId: superAdminUserId,
    email: superAdminEmail,
    passwordHash,
    role: 'Super Admin',
    roleName: 'Super Admin',
    companyId: company._id,
    isAppAdmin: false,
    status: 'Active',
    number: contactPhone
  });

  await Company.updateOne({ _id: company._id }, { contactPerson: superAdminName });

  await recordPlatformAudit({
    actor,
    action: 'Created new company',
    entityType: 'Company',
    entityId: company._id,
    targetCompanyId: company._id,
    targetCompanyName: company.name,
    details: {
      code: company.code,
      planName,
      maxUsers: company.maxUsers,
      superAdminEmail,
      superAdminUserId
    }
  });

  return {
    success: true,
    company: serializeCompany({ ...company.toObject(), contactPerson: superAdminName }, 1),
    superAdmin: {
      id: superAdmin._id,
      name: superAdmin.name,
      email: superAdmin.email,
      userId: superAdmin.userId,
      role: superAdmin.role
    }
  };
}

export async function getCompanySubscription(companyId) {
  const company = await Company.findById(companyId).lean();
  if (!company) {
    throw new ApiError(404, 'Company not found');
  }
  return {
    success: true,
    subscription: {
      planName: company.planName || '',
      expiryDate: company.planExpiryDate || null,
      status: getEffectiveCompanyStatus(company),
      maxUsers: company.maxUsers || 0,
      monthlyRate: Number(company.monthlyRate || 0),
      graceUntil: company.graceUntil || null,
      enabledFeatures: normalizeEnabledFeatures(company.enabledFeatures || DEFAULT_COMPANY_FEATURES)
    }
  };
}

export async function updateCompanyStatus(companyId, status, actor = null) {
  if (!['Active', 'Frozen'].includes(status)) {
    throw new ApiError(400, 'Invalid status');
  }
  const company = await Company.findByIdAndUpdate(companyId, { status }, { new: true }).lean();
  if (!company) {
    throw new ApiError(404, 'Company not found');
  }
  await recordPlatformAudit({
    actor,
    action: status === 'Frozen' ? 'Froze company' : 'Unfroze company',
    entityType: 'Company',
    entityId: company._id,
    targetCompanyId: company._id,
    targetCompanyName: company.name,
    details: { status }
  });
  return { success: true, company: serializeCompany(company) };
}

export async function updateCompanySubscription(companyId, payload = {}, actor = null, auditAction = 'Manual subscription override') {
  const company = await Company.findById(companyId).lean();
  if (!company) {
    throw new ApiError(404, 'Company not found');
  }
  const planName = normalizePlanName(payload.planName || company.planName || 'Basic');
  const update = {
    planName,
    monthlyRate: deriveMonthlyRate(planName, payload.monthlyRate ?? company.monthlyRate),
    maxUsers: deriveMaxUsers(planName, payload.maxUsers ?? company.maxUsers),
    status: payload.status === 'Frozen' ? 'Frozen' : 'Active',
    graceUntil: payload.graceUntil ? new Date(payload.graceUntil) : null,
    enabledFeatures: normalizeEnabledFeatures({ ...(company.enabledFeatures || DEFAULT_COMPANY_FEATURES), ...(payload.enabledFeatures || {}) })
  };
  if (payload.planExpiryDate) {
    update.planExpiryDate = new Date(payload.planExpiryDate);
  }
  const updated = await Company.findByIdAndUpdate(companyId, update, { new: true }).lean();
  await recordPlatformAudit({
    actor,
    action: auditAction,
    entityType: 'Subscription',
    entityId: companyId,
    targetCompanyId: updated._id,
    targetCompanyName: updated.name,
    details: {
      oldPlan: company.planName,
      newPlan: updated.planName,
      oldExpiryDate: company.planExpiryDate,
      newExpiryDate: updated.planExpiryDate,
      oldMaxUsers: company.maxUsers,
      newMaxUsers: updated.maxUsers
    }
  });
  return { success: true, company: serializeCompany(updated) };
}

export async function listCompanyUsers(companyId) {
  const rows = await User.find({ companyId })
    .select('name userId email role roleName status companyId createdAt')
    .sort({ role: 1, name: 1 })
    .lean();
  return {
    success: true,
    users: rows.map((row) => ({
      id: row._id,
      name: row.name,
      userId: row.userId,
      email: row.email,
      role: row.roleName || row.role,
      status: row.status,
      companyId: row.companyId,
      createdAt: row.createdAt
    }))
  };
}

export async function listCompanyRoles(companyId) {
  let rows = await Role.find({ companyId }).sort({ isSystemRole: -1, roleName: 1 }).lean();
  if (rows.length === 0) {
    await seedDefaultRoles(companyId);
    rows = await Role.find({ companyId }).sort({ isSystemRole: -1, roleName: 1 }).lean();
  }
  return { success: true, roles: rows };
}

export async function upsertCompanyRole(companyId, payload = {}) {
  const { roleId, roleName, permissions = {}, isSystemRole = false } = payload;
  if (!roleName) {
    throw new ApiError(400, 'roleName is required');
  }
  const filter = roleId ? { _id: roleId, companyId } : { companyId, roleName };
  const role = await Role.findOneAndUpdate(
    filter,
    {
      companyId,
      roleName,
      permissions: {
        canViewAllTasks: Boolean(permissions.canViewAllTasks),
        canCreateTasks: Boolean(permissions.canCreateTasks),
        canApproveTasks: Boolean(permissions.canApproveTasks),
        canViewMIS: Boolean(permissions.canViewMIS)
      },
      isSystemRole: Boolean(isSystemRole)
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
  return { success: true, role };
}

export async function deleteCompanyRole(companyId, roleId) {
  const role = await Role.findOne({ _id: roleId, companyId }).lean();
  if (!role) {
    throw new ApiError(404, 'Role not found');
  }
  if (role.isSystemRole) {
    throw new ApiError(400, 'Default roles cannot be deleted');
  }
  await Role.deleteOne({ _id: role._id });
  return { success: true, message: 'Role deleted' };
}

export async function listRenewalsData({ days = 30, search = '' } = {}) {
  const now = new Date();
  const cutoff = plusDays(Number(days) || 30, endOfToday());
  const baseRows = await Company.find({ planExpiryDate: { $ne: null, $lte: cutoff } }).sort({ planExpiryDate: 1 }).lean();
  const filteredRows = search
    ? baseRows.filter((company) => [company.name, company.code, company.contactPerson, company.contactEmail].some((value) => String(value || '').toLowerCase().includes(String(search).toLowerCase())))
    : baseRows;
  const userCountMap = await getCompanyUserCountMap();
  return {
    success: true,
    renewals: filteredRows.map((company) => serializeCompany(company, userCountMap.get(String(company._id)) || 0))
  };
}

export async function getRenewalsData({ days = 30, search = '' } = {}) {
  return listRenewalsData({ days, search });
}

export async function handleRenewalAction({ companyId, action } = {}, actor = null) {
  const company = await Company.findById(companyId).lean();
  if (!company) {
    throw new ApiError(404, 'Company not found');
  }
  const baseDate = company.planExpiryDate && new Date(company.planExpiryDate) > new Date() ? new Date(company.planExpiryDate) : new Date();
  let update = {};
  let auditAction = '';
  if (action === 'renew') {
    update = { planExpiryDate: plusYears(1, baseDate), status: 'Active', graceUntil: null };
    auditAction = 'Renewed subscription';
  } else if (action === 'extend') {
    update = { graceUntil: plusDays(30, baseDate), status: 'Active' };
    auditAction = 'Extended renewal grace period';
  } else if (action === 'remind') {
    update = { lastReminderAt: new Date() };
    auditAction = 'Sent renewal reminder';
  } else {
    throw new ApiError(400, 'Invalid renewal action');
  }
  const updated = await Company.findByIdAndUpdate(companyId, update, { new: true }).lean();
  await recordPlatformAudit({
    actor,
    action: auditAction,
    entityType: 'Subscription',
    entityId: updated._id,
    targetCompanyId: updated._id,
    targetCompanyName: updated.name,
    details: { action, planExpiryDate: updated.planExpiryDate, graceUntil: updated.graceUntil }
  });
  return { success: true, company: serializeCompany(updated) };
}

export async function getPlanRequests({ status = '', search = '' } = {}) {
  const filter = {};
  if (status && status !== 'All') {
    filter.status = status;
  }
  if (search) {
    filter.$or = [
      { companyName: { $regex: search, $options: 'i' } },
      { requestedPlan: { $regex: search, $options: 'i' } },
      { requestedByEmail: { $regex: search, $options: 'i' } }
    ];
  }
  const requests = await PlanRequest.find(filter).sort({ createdAt: -1 }).lean();
  return { success: true, requests };
}

export async function approvePlanRequest({ requestId, planName, expiryDate, maxUsers, monthlyRate } = {}, actor = null) {
  const request = await PlanRequest.findById(requestId).lean();
  if (!request) {
    throw new ApiError(404, 'Plan request not found');
  }
  if (request.status !== 'Pending') {
    throw new ApiError(400, 'Plan request is already closed');
  }
  const finalPlan = normalizePlanName(planName || request.requestedPlan || 'Basic');
  const finalExpiryDate = expiryDate ? new Date(expiryDate) : plusYears(1);
  await updateCompanySubscription(
    request.companyId,
    {
      planName: finalPlan,
      planExpiryDate: finalExpiryDate,
      maxUsers,
      monthlyRate,
      status: 'Active'
    },
    actor,
    'Approved plan request'
  );
  const updatedRequest = await PlanRequest.findByIdAndUpdate(
    requestId,
    {
      status: 'Approved',
      reviewedBy: actor?._id || null,
      reviewedAt: new Date(),
      finalizedPlan: finalPlan,
      finalizedExpiryDate: finalExpiryDate
    },
    { new: true }
  ).lean();
  await recordPlatformAudit({
    actor,
    action: 'Approved plan request',
    entityType: 'PlanRequest',
    entityId: updatedRequest._id,
    targetCompanyId: request.companyId,
    targetCompanyName: request.companyName,
    details: { requestedPlan: request.requestedPlan, finalizedPlan: finalPlan, finalizedExpiryDate: finalExpiryDate }
  });
  return { success: true, request: updatedRequest };
}

export async function rejectPlanRequest({ requestId, reason = '' } = {}, actor = null) {
  const request = await PlanRequest.findById(requestId).lean();
  if (!request) {
    throw new ApiError(404, 'Plan request not found');
  }
  if (request.status !== 'Pending') {
    throw new ApiError(400, 'Plan request is already closed');
  }
  const updatedRequest = await PlanRequest.findByIdAndUpdate(
    requestId,
    {
      status: 'Rejected',
      reviewedBy: actor?._id || null,
      reviewedAt: new Date(),
      rejectionReason: String(reason || '').trim()
    },
    { new: true }
  ).lean();
  await recordPlatformAudit({
    actor,
    action: 'Rejected plan request',
    entityType: 'PlanRequest',
    entityId: updatedRequest._id,
    targetCompanyId: request.companyId,
    targetCompanyName: request.companyName,
    status: 'Rejected',
    details: { requestedPlan: request.requestedPlan, reason: updatedRequest.rejectionReason }
  });
  return { success: true, request: updatedRequest };
}

export async function getPlatformAuditLogs({ search = '', limit = 100 } = {}) {
  const filter = search
    ? {
        $or: [
          { actorEmail: { $regex: search, $options: 'i' } },
          { actorName: { $regex: search, $options: 'i' } },
          { targetCompanyName: { $regex: search, $options: 'i' } },
          { action: { $regex: search, $options: 'i' } }
        ]
      }
    : {};
  const logs = await PlatformAudit.find(filter).sort({ createdAt: -1 }).limit(Math.min(Number(limit) || 100, 250)).lean();
  return { success: true, logs };
}

export async function listSubscriptions(search = '') {
  const response = await listCompanies(search);
  return {
    success: true,
    subscriptions: response.companies.map((company) => ({
      companyId: company._id,
      companyName: company.name,
      planName: company.planName,
      status: company.status,
      expiryDate: company.planExpiryDate,
      maxUsers: company.maxUsers,
      monthlyRate: company.monthlyRate,
      totalUsers: company.totalUsers,
      contactEmail: company.contactEmail,
      enabledFeatures: normalizeEnabledFeatures(company.enabledFeatures || DEFAULT_COMPANY_FEATURES)
    }))
  };
}

export async function getCompanyFullDetails(companyId) {
  const [company, users, roles] = await Promise.all([
    Company.findById(companyId).lean(),
    User.find({ companyId }).select('name userId email role roleName status createdAt').sort({ role: 1, name: 1 }).lean(),
    Role.find({ companyId }).sort({ isSystemRole: -1, roleName: 1 }).lean()
  ]);
  if (!company) {
    throw new ApiError(404, 'Company not found');
  }
  const totalUsers = users.length;
  return {
    success: true,
    company: serializeCompany(company, totalUsers),
    usage: {
      maxUsers: company.maxUsers || 0,
      totalUsers,
      availableSeats: Math.max(0, Number(company.maxUsers || 0) - totalUsers)
    },
    users: users.map((user) => ({
      id: user._id,
      name: user.name,
      userId: user.userId,
      email: user.email,
      role: user.roleName || user.role,
      status: user.status,
      createdAt: user.createdAt
    })),
    roles
  };
}

export async function getUserCredentials(userId) {
  const user = await User.findOne({ userId }).select('name userId email role roleName status').lean();
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  return {
    success: true,
    credentials: {
      name: user.name,
      userId: user.userId,
      email: user.email,
      role: user.roleName || user.role,
      status: user.status
    }
  };
}

export async function resetUserPasswordGlobal(userId, password, actor = null) {
  if (!password || String(password).length < 8) {
    throw new ApiError(400, 'Password must be at least 8 characters');
  }
  const user = await User.findOne({ userId }).lean();
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  const passwordHash = await bcrypt.hash(String(password), 10);
  await User.updateOne({ _id: user._id }, { passwordHash });
  await recordPlatformAudit({
    actor,
    action: 'Reset platform user password',
    entityType: 'User',
    entityId: userId,
    targetCompanyId: user.companyId || null,
    details: { userId, email: user.email }
  });
  return { success: true, message: 'Password reset successfully' };
}

export async function changeUserRoleGlobal(userId, payload = {}, actor = null) {
  const { companyId, roleName } = payload;
  if (!companyId || !roleName) {
    throw new ApiError(400, 'companyId and roleName are required');
  }
  const role = await Role.findOne({ companyId, roleName }).lean();
  if (!role) {
    throw new ApiError(404, 'Role not found for company');
  }
  const roleValue = ['Super Admin', 'Admin', 'Employee'].includes(roleName) ? roleName : 'Admin';
  const user = await User.findOneAndUpdate(
    { userId },
    { role: roleValue, roleName, companyId, isAppAdmin: false },
    { new: true }
  ).lean();
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  await recordPlatformAudit({
    actor,
    action: 'Changed platform user role',
    entityType: 'User',
    entityId: userId,
    targetCompanyId: user.companyId || null,
    details: { roleName }
  });
  return { success: true, message: 'User role updated' };
}

export async function toggleUserStatusGlobal(userId, actor = null) {
  const user = await User.findOne({ userId }).lean();
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  const nextStatus = user.status === 'Active' ? 'Inactive' : 'Active';
  await User.updateOne({ _id: user._id }, { status: nextStatus });
  await recordPlatformAudit({
    actor,
    action: 'Toggled platform user status',
    entityType: 'User',
    entityId: userId,
    targetCompanyId: user.companyId || null,
    details: { previousStatus: user.status, nextStatus }
  });
  return { success: true, status: nextStatus };
}

export async function updateUserEmailGlobal(userId, email, actor = null) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) {
    throw new ApiError(400, 'email is required');
  }
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(normalizedEmail)) {
    throw new ApiError(400, 'Invalid email format');
  }

  const user = await User.findOne({ userId }).lean();
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const duplicate = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } }).lean();
  if (duplicate) {
    throw new ApiError(409, 'Email already exists for another user');
  }

  await User.updateOne({ _id: user._id }, { email: normalizedEmail });
  await recordPlatformAudit({
    actor,
    action: 'Updated user receiver email',
    entityType: 'User',
    entityId: userId,
    targetCompanyId: user.companyId || null,
    details: { previousEmail: user.email, nextEmail: normalizedEmail }
  });
  return { success: true, message: 'User email updated', email: normalizedEmail };
}

function sanitizeNotificationSettings(input = {}, preservePassword = '') {
  const senderIn = input.sender && typeof input.sender === 'object' ? input.sender : {};
  const smtpIn = input.smtp && typeof input.smtp === 'object' ? input.smtp : {};
  const secure = smtpIn.secure === true || Number(smtpIn.port) === 465;
  const smtpPassword = String(smtpIn.password || '').trim() || String(preservePassword || '').trim();
  return {
    sender: {
      fromName: String(senderIn.fromName || '').trim(),
      fromEmail: String(senderIn.fromEmail || '').trim().toLowerCase(),
      replyTo: String(senderIn.replyTo || '').trim().toLowerCase()
    },
    smtp: {
      host: String(smtpIn.host || '').trim(),
      port: Number(smtpIn.port || 587),
      secure,
      user: String(smtpIn.user || '').trim(),
      password: smtpPassword
    },
    notifications: {
      assignment: input.notifications?.assignment !== false,
      submission: input.notifications?.submission !== false,
      approval: input.notifications?.approval !== false,
      rework: input.notifications?.rework !== false
    },
    updatedAt: new Date().toISOString()
  };
}

function toSafeNotificationSettings(value = {}) {
  const normalized = sanitizeNotificationSettings(value);
  return {
    ...normalized,
    smtp: {
      ...normalized.smtp,
      password: normalized.smtp.password ? '********' : ''
    }
  };
}

async function getNotificationSettingsByCompanyId(companyId) {
  const row = await AppSetting.findOne({ key: getCompanyNotificationKey(companyId) }).select('value updatedAt').lean();
  if (!row?.value) {
    return {
      success: true,
      settings: {
        sender: { fromName: '', fromEmail: '', replyTo: '' },
        smtp: { host: '', port: 587, secure: false, user: '', password: '' },
        notifications: { assignment: true, submission: true, approval: true, rework: true },
        updatedAt: null
      }
    };
  }
  return { success: true, settings: toSafeNotificationSettings(row.value) };
}

async function saveNotificationSettingsByCompanyId(companyId, payload = {}, actor = null) {
  if (!companyId) {
    throw new ApiError(400, 'companyId is required');
  }
  const key = getCompanyNotificationKey(companyId);
  const existing = await AppSetting.findOne({ key }).select('value').lean();
  const preservePassword = existing?.value?.smtp?.password || '';
  const next = sanitizeNotificationSettings(payload, preservePassword);

  if (!next.sender.fromEmail || !next.smtp.host || !next.smtp.user || !next.smtp.password) {
    throw new ApiError(400, 'Sender email and SMTP host/user/password are required');
  }

  await AppSetting.findOneAndUpdate(
    { key },
    { key, value: next, updatedBy: actor?._id || null },
    { upsert: true, new: true }
  );
  resetMailTransportCache();
  await recordPlatformAudit({
    actor,
    action: 'Updated company notification settings',
    entityType: 'Settings',
    entityId: key,
    targetCompanyId: companyId,
    details: {
      senderFromEmail: next.sender.fromEmail,
      smtpHost: next.smtp.host,
      smtpPort: next.smtp.port
    }
  });
  return { success: true, settings: toSafeNotificationSettings(next) };
}

async function sendNotificationTestEmailByCompanyId(companyId, payload = {}, actor = null) {
  if (!companyId) {
    throw new ApiError(400, 'companyId is required');
  }
  const to = String(payload.to || actor?.email || '').trim().toLowerCase();
  if (!to) {
    throw new ApiError(400, 'Recipient test email is required');
  }
  const tpl = await composeProfessionalEmailTemplate({
    category: 'System',
    action: 'Notification Configuration Test',
    recipientName: actor?.name || 'Team Member',
    title: 'TaskDone Notification Test Mail',
    body: 'This is a system validation email. Sender identity and SMTP configuration are correctly set up.',
    details: {
      Environment: process.env.NODE_ENV || 'development',
      CompanyId: String(companyId || ''),
      TriggeredBy: actor?.email || 'manual'
    }
  });
  const result = await sendEmail({
    to,
    companyId,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text
  });
  if (!result.success) {
    throw new ApiError(400, result.error || 'Failed to send test email');
  }
  await recordPlatformAudit({
    actor,
    action: 'Sent company notification test email',
    entityType: 'Settings',
    entityId: getCompanyNotificationKey(companyId),
    targetCompanyId: companyId,
    details: { to }
  });
  return { success: true, message: 'Test email sent successfully', to };
}

export async function getPlatformNotificationSettings(companyId) {
  return getNotificationSettingsByCompanyId(companyId);
}

export async function savePlatformNotificationSettings(companyId, payload = {}, actor = null) {
  return saveNotificationSettingsByCompanyId(companyId, payload, actor);
}

export async function sendPlatformNotificationTestEmail(companyId, payload = {}, actor = null) {
  return sendNotificationTestEmailByCompanyId(companyId, payload, actor);
}

export async function getSuperAdminNotificationSettings(actor) {
  if (!actor?.companyId) throw new ApiError(400, 'Company context missing');
  return getNotificationSettingsByCompanyId(actor.companyId);
}

export async function saveSuperAdminNotificationSettings(payload = {}, actor = null) {
  if (!actor?.companyId) throw new ApiError(400, 'Company context missing');
  return saveNotificationSettingsByCompanyId(actor.companyId, payload, actor);
}

export async function sendSuperAdminNotificationTestEmail(payload = {}, actor = null) {
  if (!actor?.companyId) throw new ApiError(400, 'Company context missing');
  return sendNotificationTestEmailByCompanyId(actor.companyId, payload, actor);
}

export async function updatePlatformUser(userId, payload = {}, actor = null) {
  const operation = String(payload.operation || '').trim();
  if (operation === 'viewCredentials') {
    return getUserCredentials(userId);
  }
  if (operation === 'resetPassword') {
    return resetUserPasswordGlobal(userId, payload.password, actor);
  }
  if (operation === 'toggleStatus') {
    return toggleUserStatusGlobal(userId, actor);
  }
  if (operation === 'changeRole') {
    return changeUserRoleGlobal(userId, payload, actor);
  }
  if (operation === 'updateEmail') {
    return updateUserEmailGlobal(userId, payload.email, actor);
  }
  throw new ApiError(400, 'Invalid platform user operation');
}

export async function updateCompanyFmsConfig(companyId, payload = {}, actor = null) {
  const { sheetId = '', range = 'FMS!A2:M', serviceAccountJson = '' } = payload;
  const company = await Company.findByIdAndUpdate(
    companyId,
    {
      fmsConfig: { sheetId, range, serviceAccountJson }
    },
    { new: true }
  ).lean();
  if (!company) {
    throw new ApiError(404, 'Company not found');
  }
  await recordPlatformAudit({
    actor,
    action: 'Updated company FMS config',
    entityType: 'Company',
    entityId: company._id,
    targetCompanyId: company._id,
    targetCompanyName: company.name,
    details: { sheetId, range }
  });
  return { success: true, company: serializeCompany(company) };
}

export async function recordUnauthorizedPlatformAccess({ actor = null, method, params = [] } = {}) {
  await recordPlatformAudit({
    actor,
    action: 'Unauthorized Access Attempt',
    entityType: 'RPC',
    entityId: method,
    status: 'Blocked',
    details: { method, params }
  });
}
