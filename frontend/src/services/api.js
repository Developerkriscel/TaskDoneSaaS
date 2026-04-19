import axios from 'axios';

const isDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const runtimeApiBase = isDev ? 'http://localhost:8080/api' : 'https://taskdone-ehkm.onrender.com/api';
const configuredApiBase = import.meta.env.VITE_API_BASE_URL || '';
const normalizedConfiguredApiBase =
  typeof window !== 'undefined' && configuredApiBase && configuredApiBase.includes('://localhost:')
    ? configuredApiBase.replace('://localhost:', `://${window.location.hostname}:`)
    : configuredApiBase;

const api = axios.create({
  baseURL: normalizedConfiguredApiBase || runtimeApiBase,
  withCredentials: true
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

export const authApi = {
  login: async (userId, password) => {
    const { data } = await api.post('/v1/auth/login', { userId, password });
    return data;
  },
  me: async () => {
    const { data } = await api.get('/v1/auth/me');
    return data;
  },
  logout: async () => {
    const { data } = await api.post('/v1/auth/logout');
    return data;
  }
};

export const legacyApi = {
  checkCredentials: (userId, password) => rpc('checkCredentials', userId, password),
  getUnifiedAppData: (userName, userRole) => rpc('getUnifiedAppData', userName, userRole),
  getDashboardPageData: (userName, userRole, filters = {}) => rpc('getDashboardPageData', userName, userRole, filters),
  getAllPendingTasksForUser: (userName) => rpc('getAllPendingTasksForUser', userName),
  getTasksForApproval: (userName, userRole, filters = {}) => rpc('getTasksForApproval', userName, userRole, filters),
  getNotificationCounts: (userName, userRole) => rpc('getNotificationCounts', userName, userRole),
  getDelegatedTasksForEmployee: (userName, filters = {}) => rpc('getDelegatedTasksForEmployee', userName, filters),
  getChecklistTasksForEmployee: (userName, filters = {}) => rpc('getChecklistTasksForEmployee', userName, filters),
  getUserWorkRequests: (userName, filters = {}) => rpc('getUserWorkRequests', userName, filters),
  saveTask: (tasks, userName) => rpc('saveTask', tasks, userName),
  saveChecklistTask: (taskData, userName) => rpc('saveChecklistTask', taskData, userName),
  saveWorkRequest: (requests, userName) => rpc('saveWorkRequest', requests, userName),
  submitTaskWrapper: (actionType, id, remarks) => rpc('submitTaskWrapper', actionType, id, remarks),
  updateStatusWrapper: (type, id, status, remarks, planDate = null) =>
    rpc('updateStatusWrapper', type, id, status, remarks, planDate),
  markChecklistTaskDone: (taskId, planDate, remarks) => rpc('markChecklistTaskDone', taskId, planDate, remarks),
  getMisData: (userName, userRole, filters = {}) => rpc('getMisData', userName, userRole, filters),
  getEmployeePerformanceReport: (userName, userRole, filters = {}) =>
    rpc('getEmployeePerformanceReport', userName, userRole, filters),
  getKraMasterData: (userName, userRole, filters = {}) => rpc('getKraMasterData', userName, userRole, filters),
  getAllReportData: (userName, userRole, filters = {}) => rpc('getAllReportData', userName, userRole, filters),
  saveMisWeeklySnapshot: (userName, userRole) => rpc('saveMisWeeklySnapshot', userName, userRole),
  getUsersForManagement: () => rpc('getUsersForManagement'),
  upsertUser: (userData) => rpc('upsertUser', userData),
  deleteUser: (userId) => rpc('deleteUser', userId),
  getHierarchyData: () => rpc('getHierarchyData'),
  saveHierarchy: (hierarchyData) => rpc('saveHierarchy', hierarchyData),
  getProjectsWithStatus: () => rpc('getProjectsWithStatus'),
  manageProject: (action, data) => rpc('manageProject', action, data),
  getAdminsAndEmployees: () => rpc('getAdminsAndEmployees'),
  saveFmsSheetSetting: (sheetSetting) => rpc('saveFmsSheetSetting', sheetSetting)
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
    return fetch(`${baseURL}/v1/ai-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ messages })
    });
  }
};

export default api;
