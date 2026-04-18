function normalizeStatus(value) {
  return String(value || '').trim();
}

function getBadgeClass(statusRaw) {
  const s = normalizeStatus(statusRaw).toLowerCase();
  if (s === 'active' || s === 'completed') return 'status-badge status-active';
  if (s === 'in-active' || s === 'inactive' || s === 'rework') return 'status-badge status-in-active';
  if (s === 'paused' || s === 'send for approval') return 'status-badge status-paused';
  if (s === 'pending') return 'status-badge status-pending';
  return 'status-badge';
}

export default function StatusBadge({ status }) {
  const label = normalizeStatus(status) || '-';
  return <span className={getBadgeClass(label)}>{label}</span>;
}
