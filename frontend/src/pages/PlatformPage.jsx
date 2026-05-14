import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { useAuth } from '../store/authContext.jsx';
import { platformApi } from '../services/api.js';
import { formatDate, formatDateTime } from '../utils/dateFormat.js';

const ADMIN_VIEWS = ['overview', 'renewals', 'plan-requests', 'audits', 'subscriptions', 'companies', 'company-details', 'notifications'];

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 7h14M5 12h14M5 17h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M16.5 4.5a8.5 8.5 0 1 1-10.9 10.9 7 7 0 0 0 10.9-10.9Z" fill="currentColor" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 4v6h6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M20 12a8 8 0 1 0-2.34 5.66L20 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" fill="currentColor" />
      <path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 8l-4 4 4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 12h10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M15 6h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function AdminDashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="4" width="6" height="6" rx="1.5" fill="currentColor" />
      <rect x="14" y="4" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.8" />
      <rect x="4" y="14" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.7" />
      <rect x="14" y="14" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.55" />
    </svg>
  );
}

function RoleMgmtIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" fill="currentColor" opacity="0.92" />
      <path d="M7 14c-2.8 0-5 2.2-5 5v1h10v-1c0-2.8-2.2-5-5-5Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="17" cy="16" r="3" fill="currentColor" opacity="0.75" />
    </svg>
  );
}

function SubscriptionIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 5h12v14H6z" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M9 9h6M9 13h6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 17h4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function FmsConfigIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4v6M6 10v6M18 10v6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <rect x="4" y="16" width="4" height="4" rx="1" fill="currentColor" />
      <rect x="10" y="10" width="4" height="10" rx="1" fill="currentColor" opacity="0.9" />
      <rect x="16" y="16" width="4" height="4" rx="1" fill="currentColor" opacity="0.76" />
    </svg>
  );
}

function QueueIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h12M4 12h16M4 17h10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="18" cy="7" r="2" fill="currentColor" />
      <circle cx="16" cy="17" r="2" fill="currentColor" opacity="0.75" />
    </svg>
  );
}

function RequestIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 3h9l3 3v15H6z" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M15 3v4h4M9 11h6M9 15h6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function AuditIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M9 8h6M9 12h6M9 16h4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CompanyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 8h16v12H4z" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M7 11h3M7 15h3M14 11h3M14 15h3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 3v5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function DetailIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 3h12l3 3v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M9 9h6M9 13h6M9 17h4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function nextYearIsoDate() {
  const now = new Date();
  now.setFullYear(now.getFullYear() + 1);
  return now.toISOString().slice(0, 10);
}

function buildPassword() {
  const pool = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$%!';
  let value = '';
  for (let i = 0; i < 12; i += 1) {
    value += pool[Math.floor(Math.random() * pool.length)];
  }
  return value;
}

const FEATURE_TOGGLE_LABELS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'checklists', label: 'Checklists' },
  { key: 'delegation', label: 'Delegation' },
  { key: 'workRequest', label: 'Work Request' },
  { key: 'fmsSystem', label: 'FMS System' },
  { key: 'trackStatus', label: 'Track Status' },
  { key: 'mis', label: 'MIS' },
  { key: 'reports', label: 'Reports' }
];

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

export default function PlatformPage() {
  const { user, logout } = useAuth();
  const [currentView, setCurrentView] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [overview, setOverview] = useState({
    totalCompanies: 0,
    activeCompanies: 0,
    frozenExpiredCompanies: 0,
    totalUsers: 0,
    mrr: 0,
    churnRate: 0,
    newThisMonth: 0
  });

  const [renewalDays, setRenewalDays] = useState(30);
  const [renewalSearch, setRenewalSearch] = useState('');
  const [renewals, setRenewals] = useState([]);

  const [planStatus, setPlanStatus] = useState('Pending');
  const [planSearch, setPlanSearch] = useState('');
  const [planRequests, setPlanRequests] = useState([]);

  const [auditSearch, setAuditSearch] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);

  const [subscriptionSearch, setSubscriptionSearch] = useState('');
  const [subscriptions, setSubscriptions] = useState([]);

  const [companySearch, setCompanySearch] = useState('');
  const [companies, setCompanies] = useState([]);

  const [activeCompanyId, setActiveCompanyId] = useState('');
  const [activeCompanyName, setActiveCompanyName] = useState('');
  const [companyDetails, setCompanyDetails] = useState({ company: null, usage: null, users: [], roles: [] });
  const [notificationSettings, setNotificationSettings] = useState({
    sender: { fromName: '', fromEmail: '', replyTo: '' },
    smtp: { host: '', port: 587, secure: false, user: '', password: '' },
    notifications: { assignment: true, submission: true, approval: true, rework: true }
  });

  const metricCards = useMemo(() => [
    { label: 'Total Companies', value: overview.totalCompanies },
    { label: 'Active', value: overview.activeCompanies },
    { label: 'Frozen / Expired', value: overview.frozenExpiredCompanies },
    { label: 'Total Users', value: overview.totalUsers },
    { label: 'MRR', value: `Rs ${Number(overview.mrr || 0).toLocaleString()}` },
    { label: 'Churn Rate', value: `${overview.churnRate || 0}%` },
    { label: 'New This Month', value: overview.newThisMonth }
  ], [overview]);

  async function withLoader(work) {
    setLoading(true);
    setError('');
    try {
      await work();
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  async function loadOverview() {
    await withLoader(async () => {
      const data = await platformApi.getPlatformStats();
      setOverview(data.metrics || {});
    });
  }

  async function loadRenewals() {
    await withLoader(async () => {
      const data = await platformApi.getRenewalsData(renewalDays, renewalSearch);
      setRenewals(data.renewals || []);
    });
  }

  async function loadPlanRequests() {
    await withLoader(async () => {
      const data = await platformApi.getPlanRequests(planStatus, planSearch);
      setPlanRequests(data.requests || []);
    });
  }

  async function loadAudits() {
    await withLoader(async () => {
      const data = await platformApi.getPlatformAuditLogs(auditSearch, 150);
      setAuditLogs(data.logs || []);
    });
  }

  async function loadSubscriptions() {
    await withLoader(async () => {
      const data = await platformApi.getSubscriptions(subscriptionSearch);
      setSubscriptions(data.subscriptions || []);
    });
  }

  async function loadCompanies() {
    await withLoader(async () => {
      const data = await platformApi.getCompanies(companySearch);
      setCompanies(data.companies || []);
    });
  }

  async function loadCompanyDetails(companyId = activeCompanyId) {
    if (!companyId) {
      setError('Select a company first from Companies or Subscriptions.');
      return;
    }
    await withLoader(async () => {
      const data = await platformApi.getCompanyFullDetails(companyId);
      setCompanyDetails({
        company: data.company || null,
        usage: data.usage || null,
        users: data.users || [],
        roles: data.roles || []
      });
      setActiveCompanyId(companyId);
      setActiveCompanyName(data.company?.name || activeCompanyName);
    });
  }

  async function loadNotificationSettings() {
    if (!activeCompanyId) {
      setError('Select a company first from Companies or Company Details.');
      return;
    }
    await withLoader(async () => {
      const data = await platformApi.getCompanyNotificationSettings(activeCompanyId);
      if (data?.settings) {
        setNotificationSettings(data.settings);
      }
    });
  }

  function applySaasRoleVisibility(role, isAppAdmin) {
    const ids = ['overview-nav', 'renewals-nav', 'plan-requests-nav', 'audits-nav', 'subscriptions-nav', 'companies-nav', 'company-details-nav', 'notifications-nav'];
    ids.forEach((id) => document.getElementById(id)?.classList.add('hidden'));

    if (isAppAdmin) {
      ids.forEach((id) => document.getElementById(id)?.classList.remove('hidden'));
    }
  }

  async function showView(viewName, selectedCompanyId = '') {
    ADMIN_VIEWS.forEach((id) => document.getElementById(id)?.classList.add('hidden'));
    document.querySelectorAll('.taskdone-nav-link, .nav-link').forEach((node) => node.classList.remove('active'));
    document.querySelector(`.taskdone-nav-link[data-view="${viewName}"], .nav-link[data-view="${viewName}"]`)?.classList.add('active');
    document.getElementById(viewName)?.classList.remove('hidden');
    setCurrentView(viewName);

    if (viewName === 'overview') return loadOverview();
    if (viewName === 'renewals') return loadRenewals();
    if (viewName === 'plan-requests') return loadPlanRequests();
    if (viewName === 'audits') return loadAudits();
    if (viewName === 'subscriptions') return loadSubscriptions();
    if (viewName === 'companies') return loadCompanies();
    if (viewName === 'company-details') {
      return loadCompanyDetails(selectedCompanyId || activeCompanyId);
    }
    if (viewName === 'notifications') return loadNotificationSettings();
    return null;
  }

  async function openCreateCompanyModal() {
    const result = await Swal.fire({
      title: 'Onboard New Company',
      html: `
        <div class="text-left space-y-4 mt-4">
          <div><label class="form-label">Step 1: Company Name</label><input id="swal-company-name" class="swal2-input form-input" /></div>
          <div><label class="form-label">Step 1: Contact Person</label><input id="swal-contact-person" class="swal2-input form-input" /></div>
          <div><label class="form-label">Step 2: Company Code</label><input id="swal-company-code" class="swal2-input form-input" /></div>
          <div><label class="form-label">Step 2: Domain</label><input id="swal-domain" class="swal2-input form-input" placeholder="acme.taskdone.local" /></div>
          <div><label class="form-label">Step 2: Super Admin Email</label><input id="swal-super-admin-email" class="swal2-input form-input" /></div>
          <div><label class="form-label">Step 2: Super Admin User ID</label><input id="swal-super-admin-user-id" class="swal2-input form-input" /></div>
          <div><label class="form-label">Step 2: First Admin Password</label><input id="swal-admin-password" type="password" class="swal2-input form-input" /></div>
          <div><label class="form-label">Step 3: Plan</label><select id="swal-plan-name" class="swal2-input form-input"><option>Basic</option><option>Professional</option><option>Enterprise</option></select></div>
          <div><label class="form-label">Step 3: Expiry Date (1 year default)</label><input id="swal-expiry-date" type="date" class="swal2-input form-input" value="${nextYearIsoDate()}" /></div>
          <div><label class="form-label">Step 4: Max Users</label><input id="swal-max-users" type="number" class="swal2-input form-input" value="25" min="1" /></div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Create Company + SuperAdmin',
      focusConfirm: false,
      preConfirm: () => {
        const name = document.getElementById('swal-company-name')?.value?.trim();
        const contactPerson = document.getElementById('swal-contact-person')?.value?.trim();
        const code = document.getElementById('swal-company-code')?.value?.trim().toUpperCase();
        const domain = document.getElementById('swal-domain')?.value?.trim();
        const superAdminEmail = document.getElementById('swal-super-admin-email')?.value?.trim();
        const superAdminUserId = document.getElementById('swal-super-admin-user-id')?.value?.trim();
        const adminPassword = document.getElementById('swal-admin-password')?.value?.trim();
        const planName = document.getElementById('swal-plan-name')?.value?.trim() || 'Basic';
        const planExpiryDate = document.getElementById('swal-expiry-date')?.value || '';
        const maxUsers = Number(document.getElementById('swal-max-users')?.value || 0);
        if (!name || !code || !superAdminEmail || !superAdminUserId || !adminPassword) {
          Swal.showValidationMessage('Company, SuperAdmin email/userId and first password are required');
          return false;
        }
        if (adminPassword.length < 8) {
          Swal.showValidationMessage('Password must be at least 8 characters');
          return false;
        }
        return {
          name,
          code,
          contactPerson,
          domain,
          superAdminEmail,
          superAdminUserId,
          adminPassword,
          planName,
          planExpiryDate,
          maxUsers
        };
      }
    });

    if (!result.isConfirmed) return;

    try {
      await platformApi.createCompany(result.value);
      await loadCompanies();
      await loadOverview();
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Company creation failed');
    }
  }

  async function toggleCompanyStatus(companyId, currentStatus, refresh = null) {
    const nextStatus = currentStatus === 'Active' ? 'Frozen' : 'Active';
    const result = await Swal.fire({
      title: `${nextStatus === 'Frozen' ? 'Freeze' : 'Activate'} Company?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: nextStatus === 'Frozen' ? 'Freeze Company' : 'Activate Company'
    });

    if (!result.isConfirmed) return;

    try {
      await platformApi.updateCompanyStatus(companyId, nextStatus);
      if (typeof refresh === 'function') await refresh();
      await loadOverview();
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to update company status');
    }
  }

  async function handleRenewalAction(companyId, action) {
    try {
      await platformApi.handleRenewalAction({ companyId, action });
      await loadRenewals();
      await loadOverview();
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to perform renewal action');
    }
  }

  async function openApprovePlanModal(request) {
    const result = await Swal.fire({
      title: 'Approve Plan Request',
      html: `
        <div class="text-left space-y-4 mt-4">
          <div><label class="form-label">Plan Name</label><select id="swal-approve-plan" class="swal2-input form-input"><option ${request.requestedPlan === 'Basic' ? 'selected' : ''}>Basic</option><option ${request.requestedPlan === 'Professional' ? 'selected' : ''}>Professional</option><option ${request.requestedPlan === 'Enterprise' ? 'selected' : ''}>Enterprise</option></select></div>
          <div><label class="form-label">Expiry Date</label><input id="swal-approve-expiry" type="date" class="swal2-input form-input" value="${nextYearIsoDate()}" /></div>
          <div><label class="form-label">Max Users</label><input id="swal-approve-max-users" type="number" class="swal2-input form-input" value="${request.maxUsers || 25}" min="1" /></div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Approve'
    });

    if (!result.isConfirmed) return;
    const payload = {
      planName: document.getElementById('swal-approve-plan')?.value,
      expiryDate: document.getElementById('swal-approve-expiry')?.value,
      maxUsers: Number(document.getElementById('swal-approve-max-users')?.value || 0)
    };

    try {
      await platformApi.approvePlanRequest(request._id, payload);
      await loadPlanRequests();
      await loadSubscriptions();
      await loadOverview();
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to approve request');
    }
  }

  async function rejectPlan(requestId) {
    const result = await Swal.fire({
      title: 'Reject Plan Request',
      input: 'text',
      inputPlaceholder: 'Reason (optional)',
      showCancelButton: true,
      confirmButtonText: 'Reject'
    });
    if (!result.isConfirmed) return;
    try {
      await platformApi.rejectPlanRequest(requestId, result.value || '');
      await loadPlanRequests();
      await loadOverview();
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to reject request');
    }
  }

  async function openSubscriptionOverride(company) {
    const enabledFeatures = { ...DEFAULT_COMPANY_FEATURES, ...(company.enabledFeatures || {}) };
    const featureTogglesHtml = FEATURE_TOGGLE_LABELS.map(
      (item) =>
        `<label style="display:flex;align-items:center;gap:8px;margin:6px 0;"><input id="swal-feature-${item.key}" type="checkbox" ${enabledFeatures[item.key] ? 'checked' : ''} /><span>${item.label}</span></label>`
    ).join('');

    const result = await Swal.fire({
      title: `Edit Subscription: ${company.companyName}`,
      html: `
        <div class="text-left space-y-4 mt-4">
          <div><label class="form-label">Plan</label><select id="swal-sub-plan" class="swal2-input form-input"><option ${company.planName === 'Basic' ? 'selected' : ''}>Basic</option><option ${company.planName === 'Professional' ? 'selected' : ''}>Professional</option><option ${company.planName === 'Enterprise' ? 'selected' : ''}>Enterprise</option></select></div>
          <div><label class="form-label">Expiry Date</label><input id="swal-sub-expiry" type="date" class="swal2-input form-input" value="${company.expiryDate ? new Date(company.expiryDate).toISOString().slice(0, 10) : ''}" /></div>
          <div><label class="form-label">Max Users</label><input id="swal-sub-users" type="number" class="swal2-input form-input" value="${company.maxUsers || 0}" min="1" /></div>
          <div><label class="form-label">Monthly Rate</label><input id="swal-sub-mrr" type="number" class="swal2-input form-input" value="${company.monthlyRate || 0}" min="0" /></div>
          <div><label class="form-label">Feature Access (Tick = Enabled)</label><div>${featureTogglesHtml}</div></div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Save Override'
    });
    if (!result.isConfirmed) return;

    const payload = {
      planName: document.getElementById('swal-sub-plan')?.value,
      planExpiryDate: document.getElementById('swal-sub-expiry')?.value,
      maxUsers: Number(document.getElementById('swal-sub-users')?.value || 0),
      monthlyRate: Number(document.getElementById('swal-sub-mrr')?.value || 0),
      status: company.status,
      enabledFeatures: FEATURE_TOGGLE_LABELS.reduce((acc, item) => {
        acc[item.key] = Boolean(document.getElementById(`swal-feature-${item.key}`)?.checked);
        return acc;
      }, {})
    };
    try {
      await platformApi.updateCompanySubscription(company.companyId, payload);
      await loadSubscriptions();
      await loadOverview();
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Subscription override failed');
    }
  }

  function openCompanyDetails(company) {
    const selectedId = company._id || company.companyId;
    setActiveCompanyId(selectedId);
    setActiveCompanyName(company.name || company.companyName || '');
    showView('company-details', selectedId);
  }

  async function viewCredentials(userId) {
    try {
      const data = await platformApi.getPlatformUserCredentials(userId);
      const credentials = data.credentials || {};
      await Swal.fire({
        title: 'User Credentials',
        html: `
          <div class="text-left space-y-2 mt-2">
            <p><strong>User:</strong> ${credentials.name || ''}</p>
            <p><strong>Email:</strong> ${credentials.email || ''}</p>
            <p><strong>User ID:</strong> ${credentials.userId || ''}</p>
            <p><strong>Role:</strong> ${credentials.role || ''}</p>
            <p><strong>Password Hash:</strong> Hidden</p>
          </div>
        `,
        width: 760
      });
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to fetch credentials');
    }
  }

  async function promptResetPassword(userId) {
    const autoPassword = buildPassword();
    const result = await Swal.fire({
      title: 'Reset Password',
      html: `
        <div class="text-left space-y-4 mt-2">
          <div><label class="form-label">User ID</label><input class="swal2-input form-input" value="${userId}" readonly /></div>
          <div><label class="form-label">New Password</label><input id="swal-reset-pass" type="text" class="swal2-input form-input" value="${autoPassword}" /></div>
          <div style="font-size: 0.9rem; color: #6e6e6e; margin-top: 0.25rem;">Password must be at least 8 characters.</div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Update Password',
      preConfirm: () => {
        const password = String(document.getElementById('swal-reset-pass')?.value || '').trim();
        if (!password) {
          Swal.showValidationMessage('Password is required');
          return false;
        }
        if (password.length < 8) {
          Swal.showValidationMessage('Password must be at least 8 characters');
          return false;
        }
        return password;
      }
    });

    if (!result.isConfirmed || !result.value) return;

    try {
      setError('');
      await platformApi.resetUserPassword(userId, result.value);
      await Swal.fire('Success', 'Password reset successfully.', 'success');
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to reset password');
    }
  }

  async function promptChangeRole(userId, companyId = activeCompanyId) {
    try {
      const data = await platformApi.getCompanyRoles(companyId);
      const roleOptions = (data.roles || []).map((role) => `<option value="${role.roleName}">${role.roleName}</option>`).join('');
      const result = await Swal.fire({
        title: 'Change User Role',
        html: `<div class="text-left space-y-4 mt-4"><div><label class="form-label">Available Roles</label><select id="swal-role-select" class="swal2-input form-input">${roleOptions}</select></div></div>`,
        showCancelButton: true,
        confirmButtonText: 'Change Role',
        preConfirm: () => {
          const roleName = document.getElementById('swal-role-select')?.value;
          if (!roleName) {
            Swal.showValidationMessage('Select a role');
            return false;
          }
          return roleName;
        }
      });

      if (!result.isConfirmed) return;
      await platformApi.updatePlatformUser(userId, { operation: 'changeRole', companyId, roleName: result.value });
      await loadCompanyDetails(companyId);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to change role');
    }
  }

  async function toggleUser(userId, companyId = activeCompanyId) {
    try {
      await platformApi.updatePlatformUser(userId, { operation: 'toggleStatus' });
      await loadCompanyDetails(companyId);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to toggle user status');
    }
  }

  async function promptUpdateUserEmail(userId, existingEmail = '') {
    const result = await Swal.fire({
      title: `Edit Receiver Email: ${userId}`,
      html: `<div><label class="form-label">Receiver Email</label><input id="swal-user-email" class="swal2-input form-input" type="email" value="${existingEmail || ''}" /></div>`,
      showCancelButton: true,
      confirmButtonText: 'Save Email',
      preConfirm: () => {
        const email = String(document.getElementById('swal-user-email')?.value || '').trim();
        if (!email) {
          Swal.showValidationMessage('Receiver email is required');
          return false;
        }
        return email;
      }
    });
    if (!result.isConfirmed) return;
    try {
      await platformApi.updatePlatformUser(userId, { operation: 'updateEmail', email: result.value });
      await loadCompanyDetails(activeCompanyId);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to update user email');
    }
  }

  async function saveNotificationSettings() {
    if (!activeCompanyId) {
      setError('Select a company first.');
      return;
    }
    try {
      const data = await platformApi.updateCompanyNotificationSettings(activeCompanyId, notificationSettings);
      if (data?.settings) {
        setNotificationSettings(data.settings);
      }
      await Swal.fire('Saved', 'Notification sender settings updated.', 'success');
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to save notification settings');
    }
  }

  async function sendTestEmail() {
    if (!activeCompanyId) {
      setError('Select a company first.');
      return;
    }
    const result = await Swal.fire({
      title: 'Send Test Mail',
      html: '<div><label class="form-label">Recipient Email</label><input id="swal-test-email" class="swal2-input form-input" type="email" /></div>',
      showCancelButton: true,
      confirmButtonText: 'Send',
      preConfirm: () => {
        const email = String(document.getElementById('swal-test-email')?.value || '').trim();
        if (!email) {
          Swal.showValidationMessage('Recipient email is required');
          return false;
        }
        return email;
      }
    });
    if (!result.isConfirmed) return;
    try {
      await platformApi.sendCompanyNotificationTestEmail(activeCompanyId, result.value);
      await Swal.fire('Sent', `Test mail sent to ${result.value}`, 'success');
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to send test email');
    }
  }

  useEffect(() => {
    window.applySaasRoleVisibility = applySaasRoleVisibility;
    window.showView = showView;
    window.loadOverview = loadOverview;
    window.loadRenewals = loadRenewals;
    window.loadPlanRequests = loadPlanRequests;
    window.loadAudits = loadAudits;
    window.loadSubscriptions = loadSubscriptions;
    window.loadCompanies = loadCompanies;
    window.loadCompanyDetails = loadCompanyDetails;
    window.openCreateCompanyModal = openCreateCompanyModal;
    window.toggleCompanyStatus = toggleCompanyStatus;
    window.handleRenewalAction = handleRenewalAction;
    window.openApprovePlanModal = openApprovePlanModal;
    window.rejectPlan = rejectPlan;
    window.openSubscriptionOverride = openSubscriptionOverride;
    window.openCompanyDetails = openCompanyDetails;
    window.viewCredentials = viewCredentials;
    window.promptResetPassword = promptResetPassword;
    window.promptChangeRole = promptChangeRole;
    window.toggleUser = toggleUser;

    applySaasRoleVisibility(user?.role, user?.isAppAdmin);
    showView('overview');

    return () => {
      delete window.applySaasRoleVisibility;
      delete window.showView;
      delete window.loadOverview;
      delete window.loadRenewals;
      delete window.loadPlanRequests;
      delete window.loadAudits;
      delete window.loadSubscriptions;
      delete window.loadCompanies;
      delete window.loadCompanyDetails;
      delete window.openCreateCompanyModal;
      delete window.toggleCompanyStatus;
      delete window.handleRenewalAction;
      delete window.openApprovePlanModal;
      delete window.rejectPlan;
      delete window.openSubscriptionOverride;
      delete window.openCompanyDetails;
      delete window.viewCredentials;
      delete window.promptResetPassword;
      delete window.promptChangeRole;
      delete window.toggleUser;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role, user?.isAppAdmin]);

  return (
    <>
      <div id="sidebar-overlay" className="hidden" />
      <div id="app-view" className="platform-shell taskdone-shell">
        <nav id="sidebar" className="sidebar platform-sidebar">
          <div>
            <div className="platform-brand taskdone-brand-block">
              <div className="taskdone-brand-logo">✓</div>
              <h1>TaskEasy</h1>
            </div>
            <ul className="platform-nav-list">
              <li id="overview-nav" className="hidden">
                <button type="button" className={`taskdone-nav-link ${currentView === 'overview' ? 'active' : ''}`} data-view="overview" onClick={() => showView('overview')}>
                  <span className="taskdone-nav-icon"><AdminDashIcon /></span>
                  <span className="taskdone-nav-label">Overview</span>
                </button>
              </li>
              <li id="renewals-nav" className="hidden">
                <button type="button" className={`taskdone-nav-link ${currentView === 'renewals' ? 'active' : ''}`} data-view="renewals" onClick={() => showView('renewals')}>
                  <span className="taskdone-nav-icon"><QueueIcon /></span>
                  <span className="taskdone-nav-label">Renewals Queue</span>
                </button>
              </li>
              <li id="plan-requests-nav" className="hidden">
                <button type="button" className={`taskdone-nav-link ${currentView === 'plan-requests' ? 'active' : ''}`} data-view="plan-requests" onClick={() => showView('plan-requests')}>
                  <span className="taskdone-nav-icon"><RequestIcon /></span>
                  <span className="taskdone-nav-label">Plan Requests</span>
                </button>
              </li>
              <li id="audits-nav" className="hidden">
                <button type="button" className={`taskdone-nav-link ${currentView === 'audits' ? 'active' : ''}`} data-view="audits" onClick={() => showView('audits')}>
                  <span className="taskdone-nav-icon"><AuditIcon /></span>
                  <span className="taskdone-nav-label">Audit Trail</span>
                </button>
              </li>
              <li id="subscriptions-nav" className="hidden">
                <button type="button" className={`taskdone-nav-link ${currentView === 'subscriptions' ? 'active' : ''}`} data-view="subscriptions" onClick={() => showView('subscriptions')}>
                  <span className="taskdone-nav-icon"><SubscriptionIcon /></span>
                  <span className="taskdone-nav-label">Subscriptions</span>
                </button>
              </li>
              <li id="companies-nav" className="hidden">
                <button type="button" className={`taskdone-nav-link ${currentView === 'companies' ? 'active' : ''}`} data-view="companies" onClick={() => showView('companies')}>
                  <span className="taskdone-nav-icon"><CompanyIcon /></span>
                  <span className="taskdone-nav-label">Companies</span>
                </button>
              </li>
              <li id="company-details-nav" className="hidden">
                <button type="button" className={`taskdone-nav-link ${currentView === 'company-details' ? 'active' : ''}`} data-view="company-details" onClick={() => showView('company-details')}>
                  <span className="taskdone-nav-icon"><DetailIcon /></span>
                  <span className="taskdone-nav-label">Company Details</span>
                </button>
              </li>
              <li id="notifications-nav" className="hidden">
                <button type="button" className={`taskdone-nav-link ${currentView === 'notifications' ? 'active' : ''}`} data-view="notifications" onClick={() => showView('notifications')}>
                  <span className="taskdone-nav-icon"><QueueIcon /></span>
                  <span className="taskdone-nav-label">Notifications</span>
                </button>
              </li>
            </ul>
          </div>
          <div className="platform-sidebar-footer">
            <p>Powered by</p>
            <strong>Kriscel Tech Pvt Ltd</strong>
          </div>
        </nav>

        <main id="main-content" className="main-content taskdone-main-content">
          <header className="app-header taskdone-header">
            <div className="taskdone-header-left">
              <button type="button" className="taskdone-header-icon menu" aria-label="Menu">
                <MenuIcon />
              </button>
              <h1 id="view-title" className="taskdone-header-title">App Admin Portal</h1>
            </div>
            <div className="taskdone-header-right">
              <button id="theme-toggle" type="button" className="taskdone-header-icon purple" aria-label="Theme">
                <MoonIcon />
              </button>
              <button id="refresh-button" type="button" className="taskdone-header-icon green" onClick={() => showView(currentView)} aria-label="Refresh">
                <RefreshIcon />
              </button>
              <div className="taskdone-user-meta">
                <span>{getGreeting()}</span>
                <strong>{user?.name || 'App Admin'}</strong>
              </div>
              <div className="taskdone-avatar" aria-hidden="true">
                <UserIcon />
              </div>
              <button id="header-logout-btn-visible" type="button" className="taskdone-header-icon red" onClick={logout} aria-label="Logout">
                <LogoutIcon />
              </button>
            </div>
          </header>

          {error ? <div className="state-error">{error}</div> : null}
          {loading ? <div className="state-info">Loading Data...</div> : null}

          <div id="overview" className={`content-view taskdone-dashboard-content ${currentView === 'overview' ? '' : 'hidden'}`}>
            <div className="content-wrapper p-5 animated-card">
              <div className="platform-titlebar">
                <div>
                  <h3><span className="section-title-icon"><AdminDashIcon /></span>Platform Overview</h3>
                  <p>Real-time platform health, user scale, and revenue indicators.</p>
                </div>
                <button type="button" className="platform-primary-btn" onClick={loadOverview}>Refresh Stats</button>
              </div>
            </div>

            <div className="platform-stats-layout taskdone-summary-layout">
              {metricCards.map((metric) => (
                <div key={metric.label} className="content-wrapper p-5 animated-card platform-stat-box taskdone-summary-card">
                  <span>{metric.value}</span>
                  <small>{metric.label}</small>
                </div>
              ))}
            </div>
          </div>

          <div id="renewals" className={`content-view taskdone-dashboard-content ${currentView === 'renewals' ? '' : 'hidden'}`}>
            <div className="content-wrapper p-5 animated-card taskdone-table-card">
              <div className="platform-titlebar">
                <div>
                  <h3><span className="section-title-icon"><QueueIcon /></span>Renewals Queue</h3>
                  <p>Filter expiring subscriptions and execute renewal actions.</p>
                </div>
                <div className="row-actions">
                  <select className="form-input" value={renewalDays} onChange={(e) => setRenewalDays(Number(e.target.value))}>
                    <option value={7}>7 Days</option>
                    <option value={15}>15 Days</option>
                    <option value={30}>30 Days</option>
                  </select>
                  <input className="form-input" placeholder="Search company" value={renewalSearch} onChange={(e) => setRenewalSearch(e.target.value)} />
                  <button type="button" className="platform-primary-btn" onClick={loadRenewals}>Search</button>
                </div>
              </div>
              <div className="table-wrap">
                <table className="table-legacy platform-admin-table">
                  <thead>
                    <tr>
                      <th className="col-wrap">Company Name</th>
                      <th className="col-wrap">Plan</th>
                      <th className="col-status">Status</th>
                      <th className="col-date">Expiry Date</th>
                      <th className="col-action">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {renewals.map((company) => (
                      <tr key={company._id}>
                        <td className="col-wrap">{company.name}</td>
                        <td className="col-wrap">{company.planName || '-'}</td>
                        <td className="col-status"><span className={company.status === 'Active' ? 'status-badge status-active' : 'status-badge status-in-active'}>{company.status}</span></td>
                        <td className="col-date">{formatDate(company.planExpiryDate)}</td>
                        <td className="row-actions col-action">
                          <button type="button" className="platform-table-btn" onClick={() => handleRenewalAction(company._id, 'renew')}>Renew</button>
                          <button type="button" className="platform-table-btn" onClick={() => handleRenewalAction(company._id, 'extend')}>Extend 30d</button>
                          <button type="button" className="platform-table-btn" onClick={() => handleRenewalAction(company._id, 'remind')}>Remind</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div id="plan-requests" className={`content-view taskdone-dashboard-content ${currentView === 'plan-requests' ? '' : 'hidden'}`}>
            <div className="content-wrapper p-5 animated-card taskdone-table-card">
              <div className="platform-titlebar">
                <div>
                  <h3><span className="section-title-icon"><RequestIcon /></span>Plan Requests</h3>
                  <p>Approve or reject tenant upgrade requests.</p>
                </div>
                <div className="row-actions">
                  <select className="form-input" value={planStatus} onChange={(e) => setPlanStatus(e.target.value)}>
                    <option value="All">All</option>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                  <input className="form-input" placeholder="Search request" value={planSearch} onChange={(e) => setPlanSearch(e.target.value)} />
                  <button type="button" className="platform-primary-btn" onClick={loadPlanRequests}>Search</button>
                </div>
              </div>
              <div className="table-wrap">
                <table className="table-legacy table-compact platform-admin-table">
                  <thead>
                    <tr>
                      <th className="col-wrap">Company</th>
                      <th className="col-wrap">Requested Plan</th>
                      <th className="col-wrap">Requested By</th>
                      <th className="col-status">Status</th>
                      <th className="col-date">Requested At</th>
                      <th className="col-action">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {planRequests.map((row) => (
                      <tr key={row._id}>
                        <td className="col-wrap">{row.companyName || '-'}</td>
                        <td className="col-wrap">{row.requestedPlan || '-'}</td>
                        <td className="col-wrap">{row.requestedByEmail || '-'}</td>
                        <td className="col-status"><span className={row.status === 'Approved' ? 'status-badge status-active' : row.status === 'Rejected' ? 'status-badge status-in-active' : 'status-badge status-pending'}>{row.status}</span></td>
                        <td className="col-date">{formatDateTime(row.createdAt)}</td>
                        <td className="row-actions col-action">
                          <button type="button" className="platform-table-btn" disabled={row.status !== 'Pending'} onClick={() => openApprovePlanModal(row)}>Approve</button>
                          <button type="button" className="platform-table-btn" disabled={row.status !== 'Pending'} onClick={() => rejectPlan(row._id)}>Reject</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div id="audits" className={`content-view taskdone-dashboard-content ${currentView === 'audits' ? '' : 'hidden'}`}>
            <div className="content-wrapper p-5 animated-card taskdone-table-card">
              <div className="platform-titlebar">
                <div>
                  <h3><span className="section-title-icon"><AuditIcon /></span>Audit Trail</h3>
                  <p>Platform action logs including blocked unauthorized attempts.</p>
                </div>
                <div className="row-actions">
                  <input className="form-input" placeholder="Search audit" value={auditSearch} onChange={(e) => setAuditSearch(e.target.value)} />
                  <button type="button" className="platform-primary-btn" onClick={loadAudits}>Search</button>
                </div>
              </div>
              <div className="table-wrap">
                <table className="table-legacy table-compact platform-admin-table">
                  <thead>
                    <tr>
                      <th className="col-wrap">Action</th>
                      <th className="col-wrap">App Admin</th>
                      <th className="col-wrap">Company</th>
                      <th className="col-status">Status</th>
                      <th className="col-date">Timestamp</th>
                      <th className="col-wrap">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log._id}>
                        <td className="col-wrap">{log.action || '-'}</td>
                        <td className="col-wrap">{log.actorEmail || log.actorName || '-'}</td>
                        <td className="col-wrap">
                          {log.targetCompanyName || log.details?.companyName || log.details?.company || log.targetCompanyId?.name || (typeof log.targetCompanyId === 'string' ? log.targetCompanyId : '') || 'Unknown Company'}
                        </td>
                        <td className="col-status"><span className={log.status === 'Blocked' ? 'status-badge status-in-active' : 'status-badge status-active'}>{log.status || 'Done'}</span></td>
                        <td className="col-date">{formatDateTime(log.createdAt)}</td>
                        <td className="col-wrap"><pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>{JSON.stringify(log.details || {}, null, 0)}</pre></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div id="subscriptions" className={`content-view taskdone-dashboard-content ${currentView === 'subscriptions' ? '' : 'hidden'}`}>
            <div className="content-wrapper p-5 animated-card taskdone-table-card">
              <div className="platform-titlebar">
                <div>
                  <h3><span className="section-title-icon"><SubscriptionIcon /></span>Subscriptions</h3>
                  <p>Manage freeze/unfreeze and manual subscription overrides.</p>
                </div>
                <div className="row-actions">
                  <input className="form-input" placeholder="Search subscriptions" value={subscriptionSearch} onChange={(e) => setSubscriptionSearch(e.target.value)} />
                  <button type="button" className="platform-primary-btn" onClick={loadSubscriptions}>Search</button>
                </div>
              </div>
              <div className="table-wrap">
                <table className="table-legacy platform-admin-table">
                  <thead>
                    <tr>
                      <th className="col-wrap">Company</th>
                      <th className="col-wrap">Plan</th>
                      <th className="col-status">Status</th>
                      <th className="col-date">Expiry</th>
                      <th className="col-id">Max Users</th>
                      <th className="col-action">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map((item) => (
                      <tr key={item.companyId}>
                        <td className="col-wrap">{item.companyName}</td>
                        <td className="col-wrap">{item.planName || '-'}</td>
                        <td className="col-status"><span className={item.status === 'Active' ? 'status-badge status-active' : 'status-badge status-in-active'}>{item.status}</span></td>
                        <td className="col-date">{formatDate(item.expiryDate)}</td>
                        <td className="col-id">{item.maxUsers || 0}</td>
                        <td className="row-actions col-action">
                          <button type="button" className="platform-table-btn" onClick={() => toggleCompanyStatus(item.companyId, item.status, loadSubscriptions)}>
                            {item.status === 'Active' ? 'Freeze' : 'Unfreeze'}
                          </button>
                          <button type="button" className="platform-table-btn" onClick={() => openSubscriptionOverride(item)}>Plan</button>
                          <button type="button" className="platform-table-btn" onClick={() => openCompanyDetails(item)}>Details</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div id="companies" className={`content-view taskdone-dashboard-content ${currentView === 'companies' ? '' : 'hidden'}`}>
            <div className="content-wrapper p-5 animated-card taskdone-table-card">
              <div className="platform-titlebar">
                <div>
                  <h3><span className="section-title-icon"><CompanyIcon /></span>Companies</h3>
                  <p>Tenant assembly factory with SuperAdmin creation control.</p>
                </div>
                <div className="row-actions">
                  <input className="form-input" placeholder="Search companies" value={companySearch} onChange={(e) => setCompanySearch(e.target.value)} />
                  <button type="button" className="platform-primary-btn" onClick={loadCompanies}>Search</button>
                  <button type="button" className="platform-primary-btn" onClick={openCreateCompanyModal}>Add Company</button>
                </div>
              </div>
              <div className="table-wrap">
                <table className="table-legacy platform-admin-table">
                  <thead>
                    <tr>
                      <th className="col-wrap">Company</th>
                      <th className="col-wrap">Contact</th>
                      <th className="col-wrap">SuperAdmin</th>
                      <th className="col-wrap">Plan</th>
                      <th className="col-status">Status</th>
                      <th className="col-date">Expiry</th>
                      <th className="col-action">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companies.map((company) => (
                      <tr key={company._id}>
                        <td className="col-wrap">{company.name}</td>
                        <td className="col-wrap">{company.contactPerson || '-'} ({company.contactEmail || '-'})</td>
                        <td className="col-wrap">{company.superAdminEmail || '-'}</td>
                        <td className="col-wrap">{company.planName || '-'}</td>
                        <td className="col-status"><span className={company.status === 'Active' ? 'status-badge status-active' : 'status-badge status-in-active'}>{company.status}</span></td>
                        <td className="col-date">{formatDate(company.planExpiryDate)}</td>
                        <td className="row-actions col-action">
                          <button type="button" className="platform-table-btn" onClick={() => openCompanyDetails(company)}>Details</button>
                          <button type="button" className="platform-table-btn" onClick={() => toggleCompanyStatus(company._id, company.status, loadCompanies)}>
                            {company.status === 'Active' ? 'Freeze' : 'Unfreeze'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div id="company-details" className={`content-view taskdone-dashboard-content ${currentView === 'company-details' ? '' : 'hidden'}`}>
            <div className="content-wrapper p-5 animated-card taskdone-table-card">
              <div className="platform-titlebar">
                <div>
                  <h3><span className="section-title-icon"><DetailIcon /></span>Company Details</h3>
                  <p>{activeCompanyName || 'Select a company to inspect tenant internals.'}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" className="platform-primary-btn" onClick={() => showView('notifications')}>Configure Sender</button>
                  <button type="button" className="platform-primary-btn" onClick={() => loadCompanyDetails(activeCompanyId)}>Refresh Details</button>
                </div>
              </div>

              <div className="platform-stats-layout taskdone-summary-layout" style={{ marginBottom: '1rem' }}>
                <div className="content-wrapper p-5 animated-card platform-stat-box taskdone-summary-card"><span>{companyDetails.company?.code || '-'}</span><small>Tenant Code</small></div>
                <div className="content-wrapper p-5 animated-card platform-stat-box taskdone-summary-card"><span>{companyDetails.usage?.totalUsers || 0}</span><small>Total Users</small></div>
                <div className="content-wrapper p-5 animated-card platform-stat-box taskdone-summary-card"><span>{companyDetails.usage?.maxUsers || 0}</span><small>Max Users</small></div>
                <div className="content-wrapper p-5 animated-card platform-stat-box taskdone-summary-card"><span>{companyDetails.usage?.availableSeats || 0}</span><small>Available Seats</small></div>
              </div>

              <div className="platform-titlebar compact">
                <h3>Authorized Users</h3>
                <span>{companyDetails.users.length} records</span>
              </div>
              <div className="table-wrap">
                <table className="table-legacy table-compact platform-admin-table">
                  <thead>
                    <tr>
                      <th className="col-wrap">Name</th>
                      <th className="col-wrap">Email</th>
                      <th className="col-id">User ID</th>
                      <th className="col-status">Role</th>
                      <th className="col-status">Status</th>
                      <th className="col-action">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companyDetails.users.map((row) => (
                      <tr key={row.userId}>
                        <td className="col-wrap">{row.name}</td>
                        <td className="col-wrap">{row.email || '-'}</td>
                        <td className="col-id">{row.userId}</td>
                        <td className="col-status">{row.role}</td>
                        <td className="col-status"><span className={row.status === 'Active' ? 'status-badge status-active' : 'status-badge status-in-active'}>{row.status}</span></td>
                        <td className="row-actions col-action">
                          <button type="button" className="platform-table-btn" onClick={() => viewCredentials(row.userId)}>Credentials</button>
                          <button type="button" className="platform-table-btn" onClick={() => promptUpdateUserEmail(row.userId, row.email || '')}>Email</button>
                          <button type="button" className="platform-table-btn" onClick={() => promptResetPassword(row.userId)}>Reset</button>
                          <button type="button" className="platform-table-btn" onClick={() => promptChangeRole(row.userId, activeCompanyId)}>Role</button>
                          <button type="button" className="platform-table-btn" onClick={() => toggleUser(row.userId, activeCompanyId)}>Status</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div id="notifications" className={`content-view taskdone-dashboard-content ${currentView === 'notifications' ? '' : 'hidden'}`}>
            <div className="content-wrapper p-5 animated-card taskdone-table-card">
              <div className="platform-titlebar">
                <div>
                  <h3><span className="section-title-icon"><QueueIcon /></span>Notification Sender Settings</h3>
                  <p>Sender mailbox configure karne ka access sirf Platform Admin ke paas hai.</p>
                </div>
                <button type="button" className="platform-primary-btn" onClick={saveNotificationSettings}>Save Settings</button>
              </div>

              <p className="state-info">Guide: Sender mailbox yahan set karein. Receiver email har user profile me edit karein (Company Details / Admin panels).</p>

              <div className="work-form">
                <h4>Sender Identity</h4>
                <label>
                  Sender Name
                  <input value={notificationSettings.sender.fromName || ''} onChange={(e) => setNotificationSettings((p) => ({ ...p, sender: { ...p.sender, fromName: e.target.value } }))} />
                </label>
                <label>
                  Sender Email
                  <input type="email" value={notificationSettings.sender.fromEmail || ''} onChange={(e) => setNotificationSettings((p) => ({ ...p, sender: { ...p.sender, fromEmail: e.target.value } }))} />
                </label>
                <label>
                  Reply-To Email
                  <input type="email" value={notificationSettings.sender.replyTo || ''} onChange={(e) => setNotificationSettings((p) => ({ ...p, sender: { ...p.sender, replyTo: e.target.value } }))} />
                </label>

                <h4>SMTP</h4>
                <label>
                  Host
                  <input value={notificationSettings.smtp.host || ''} onChange={(e) => setNotificationSettings((p) => ({ ...p, smtp: { ...p.smtp, host: e.target.value } }))} />
                </label>
                <label>
                  Port
                  <input type="number" value={notificationSettings.smtp.port || 587} onChange={(e) => setNotificationSettings((p) => ({ ...p, smtp: { ...p.smtp, port: Number(e.target.value || 587) } }))} />
                </label>
                <label>
                  SMTP User
                  <input value={notificationSettings.smtp.user || ''} onChange={(e) => setNotificationSettings((p) => ({ ...p, smtp: { ...p.smtp, user: e.target.value } }))} />
                </label>
                <label>
                  SMTP Password
                  <input type="password" value={notificationSettings.smtp.password || ''} onChange={(e) => setNotificationSettings((p) => ({ ...p, smtp: { ...p.smtp, password: e.target.value } }))} />
                </label>
                <label>
                  <input type="checkbox" checked={Boolean(notificationSettings.smtp.secure)} onChange={(e) => setNotificationSettings((p) => ({ ...p, smtp: { ...p.smtp, secure: e.target.checked } }))} />
                  Use secure SSL/TLS
                </label>

                <h4>Notification Events</h4>
                <label>
                  <input type="checkbox" checked={Boolean(notificationSettings.notifications.assignment)} onChange={(e) => setNotificationSettings((p) => ({ ...p, notifications: { ...p.notifications, assignment: e.target.checked } }))} />
                  Task Assignment Mail
                </label>
                <label>
                  <input type="checkbox" checked={Boolean(notificationSettings.notifications.submission)} onChange={(e) => setNotificationSettings((p) => ({ ...p, notifications: { ...p.notifications, submission: e.target.checked } }))} />
                  Submission Mail
                </label>
                <label>
                  <input type="checkbox" checked={Boolean(notificationSettings.notifications.approval)} onChange={(e) => setNotificationSettings((p) => ({ ...p, notifications: { ...p.notifications, approval: e.target.checked } }))} />
                  Approval Mail
                </label>
                <label>
                  <input type="checkbox" checked={Boolean(notificationSettings.notifications.rework)} onChange={(e) => setNotificationSettings((p) => ({ ...p, notifications: { ...p.notifications, rework: e.target.checked } }))} />
                  Rework Mail
                </label>
              </div>

              <div className="platform-titlebar compact">
                <h3>Connectivity</h3>
                <button type="button" className="platform-table-btn" onClick={sendTestEmail}>Send Test Mail</button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
