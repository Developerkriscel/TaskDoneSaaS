import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../store/authContext.jsx';
import { legacyApi } from '../services/api.js';
import WorkPanels from '../components/WorkPanels.jsx';
import ApprovalQueuePanel from '../components/ApprovalQueuePanel.jsx';
import MisPanel from '../components/MisPanel.jsx';
import ReportsPanel from '../components/ReportsPanel.jsx';
import AdminPanel from '../components/AdminPanel.jsx';
import FmsFlowPanel from '../components/FmsFlowPanel.jsx';

const DEFAULT_FILTERS = {
  period: 'all',
  status: 'All Statuses',
  project: 'All Projects',
  employee: 'All Team',
  fromDate: '',
  toDate: ''
};

const PERIOD_BUTTONS = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'lastWeek', label: 'Last Week' },
  { key: 'month', label: 'This Month' },
  { key: 'lastMonth', label: 'Last Month' }
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

const VIEW_FEATURE_MAP = {
  'dashboard-view': 'dashboard',
  'checklist-view': 'checklists',
  'delegation-view': 'delegation',
  'work-request-view': 'workRequest',
  'fms-view': 'fmsSystem',
  'approve-task-view': 'trackStatus',
  'mis-view': 'mis',
  'reports-view': 'reports'
};

function startOfDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function formatInputDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB');
}

function formatTaskDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-GB');
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function getDefaultFilters(user) {
  const today = new Date();
  return {
    ...DEFAULT_FILTERS,
    employee: user?.role === 'Employee' ? user.name : 'All Team',
    fromDate: formatInputDate(today),
    toDate: formatInputDate(today)
  };
}

function buildPeriodFilters(baseFilters, periodKey) {
  const today = new Date();
  const todayValue = formatInputDate(today);

  if (periodKey === 'all') {
    return {
      ...baseFilters,
      period: 'all',
      fromDate: todayValue,
      toDate: todayValue
    };
  }

  if (periodKey === 'today') {
    return {
      ...baseFilters,
      period: 'today',
      fromDate: todayValue,
      toDate: todayValue
    };
  }

  if (periodKey === 'week') {
    const from = startOfDay(today);
    from.setDate(today.getDate() - 6);
    return {
      ...baseFilters,
      period: 'week',
      fromDate: formatInputDate(from),
      toDate: todayValue
    };
  }

  if (periodKey === 'month') {
    const from = startOfDay(new Date(today.getFullYear(), today.getMonth(), 1));
    return {
      ...baseFilters,
      period: 'month',
      fromDate: formatInputDate(from),
      toDate: todayValue
    };
  }

  if (periodKey === 'lastWeek') {
    const end = endOfDay(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7));
    const start = startOfDay(new Date(end));
    start.setDate(end.getDate() - 6);
    return {
      ...baseFilters,
      period: 'custom',
      fromDate: formatInputDate(start),
      toDate: formatInputDate(end)
    };
  }

  if (periodKey === 'lastMonth') {
    const start = startOfDay(new Date(today.getFullYear(), today.getMonth() - 1, 1));
    const end = endOfDay(new Date(today.getFullYear(), today.getMonth(), 0));
    return {
      ...baseFilters,
      period: 'custom',
      fromDate: formatInputDate(start),
      toDate: formatInputDate(end)
    };
  }

  return baseFilters;
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15.9 2.6a8.8 8.8 0 1 0 5.5 15.8A9.8 9.8 0 0 1 15.9 2.6Z" fill="currentColor" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 6v5h-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 11a8 8 0 1 1-2.34-5.66L20 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.2 0-7 2.1-7 5v1h14v-1c0-2.9-2.8-5-7-5Z" fill="currentColor" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 7l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 12H9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M11 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function DashboardNavIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="4" width="7" height="7" rx="1.5" fill="currentColor" />
      <rect x="13" y="4" width="7" height="4" rx="1.5" fill="currentColor" opacity="0.72" />
      <rect x="13" y="10" width="7" height="10" rx="1.5" fill="currentColor" opacity="0.9" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.72" />
    </svg>
  );
}

function ChecklistNavIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 5h10M9 12h10M9 19h10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="m4.5 5.5 1.8 1.8L8.7 4.8M4.5 12.5l1.8 1.8 2.4-2.5M4.5 19.5l1.8 1.8 2.4-2.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DelegationNavIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 7h10M7 12h7M7 17h10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="4" cy="7" r="1.5" fill="currentColor" />
      <circle cx="4" cy="12" r="1.5" fill="currentColor" />
      <circle cx="4" cy="17" r="1.5" fill="currentColor" />
    </svg>
  );
}

function WorkRequestNavIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 7h10l1 12H6L7 7Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M10 9V6a2 2 0 1 1 4 0v3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function FmsNavIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4v6M6 10v6M18 10v6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <rect x="4" y="16" width="4" height="4" rx="1" fill="currentColor" />
      <rect x="10" y="10" width="4" height="10" rx="1" fill="currentColor" opacity="0.9" />
      <rect x="16" y="16" width="4" height="4" rx="1" fill="currentColor" opacity="0.76" />
    </svg>
  );
}

function ApproveNavIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12 4 4L19 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MisNavIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4a8 8 0 1 0 8 8h-8Z" fill="currentColor" opacity="0.9" />
      <path d="M13 3.1A8.9 8.9 0 0 1 20.9 11H13Z" fill="currentColor" opacity="0.55" />
    </svg>
  );
}

function ReportsNavIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 4h10v16H7z" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M9 9h6M9 13h6M9 17h4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SettingsNavIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9" cy="9" r="3" fill="currentColor" opacity="0.92" />
      <circle cx="17" cy="10" r="2.6" fill="currentColor" opacity="0.72" />
      <circle cx="13" cy="17" r="3" fill="currentColor" opacity="0.82" />
    </svg>
  );
}

function HierarchyNavIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v5M6 19v-5h12v5M9 14v-2h6v2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="4" y="19" width="4" height="3" rx="1" fill="currentColor" />
      <rect x="10" y="2" width="4" height="3" rx="1" fill="currentColor" opacity="0.88" />
      <rect x="16" y="19" width="4" height="3" rx="1" fill="currentColor" opacity="0.72" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="6" width="16" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M8 3v5M16 3v5M4 10h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 6h16M7 12h10M10 18h4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="9" cy="6" r="2" fill="currentColor" />
      <circle cx="15" cy="12" r="2" fill="currentColor" />
      <circle cx="12" cy="18" r="2" fill="currentColor" />
    </svg>
  );
}

function NavButton({ active, onClick, icon, label, notificationVisible }) {
  return (
    <button type="button" className={`taskdone-nav-link ${active ? 'active' : ''}`} onClick={onClick}>
      <span className="taskdone-nav-icon">{icon}</span>
      <span className="taskdone-nav-label">{label}</span>
      <span className={`notification-dot ${notificationVisible ? '' : 'hidden'}`} />
    </button>
  );
}

function SummaryCard({ title, data, mode }) {
  const total = Number(data?.total || 0);
  const done = Number(data?.done || 0);
  const pending = Number(data?.pending || 0);
  const delayed = Number(data?.tasksDelayed || 0);

  return (
    <article className="taskdone-summary-card animated-card">
      <h3>{`${mode === 'Team' ? 'Team' : 'My'} ${title}`}</h3>
      <div className="taskdone-summary-grid">
        <div>
          <strong className="blue">{total}</strong>
          <span>Total</span>
        </div>
        <div>
          <strong className="green">{done}</strong>
          <span>Done</span>
        </div>
        <div>
          <strong className="yellow">{pending}</strong>
          <span>Pending</span>
        </div>
        <div>
          <strong className="red">{delayed}</strong>
          <span>Delayed</span>
        </div>
      </div>
    </article>
  );
}

function DashboardTable({ title, rows, emptyText }) {
  return (
    <section className="taskdone-table-card content-wrapper animated-card">
      <div className="taskdone-table-head">
        <h3>{title}</h3>
        <span>{rows.length}</span>
      </div>
      {rows.length ? (
        <div className="taskdone-table-wrap">
          <table className="taskdone-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Description</th>
                <th>Project</th>
                <th>Target Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id || row.taskId || row.requestId || index}>
                  <td>{row.type || '-'}</td>
                  <td>{row.description || '-'}</td>
                  <td>{row.project || '-'}</td>
                  <td>{formatTaskDate(row.targetDate)}</td>
                  <td>{row.status || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="taskdone-empty-state">{emptyText}</div>
      )}
    </section>
  );
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [filters, setFilters] = useState(() => getDefaultFilters(user));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard-view');
  const [dashboardMode, setDashboardMode] = useState(user.role === 'Employee' ? 'My' : 'Team');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payload, setPayload] = useState({
    unified: null,
    dashboard: null,
    pending: [],
    approvals: { delegations: [], workRequests: [], checklists: [] },
    notifications: null
  });

  const featureAccess = useMemo(() => {
    const features = user?.companyFeatures || {};
    return {
      ...DEFAULT_COMPANY_FEATURES,
      ...features
    };
  }, [user?.companyFeatures]);

  async function loadData(currentFilters) {
    setLoading(true);
    setError('');
    try {
      const [unified, dashboard, pending, approvals, notifications] = await Promise.all([
        legacyApi.getUnifiedAppData(user.name, user.role),
        legacyApi.getDashboardPageData(user.name, user.role, currentFilters),
        legacyApi.getAllPendingTasksForUser(user.name),
        legacyApi.getTasksForApproval(user.name, user.role, currentFilters),
        legacyApi.getNotificationCounts(user.name, user.role)
      ]);

      setPayload({ unified, dashboard, pending, approvals, notifications });
    } catch (err) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const nextFilters = getDefaultFilters(user);
    setFilters(nextFilters);
    setDashboardMode(user.role === 'Employee' ? 'My' : 'Team');
    loadData(nextFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.name, user.role]);

  const navVisibility = useMemo(() => {
    const role = String(user.role || '').trim();
    return {
      dashboard: featureAccess.dashboard,
      delegation: ['Employee', 'Admin', 'Super Admin'].includes(role) && featureAccess.delegation,
      checklist: ['Employee', 'Admin', 'Super Admin'].includes(role) && featureAccess.checklists,
      workRequest: ['Employee', 'Admin', 'Super Admin'].includes(role) && featureAccess.workRequest,
      approve: ['Employee', 'Admin', 'Super Admin'].includes(role) && featureAccess.trackStatus,
      mis: ['Admin', 'Super Admin'].includes(role) && featureAccess.mis,
      reports: ['Admin', 'Super Admin'].includes(role) && featureAccess.reports,
      adminSettings: role === 'Super Admin',
      hierarchy: role === 'Super Admin',
      fms: ['Employee', 'Admin', 'Super Admin'].includes(role) && featureAccess.fmsSystem
    };
  }, [featureAccess, user.role]);

  const projects = payload.unified?.projects || [];
  const metrics = payload.dashboard?.metrics || {};
  const priorityRows = payload.dashboard?.priorityTasks || [];
  const teamRows = payload.dashboard?.teamPriorityTasks || [];
  const counts = payload.notifications || {};
  const teamMembers = payload.unified?.teamMembers || [];
  const currentFeatureBlocked = Boolean(VIEW_FEATURE_MAP[currentView] && featureAccess[VIEW_FEATURE_MAP[currentView]] === false);

  const activePeriod = useMemo(() => {
    if (filters.period === 'all') return 'all';
    if (filters.period === 'today') return 'today';
    if (filters.period === 'week') return 'week';
    if (filters.period === 'month') return 'month';

    const today = formatInputDate(new Date());
    const lastWeek = buildPeriodFilters(filters, 'lastWeek');
    const lastMonth = buildPeriodFilters(filters, 'lastMonth');
    if (filters.fromDate === today && filters.toDate === today) return 'today';
    if (filters.fromDate === lastWeek.fromDate && filters.toDate === lastWeek.toDate) return 'lastWeek';
    if (filters.fromDate === lastMonth.fromDate && filters.toDate === lastMonth.toDate) return 'lastMonth';
    return 'custom';
  }, [filters]);

  const activeFilterCount = useMemo(() => {
    const defaults = getDefaultFilters(user);
    const fieldKeys = ['employee', 'project', 'status'];
    const changedFields = fieldKeys.reduce((count, key) => (filters[key] !== defaults[key] ? count + 1 : count), 0);
    const dateChanged = filters.fromDate !== defaults.fromDate || filters.toDate !== defaults.toDate || (filters.period && filters.period !== 'all');
    return changedFields + (dateChanged ? 1 : 0);
  }, [filters, user]);

  useEffect(() => {
    const requiredFeature = VIEW_FEATURE_MAP[currentView];
    if (!requiredFeature || featureAccess[requiredFeature] !== false) {
      return;
    }

    const fallbackOrder = [
      'dashboard-view',
      'checklist-view',
      'delegation-view',
      'work-request-view',
      'fms-view',
      'approve-task-view',
      'mis-view',
      'reports-view',
      'user-management-view',
      'hierarchy-view'
    ];

    const fallbackView = fallbackOrder.find((viewName) => {
      const featureKey = VIEW_FEATURE_MAP[viewName];
      if (!featureKey) return true;
      return featureAccess[featureKey] !== false;
    });

    if (fallbackView && fallbackView !== currentView) {
      setCurrentView(fallbackView);
      setError('disabled please contact TaskEasy Support');
    }
  }, [currentView, featureAccess]);

  function showView(viewName) {
    const requiredFeature = VIEW_FEATURE_MAP[viewName];
    if (requiredFeature && featureAccess[requiredFeature] === false) {
      setError('disabled please contact TaskEasy Support');
      return;
    }
    setCurrentView(viewName);
    setError((prev) => (prev === 'disabled please contact TaskEasy Support' ? '' : prev));
  }

  function applyFilters(nextFilters) {
    setFilters(nextFilters);
    loadData(nextFilters);
  }

  function handleModeChange(mode) {
    if (user.role === 'Employee') return;
    setDashboardMode(mode);
    const nextFilters = {
      ...filters,
      employee: mode === 'My' ? user.name : 'All Team'
    };
    applyFilters(nextFilters);
  }

  function handlePeriodClick(periodKey) {
    applyFilters(buildPeriodFilters(filters, periodKey));
  }

  function handleFilterField(field, value) {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'fromDate' || field === 'toDate' ? { period: 'custom' } : {})
    }));
  }

  function handleApplyClick() {
    let nextFilters = { ...filters };
    if (dashboardMode === 'My' && user.role !== 'Employee') {
      nextFilters.employee = user.name;
    }
    if (dashboardMode === 'Team' && user.role !== 'Employee' && !nextFilters.employee) {
      nextFilters.employee = 'All Team';
    }
    applyFilters(nextFilters);
  }

  function handleClearFilters() {
    const nextFilters = getDefaultFilters(user);
    setDashboardMode(user.role === 'Employee' ? 'My' : 'Team');
    applyFilters(nextFilters);
  }

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
              <li className={navVisibility.dashboard ? '' : 'hidden'}>
                <NavButton active={currentView === 'dashboard-view'} onClick={() => showView('dashboard-view')} icon={<DashboardNavIcon />} label="Dashboard" />
              </li>
              <li id="checklist-nav" className={navVisibility.checklist ? '' : 'hidden'}>
                <NavButton active={currentView === 'checklist-view'} onClick={() => showView('checklist-view')} icon={<ChecklistNavIcon />} label="Checklists" notificationVisible={Number(user.role === 'Employee' ? counts.checklistCount : counts.myChecklistCount) > 0} />
              </li>
              <li id="delegation-nav" className={navVisibility.delegation ? '' : 'hidden'}>
                <NavButton active={currentView === 'delegation-view'} onClick={() => showView('delegation-view')} icon={<DelegationNavIcon />} label="Delegation" notificationVisible={Number(user.role === 'Employee' ? counts.delegationCount : counts.myDelegationCount) > 0} />
              </li>
              <li id="work-request-nav" className={navVisibility.workRequest ? '' : 'hidden'}>
                <NavButton active={currentView === 'work-request-view'} onClick={() => showView('work-request-view')} icon={<WorkRequestNavIcon />} label="Work Request" notificationVisible={Number(user.role === 'Employee' ? counts.workRequestCount : counts.myWorkRequestCount) > 0} />
              </li>
              <li id="fms-nav" className={navVisibility.fms ? '' : 'hidden'}>
                <NavButton active={currentView === 'fms-view'} onClick={() => showView('fms-view')} icon={<FmsNavIcon />} label="FMS System" />
              </li>
              <li id="approve-task-nav" className={navVisibility.approve ? '' : 'hidden'}>
                <NavButton active={currentView === 'approve-task-view'} onClick={() => showView('approve-task-view')} icon={<ApproveNavIcon />} label={user.role === 'Employee' ? 'Track Status' : 'Approve/Review'} notificationVisible={Number(counts.approvalCount) > 0} />
              </li>
              <li id="mis-nav" className={navVisibility.mis ? '' : 'hidden'}>
                <NavButton active={currentView === 'mis-view'} onClick={() => showView('mis-view')} icon={<MisNavIcon />} label="MIS" />
              </li>
              <li id="reports-nav" className={navVisibility.reports ? '' : 'hidden'}>
                <NavButton active={currentView === 'reports-view'} onClick={() => showView('reports-view')} icon={<ReportsNavIcon />} label="Reports" />
              </li>
              <li id="user-management-nav" className={navVisibility.adminSettings ? '' : 'hidden'}>
                <NavButton active={currentView === 'user-management-view'} onClick={() => showView('user-management-view')} icon={<SettingsNavIcon />} label="Admin Settings" />
              </li>
              <li id="hierarchy-nav" className={navVisibility.hierarchy ? '' : 'hidden'}>
                <NavButton active={currentView === 'hierarchy-view'} onClick={() => showView('hierarchy-view')} icon={<HierarchyNavIcon />} label="Set Hierarchy" />
              </li>
            </ul>
          </div>
        </nav>

        <main id="main-content" className="main-content taskdone-main-content">
          <header className="app-header taskdone-header">
            <div className="taskdone-header-left">
              <button type="button" className="taskdone-header-icon menu" aria-label="Menu">
                <MenuIcon />
              </button>
              <h1 id="view-title" className="taskdone-header-title">Dashboard</h1>
            </div>
            <div className="taskdone-header-right">
              <button id="theme-toggle" type="button" className="taskdone-header-icon purple" aria-label="Theme">
                <MoonIcon />
              </button>
              <button id="refresh-button" type="button" className="taskdone-header-icon green" onClick={() => loadData(filters)} aria-label="Refresh">
                <RefreshIcon />
              </button>
              <div className="taskdone-user-meta">
                <span>{getGreeting()}</span>
                <strong>{user.name}</strong>
              </div>
              <div className="taskdone-avatar" aria-hidden="true">
                <UserIcon />
              </div>
              <button id="header-logout-btn-visible" type="button" className="taskdone-header-icon red" onClick={logout} aria-label="Logout">
                <LogoutIcon />
              </button>
            </div>
          </header>

          <div className="dash-content taskdone-dashboard-content">
            {error ? <div className="state-error taskdone-state-error">{error}</div> : null}
            {loading ? <div className="state-info taskdone-state-info">Loading dashboard data...</div> : null}

            {!loading ? (
              <>
                {currentFeatureBlocked ? (
                  <div className="content-wrapper p-5 animated-card">
                    <p className="state-error">disabled please contact TaskEasy Support</p>
                  </div>
                ) : null}

                <div className={currentFeatureBlocked ? 'hidden' : ''}>
                <div id="dashboard-view" className={`content-view ${currentView === 'dashboard-view' ? '' : 'hidden'}`}>
                  {user.role !== 'Employee' ? (
                    <div className="taskdone-mode-toggle-wrap">
                      <div className="taskdone-mode-toggle">
                        <button type="button" onClick={() => handleModeChange('Team')} className={dashboardMode === 'Team' ? 'active' : ''}>
                          Team View
                        </button>
                        <button type="button" onClick={() => handleModeChange('My')} className={dashboardMode === 'My' ? 'active' : ''}>
                          My View
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div className={`taskdone-filter-shell ${filtersOpen ? 'open' : ''}`}>
                    <button
                      type="button"
                      className="taskdone-filter-trigger"
                      onClick={() => setFiltersOpen((prev) => !prev)}
                      aria-expanded={filtersOpen}
                      aria-controls="dashboard-filter-panel"
                    >
                      <span className="taskdone-filter-trigger-icon"><FilterIcon /></span>
                      <span>Filter</span>
                      {activeFilterCount > 0 ? <strong>{activeFilterCount}</strong> : null}
                    </button>

                    <div id="dashboard-filter-panel" className="taskdone-filter-panel" aria-hidden={!filtersOpen}>
                  <section className="taskdone-filter-card content-wrapper animated-card">
                    <div className="taskdone-filter-top-row">
                      <div className="taskdone-filter-selects">
                        {user.role !== 'Employee' ? (
                          <select value={filters.employee} onChange={(e) => handleFilterField('employee', e.target.value)} className="taskdone-select">
                            <option value="All Team">All Employees</option>
                            {[...new Set(teamMembers)].map((member) => (
                              <option key={member} value={member}>
                                {member}
                              </option>
                            ))}
                          </select>
                        ) : null}
                        <select value={filters.project} onChange={(e) => handleFilterField('project', e.target.value)} className="taskdone-select">
                          <option value="All Projects">All Projects</option>
                          {projects.map((project) => (
                            <option key={project} value={project}>
                              {project}
                            </option>
                          ))}
                        </select>
                        <select value={filters.status} onChange={(e) => handleFilterField('status', e.target.value)} className="taskdone-select">
                          <option value="All Statuses">All Statuses</option>
                          <option value="Pending">Pending</option>
                          <option value="Completed">Completed</option>
                          <option value="Rework">Rework</option>
                          <option value="Late">Late</option>
                        </select>
                      </div>

                      <div className="taskdone-date-range">
                        <label className="taskdone-date-field">
                          <span className="taskdone-calendar-icon"><CalendarIcon /></span>
                          <input type="date" value={filters.fromDate} onChange={(e) => handleFilterField('fromDate', e.target.value)} />
                          <em>{formatDisplayDate(filters.fromDate)}</em>
                        </label>
                        <span className="taskdone-date-separator">-</span>
                        <label className="taskdone-date-field">
                          <span className="taskdone-calendar-icon"><CalendarIcon /></span>
                          <input type="date" value={filters.toDate} onChange={(e) => handleFilterField('toDate', e.target.value)} />
                          <em>{formatDisplayDate(filters.toDate)}</em>
                        </label>
                      </div>
                    </div>

                    <div className="taskdone-filter-bottom-row">
                      <button type="button" className="taskdone-clear-btn" onClick={handleClearFilters} aria-label="Clear Filters">
                        ×
                      </button>
                      <div className="taskdone-period-tabs">
                        {PERIOD_BUTTONS.map((button) => (
                          <button key={button.key} type="button" className={activePeriod === button.key ? 'active' : ''} onClick={() => handlePeriodClick(button.key)}>
                            {button.label}
                          </button>
                        ))}
                      </div>
                      <button type="button" className="taskdone-apply-btn" onClick={handleApplyClick}>
                        Apply
                      </button>
                    </div>
                  </section>
                    </div>
                  </div>

                  <section className="taskdone-summary-layout">
                    <SummaryCard title="Delegation" data={metrics.delegation} mode={dashboardMode} />
                    <SummaryCard title="Work Request" data={metrics.workRequest} mode={dashboardMode} />
                    <SummaryCard title="Checklist" data={metrics.checklist} mode={dashboardMode} />
                    <SummaryCard title="FMS" data={metrics.fms} mode={dashboardMode} />
                  </section>

                  <div className="taskdone-dashboard-grids">
                    <DashboardTable title={dashboardMode === 'Team' ? 'Team Priority Tasks' : 'My Priority Tasks'} rows={dashboardMode === 'Team' ? teamRows : priorityRows} emptyText="No priority tasks found." />
                    <DashboardTable title="My Pending Tasks" rows={payload.pending || []} emptyText="No pending tasks found." />
                  </div>
                </div>

                <div id="approve-task-view" className={`content-view ${currentView === 'approve-task-view' ? '' : 'hidden'}`}>
                  <ApprovalQueuePanel approvals={payload.approvals} userRole={user.role} onRefresh={() => loadData(filters)} />
                </div>

                <div id="delegation-view" className={`content-view ${currentView === 'delegation-view' ? '' : 'hidden'}`}>
                  <WorkPanels user={user} projects={projects} allUsers={payload.unified?.allUsers || []} onRefresh={() => loadData(filters)} initialTab="Delegation" />
                </div>

                <div id="checklist-view" className={`content-view ${currentView === 'checklist-view' ? '' : 'hidden'}`}>
                  <WorkPanels user={user} projects={projects} allUsers={payload.unified?.allUsers || []} onRefresh={() => loadData(filters)} initialTab="Checklist" />
                </div>

                <div id="work-request-view" className={`content-view ${currentView === 'work-request-view' ? '' : 'hidden'}`}>
                  <WorkPanels user={user} projects={projects} allUsers={payload.unified?.allUsers || []} onRefresh={() => loadData(filters)} initialTab="Work Request" />
                </div>

                <div id="fms-view" className={`content-view ${currentView === 'fms-view' ? '' : 'hidden'}`}>
                  <FmsFlowPanel user={user} allUsers={payload.unified?.allUsers || []} />
                </div>

                <div id="mis-view" className={`content-view ${currentView === 'mis-view' ? '' : 'hidden'}`}>
                  <MisPanel user={user} filters={filters} />
                </div>

                <div id="reports-view" className={`content-view ${currentView === 'reports-view' ? '' : 'hidden'}`}>
                  <ReportsPanel user={user} filters={filters} />
                </div>

                <div id="user-management-view" className={`content-view ${currentView === 'user-management-view' ? '' : 'hidden'}`}>
                  <AdminPanel user={user} />
                </div>

                <div id="hierarchy-view" className={`content-view ${currentView === 'hierarchy-view' ? '' : 'hidden'}`}>
                  <AdminPanel user={user} defaultTab="Hierarchy" />
                </div>
                </div>
              </>
            ) : null}
          </div>
        </main>
      </div>
    </>
  );
}
