import axios from 'axios';

const defaultProductionApiBase = 'https://taskdone-ehkm.onrender.com/api';
const defaultLocalApiBase = 'http://localhost:8080/api';
const runtimeApiBase = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}/api` : 'http://localhost:8080/api';
const isLocalHost =
  typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
const configuredApiBase =
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== 'undefined' ? window.__TASKDONE_API_BASE_URL__ || (isLocalHost ? defaultLocalApiBase : defaultProductionApiBase) : '');
const normalizedConfiguredApiBase =
  typeof window !== 'undefined' && configuredApiBase && configuredApiBase.includes('://localhost:')
    ? configuredApiBase.replace('://localhost:', `://${window.location.hostname}:`)
    : configuredApiBase;

const TOKEN_KEY = 'td_token';

function readStoredToken() {
  if (typeof window === 'undefined') return '';
  return window.sessionStorage.getItem(TOKEN_KEY) || '';
}

export function setAuthToken(token) {
  if (typeof window === 'undefined') return;
  if (token) {
    window.sessionStorage.setItem(TOKEN_KEY, token);
  } else {
    window.sessionStorage.removeItem(TOKEN_KEY);
  }
}

const api = axios.create({
  baseURL: normalizedConfiguredApiBase || runtimeApiBase,
  withCredentials: true
});

api.interceptors.request.use((config) => {
  const token = readStoredToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function rpc(method, ...params) {
  try {
    const { data } = await api.post('/rpc', { method, params });
    return data;
  } catch (err) {
    const message = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'RPC call failed';
    throw new Error(`${method}: ${message}`);
  }
}

export async function rpcSecure(method, ...params) {
  try {
    const { data } = await api.post('/rpc/secure', { method, params });
    return data;
  } catch (err) {
    const message = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'RPC call failed';
    throw new Error(`${method}: ${message}`);
  }
}

export const authApi = {
  login: async (userId, password) => {
    const { data } = await api.post('/v1/auth/login', { userId, password });
    if (data?.token) setAuthToken(data.token);
    return data;
  },
  me: async () => {
    const { data } = await api.get('/v1/auth/me');
    return data;
  },
  logout: async () => {
    const { data } = await api.post('/v1/auth/logout');
    setAuthToken('');
    return data;
  }
};

export const legacyApi = {
  checkCredentials: (userId, password) => rpc('checkCredentials', userId, password),
  getUnifiedAppData: (userName, userRole) => rpcSecure('getUnifiedAppData', userName, userRole),
  getDashboardPageData: (userName, userRole, filters = {}) => rpcSecure('getDashboardPageData', userName, userRole, filters),
  getAllPendingTasksForUser: (userName) => rpcSecure('getAllPendingTasksForUser', userName),
  getTasksForApproval: (userName, userRole, filters = {}) => rpcSecure('getTasksForApproval', userName, userRole, filters),
  getNotificationCounts: (userName, userRole) => rpcSecure('getNotificationCounts', userName, userRole),
  getDelegatedTasksForEmployee: (userName, filters = {}) => rpcSecure('getDelegatedTasksForEmployee', userName, filters),
  getChecklistTasksForEmployee: (userName, filters = {}) => rpcSecure('getChecklistTasksForEmployee', userName, filters),
  getUserWorkRequests: (userName, filters = {}) => rpcSecure('getUserWorkRequests', userName, filters),
  saveTask: (tasks, userName) => rpcSecure('saveTask', tasks, userName),
  saveChecklistTask: (taskData, userName) => rpcSecure('saveChecklistTask', taskData, userName),
  saveWorkRequest: (requests, userName) => rpcSecure('saveWorkRequest', requests, userName),
  submitTaskWrapper: (actionType, id, remarks) => rpcSecure('submitTaskWrapper', actionType, id, remarks),
  updateStatusWrapper: (type, id, status, remarks, planDate = null) =>
    rpcSecure('updateStatusWrapper', type, id, status, remarks, planDate),
  markChecklistTaskDone: (taskId, planDate, remarks) => rpcSecure('markChecklistTaskDone', taskId, planDate, remarks),
  getMisData: (userName, userRole, filters = {}) => rpcSecure('getMisData', userName, userRole, filters),
  getEmployeePerformanceReport: (userName, userRole, filters = {}) =>
    rpcSecure('getEmployeePerformanceReport', userName, userRole, filters),
  getKraMasterData: (userName, userRole, filters = {}) => rpcSecure('getKraMasterData', userName, userRole, filters),
  getAllReportData: (userName, userRole, filters = {}) => rpcSecure('getAllReportData', userName, userRole, filters),
  saveMisWeeklySnapshot: (userName, userRole) => rpcSecure('saveMisWeeklySnapshot', userName, userRole),
  getUsersForManagement: () => rpcSecure('getUsersForManagement'),
  upsertUser: (userData) => rpcSecure('upsertUser', userData),
  deleteUser: (userId) => rpcSecure('deleteUser', userId),
  getHierarchyData: () => rpcSecure('getHierarchyData'),
  saveHierarchy: (hierarchyData) => rpcSecure('saveHierarchy', hierarchyData),
  getProjectsWithStatus: () => rpcSecure('getProjectsWithStatus'),
  manageProject: (action, data) => rpcSecure('manageProject', action, data),
  getAdminsAndEmployees: () => rpcSecure('getAdminsAndEmployees'),
  saveFmsSheetSetting: (sheetSetting) => rpcSecure('saveFmsSheetSetting', sheetSetting)
};

export const platformApi = {
  getPlatformStats: async () => {
    const { data } = await api.get('/v1/platform/overview');
    return data;
  },
  getRenewalsData: async (days = 30, search = '') => {
    const { data } = await api.get('/v1/platform/renewals', { params: { days, search } });
    return data;
  },
  handleRenewalAction: async (payload) => {
    const { data } = await api.post('/v1/platform/renewals/action', payload);
    return data;
  },
  getPlanRequests: async (status = '', search = '') => {
    const { data } = await api.get('/v1/platform/plan-requests', { params: { status, search } });
    return data;
  },
  approvePlanRequest: async (requestId, payload) => {
    const { data } = await api.patch(`/v1/platform/plan-requests/${requestId}/approve`, payload);
    return data;
  },
  rejectPlanRequest: async (requestId, reason = '') => {
    const { data } = await api.patch(`/v1/platform/plan-requests/${requestId}/reject`, { reason });
    return data;
  },
  getPlatformAuditLogs: async (search = '', limit = 100) => {
    const { data } = await api.get('/v1/platform/audits', { params: { search, limit } });
    return data;
  },
  getSubscriptions: async (search = '') => {
    const { data } = await api.get('/v1/platform/subscriptions', { params: { search } });
    return data;
  },
  getCompanies: async (search = '') => {
    const { data } = await api.get('/v1/platform/companies', { params: { search } });
    return data;
  },
  createCompany: async (payload) => {
    const { data } = await api.post('/v1/platform/companies', payload);
    return data;
  },
  getCompanyFullDetails: async (companyId) => {
    const { data } = await api.get(`/v1/platform/companies/${companyId}/details`);
    return data;
  },
  updateCompanyStatus: async (companyId, status) => {
    const { data } = await api.patch(`/v1/platform/companies/${companyId}/status`, { status });
    return data;
  },
  updateCompanySubscription: async (companyId, payload) => {
    const { data } = await api.patch(`/v1/platform/companies/${companyId}/subscription`, payload);
    return data;
  },
  updateCompanyFms: async (companyId, payload) => {
    const { data } = await api.patch(`/v1/platform/companies/${companyId}/fms`, payload);
    return data;
  },
  getCompanyUsers: async (companyId) => {
    const { data } = await api.get(`/v1/platform/companies/${companyId}/users`);
    return data;
  },
  getCompanyRoles: async (companyId) => {
    const { data } = await api.get(`/v1/platform/companies/${companyId}/roles`);
    return data;
  },
  saveCompanyRole: async (companyId, payload) => {
    const { data } = await api.post(`/v1/platform/companies/${companyId}/roles`, payload);
    return data;
  },
  deleteCompanyRole: async (companyId, roleId) => {
    const { data } = await api.delete(`/v1/platform/companies/${companyId}/roles/${roleId}`);
    return data;
  },
  getCompanySubscription: async (companyId) => {
    const { data } = await api.get(`/v1/platform/companies/${companyId}/subscription`);
    return data;
  },
  getPlatformUserCredentials: async (userId) => {
    const { data } = await api.get(`/v1/platform/users/${userId}/credentials`);
    return data;
  },
  getCompanyNotificationSettings: async (companyId) => {
    const { data } = await api.get(`/v1/platform/companies/${companyId}/notification-settings`);
    return data;
  },
  updateCompanyNotificationSettings: async (companyId, payload) => {
    const { data } = await api.patch(`/v1/platform/companies/${companyId}/notification-settings`, payload);
    return data;
  },
  sendCompanyNotificationTestEmail: async (companyId, to) => {
    const { data } = await api.post(`/v1/platform/companies/${companyId}/notification-settings/test-email`, { to });
    return data;
  },
  getAdminNotificationSettings: async () => {
    const { data } = await api.get('/v1/admin/notification-settings');
    return data;
  },
  updateAdminNotificationSettings: async (payload) => {
    const { data } = await api.patch('/v1/admin/notification-settings', payload);
    return data;
  },
  sendAdminNotificationTestEmail: async (to) => {
    const { data } = await api.post('/v1/admin/notification-settings/test-email', { to });
    return data;
  },
  updatePlatformUser: async (userId, payload) => {
    const { data } = await api.patch(`/v1/platform/users/${userId}`, payload);
    return data;
  },
  resetUserPassword: async (userId, password) => {
    const { data } = await api.post(`/v1/platform/users/${userId}/reset-password`, { password });
    return data;
  },
  changeUserRole: async (userId, payload) => {
    const { data } = await api.patch(`/v1/platform/users/${userId}/role`, payload);
    return data;
  },
  toggleUserStatus: async (userId) => {
    const { data } = await api.patch(`/v1/platform/users/${userId}/toggle-status`);
    return data;
  },
  aiChatStream: (messages) => {
    const baseURL = api.defaults.baseURL;
    const token = readStoredToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetch(`${baseURL}/v1/ai-chat`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ messages })
    });
  },
  generateFmsFlowDraft: async (payload) => {
    const { data } = await api.post('/v1/fms/flows/generate', payload);
    return data;
  },
  createFmsFlow: async (payload) => {
    const { data } = await api.post('/v1/fms/flows', payload);
    return data;
  },
  listFmsFlows: async () => {
    const { data } = await api.get('/v1/fms/flows');
    return data;
  },
  getFmsFlow: async (flowId, viewMode = 'live') => {
    const { data } = await api.get(`/v1/fms/flows/${flowId}`, { params: { viewMode } });
    return data;
  },
  startFmsFlow: async (flowId) => {
    const { data } = await api.post(`/v1/fms/flows/${flowId}/start`);
    return data;
  },
  actionFmsFlow: async (flowId, payload) => {
    const { data } = await api.post(`/v1/fms/flows/${flowId}/action`, payload);
    return data;
  },
  monitorFmsFlow: async (flowId, viewMode = 'live') => {
    const { data } = await api.get(`/v1/fms/flows/${flowId}/monitor`, { params: { viewMode } });
    return data;
  }
};

export default api;

