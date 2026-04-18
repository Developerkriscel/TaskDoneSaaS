import { asyncHandler } from '../utils/asyncHandler.js';
import {
  approvePlanRequest,
  changeUserRoleGlobal as changeUserRoleGlobalService,
  createCompany as createCompanyService,
  deleteCompanyRole as deleteCompanyRoleService,
  getCompanyFullDetails,
  getCompanySubscription as getCompanySubscriptionService,
  getPlanRequests,
  getPlatformAuditLogs,
  getPlatformStats,
  getUserCredentials,
  handleRenewalAction,
  listCompanies as listCompaniesService,
  listCompanyRoles as listCompanyRolesService,
  listCompanyUsers as listCompanyUsersService,
  listRenewalsData,
  listSubscriptions,
  rejectPlanRequest,
  resetUserPasswordGlobal as resetUserPasswordGlobalService,
  toggleUserStatusGlobal as toggleUserStatusGlobalService,
  updateCompanyFmsConfig as _unusedUpdateCompanyFmsConfig,
  updateCompanyStatus as updateCompanyStatusService,
  updateCompanySubscription as updateCompanySubscriptionService,
  updatePlatformUser,
  upsertCompanyRole as upsertCompanyRoleService
} from '../services/platformAdminService.js';

export const platformOverview = asyncHandler(async (req, res) => {
  res.json(await getPlatformStats());
});

export const listCompanies = asyncHandler(async (req, res) => {
  res.json(await listCompaniesService(req.query.search || ''));
});

export const createCompany = asyncHandler(async (req, res) => {
  const result = await createCompanyService(req.body || {}, req.user || null);
  res.status(201).json(result);
});

export const getCompanySubscription = asyncHandler(async (req, res) => {
  res.json(await getCompanySubscriptionService(req.params.companyId));
});

export const updateCompanyStatus = asyncHandler(async (req, res) => {
  const companyId = req.params.companyId || req.body?.companyId;
  res.json(await updateCompanyStatusService(companyId, req.body?.status, req.user || null));
});

export const updateCompanySubscription = asyncHandler(async (req, res) => {
  const companyId = req.params.companyId || req.body?.companyId;
  res.json(await updateCompanySubscriptionService(companyId, req.body || {}, req.user || null));
});

export const listCompanyUsers = asyncHandler(async (req, res) => {
  res.json(await listCompanyUsersService(req.params.companyId));
});

export const listCompanyRoles = asyncHandler(async (req, res) => {
  res.json(await listCompanyRolesService(req.params.companyId));
});

export const upsertCompanyRole = asyncHandler(async (req, res) => {
  const companyId = req.params.companyId || req.body?.companyId;
  res.json(await upsertCompanyRoleService(companyId, req.body || {}));
});

export const deleteCompanyRole = asyncHandler(async (req, res) => {
  const companyId = req.params.companyId || req.body?.companyId;
  res.json(await deleteCompanyRoleService(companyId, req.params.roleId));
});

export const updateCompanyFmsConfig = asyncHandler(async (req, res) => {
  res.json(await _unusedUpdateCompanyFmsConfig(req.params.companyId || req.body?.companyId, req.body || {}, req.user || null));
});

export const resetUserPasswordGlobal = asyncHandler(async (req, res) => {
  const userId = req.params.userId || req.body?.userId;
  res.json(await resetUserPasswordGlobalService(userId, req.body?.password, req.user || null));
});

export const changeUserRoleGlobal = asyncHandler(async (req, res) => {
  const userId = req.params.userId || req.body?.userId;
  res.json(await changeUserRoleGlobalService(userId, req.body || {}, req.user || null));
});

export const toggleUserStatusGlobal = asyncHandler(async (req, res) => {
  const userId = req.params.userId || req.body?.userId;
  res.json(await toggleUserStatusGlobalService(userId, req.user || null));
});

export const platformRenewals = asyncHandler(async (req, res) => {
  res.json(await listRenewalsData({ days: req.query.days, search: req.query.search || '' }));
});

export const renewalAction = asyncHandler(async (req, res) => {
  res.json(await handleRenewalAction(req.body || {}, req.user || null));
});

export const platformPlanRequests = asyncHandler(async (req, res) => {
  res.json(await getPlanRequests({ status: req.query.status || '', search: req.query.search || '' }));
});

export const approvePlatformPlanRequest = asyncHandler(async (req, res) => {
  res.json(await approvePlanRequest({ requestId: req.params.requestId, ...req.body }, req.user || null));
});

export const rejectPlatformPlanRequest = asyncHandler(async (req, res) => {
  res.json(await rejectPlanRequest({ requestId: req.params.requestId, reason: req.body?.reason || '' }, req.user || null));
});

export const platformAuditLogs = asyncHandler(async (req, res) => {
  res.json(await getPlatformAuditLogs({ search: req.query.search || '', limit: req.query.limit }));
});

export const platformSubscriptions = asyncHandler(async (req, res) => {
  res.json(await listSubscriptions(req.query.search || ''));
});

export const companyFullDetails = asyncHandler(async (req, res) => {
  res.json(await getCompanyFullDetails(req.params.companyId));
});

export const platformUserCredentials = asyncHandler(async (req, res) => {
  res.json(await getUserCredentials(req.params.userId));
});

export const platformUserUpdate = asyncHandler(async (req, res) => {
  res.json(await updatePlatformUser(req.params.userId, req.body || {}, req.user || null));
});
