import { Router } from 'express';
import { currentUser, login, logout } from '../controllers/authController.js';
import {
  approvals,
  checklistTasks,
  createChecklist,
  createDelegations,
  createWorkRequests,
  dashboard,
  delegatedTasks,
  employeeDashboard,
  employeePerformance,
  filteredCard,
  fmsMarkDone,
  fmsTasks,
  kraMaster,
  misData,
  pendingTasks,
  reports,
  saveMisScore,
  saveMisSnapshot,
  submitTask,
  updateStatus,
  userSubmissions,
  workRequests
} from '../controllers/taskController.js';
import {
  actionFmsFlowStep,
  aiAssistFmsStep,
  createFlowFromSheetRow,
  createFmsFlowsFromSheet,
  deleteFmsSheetConfig,
  createFmsFlow,
  fmsFlowAnalytics,
  generateFmsFlowDraft,
  getFmsFlowDetail,
  getFmsSheetSession,
  importFmsSheetPreview,
  listFmsSheetConfigs,
  listFmsFlows,
  mapFmsSheetSession,
  manageFmsFlow,
  monitorFmsFlow,
  prefillFmsSheetRow,
  saveFmsSheetConfig,
  suggestFmsSheetMapping,
  startFmsFlow,
  updateFmsFlow
} from '../controllers/fmsFlowController.js';
import {
  approvePlatformPlanRequest,
  changeUserRoleGlobal,
  companyFullDetails,
  createCompany,
  deleteCompanyRole,
  getCompanySubscription,
  platformAuditLogs,
  platformNotificationSettings,
  platformNotificationSettingsUpdate,
  platformNotificationTestEmail,
  platformPlanRequests,
  listCompanies,
  listCompanyRoles,
  listCompanyUsers,
  platformOverview,
  platformRenewals,
  platformSubscriptions,
  platformUserCredentials,
  platformUserUpdate,
  rejectPlatformPlanRequest,
  renewalAction,
  resetUserPasswordGlobal,
  toggleUserStatusGlobal,
  updateCompanyFmsConfig,
  updateCompanyStatus,
  updateCompanySubscription,
  upsertCompanyRole
} from '../controllers/platformController.js';
import {
  deleteUser as deleteUserAdmin,
  hierarchyGet as hierarchyGetAdmin,
  hierarchySave as hierarchySaveAdmin,
  adminNotificationSettingsGet,
  adminNotificationSettingsSave,
  adminNotificationSettingsTest,
  manageProject as manageProjectAdmin,
  projects as projectsAdmin,
  saveFmsConnector as saveFmsConnectorAdmin,
  upsertUser as upsertUserAdmin,
  users as usersAdmin
} from '../controllers/adminController.js';
import { authRequired, featureRequired, permissionRequired, roleRequired } from '../middlewares/auth.js';

const router = Router();

function twoDigit(value) {
  return String(value).padStart(2, '0');
}

function formatAppDate(value, fallback = 'N/A') {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return `${twoDigit(date.getDate())}-${twoDigit(date.getMonth() + 1)}-${date.getFullYear()}`;
}

function formatAppDateTime(value, fallback = 'N/A') {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  let hours = date.getHours();
  const suffix = hours >= 12 ? 'PM' : 'AM';
  hours %= 12;
  if (hours === 0) hours = 12;
  return `${formatAppDate(date, fallback)} ${twoDigit(hours)}:${twoDigit(date.getMinutes())} ${suffix}`;
}

router.post('/auth/login', login);
router.get('/auth/me', authRequired, currentUser);
router.post('/auth/logout', authRequired, logout);

router.use(authRequired);

router.get('/dashboard', featureRequired('dashboard'), dashboard);
router.get('/dashboard/employee', featureRequired('dashboard'), employeeDashboard);

router.get('/tasks/pending', featureRequired('dashboard'), pendingTasks);
router.get('/tasks/delegations', featureRequired('delegation'), delegatedTasks);
router.get('/tasks/checklists', featureRequired('checklists'), checklistTasks);
router.get('/tasks/work-requests', featureRequired('workRequest'), workRequests);
router.post('/tasks/delegations', featureRequired('delegation'), permissionRequired('canCreateTasks'), createDelegations);
router.post('/tasks/checklists', featureRequired('checklists'), permissionRequired('canCreateTasks'), createChecklist);
router.post('/tasks/work-requests', featureRequired('workRequest'), createWorkRequests);
router.post('/tasks/submit', featureRequired('trackStatus'), submitTask);
router.post('/tasks/status', featureRequired('trackStatus'), permissionRequired('canApproveTasks'), updateStatus);
router.get('/tasks/submissions', featureRequired('trackStatus'), userSubmissions);

router.get('/approvals', featureRequired('trackStatus'), permissionRequired('canApproveTasks'), approvals);
router.get('/reports', featureRequired('reports'), roleRequired('Admin', 'Super Admin'), reports);
router.get('/reports/employee-performance', featureRequired('reports'), roleRequired('Admin', 'Super Admin'), employeePerformance);
router.get('/dashboard/card-filter', featureRequired('dashboard'), filteredCard);
router.get('/kra/master', featureRequired('checklists'), kraMaster);
router.get('/mis', featureRequired('mis'), permissionRequired('canViewMIS'), misData);
router.get('/fms/tasks', featureRequired('fmsSystem'), fmsTasks);
router.post('/fms/done', featureRequired('fmsSystem'), fmsMarkDone);
router.post('/fms/flows/generate', featureRequired('fmsSystem'), roleRequired('Admin', 'Super Admin'), generateFmsFlowDraft);
router.post('/fms/flows', featureRequired('fmsSystem'), roleRequired('Admin', 'Super Admin'), createFmsFlow);
router.post('/fms/flows/create-from-sheet', featureRequired('fmsSystem'), roleRequired('Admin', 'Super Admin'), createFmsFlowsFromSheet);
router.get('/fms/flows', featureRequired('fmsSystem'), listFmsFlows);
router.get('/fms/flows-analytics', featureRequired('fmsSystem'), roleRequired('Admin', 'Super Admin'), fmsFlowAnalytics);
router.get('/fms/flows/analytics', featureRequired('fmsSystem'), roleRequired('Admin', 'Super Admin'), fmsFlowAnalytics);
router.get('/fms/flows/:flowId', featureRequired('fmsSystem'), getFmsFlowDetail);
router.patch('/fms/flows/:flowId', featureRequired('fmsSystem'), roleRequired('Admin', 'Super Admin'), updateFmsFlow);
router.post('/fms/flows/:flowId/manage', featureRequired('fmsSystem'), roleRequired('Admin', 'Super Admin'), manageFmsFlow);
router.post('/fms/flows/:flowId/start', featureRequired('fmsSystem'), roleRequired('Admin', 'Super Admin'), startFmsFlow);
router.post('/fms/flows/:flowId/action', featureRequired('fmsSystem'), actionFmsFlowStep);
router.get('/fms/flows/:flowId/monitor', featureRequired('fmsSystem'), monitorFmsFlow);
router.post('/fms/flows/:flowId/ai-assist', featureRequired('fmsSystem'), aiAssistFmsStep);
router.post('/fms/sheet/import', featureRequired('fmsSystem'), roleRequired('Admin', 'Super Admin'), importFmsSheetPreview);
router.post('/fms/sheet/mapping/suggest', featureRequired('fmsSystem'), roleRequired('Admin', 'Super Admin'), suggestFmsSheetMapping);
router.get('/fms/sheet/:sessionId', featureRequired('fmsSystem'), roleRequired('Admin', 'Super Admin'), getFmsSheetSession);
router.post('/fms/sheet/:sessionId/map', featureRequired('fmsSystem'), roleRequired('Admin', 'Super Admin'), mapFmsSheetSession);
router.post('/fms/sheet/:sessionId/rows/:rowIndex/prefill', featureRequired('fmsSystem'), roleRequired('Admin', 'Super Admin'), prefillFmsSheetRow);
router.post('/fms/sheet/:sessionId/rows/:rowIndex/create-flow', featureRequired('fmsSystem'), roleRequired('Admin', 'Super Admin'), createFlowFromSheetRow);
router.get('/fms/sheet-configs', featureRequired('fmsSystem'), roleRequired('Admin', 'Super Admin'), listFmsSheetConfigs);
router.post('/fms/sheet-configs', featureRequired('fmsSystem'), roleRequired('Admin', 'Super Admin'), saveFmsSheetConfig);
router.delete('/fms/sheet-configs/:configId', featureRequired('fmsSystem'), roleRequired('Admin', 'Super Admin'), deleteFmsSheetConfig);
router.post('/mis/score', featureRequired('mis'), permissionRequired('canViewMIS'), saveMisScore);
router.post('/mis/snapshot', featureRequired('mis'), permissionRequired('canViewMIS'), saveMisSnapshot);

router.get('/admin/projects', roleRequired('Admin', 'Super Admin'), projectsAdmin);
router.post('/admin/projects/manage', roleRequired('Admin', 'Super Admin'), manageProjectAdmin);
router.get('/admin/users', roleRequired('Admin', 'Super Admin'), usersAdmin);
router.post('/admin/users', roleRequired('Admin', 'Super Admin'), upsertUserAdmin);
router.delete('/admin/users/:userId', roleRequired('Admin', 'Super Admin'), deleteUserAdmin);
router.get('/admin/hierarchy', roleRequired('Admin', 'Super Admin'), hierarchyGetAdmin);
router.post('/admin/hierarchy', roleRequired('Admin', 'Super Admin'), hierarchySaveAdmin);
router.post('/admin/fms/connector', roleRequired('Super Admin'), saveFmsConnectorAdmin);
router.get('/admin/notification-settings', roleRequired('Super Admin'), adminNotificationSettingsGet);
router.patch('/admin/notification-settings', roleRequired('Super Admin'), adminNotificationSettingsSave);
router.post('/admin/notification-settings/test-email', roleRequired('Super Admin'), adminNotificationSettingsTest);

router.get('/platform/overview', roleRequired('App Admin'), platformOverview);
router.get('/platform/renewals', roleRequired('App Admin'), platformRenewals);
router.post('/platform/renewals/action', roleRequired('App Admin'), renewalAction);
router.get('/platform/plan-requests', roleRequired('App Admin'), platformPlanRequests);
router.patch('/platform/plan-requests/:requestId/approve', roleRequired('App Admin'), approvePlatformPlanRequest);
router.patch('/platform/plan-requests/:requestId/reject', roleRequired('App Admin'), rejectPlatformPlanRequest);
router.get('/platform/audits', roleRequired('App Admin'), platformAuditLogs);
router.get('/platform/subscriptions', roleRequired('App Admin'), platformSubscriptions);
router.get('/platform/companies', roleRequired('App Admin'), listCompanies);
router.post('/platform/companies', roleRequired('App Admin'), createCompany);
router.get('/platform/companies/:companyId/details', roleRequired('App Admin'), companyFullDetails);
router.get('/platform/companies/:companyId/users', roleRequired('App Admin'), listCompanyUsers);
router.get('/platform/companies/:companyId/roles', roleRequired('App Admin'), listCompanyRoles);
router.post('/platform/companies/:companyId/roles', roleRequired('App Admin'), upsertCompanyRole);
router.delete('/platform/companies/:companyId/roles/:roleId', roleRequired('App Admin'), deleteCompanyRole);
router.get('/platform/companies/:companyId/subscription', roleRequired('App Admin'), getCompanySubscription);
router.patch('/platform/companies/:companyId/status', roleRequired('App Admin'), updateCompanyStatus);
router.patch('/platform/companies/:companyId/subscription', roleRequired('App Admin'), updateCompanySubscription);
router.patch('/platform/companies/:companyId/fms', roleRequired('App Admin'), updateCompanyFmsConfig);
router.get('/platform/users/:userId/credentials', roleRequired('App Admin'), platformUserCredentials);
router.patch('/platform/users/:userId', roleRequired('App Admin'), platformUserUpdate);
router.post('/platform/users/:userId/reset-password', roleRequired('App Admin'), resetUserPasswordGlobal);
router.patch('/platform/users/:userId/role', roleRequired('App Admin'), changeUserRoleGlobal);
router.patch('/platform/users/:userId/toggle-status', roleRequired('App Admin'), toggleUserStatusGlobal);
router.get('/platform/companies/:companyId/notification-settings', roleRequired('App Admin'), platformNotificationSettings);
router.patch('/platform/companies/:companyId/notification-settings', roleRequired('App Admin'), platformNotificationSettingsUpdate);
router.post('/platform/companies/:companyId/notification-settings/test-email', roleRequired('App Admin'), platformNotificationTestEmail);

// ── AI Chat Proxy (Mistral) — ALL authenticated users ──
router.post('/ai-chat', async (req, res) => {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey || apiKey === 'your_mistral_api_key_here') {
    return res.status(503).json({ success: false, error: 'AI service not configured. Set MISTRAL_API_KEY in .env' });
  }

  const { messages = [] } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ success: false, error: 'messages array is required' });
  }

  // Sanitize inbound messages for Mistral compatibility
  const validRoles = new Set(['system', 'user', 'assistant']);
  const sanitizedMessages = messages
    .map((m) => ({
      role: String(m?.role || '').trim(),
      content: String(m?.content || '').trim()
    }))
    .filter((m) => validRoles.has(m.role) && m.content.length > 0);

  if (sanitizedMessages.length === 0) {
    return res.status(400).json({ success: false, error: 'No valid messages to send' });
  }

  // Auto-build context based on user role
  const user = req.user;
  let autoContext = '';
  try {
    if (user.isAppAdmin || user.role === 'App Admin') {
      const { Company } = await import('../models/Company.js');
      const { User: UserModel } = await import('../models/User.js');
      const companies = await Company.find().select('name code status planName planExpiryDate maxUsers monthlyRate').lean();
      const totalUsers = await UserModel.countDocuments({ companyId: { $ne: null } });
      const active = companies.filter(c => c.status === 'Active').length;
      const frozen = companies.filter(c => ['Frozen','Expired'].includes(c.status)).length;
      const mrr = companies.filter(c => c.status === 'Active').reduce((s,c) => s + Number(c.monthlyRate||0), 0);
      autoContext = `ROLE: App Admin (Platform Owner)\nPLATFORM_METRICS:\nTotal Companies: ${companies.length}\nActive: ${active}\nFrozen/Expired: ${frozen}\nTotal Users: ${totalUsers}\nMRR: Rs ${mrr.toLocaleString()}\n\nCOMPANIES:\n${companies.slice(0,50).map(c => `- ${c.name} | Plan: ${c.planName||'N/A'} | Status: ${c.status} | Max Users: ${c.maxUsers||0} | Expiry: ${formatAppDate(c.planExpiryDate)}`).join('\n')}`;
    } else if (user.companyId) {
      const { Company } = await import('../models/Company.js');
      const { User: UserModel } = await import('../models/User.js');
      const { HierarchyGroup } = await import('../models/HierarchyGroup.js');
      const { DelegationTask } = await import('../models/DelegationTask.js');
      const { ChecklistTask } = await import('../models/ChecklistTask.js');
      const { WorkRequest } = await import('../models/WorkRequest.js');

      const company = await Company.findById(user.companyId).select('name code status planName maxUsers').lean();
      const companyUsers = await UserModel.find({ companyId: user.companyId })
        .select('name userId role roleName status')
        .lean();
      const companyName = company?.name || 'Unknown';
      const normalizedRole = String(user.role || '').trim().toLowerCase();
      const currentUserId = user?._id || user?.id;
      const isSuperAdmin = normalizedRole === 'super admin';
      const isEmployee = normalizedRole === 'employee';

      // Hierarchy-scoped visibility for chatbot (same idea as app access model):
      // - Super Admin: all active users in company
      // - Employee: self only
      // - Admin: self + hierarchy mapped employeeUsers
      let visibleUsers = [];
      if (isSuperAdmin) {
        visibleUsers = companyUsers.filter((u) => String(u.status || '').toLowerCase() === 'active');
      } else if (isEmployee) {
        visibleUsers = companyUsers.filter((u) => String(u._id) === String(currentUserId));
      } else {
        const selfUser = companyUsers.find((u) => String(u._id) === String(currentUserId));
        if (selfUser) {
          const group = await HierarchyGroup.findOne({ companyId: user.companyId, adminUser: selfUser._id })
            .select('employeeUsers')
            .lean();
          const visibleIdSet = new Set([String(selfUser._id), ...((group?.employeeUsers || []).map((id) => String(id)))]);
          visibleUsers = companyUsers.filter((u) => visibleIdSet.has(String(u._id)));
        } else {
          visibleUsers = [];
        }
      }

      const userIds = visibleUsers.map(u => u._id);
      const userMap = {};
      companyUsers.forEach(u => { userMap[u._id.toString()] = u.name; });

      // Fetch all tasks for company users (last 90 days for relevance)
      const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

      const [delegations, checklists, workReqs] = await Promise.all([
        DelegationTask.find({ delegatedToUser: { $in: userIds }, createdAt: { $gte: since } })
          .select('delegatedToUser delegatedByUser description status targetDate onTimeStatus delay priority')
          .lean(),
        ChecklistTask.find({ user: { $in: userIds }, createdAt: { $gte: since } })
          .select('user description approvalStatus planDate actualDate onTimeStatus totalDelay frequency')
          .lean(),
        WorkRequest.find({ requestForUser: { $in: userIds }, createdAt: { $gte: since } })
          .select('requestForUser requestedByUser description status deadline onTimeStatus delayDays')
          .lean()
      ]);

      // Build per-employee summary
      const empStats = {};
      visibleUsers.forEach(u => {
        empStats[u._id.toString()] = {
          name: u.name, role: u.roleName || u.role, status: u.status,
          delegation: { total: 0, pending: 0, done: 0, delayed: 0, tasks: [] },
          checklist: { total: 0, pending: 0, done: 0, delayed: 0, tasks: [] },
          workRequest: { total: 0, pending: 0, done: 0, delayed: 0, tasks: [] }
        };
      });

      delegations.forEach(t => {
        const uid = t.delegatedToUser?.toString();
        const e = empStats[uid];
        if (!e) return;
        e.delegation.total++;
        const st = (t.status || '').toLowerCase();
        if (st === 'pending' || st === 'revision') e.delegation.pending++;
        else if (st === 'done' || st === 'approved') e.delegation.done++;
        if (t.onTimeStatus === 'Delayed') e.delegation.delayed++;
        if (e.delegation.tasks.length < 8) {
          e.delegation.tasks.push(`${t.description?.slice(0,60)} [${t.status}] [${t.onTimeStatus}] [Priority:${t.priority||'Medium'}] [Due:${formatAppDateTime(t.targetDate)}] [Delay:${t.delay||0}d] [AssignedBy:${userMap[t.delegatedByUser?.toString()]||'?'}]`);
        }
      });

      checklists.forEach(t => {
        const uid = t.user?.toString();
        const e = empStats[uid];
        if (!e) return;
        e.checklist.total++;
        const st = (t.approvalStatus || '').toLowerCase();
        if (st === 'pending') e.checklist.pending++;
        else if (st === 'done' || st === 'approved') e.checklist.done++;
        if (t.onTimeStatus === 'Delayed') e.checklist.delayed++;
        if (e.checklist.tasks.length < 8) {
          e.checklist.tasks.push(`${t.description?.slice(0,60)} [${t.approvalStatus}] [${t.onTimeStatus}] [Freq:${t.frequency||'Adhoc'}] [Plan:${formatAppDateTime(t.planDate)}] [Delay:${t.totalDelay||0}d]`);
        }
      });

      workReqs.forEach(t => {
        const uid = t.requestForUser?.toString();
        const e = empStats[uid];
        if (!e) return;
        e.workRequest.total++;
        const st = (t.status || '').toLowerCase();
        if (st === 'pending') e.workRequest.pending++;
        else if (st === 'done' || st === 'approved' || st === 'completed') e.workRequest.done++;
        if (t.onTimeStatus === 'Delayed') e.workRequest.delayed++;
        if (e.workRequest.tasks.length < 6) {
          e.workRequest.tasks.push(`${t.description?.slice(0,60)} [${t.status}] [${t.onTimeStatus}] [Due:${formatAppDateTime(t.deadline)}] [Delay:${t.delayDays||0}d] [RequestedBy:${userMap[t.requestedByUser?.toString()]||'?'}]`);
        }
      });

      // Build context string
      const ctxLines = [];
      ctxLines.push(`ROLE: ${user.roleName || user.role} at ${companyName}`);
      ctxLines.push(`ACCESS_SCOPE: ${isSuperAdmin ? 'COMPANY_ALL_ACTIVE' : (isEmployee ? 'SELF_ONLY' : 'HIERARCHY_TEAM_ONLY')}`);
      ctxLines.push(`COMPANY: ${companyName} (${company?.code||''}) | Status: ${company?.status||'Active'} | Plan: ${company?.planName||'N/A'} | Max Users: ${company?.maxUsers||0}`);
      ctxLines.push(`TOTAL_TEAM: ${visibleUsers.length} members`);
      ctxLines.push(`TASK_SUMMARY: Delegations: ${delegations.length} | Checklists: ${checklists.length} | Work Requests: ${workReqs.length}`);
      ctxLines.push(`ACCESS_RULE: Never reveal users outside ACCESS_SCOPE. If asked, refuse and offer allowed scope summary.`);
      ctxLines.push('');

      Object.values(empStats).forEach(e => {
        const totalTasks = e.delegation.total + e.checklist.total + e.workRequest.total;
        const totalPending = e.delegation.pending + e.checklist.pending + e.workRequest.pending;
        const totalDelayed = e.delegation.delayed + e.checklist.delayed + e.workRequest.delayed;
        const totalDone = e.delegation.done + e.checklist.done + e.workRequest.done;

        ctxLines.push(`EMPLOYEE: ${e.name} | Role: ${e.role} | Status: ${e.status}`);
        ctxLines.push(`  Overall: ${totalTasks} tasks | ${totalPending} pending | ${totalDone} done | ${totalDelayed} delayed`);

        if (e.delegation.total > 0) {
          ctxLines.push(`  Delegation: ${e.delegation.total} total, ${e.delegation.pending} pending, ${e.delegation.done} done, ${e.delegation.delayed} delayed`);
          e.delegation.tasks.forEach(t => ctxLines.push(`    • ${t}`));
        }
        if (e.checklist.total > 0) {
          ctxLines.push(`  Checklist: ${e.checklist.total} total, ${e.checklist.pending} pending, ${e.checklist.done} done, ${e.checklist.delayed} delayed`);
          e.checklist.tasks.forEach(t => ctxLines.push(`    • ${t}`));
        }
        if (e.workRequest.total > 0) {
          ctxLines.push(`  Work Requests: ${e.workRequest.total} total, ${e.workRequest.pending} pending, ${e.workRequest.done} done, ${e.workRequest.delayed} delayed`);
          e.workRequest.tasks.forEach(t => ctxLines.push(`    • ${t}`));
        }
        ctxLines.push('');
      });

      autoContext = ctxLines.join('\n');
    }
  } catch { /* context build failure is non-fatal */ }

  // Inject auto-context into messages if available
  const enrichedMessages = [...sanitizedMessages];
  if (autoContext && enrichedMessages.length > 0) {
    const sysIdx = enrichedMessages.findIndex(m => m.role === 'system');
    const insertIdx = sysIdx >= 0 ? sysIdx + 1 : 0;
    enrichedMessages.splice(insertIdx, 0,
      { role: 'user', content: `USER_CONTEXT:\n${autoContext}` },
      { role: 'assistant', content: 'Understood. I have your data loaded. How can I help?' }
    );
  }

  try {
    const model = process.env.MISTRAL_MODEL || 'mistral-small-latest';
    const upstream = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: enrichedMessages,
        max_tokens: 800,
        temperature: 0.3,
        stream: true
      })
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      let errMsg = 'Mistral API error';
      try {
        const parsed = JSON.parse(errText);
        errMsg = parsed?.error?.message || parsed?.message || errMsg;
      } catch { /* ignore */ }
      return res.status(upstream.status).json({ success: false, error: errMsg });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value, { stream: true }));
      }
    } catch { /* client disconnect */ }

    res.end();
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message || 'AI proxy error' });
    }
  }
});

export default router;
