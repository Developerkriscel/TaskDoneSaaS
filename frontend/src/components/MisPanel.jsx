import { useEffect, useMemo, useState } from 'react';
import { legacyApi } from '../services/api.js';

function toSummary(rows = []) {
  return rows.map((row) => {
    const d = row.metrics?.delegation || {};
    const w = row.metrics?.workRequest || {};
    const c = row.metrics?.checklist || {};
    const total = Number(d.total || 0) + Number(w.total || 0) + Number(c.total || 0);
    const done = Number(d.done || 0) + Number(w.done || 0) + Number(c.done || 0);
    const pending = Number(d.pending || 0) + Number(w.pending || 0) + Number(c.pending || 0);
    return {
      personName: row.personName,
      total,
      done,
      pending,
      donePct: total > 0 ? Math.round((done / total) * 100) : 0
    };
  });
}

export default function MisPanel({ user, filters }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [misRows, setMisRows] = useState([]);
  const [performanceRows, setPerformanceRows] = useState([]);
  const [kraRows, setKraRows] = useState([]);

  async function loadMisData() {
    setLoading(true);
    setError('');
    try {
      const [mis, performance, kra] = await Promise.all([
        legacyApi.getMisData(user.name, user.role, filters),
        legacyApi.getEmployeePerformanceReport(user.name, user.role, filters),
        legacyApi.getKraMasterData(user.name, user.role, filters)
      ]);
      setMisRows(Array.isArray(mis) ? mis : []);
      setPerformanceRows(Array.isArray(performance) ? performance : []);
      setKraRows(Array.isArray(kra) ? kra : []);
    } catch (err) {
      setError(err.message || 'Failed to load MIS data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMisData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.name, user.role]);

  const summaryRows = useMemo(() => toSummary(misRows), [misRows]);

  async function onSnapshot() {
    setMsg('');
    setError('');
    try {
      const res = await legacyApi.saveMisWeeklySnapshot(user.name, user.role);
      if (typeof res === 'string' && res !== 'success') throw new Error(res);
      setMsg('MIS weekly snapshot saved successfully.');
    } catch (err) {
      setError(err.message || 'Failed to save snapshot');
    }
  }

  return (
    <section className="panel-table">
      <div className="panel-head">
        <h3>MIS & Performance</h3>
        <div className="row-actions">
          <button type="button" onClick={loadMisData} disabled={loading}>
            Refresh MIS
          </button>
          <button type="button" onClick={onSnapshot} disabled={loading}>
            Save Snapshot
          </button>
        </div>
      </div>

      {error ? <p className="state-error">{error}</p> : null}
      {msg ? <p className="state-info">{msg}</p> : null}

      {loading ? <p className="state-info">Loading MIS data...</p> : null}

      {!loading ? (
        <div className="panel-body">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Total</th>
                  <th>Done</th>
                  <th>Pending</th>
                  <th>Done %</th>
                </tr>
              </thead>
              <tbody>
                {summaryRows.map((row) => (
                  <tr key={`mis-${row.personName}`}>
                    <td>{row.personName}</td>
                    <td>{row.total}</td>
                    <td>{row.done}</td>
                    <td>{row.pending}</td>
                    <td>{row.donePct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Total</th>
                  <th>Done</th>
                  <th>Delayed</th>
                  <th>On Time</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {performanceRows.map((row) => (
                  <tr key={`perf-${row.employee}`}>
                    <td>{row.employee}</td>
                    <td>{row.total}</td>
                    <td>{row.done}</td>
                    <td>{row.delayed}</td>
                    <td>{row.onTime}</td>
                    <td>{row.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Task ID</th>
                  <th>Delegated To</th>
                  <th>Description</th>
                  <th>Project</th>
                  <th>Frequency</th>
                </tr>
              </thead>
              <tbody>
                {kraRows.map((row) => (
                  <tr key={`kra-${row.taskId}`}>
                    <td>{row.taskId}</td>
                    <td>{row.delegatedTo}</td>
                    <td>{row.taskDescription}</td>
                    <td>{row.project || '-'}</td>
                    <td>{row.taskFrequency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
