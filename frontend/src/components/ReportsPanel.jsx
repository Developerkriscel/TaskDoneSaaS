import { useEffect, useMemo, useState } from 'react';
import { legacyApi } from '../services/api.js';

const REPORT_TABS = [
  { key: 'delegationReport', label: 'Delegation' },
  { key: 'workRequestReport', label: 'Work Request' },
  { key: 'checklistReport', label: 'Checklist' }
];

function toCsv(rows) {
  if (!rows.length) return '';
  const keys = Object.keys(rows[0]);
  const head = keys.join(',');
  const body = rows
    .map((row) => keys.map((k) => `"${String(row[k] ?? '').replaceAll('"', '""')}"`).join(','))
    .join('\n');
  return `${head}\n${body}`;
}

export default function ReportsPanel({ user, filters }) {
  const [activeTab, setActiveTab] = useState('delegationReport');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reports, setReports] = useState({
    delegationReport: [],
    workRequestReport: [],
    checklistReport: []
  });

  async function loadReports() {
    setLoading(true);
    setError('');
    try {
      const data = await legacyApi.getAllReportData(user.name, user.role, filters);
      setReports({
        delegationReport: data?.delegationReport || [],
        workRequestReport: data?.workRequestReport || [],
        checklistReport: data?.checklistReport || []
      });
    } catch (err) {
      setError(err.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.name, user.role]);

  const rows = useMemo(() => reports[activeTab] || [], [reports, activeTab]);
  const columns = useMemo(() => {
    if (!rows.length) return [];
    return Object.keys(rows[0]).slice(0, 8);
  }, [rows]);

  function downloadCurrentCsv() {
    const csv = toCsv(rows);
    if (!csv) return;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTab}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="panel-table">
      <div className="panel-head">
        <h3>Reports</h3>
        <div className="row-actions">
          <button type="button" onClick={loadReports} disabled={loading}>
            Refresh Reports
          </button>
          <button type="button" onClick={downloadCurrentCsv} disabled={loading || !rows.length}>
            Export CSV
          </button>
        </div>
      </div>

      <div className="tab-row">
        {REPORT_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={tab.key === activeTab ? 'tab-btn active' : 'tab-btn'}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error ? <p className="state-error">{error}</p> : null}
      {loading ? <p className="state-info">Loading reports...</p> : null}

      {!loading ? (
        rows.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={`${activeTab}-${idx}`}>
                    {columns.map((col) => (
                      <td key={`${col}-${idx}`}>{String(row[col] ?? '-')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="panel-empty">No report rows for current filters.</p>
        )
      ) : null}
    </section>
  );
}
