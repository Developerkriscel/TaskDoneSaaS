import { useEffect, useMemo, useState } from 'react';
import { legacyApi } from '../services/api.js';
import StatusBadge from './StatusBadge.jsx';

const ADMIN_ROLES = new Set(['Admin', 'Super Admin', 'App Admin']);
const TABS = ['Users', 'Hierarchy', 'Projects', 'FMS'];

function ensureSuccess(res) {
  if (typeof res === 'string' && res !== 'success') {
    throw new Error(res);
  }
}

export default function AdminPanel({ user }) {
  const [activeTab, setActiveTab] = useState('Users');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const [users, setUsers] = useState([]);
  const [hierarchy, setHierarchy] = useState([]);
  const [projects, setProjects] = useState([]);
  const [adminEmployeeOptions, setAdminEmployeeOptions] = useState({ admins: [], employees: [] });

  const [userForm, setUserForm] = useState({
    user: '',
    number: '',
    userId: '',
    email: '',
    role: 'Employee',
    status: 'Active',
    password: ''
  });

  const [hierarchyForm, setHierarchyForm] = useState({ admin: '', employeesCsv: '' });
  const [projectName, setProjectName] = useState('');
  const [fmsForm, setFmsForm] = useState({ sheetId: '', range: 'FMS!A2:M' });

  const canManage = useMemo(() => ADMIN_ROLES.has(String(user.role || '').trim()), [user.role]);

  async function loadAdminData() {
    if (!canManage) return;

    setLoading(true);
    setError('');
    try {
      const [usersRows, hierarchyRows, projectRows, options] = await Promise.all([
        legacyApi.getUsersForManagement(),
        legacyApi.getHierarchyData(),
        legacyApi.getProjectsWithStatus(),
        legacyApi.getAdminsAndEmployees()
      ]);
      setUsers(Array.isArray(usersRows) ? usersRows : []);
      setHierarchy(Array.isArray(hierarchyRows) ? hierarchyRows : []);
      setProjects(Array.isArray(projectRows) ? projectRows : []);
      setAdminEmployeeOptions(options || { admins: [], employees: [] });
    } catch (err) {
      setError(err.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAdminData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage]);

  function startEditUser(row) {
    setUserForm({
      user: row.user || '',
      number: row.number || '',
      userId: row.userId || '',
      email: row.email || '',
      role: row.role || 'Employee',
      status: row.status || 'Active',
      password: ''
    });
    setActiveTab('Users');
  }

  async function submitUser(e) {
    e.preventDefault();
    setMsg('');
    setError('');

    if (!userForm.user || !userForm.userId || !userForm.password) {
      setError('Name, User ID, and Password are required');
      return;
    }

    try {
      const payload = {
        user: userForm.user,
        number: userForm.number,
        userId: userForm.userId,
        email: userForm.email,
        role: userForm.role,
        status: userForm.status,
        ...(userForm.password ? { password: userForm.password } : {})
      };
      ensureSuccess(await legacyApi.upsertUser(payload));
      setMsg('Success! User saved.');
      await loadAdminData();
      setUserForm({ user: '', number: '', userId: '', email: '', role: 'Employee', status: 'Active', password: '' });
    } catch (err) {
      setError(err.message || 'Failed to save user');
    }
  }

  async function removeUser(userId) {
    setMsg('');
    setError('');
    try {
      ensureSuccess(await legacyApi.deleteUser(userId));
      setMsg('Deleted! User has been deleted.');
      await loadAdminData();
    } catch (err) {
      setError(err.message || 'Failed to delete user');
    }
  }

  async function saveHierarchyRow(e) {
    e.preventDefault();
    setMsg('');
    setError('');

    if (!hierarchyForm.admin) {
      setError('Please select an admin.');
      return;
    }

    const employees = hierarchyForm.employeesCsv
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);

    try {
      const payload = [...hierarchy.filter((x) => x.admin !== hierarchyForm.admin), { admin: hierarchyForm.admin, employees }];
      ensureSuccess(await legacyApi.saveHierarchy(payload));
      setMsg('Success! Hierarchy saved.');
      setHierarchyForm({ admin: '', employeesCsv: '' });
      await loadAdminData();
    } catch (err) {
      setError(err.message || 'Failed to save hierarchy');
    }
  }

  async function createProject(e) {
    e.preventDefault();
    setMsg('');
    setError('');

    if (!String(projectName || '').trim()) {
      setError('Name is required!');
      return;
    }

    try {
      ensureSuccess(await legacyApi.manageProject('add', { newName: projectName }));
      setProjectName('');
      setMsg('Success! Projects updated.');
      await loadAdminData();
    } catch (err) {
      setError(err.message || 'Failed to add project');
    }
  }

  async function toggleProject(name) {
    setMsg('');
    setError('');
    try {
      ensureSuccess(await legacyApi.manageProject('toggleStatus', { name }));
      setMsg('Success! Projects updated.');
      await loadAdminData();
    } catch (err) {
      setError(err.message || 'Failed to update project');
    }
  }

  async function deleteProject(name) {
    setMsg('');
    setError('');
    try {
      ensureSuccess(await legacyApi.manageProject('delete', { name }));
      setMsg('Success! Projects updated.');
      await loadAdminData();
    } catch (err) {
      setError(err.message || 'Failed to delete project');
    }
  }

  async function saveFms(e) {
    e.preventDefault();
    setMsg('');
    setError('');
    try {
      ensureSuccess(await legacyApi.saveFmsSheetSetting({ sheetId: fmsForm.sheetId, range: fmsForm.range }));
      setMsg('FMS connector setting saved.');
    } catch (err) {
      setError(err.message || 'Failed to save FMS setting');
    }
  }

  if (!canManage) {
    return (
      <section className="panel-table">
        <div className="panel-head">
          <h3>Admin Management</h3>
          <span>Restricted</span>
        </div>
        <p className="panel-empty">Your role does not have admin-management access.</p>
      </section>
    );
  }

  return (
    <section className="panel-table">
      <div className="panel-head">
        <h3>Admin Management</h3>
        <button type="button" onClick={loadAdminData} disabled={loading}>
          Refresh
        </button>
      </div>

      <div className="tab-row">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={tab === activeTab ? 'tab-btn active' : 'tab-btn'}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {error ? <p className="state-error">{error}</p> : null}
      {msg ? <p className="state-info">{msg}</p> : null}

      {activeTab === 'Users' ? (
        <div className="panel-body">
          <form className="work-form" onSubmit={submitUser}>
            <h4>User Management</h4>
            <label>
              Name
              <input value={userForm.user} onChange={(e) => setUserForm((p) => ({ ...p, user: e.target.value }))} required />
            </label>
            <label>
              Number
              <input value={userForm.number} onChange={(e) => setUserForm((p) => ({ ...p, number: e.target.value }))} />
            </label>
            <label>
              User ID
              <input value={userForm.userId} onChange={(e) => setUserForm((p) => ({ ...p, userId: e.target.value }))} required />
            </label>
            <label>
              Email
              <input value={userForm.email} onChange={(e) => setUserForm((p) => ({ ...p, email: e.target.value }))} type="email" />
            </label>
            <label>
              Role
              <select value={userForm.role} onChange={(e) => setUserForm((p) => ({ ...p, role: e.target.value }))}>
                <option>Employee</option>
                <option>Admin</option>
                <option>App Admin</option>
                <option>Super Admin</option>
              </select>
            </label>
            <label>
              Status
              <select value={userForm.status} onChange={(e) => setUserForm((p) => ({ ...p, status: e.target.value }))}>
                <option>Active</option>
                <option>In-active</option>
              </select>
            </label>
            <label>
              Password
              <input
                type="password"
                value={userForm.password}
                onChange={(e) => setUserForm((p) => ({ ...p, password: e.target.value }))}
                placeholder="Leave blank to keep existing"
              />
            </label>
            <button type="submit" disabled={loading}>
              Save User
            </button>
          </form>

          <div className="table-wrap">
            <table className="table-legacy table-compact">
              <thead>
                <tr>
                  <th className="col-user">User</th>
                  <th className="col-id">User ID</th>
                  <th>Email</th>
                  <th className="col-user">Role</th>
                  <th className="col-status">Status</th>
                  <th className="col-action">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((row) => (
                  <tr key={row.userId}>
                    <td className="col-user">{row.user}</td>
                    <td className="col-id">{row.userId}</td>
                    <td>{row.email || '-'}</td>
                    <td className="col-user">{row.role}</td>
                    <td className="col-status">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="row-actions col-action">
                      <button type="button" onClick={() => startEditUser(row)}>
                        Edit
                      </button>
                      <button type="button" className="btn-danger" onClick={() => removeUser(row.userId)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {activeTab === 'Hierarchy' ? (
        <div className="panel-body">
          <form className="work-form" onSubmit={saveHierarchyRow}>
            <h4>Hierarchy Mapping</h4>
            <label>
              Admin
              <select
                value={hierarchyForm.admin}
                onChange={(e) => setHierarchyForm((p) => ({ ...p, admin: e.target.value }))}
                required
              >
                <option value="">Select admin</option>
                {(adminEmployeeOptions.admins || []).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Employees (comma separated)
              <input
                value={hierarchyForm.employeesCsv}
                onChange={(e) => setHierarchyForm((p) => ({ ...p, employeesCsv: e.target.value }))}
                placeholder={(adminEmployeeOptions.employees || []).join(', ')}
                required
              />
            </label>
            <button type="submit" disabled={loading}>
              Save Hierarchy
            </button>
          </form>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Admin</th>
                  <th>Employees</th>
                </tr>
              </thead>
              <tbody>
                {hierarchy.map((row, idx) => (
                  <tr key={`${row.admin}-${idx}`}>
                    <td>{row.admin}</td>
                    <td>{(row.employees || []).join(', ') || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {activeTab === 'Projects' ? (
        <div className="panel-body">
          <form className="work-form" onSubmit={createProject}>
            <h4>Project Management</h4>
            <label>
              New Project Name
              <input value={projectName} onChange={(e) => setProjectName(e.target.value)} required />
            </label>
            <button type="submit" disabled={loading}>
              Add Project
            </button>
          </form>

          <div className="table-wrap">
            <table className="table-legacy table-compact">
              <thead>
                <tr>
                  <th className="col-wrap">Project</th>
                  <th className="col-status">Status</th>
                  <th className="col-action">Action</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((row) => (
                  <tr key={row.name}>
                    <td className="col-wrap">{row.name}</td>
                    <td className="col-status">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="row-actions col-action">
                      <button type="button" onClick={() => toggleProject(row.name)}>
                        Toggle Status
                      </button>
                      <button type="button" className="btn-danger" onClick={() => deleteProject(row.name)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {activeTab === 'FMS' ? (
        <div className="panel-body">
          <form className="work-form" onSubmit={saveFms}>
            <h4>FMS Connector</h4>
            <label>
              Sheet ID
              <input value={fmsForm.sheetId} onChange={(e) => setFmsForm((p) => ({ ...p, sheetId: e.target.value }))} required />
            </label>
            <label>
              Range
              <input value={fmsForm.range} onChange={(e) => setFmsForm((p) => ({ ...p, range: e.target.value }))} required />
            </label>
            <button type="submit" disabled={loading}>
              Save FMS Setting
            </button>
          </form>
        </div>
      ) : null}
    </section>
  );
}
