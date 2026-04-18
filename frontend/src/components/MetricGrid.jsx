function MetricCard({ title, data }) {
  const total = Number(data?.total || 0);
  const done = Number(data?.done || 0);
  const pending = Number(data?.pending || 0);
  const donePct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <article className="metric-card">
      <header>
        <h3>{title}</h3>
        <span>{donePct}% done</span>
      </header>
      <div className="metric-row">
        <strong>{total}</strong>
        <small>Total</small>
      </div>
      <div className="metric-inline">
        <p>
          <b>{done}</b> Done
        </p>
        <p>
          <b>{pending}</b> Pending
        </p>
      </div>
      <div className="metric-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={donePct}>
        <span style={{ width: `${donePct}%` }} />
      </div>
    </article>
  );
}

export default function MetricGrid({ metrics }) {
  const buckets = [
    { key: 'delegation', label: 'Delegation' },
    { key: 'workRequest', label: 'Work Request' },
    { key: 'checklist', label: 'Checklist' },
    { key: 'fms', label: 'FMS' }
  ];

  return (
    <section className="metric-grid">
      {buckets.map((bucket) => (
        <MetricCard key={bucket.key} title={bucket.label} data={metrics?.[bucket.key]} />
      ))}
    </section>
  );
}
