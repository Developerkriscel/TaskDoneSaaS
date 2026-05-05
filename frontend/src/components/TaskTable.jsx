import { formatDate } from '../utils/dateFormat.js';

export default function TaskTable({ title, rows = [], columns = [], emptyText = 'No rows found.' }) {
  return (
    <section className="panel-table">
      <div className="panel-head">
        <h3>{title}</h3>
        <span>{rows.length} items</span>
      </div>
      {rows.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.id || row.taskId || row.requestId || idx}>
                  {columns.map((col) => {
                    const raw = row[col.key];
                    const value = col.format === 'date' ? formatDate(raw) : raw;
                    return <td key={`${col.key}-${idx}`}>{value || '-'}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="panel-empty">{emptyText}</p>
      )}
    </section>
  );
}
