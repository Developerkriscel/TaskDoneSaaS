import { useMemo, useState } from 'react';
import { legacyApi } from '../services/api.js';
import StatusBadge from './StatusBadge.jsx';
import AttachmentPreviewModal from './AttachmentPreviewModal.jsx';
import ToastNotice from './ToastNotice.jsx';
import { formatDateTime } from '../utils/dateFormat.js';

const REVIEW_ROLES = new Set(['Admin', 'Super Admin', 'App Admin']);
const APPROVAL_PENDING = new Set(['send for approval', 'pending', 'rework']);

function isApprovalActionable(status) {
  const normalized = String(status || '').trim().toLowerCase();
  return APPROVAL_PENDING.has(normalized);
}

function normalizeRows(approvals) {
  const delegations = (approvals?.delegations || []).map((row) => ({
    id: row.taskId,
    type: 'Delegation',
    rpcType: 'Delegation',
    fromUser: row.delegatedBy || 'System',
    toUser: row.taskCompletedBy,
    description: row.taskDescription,
    project: row.project,
    status: row.status,
    remarks: row.doerRemarks || '',
    submittedOn: row.approvalDate || row.actionDate || '',
    proof: row.doerAttachments || []
  }));

  const workRequests = (approvals?.workRequests || []).map((row) => ({
    id: row.requestId,
    type: 'Work Request',
    rpcType: 'WorkRequest',
    fromUser: row.requestedBy || 'System',
    toUser: row.requestFor,
    description: row.description,
    project: row.project,
    status: row.status,
    remarks: row.doerRemarks || '',
    submittedOn: row.completionDate || '',
    proof: row.doerAttachments || []
  }));

  const checklists = (approvals?.checklists || []).map((row) => ({
    id: row.taskId,
    type: 'Checklist',
    rpcType: 'Checklist',
    fromUser: row.delegatedBy || 'System',
    toUser: row.taskCompletedBy || row.userName,
    description: row.taskDescription || row.description,
    project: row.project,
    status: row.status || row.approvalStatus || 'Send for Approval',
    remarks: row.doerRemarks || row.remarks || '',
    submittedOn: row.approvalDate || row.completionDate || row.actionDate || '',
    proof: row.doerAttachments || row.attachment || [],
    planDate: row.planDate || null
  }));

  return [...delegations, ...workRequests, ...checklists];
}

function ReviewModal({ open, mode, row, remarks, setRemarks, onClose, onConfirm, busy }) {
  if (!open || !row) return null;

  const targetStatus = mode === 'approve' ? 'Completed' : 'Rework';
  const heading = `${targetStatus} ${row.type} #${row.id}`;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h4>{heading}</h4>
        <p>
          <b>{row.type}</b> - {row.description}
        </p>
        <label>
          Remarks
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={4}
            placeholder={mode === 'rework' ? 'Reason for rework...' : 'Final remarks...'}
          />
        </label>
        <div className="modal-actions">
          <button type="button" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={busy}>
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ApprovalQueuePanel({ approvals, userRole, onRefresh }) {
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState('');
  const [error, setError] = useState('');
  const [remarks, setRemarks] = useState('');
  const [modal, setModal] = useState({ open: false, mode: 'approve', row: null });
  const [toast, setToast] = useState({ text: '', type: 'success' });
  const [preview, setPreview] = useState({ open: false, urls: [], title: 'File Preview' });

  const rows = useMemo(
    () =>
      normalizeRows(approvals).filter((row) => {
        // Checklist is auto-approved in backend; hide completed checklist rows if any stale data appears.
        if (row.type === 'Checklist' && !isApprovalActionable(row.status)) return false;
        return true;
      }),
    [approvals]
  );
  const canReview = REVIEW_ROLES.has(String(userRole || '').trim());

  function openModal(mode, row) {
    setError('');
    setInfo('');
    setRemarks('');
    setModal({ open: true, mode, row });
  }

  function closeModal() {
    setModal({ open: false, mode: 'approve', row: null });
  }

  async function submitReview() {
    if (!modal.row) return;
    if (modal.mode === 'rework' && !String(remarks).trim()) {
      setError('Rework reason is mandatory!');
      return;
    }

    setBusy(true);
    setError('');
    setInfo('');

    try {
      const nextStatus = modal.mode === 'approve' ? 'Completed' : 'Rework';
      const res = await legacyApi.updateStatusWrapper(modal.row.rpcType, modal.row.id, nextStatus, remarks, modal.row.planDate || null);
      if (typeof res === 'string' && res !== 'success') {
        throw new Error(res);
      }
      closeModal();
      await onRefresh();
      setInfo(`Updated! Item #${modal.row.id} is now ${nextStatus}.`);
      setToast({ text: `Updated! Item #${modal.row.id} is now ${nextStatus}.`, type: 'success' });
    } catch (err) {
      setError(err.message || 'Failed to update status');
      setToast({ text: err.message || 'Failed to update status', type: 'error' });
    } finally {
      setBusy(false);
    }
  }

  function openPreview(urls) {
    setPreview({ open: true, urls, title: 'Approval Proof' });
  }

  function closePreview() {
    setPreview({ open: false, urls: [], title: 'File Preview' });
  }

  return (
    <section className="panel-table">
      <div className="panel-head">
        <h3>Approval Queue</h3>
        <span>{rows.length} items</span>
      </div>

      {info ? <p className="state-info">{info}</p> : null}
      {error ? <p className="state-error">{error}</p> : null}

      {rows.length ? (
        <div className="table-wrap">
          <table className="table-legacy table-compact">
            <thead>
              <tr>
                <th className="col-user">Type</th>
                <th className="col-user">From</th>
                <th className="col-user">To</th>
                <th className="col-wrap">Description</th>
                <th className="col-date">Submitted On</th>
                <th className="col-user">Project</th>
                <th className="col-wrap">Doer Remarks</th>
                <th className="col-proof">Proof</th>
                <th className="col-status">Status</th>
                <th className="col-action">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.type}-${row.id}`}>
                  <td className="col-user">{row.type}</td>
                  <td className="col-user">{row.fromUser || '-'}</td>
                  <td className="col-user">{row.toUser || '-'}</td>
                  <td className="col-wrap">{row.description || '-'}</td>
                  <td className="col-date">{formatDateTime(row.submittedOn)}</td>
                  <td className="col-user">{row.project || '-'}</td>
                  <td className="col-wrap">{row.remarks || '-'}</td>
                  <td className="col-proof">
                    {Array.isArray(row.proof) && row.proof.length ? (
                      <button type="button" className="btn-compact" onClick={() => openPreview(row.proof)}>
                        View ({row.proof.length})
                      </button>
                    ) : (
                      'No Attachments'
                    )}
                  </td>
                  <td className="col-status">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="row-actions col-action">
                    {canReview && isApprovalActionable(row.status) ? (
                      <>
                        <button
                          type="button"
                          className="approval-btn approve"
                          title="Approve"
                          disabled={busy}
                          onClick={() => openModal('approve', row)}
                        >
                          OK
                        </button>
                        <button
                          type="button"
                          className="approval-btn rework"
                          title="Rework"
                          disabled={busy}
                          onClick={() => openModal('rework', row)}
                        >
                          RW
                        </button>
                      </>
                    ) : (
                      <span>{row.type === 'Checklist' ? 'Auto-approved' : 'View only'}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="panel-empty">No approvals pending.</p>
      )}

      <ReviewModal
        open={modal.open}
        mode={modal.mode}
        row={modal.row}
        remarks={remarks}
        setRemarks={setRemarks}
        onClose={closeModal}
        onConfirm={submitReview}
        busy={busy}
      />
      <AttachmentPreviewModal open={preview.open} urls={preview.urls} title={preview.title} onClose={closePreview} />
      <ToastNotice message={toast.text} type={toast.type} onDone={() => setToast({ text: '', type: 'success' })} />
    </section>
  );
}
