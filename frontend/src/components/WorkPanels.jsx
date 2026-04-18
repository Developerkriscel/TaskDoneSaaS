import { useEffect, useMemo, useState } from 'react';
import { legacyApi } from '../services/api.js';
import StatusBadge from './StatusBadge.jsx';
import ToastNotice from './ToastNotice.jsx';
import AttachmentPreviewModal from './AttachmentPreviewModal.jsx';
import FileDropZone from './FileDropZone.jsx';

function formatDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

function formatAttachmentFlag(value) {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return 'No';
  if (raw === 'yes' || raw === 'true' || raw === 'required') return 'Yes';
  return 'No';
}

const TABS = ['Delegation', 'Checklist', 'Work Request'];

function PanelStatus({ message, error }) {
  if (!message && !error) return null;
  return <p className={error ? 'state-error' : 'state-info'}>{error || message}</p>;
}

export default function WorkPanels({ user, projects = [], allUsers = [], onRefresh, initialTab = 'Delegation' }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [delegation, setDelegation] = useState({
    delegatedTo: '',
    description: '',
    project: '',
    targetDate: '',
    targetTime: '',
    priority: 'Medium'
  });
  const [checklist, setChecklist] = useState({
    employee: '',
    description: '',
    project: '',
    frequency: 'Daily',
    startDate: '',
    startTime: '',
    attReq: ''
  });
  const [workRequest, setWorkRequest] = useState({
    requestFor: '',
    description: '',
    project: '',
    deadline: '',
    deadlineTime: '',
    notes: ''
  });
  const [delegationFiles, setDelegationFiles] = useState([]);
  const [workRequestFiles, setWorkRequestFiles] = useState([]);
  const [fileProgress, setFileProgress] = useState({ delegation: 0, workRequest: 0 });

  const [taskRows, setTaskRows] = useState({
    delegations: [],
    checklists: [],
    workRequests: []
  });
  const [toast, setToast] = useState({ text: '', type: 'success' });
  const [preview, setPreview] = useState({ open: false, urls: [], title: 'File Preview' });
  const [actionModal, setActionModal] = useState({
    open: false,
    title: '',
    row: null,
    mode: ''
  });
  const [actionRemarks, setActionRemarks] = useState('');

  const assignableUsers = useMemo(
    () => allUsers.filter((name) => String(name || '').trim().toLowerCase() !== String(user.name || '').trim().toLowerCase()),
    [allUsers, user.name]
  );

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  async function reloadRows() {
    const [delegations, checklists, workRequests] = await Promise.all([
      legacyApi.getDelegatedTasksForEmployee(user.name),
      legacyApi.getChecklistTasksForEmployee(user.name),
      legacyApi.getUserWorkRequests(user.name)
    ]);

    setTaskRows({ delegations, checklists, workRequests });
  }

  async function guardedRun(fn) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await fn();
      if (typeof res === 'string' && res !== 'success') {
        throw new Error(res);
      }
      await reloadRows();
      await onRefresh();
      setMessage('Action completed successfully.');
      setToast({ text: 'Updated successfully', type: 'success' });
    } catch (err) {
      setError(err.message || 'Action failed');
      setToast({ text: err.message || 'Action failed', type: 'error' });
    } finally {
      setBusy(false);
    }
  }

  function openPreview(urls, title) {
    setPreview({ open: true, urls, title });
  }

  function closePreview() {
    setPreview({ open: false, urls: [], title: 'File Preview' });
  }

  function toIsoDateTime(dateValue, timeValue) {
    if (!dateValue || !timeValue) return '';
    return `${dateValue}T${timeValue}:00`;
  }

  async function filesToDataUris(files, key) {
    const arr = Array.from(files || []);
    if (!arr.length) {
      setFileProgress((p) => ({ ...p, [key]: 0 }));
      return [];
    }

    let done = 0;
    const toDataUri = (file) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          done += 1;
          const pct = Math.round((done / arr.length) * 100);
          setFileProgress((p) => ({ ...p, [key]: pct }));
          resolve(ev.target?.result || '');
        };
        reader.onerror = () => reject(new Error(`File Error: ${file.name}`));
        reader.readAsDataURL(file);
      });

    const uris = [];
    for (const f of arr) {
      uris.push(await toDataUri(f));
    }
    return uris;
  }

  async function createDelegation(e) {
    e.preventDefault();

    if (!delegation.delegatedTo) {
      setError('Please select at least one user.');
      return;
    }
    if (!delegation.project) {
      setError('Please select a project.');
      return;
    }
    if (!delegation.description || !delegation.targetDate || !delegation.targetTime) {
      setError('Please fill all required fields.');
      return;
    }

    const attachmentData = await filesToDataUris(delegationFiles, 'delegation');

    await guardedRun(async () =>
      legacyApi.saveTask(
        [
          {
            delegatedTo: [delegation.delegatedTo],
            description: delegation.description,
            project: delegation.project,
            targetDate: toIsoDateTime(delegation.targetDate, delegation.targetTime),
            priority: delegation.priority,
            attachments: attachmentData
          }
        ],
        user.name
      )
    );
    setDelegationFiles([]);
    setFileProgress((p) => ({ ...p, delegation: 0 }));
  }

  async function createChecklist(e) {
    e.preventDefault();

    if (!checklist.employee || !checklist.project) {
      setError('Please select an employee and project.');
      return;
    }
    if (!checklist.description || !checklist.startDate || !checklist.startTime) {
      setError('Please fill all fields.');
      return;
    }

    await guardedRun(async () =>
      legacyApi.saveChecklistTask(
        {
          employee: checklist.employee,
          description: checklist.description,
          project: checklist.project,
          frequency: checklist.frequency,
          startDate: toIsoDateTime(checklist.startDate, checklist.startTime),
          attReq: checklist.attReq
        },
        user.name
      )
    );
  }

  async function createWorkRequest(e) {
    e.preventDefault();

    if (!workRequest.requestFor || !workRequest.project || !workRequest.description || !workRequest.deadline || !workRequest.deadlineTime) {
      setError('Please fill all required fields (Desc, Date, Time).');
      return;
    }

    const attachmentData = await filesToDataUris(workRequestFiles, 'workRequest');

    await guardedRun(async () =>
      legacyApi.saveWorkRequest(
        [
          {
            requestFor: workRequest.requestFor,
            description: workRequest.description,
            project: workRequest.project,
            deadline: toIsoDateTime(workRequest.deadline, workRequest.deadlineTime),
            notes: workRequest.notes,
            attachments: attachmentData
          }
        ],
        user.name
      )
    );
    setWorkRequestFiles([]);
    setFileProgress((p) => ({ ...p, workRequest: 0 }));
  }

  function openActionModal(mode, title, row) {
    setActionRemarks('');
    setActionModal({ open: true, mode, title, row });
  }

  function closeActionModal() {
    setActionModal({ open: false, title: '', row: null, mode: '' });
    setActionRemarks('');
  }

  async function submitActionModal() {
    if (!actionModal.row) return;

    if (actionModal.mode === 'delegation-submit') {
      await guardedRun(async () => legacyApi.submitTaskWrapper('Task', actionModal.row.taskId, actionRemarks));
      closeActionModal();
      return;
    }

    if (actionModal.mode === 'workrequest-submit') {
      await guardedRun(async () => legacyApi.submitTaskWrapper('Work Request', actionModal.row.requestId, actionRemarks));
      closeActionModal();
      return;
    }

    if (actionModal.mode === 'checklist-done') {
      await guardedRun(async () => legacyApi.markChecklistTaskDone(actionModal.row.taskId, actionModal.row.planDate, actionRemarks));
      closeActionModal();
    }
  }

  function getActionPlaceholder(mode) {
    if (mode === 'rework') return 'Reason for rework...';
    return 'Final remarks...';
  }

  useEffect(() => {
    reloadRows().catch(() => {
      setError('Failed to load work panels.');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.name]);

  return (
    <section className="panel-table">
      <div className="panel-head">
        <h3>Work Panels</h3>
        <span>{activeTab}</span>
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

      <PanelStatus message={message} error={error} />

      {activeTab === 'Delegation' ? (
        <div className="panel-body">
          <form className="work-form" onSubmit={createDelegation}>
            <h4>Create Delegation Task</h4>
            <label>
              Delegated To
              <select
                value={delegation.delegatedTo}
                onChange={(e) => setDelegation((prev) => ({ ...prev, delegatedTo: e.target.value }))}
                required
              >
                <option value="">Select employee</option>
                {assignableUsers.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Project
              <select
                value={delegation.project}
                onChange={(e) => setDelegation((prev) => ({ ...prev, project: e.target.value }))}
                required
              >
                <option value="">Select project</option>
                {projects.map((project) => (
                  <option key={project} value={project}>
                    {project}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Description
              <input
                value={delegation.description}
                onChange={(e) => setDelegation((prev) => ({ ...prev, description: e.target.value }))}
                required
              />
            </label>
            <label>
              Target Date
              <input
                type="date"
                value={delegation.targetDate}
                onChange={(e) => setDelegation((prev) => ({ ...prev, targetDate: e.target.value }))}
                required
              />
            </label>
            <label>
              Target Time
              <input
                type="time"
                value={delegation.targetTime}
                onChange={(e) => setDelegation((prev) => ({ ...prev, targetTime: e.target.value }))}
                required
              />
            </label>
            <label>
              Priority
              <select
                value={delegation.priority}
                onChange={(e) => setDelegation((prev) => ({ ...prev, priority: e.target.value }))}
              >
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </label>
            <button disabled={busy} type="submit">
              Save Delegation
            </button>
          </form>

          <div className="upload-panel">
            <FileDropZone files={delegationFiles} setFiles={setDelegationFiles} label="Delegation Attachments" />
            {fileProgress.delegation > 0 && fileProgress.delegation < 100 ? (
              <p className="state-info">File processing: {fileProgress.delegation}%</p>
            ) : null}
          </div>

          <div className="table-wrap">
            <table className="table-legacy table-compact">
              <thead>
                <tr>
                  <th className="col-id">ID</th>
                  <th className="col-user">From</th>
                  <th className="col-wrap">Description</th>
                  <th className="col-date">Target Date</th>
                  <th className="col-status">Status</th>
                  <th className="col-wrap">Rework Remark</th>
                  <th className="col-proof">Attachments</th>
                  <th className="col-action">Action</th>
                </tr>
              </thead>
              <tbody>
                {taskRows.delegations.map((row) => (
                  <tr key={row.taskId}>
                    <td className="col-id">{row.taskId}</td>
                    <td className="col-user">{row.delegatedBy || '-'}</td>
                    <td className="col-wrap">{row.taskDescription}</td>
                    <td className="col-date">{formatDate(row.targetDate)}</td>
                    <td className="col-status">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="col-wrap">{row.reworkRemark || '-'}</td>
                    <td className="col-proof">
                      {Array.isArray(row.attachmentUrl) && row.attachmentUrl.length ? (
                        <button type="button" className="btn-compact" onClick={() => openPreview(row.attachmentUrl, 'Delegation Attachments')}>
                          View ({row.attachmentUrl.length})
                        </button>
                      ) : (
                        'No Attachments'
                      )}
                    </td>
                    <td className="row-actions col-action">
                      <button
                        className="btn-compact"
                        disabled={busy}
                        type="button"
                        onClick={() => openActionModal('delegation-submit', 'Submit Delegation Task', row)}
                      >
                        Done
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {activeTab === 'Checklist' ? (
        <div className="panel-body">
          <form className="work-form" onSubmit={createChecklist}>
            <h4>Create Checklist Master</h4>
            <label>
              Employee
              <select
                value={checklist.employee}
                onChange={(e) => setChecklist((prev) => ({ ...prev, employee: e.target.value }))}
                required
              >
                <option value="">Select employee</option>
                {assignableUsers.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Project
              <select
                value={checklist.project}
                onChange={(e) => setChecklist((prev) => ({ ...prev, project: e.target.value }))}
                required
              >
                <option value="">Select project</option>
                {projects.map((project) => (
                  <option key={project} value={project}>
                    {project}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Description
              <input
                value={checklist.description}
                onChange={(e) => setChecklist((prev) => ({ ...prev, description: e.target.value }))}
                required
              />
            </label>
            <label>
              Frequency
              <select
                value={checklist.frequency}
                onChange={(e) => setChecklist((prev) => ({ ...prev, frequency: e.target.value }))}
              >
                <option>Daily</option>
                <option>Weekly</option>
                <option>Fortnightly</option>
                <option>Monthly</option>
                <option>Quarterly</option>
                <option>Yearly</option>
              </select>
            </label>
            <label>
              Start Date
              <input
                type="date"
                value={checklist.startDate}
                onChange={(e) => setChecklist((prev) => ({ ...prev, startDate: e.target.value }))}
                required
              />
            </label>
            <label>
              Start Time
              <input
                type="time"
                value={checklist.startTime}
                onChange={(e) => setChecklist((prev) => ({ ...prev, startTime: e.target.value }))}
                required
              />
            </label>
            <label>
              Attachment Required
              <input value={checklist.attReq} onChange={(e) => setChecklist((prev) => ({ ...prev, attReq: e.target.value }))} />
            </label>
            <button disabled={busy} type="submit">
              Save Checklist
            </button>
          </form>

          <div className="table-wrap">
            <table className="table-legacy table-compact">
              <thead>
                <tr>
                  <th className="col-id">ID</th>
                  <th className="col-user">From</th>
                  <th className="col-wrap">Description</th>
                  <th className="col-date">Plan Date</th>
                  <th className="col-proof">Attachment</th>
                  <th className="col-status">Status</th>
                  <th className="col-action">Action</th>
                </tr>
              </thead>
              <tbody>
                {taskRows.checklists.map((row) => (
                  <tr key={row.taskId}>
                    <td className="col-id">{row.taskId}</td>
                    <td className="col-user">{row.delegatedBy || 'System'}</td>
                    <td className="col-wrap">{row.taskDescription}</td>
                    <td className="col-date">{formatDate(row.planDate)}</td>
                    <td className="col-proof">{formatAttachmentFlag(row.attReq)}</td>
                    <td className="col-status">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="row-actions col-action">
                      <button
                        className="btn-compact btn-ok"
                        disabled={busy}
                        type="button"
                        onClick={() => openActionModal('checklist-done', 'Mark Checklist Task Done', row)}
                      >
                        Done
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {activeTab === 'Work Request' ? (
        <div className="panel-body">
          <form className="work-form" onSubmit={createWorkRequest}>
            <h4>Create Work Request</h4>
            <label>
              Request For
              <select
                value={workRequest.requestFor}
                onChange={(e) => setWorkRequest((prev) => ({ ...prev, requestFor: e.target.value }))}
                required
              >
                <option value="">Select employee</option>
                {assignableUsers.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Project
              <select
                value={workRequest.project}
                onChange={(e) => setWorkRequest((prev) => ({ ...prev, project: e.target.value }))}
                required
              >
                <option value="">Select project</option>
                {projects.map((project) => (
                  <option key={project} value={project}>
                    {project}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Description
              <input
                value={workRequest.description}
                onChange={(e) => setWorkRequest((prev) => ({ ...prev, description: e.target.value }))}
                required
              />
            </label>
            <label>
              Deadline
              <input
                type="date"
                value={workRequest.deadline}
                onChange={(e) => setWorkRequest((prev) => ({ ...prev, deadline: e.target.value }))}
                required
              />
            </label>
            <label>
              Time
              <input
                type="time"
                value={workRequest.deadlineTime}
                onChange={(e) => setWorkRequest((prev) => ({ ...prev, deadlineTime: e.target.value }))}
                required
              />
            </label>
            <label>
              Notes
              <input value={workRequest.notes} onChange={(e) => setWorkRequest((prev) => ({ ...prev, notes: e.target.value }))} />
            </label>
            <button disabled={busy} type="submit">
              Save Work Request
            </button>
          </form>

          <div className="upload-panel">
            <FileDropZone files={workRequestFiles} setFiles={setWorkRequestFiles} label="Work Request Attachments" />
            {fileProgress.workRequest > 0 && fileProgress.workRequest < 100 ? (
              <p className="state-info">File processing: {fileProgress.workRequest}%</p>
            ) : null}
          </div>

          <div className="table-wrap">
            <table className="table-legacy table-compact">
              <thead>
                <tr>
                  <th className="col-id">Request ID</th>
                  <th className="col-user">Request For</th>
                  <th className="col-wrap">Description</th>
                  <th className="col-user">Project</th>
                  <th className="col-date">Deadline</th>
                  <th className="col-proof">Files</th>
                  <th className="col-status">Status</th>
                  <th className="col-action">Action</th>
                </tr>
              </thead>
              <tbody>
                {taskRows.workRequests.map((row) => (
                  <tr key={row.requestId}>
                    <td className="col-id">{row.requestId}</td>
                    <td className="col-user">{row.requestFor || '-'}</td>
                    <td className="col-wrap">{row.description}</td>
                    <td className="col-user">{row.project || '-'}</td>
                    <td className="col-date">{formatDate(row.deadline)}</td>
                    <td className="col-proof">
                      {Array.isArray(row.attachment) && row.attachment.length ? (
                        <button type="button" className="btn-compact" onClick={() => openPreview(row.attachment, 'Work Request Attachments')}>
                          View ({row.attachment.length})
                        </button>
                      ) : (
                        'No Attachments'
                      )}
                    </td>
                    <td className="col-status">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="row-actions col-action">
                      <button
                        className="btn-compact"
                        disabled={busy}
                        type="button"
                        onClick={() => openActionModal('workrequest-submit', 'Submit Work Request', row)}
                      >
                        Done
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {actionModal.open ? (
        <div className="modal-backdrop" role="presentation" onClick={closeActionModal}>
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h4>{actionModal.title}</h4>
            <p>
              Task: {actionModal.row?.taskId || actionModal.row?.requestId || '-'}
              {actionModal.mode === 'checklist-done' && actionModal.row?.planDate
                ? ` for date ${new Date(actionModal.row.planDate).toLocaleDateString()}`
                : ''}
            </p>
            <label>
              Remarks
              <textarea
                value={actionRemarks}
                onChange={(e) => setActionRemarks(e.target.value)}
                rows={4}
                placeholder={getActionPlaceholder(actionModal.mode)}
              />
            </label>
            <div className="modal-actions">
              <button type="button" onClick={closeActionModal} disabled={busy}>
                Cancel
              </button>
              <button type="button" onClick={submitActionModal} disabled={busy}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <AttachmentPreviewModal open={preview.open} urls={preview.urls} title={preview.title} onClose={closePreview} />
      <ToastNotice message={toast.text} type={toast.type} onDone={() => setToast({ text: '', type: 'success' })} />
    </section>
  );
}
