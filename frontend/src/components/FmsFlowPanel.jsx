import { useEffect, useMemo, useState } from 'react';
import { platformApi } from '../services/api.js';
import { formatDateTime } from '../utils/dateFormat.js';

const ROLE_OPTIONS = ['Employee', 'Admin', 'Super Admin'];
const ACTION_OPTIONS = ['submit', 'review', 'approve'];

function cloneSteps(steps = []) {
  return (steps || []).map((s) => ({ ...s }));
}

export default function FmsFlowPanel({ user, allUsers = [] }) {
  const [intent, setIntent] = useState('');
  const [flowName, setFlowName] = useState('');
  const [draft, setDraft] = useState({ name: '', intent: '', steps: [], source: { mode: 'manual', model: '' } });
  const [assignments, setAssignments] = useState({});
  const [flows, setFlows] = useState([]);
  const [selectedFlowId, setSelectedFlowId] = useState('');
  const [selectedFlow, setSelectedFlow] = useState(null);
  const [monitor, setMonitor] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('live');

  const canDesign = useMemo(() => ['Admin', 'Super Admin'].includes(String(user.role || '').trim()), [user.role]);
  const isEmployee = useMemo(() => String(user.role || '').trim() === 'Employee', [user.role]);
  const assignableUsers = useMemo(
    () => (allUsers || []).map((u) => (typeof u === 'string' ? { name: u, userId: '', role: '' } : u)).filter((u) => u?.name),
    [allUsers]
  );

  async function loadFlows(pickLast = false) {
    const res = await platformApi.listFmsFlows();
    const list = res?.flows || [];
    setFlows(list);
    if (pickLast && list.length) setSelectedFlowId(String(list[0]._id));
  }

  async function loadFlowDetail(flowId, mode = viewMode) {
    if (!flowId) {
      setSelectedFlow(null);
      setMonitor(null);
      return;
    }
    const [detail, mon] = await Promise.all([
      platformApi.getFmsFlow(flowId, mode),
      platformApi.monitorFmsFlow(flowId, mode)
    ]);
    setSelectedFlow(detail?.flow || null);
    setMonitor(mon || null);
  }

  useEffect(() => {
    loadFlows().catch(() => setError('Failed to load FMS flows.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadFlowDetail(selectedFlowId, viewMode).catch(() => setError('Failed to load flow details.'));
  }, [selectedFlowId, viewMode]);

  useEffect(() => {
    if (!selectedFlowId) return undefined;
    const timer = setInterval(() => {
      loadFlowDetail(selectedFlowId, viewMode).catch(() => setError('Live sync failed.'));
    }, 5000);
    return () => clearInterval(timer);
  }, [selectedFlowId, viewMode]);

  async function generateWithAi() {
    if (!intent.trim()) return;
    setBusy(true);
    setError('');
    setStatus('');
    try {
      const res = await platformApi.generateFmsFlowDraft({ intent, flowName });
      const next = res?.draft || { name: flowName || 'AI Generated Flow', intent, steps: [] };
      setDraft({ ...next, steps: cloneSteps(next.steps || []) });
      setStatus('AI draft generated. Review and edit before finalize.');
      setAssignments({});
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'AI draft generation failed');
    } finally {
      setBusy(false);
    }
  }

  function updateStep(index, key, value) {
    setDraft((prev) => {
      const steps = cloneSteps(prev.steps);
      steps[index] = { ...steps[index], [key]: value };
      return { ...prev, steps };
    });
  }

  function addStep() {
    setDraft((prev) => ({
      ...prev,
      steps: [...cloneSteps(prev.steps), { sequence: prev.steps.length + 1, title: '', description: '', role: 'Employee', actionType: 'submit' }]
    }));
  }

  function removeStep(index) {
    setDraft((prev) => {
      const steps = cloneSteps(prev.steps).filter((_, i) => i !== index).map((s, i) => ({ ...s, sequence: i + 1 }));
      return { ...prev, steps };
    });
  }

  async function finalizeFlow() {
    if (!draft.steps.length) {
      setError('At least one step is required.');
      return;
    }
    setBusy(true);
    setError('');
    setStatus('');
    try {
      const payload = {
        name: draft.name || flowName || 'Untitled Flow',
        intent: draft.intent || intent,
        steps: draft.steps.map((s, i) => ({ ...s, sequence: i + 1 })),
        assignments: draft.steps.map((_, i) => ({ stepIndex: i, userId: '', userName: assignments[i] || '' })),
        source: draft.source || { mode: 'manual', model: '' }
      };
      await platformApi.createFmsFlow(payload);
      setStatus('Flow finalized and ready to run.');
      await loadFlows(true);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to finalize flow');
    } finally {
      setBusy(false);
    }
  }

  async function startFlow() {
    if (!selectedFlowId) return;
    setBusy(true);
    setError('');
    setStatus('');
    try {
      await platformApi.startFmsFlow(selectedFlowId);
      setStatus('Flow started.');
      await loadFlowDetail(selectedFlowId);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to start flow');
    } finally {
      setBusy(false);
    }
  }

  async function stepAction(action) {
    if (!selectedFlowId) return;
    setBusy(true);
    setError('');
    setStatus('');
    try {
      await platformApi.actionFmsFlow(selectedFlowId, { action, remarks });
      setRemarks('');
      setStatus(action === 'rework' ? 'Step sent for rework.' : 'Step completed.');
      await loadFlowDetail(selectedFlowId);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to update step');
    } finally {
      setBusy(false);
    }
  }

  const currentStep = selectedFlow?.steps?.[selectedFlow?.currentStep || 0];
  const myTurn = currentStep && String(currentStep.assignedUserName || '').trim().toLowerCase() === String(user.name || '').trim().toLowerCase();

  return (
    <section className="panel-table fms-flow-panel">
      <div className="panel-head">
        <h3>FMS Flow Monitor</h3>
        <span>{selectedFlow?.status || 'Design'}</span>
      </div>

      {status ? <p className="state-info">{status}</p> : null}
      {error ? <p className="state-error">{error}</p> : null}

      {canDesign ? (
        <div className="panel-body">
          <form className="work-form" onSubmit={(e) => e.preventDefault()}>
            <h4>Phase 1: Create Flow (AI Draft)</h4>
            <label>
              Flow Name
              <input value={flowName} onChange={(e) => setFlowName(e.target.value)} />
            </label>
            <label>
              Intent
              <textarea value={intent} onChange={(e) => setIntent(e.target.value)} rows={3} placeholder="Describe process intent..." />
            </label>
            <button type="button" disabled={busy || !intent.trim()} onClick={generateWithAi}>Generate with AI</button>
          </form>

          <div className="table-wrap fms-flow-table-wrap">
            <table className="table-legacy table-compact">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Step</th>
                  <th>Description</th>
                  <th>Role</th>
                  <th>Action</th>
                  <th>Assign User</th>
                  <th>Remove</th>
                </tr>
              </thead>
              <tbody>
                {draft.steps.map((step, idx) => (
                  <tr key={`draft-step-${idx}`}>
                    <td>{idx + 1}</td>
                    <td><input value={step.title || ''} onChange={(e) => updateStep(idx, 'title', e.target.value)} /></td>
                    <td><input value={step.description || ''} onChange={(e) => updateStep(idx, 'description', e.target.value)} /></td>
                    <td>
                      <select value={step.role || 'Employee'} onChange={(e) => updateStep(idx, 'role', e.target.value)}>
                        {ROLE_OPTIONS.map((x) => <option key={x}>{x}</option>)}
                      </select>
                    </td>
                    <td>
                      <select value={step.actionType || 'submit'} onChange={(e) => updateStep(idx, 'actionType', e.target.value)}>
                        {ACTION_OPTIONS.map((x) => <option key={x}>{x}</option>)}
                      </select>
                    </td>
                    <td>
                      <select value={assignments[idx] || ''} onChange={(e) => setAssignments((p) => ({ ...p, [idx]: e.target.value }))}>
                        <option value="">Select user</option>
                        {assignableUsers.map((u) => (
                          <option key={`${u.name}-${u.userId || 'name'}`} value={u.name}>{u.name}{u.roleName || u.role ? ` (${u.roleName || u.role})` : ''}</option>
                        ))}
                      </select>
                    </td>
                    <td><button type="button" className="platform-table-btn danger" onClick={() => removeStep(idx)}>Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="row-actions fms-flow-actions">
            <button type="button" className="platform-table-btn" onClick={addStep}>Add Step</button>
            <button type="button" className="platform-primary-btn" disabled={busy || !draft.steps.length} onClick={finalizeFlow}>
              Finalize Flow
            </button>
          </div>
        </div>
      ) : null}

        <div className="panel-body fms-flow-monitor">
        <h4>Phase 2-4: Assignment, Execution, Monitoring</h4>
        {!isEmployee ? (
          <>
            <label className="form-label">Flow View</label>
            <div className="taskdone-mode-toggle-wrap">
              <div className="taskdone-mode-toggle">
                <button type="button" className={viewMode === 'live' ? 'active' : ''} onClick={() => setViewMode('live')}>Live</button>
                <button type="button" className={viewMode === 'current' ? 'active' : ''} onClick={() => setViewMode('current')}>Current Progress</button>
              </div>
            </div>
          </>
        ) : null}
        <label className="form-label">Select Flow</label>
        <select className="form-input" value={selectedFlowId} onChange={(e) => setSelectedFlowId(e.target.value)}>
          <option value="">Select flow</option>
          {flows.map((f) => (
            <option key={f._id} value={f._id}>{f.name} ({f.status})</option>
          ))}
        </select>

        {selectedFlow ? (
          <>
            <div className="table-wrap fms-flow-table-wrap">
              <table className="table-legacy table-compact">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Step</th>
                    <th>Role</th>
                    <th>Assigned</th>
                    <th>Status</th>
                    <th>Completed By</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedFlow.steps.map((s) => (
                    <tr key={`${selectedFlow._id}-${s.sequence}`}>
                      <td>{s.sequence}</td>
                      <td>{s.title}</td>
                      <td>{s.role}</td>
                      <td>{s.assignedUserName || '-'}</td>
                      <td>{s.status}</td>
                      <td>{s.completedByName || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="row-actions fms-flow-actions">
              {canDesign && selectedFlow.status === 'ready' ? <button type="button" className="platform-primary-btn" disabled={busy} onClick={startFlow}>Start Flow</button> : null}
              {selectedFlow.status === 'active' && myTurn ? (
                <>
                  <input className="form-input" placeholder="Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                  <button type="button" className="platform-primary-btn" disabled={busy} onClick={() => stepAction('complete')}>Complete Step</button>
                  <button type="button" className="platform-table-btn danger" disabled={busy} onClick={() => stepAction('rework')}>Send Rework</button>
                </>
              ) : null}
            </div>

            {monitor?.summary ? (
              <div className="taskdone-summary-layout">
                <article className="taskdone-summary-card animated-card"><h3>Total Steps</h3><div className="taskdone-summary-grid"><div><strong className="blue">{monitor.summary.totalSteps}</strong><span>Flow Steps</span></div></div></article>
                <article className="taskdone-summary-card animated-card"><h3>Completed</h3><div className="taskdone-summary-grid"><div><strong className="green">{monitor.summary.completedSteps}</strong><span>Done</span></div></div></article>
                <article className="taskdone-summary-card animated-card"><h3>Pending</h3><div className="taskdone-summary-grid"><div><strong className="yellow">{monitor.summary.pendingSteps}</strong><span>Open</span></div></div></article>
                <article className="taskdone-summary-card animated-card"><h3>Rework Loops</h3><div className="taskdone-summary-grid"><div><strong className="red">{monitor.summary.reworkCount}</strong><span>Rework</span></div></div></article>
              </div>
            ) : null}

            <div className="table-wrap fms-flow-table-wrap">
              <table className="table-legacy table-compact">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Actor</th>
                    <th>Event</th>
                    <th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {(monitor?.events || []).slice().reverse().map((e, idx) => (
                    <tr key={`evt-${idx}`}>
                      <td>{formatDateTime(e.at)}</td>
                      <td>{e.actorName || '-'}</td>
                      <td>{e.eventType}</td>
                      <td>{e.message || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
