import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { runGasMethod, listGasMethods } from '../services/gasCompatService.js';
import {
  approvePlanRequest,
  createCompany,
  getCompanyFullDetails,
  getPlanRequests,
  getPlatformAuditLogs,
  getPlatformStats,
  getRenewalsData,
  handleRenewalAction,
  recordUnauthorizedPlatformAccess,
  rejectPlanRequest,
  updatePlatformUser
} from '../services/platformAdminService.js';

export const PLATFORM_METHODS = [
  'getPlatformStats',
  'getRenewalsData',
  'handleRenewalAction',
  'getPlanRequests',
  'approvePlan',
  'rejectPlanRequest',
  'getPlatformAuditLogs',
  'addCompany',
  'getCompanyFullDetails',
  'updatePlatformUser'
];

// Keep only minimal public RPC surface for pre-login compatibility.
const PUBLIC_RPC_METHODS = new Set(['checkCredentials']);

const platformRpcHandlers = {
  getPlatformStats: async () => getPlatformStats(),
  getRenewalsData: async (days, search) => getRenewalsData({ days, search }),
  handleRenewalAction: async (payload, context) => handleRenewalAction(payload || {}, context.user || null),
  getPlanRequests: async (status, search) => getPlanRequests({ status, search }),
  approvePlan: async (payload, context) => approvePlanRequest(payload || {}, context.user || null),
  rejectPlanRequest: async (payload, context) => rejectPlanRequest(payload || {}, context.user || null),
  getPlatformAuditLogs: async (search, limit) => getPlatformAuditLogs({ search, limit }),
  addCompany: async (payload, context) => createCompany(payload || {}, context.user || null),
  getCompanyFullDetails: async (companyId) => getCompanyFullDetails(companyId),
  updatePlatformUser: async (userId, payload, context) => updatePlatformUser(userId, payload || {}, context.user || null)
};

export const rpcCall = asyncHandler(async (req, res) => {
  const { method, params = [] } = req.body;

  if (!req.user && !PUBLIC_RPC_METHODS.has(method)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  if (PLATFORM_METHODS.includes(method)) {
    if (!req.user || (!req.user.isAppAdmin && req.user.role !== 'App Admin')) {
      await recordUnauthorizedPlatformAccess({ actor: req.user || null, method, params });
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const handler = platformRpcHandlers[method];
    if (!handler) {
      throw new ApiError(404, `Unknown platform method: ${method}`);
    }

    const result = await handler(...params, { user: req.user });
    return res.json(result);
  }

  const result = await runGasMethod(method, params, { user: req.user || null });
  res.json(result);
});

export const rpcMethods = asyncHandler(async (req, res) => {
  res.json({ success: true, methods: listGasMethods() });
});
