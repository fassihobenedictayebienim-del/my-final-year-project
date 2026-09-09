import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';

const ACTION_COLORS = {
  LOGIN: 'badge-fulfilled', PRODUCT_CREATED: 'badge-approved', PRODUCT_UPDATED: 'badge-pending',
  PRODUCT_DELETED: 'badge-rejected', VARIANT_ADDED: 'badge-approved', VARIANT_DELETED: 'badge-rejected',
  SHIPMENT_RECORDED: 'badge-approved', STOCK_REQUEST_CREATED: 'badge-pending', REQUEST_APPROVED: 'badge-approved',
  REQUEST_REJECTED: 'badge-rejected', RECEIPT_CONFIRMED: 'badge-fulfilled', SALE_RECORDED: 'badge-approved',
  USER_CREATED: 'badge-fulfilled', USER_UPDATED: 'badge-pending', PASSWORD_RESET: 'badge-rejected',
  PASSWORD_CHANGED: 'badge-pending', LOCATION_UPDATED: 'badge-pending',
};

export default function ActivityLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    api.get('/activity-logs')
      .then((res) => setLogs(res.data.logs))
      .catch(() => setError('Failed to load activity log.'))
      .finally(() => setLoading(false));
  }, []);

  const filteredLogs = logs.filter((log) => {
    const d = new Date(log.created_at);
    if (startDate && d < new Date(startDate)) return false;
    if (endDate && d > new Date(endDate + 'T23:59:59')) return false;
    return true;
  });

  function clearFilter() { setStartDate(''); setEndDate(''); }

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>Activity Log</h1>
          <p>A record of key actions taken across the system (most recent 200).</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="form-row" style={{ alignItems: 'center', marginBottom: 16 }}>
        <label style={{ fontSize: 13 }}>From <input type="date" className="form-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
        <label style={{ fontSize: 13 }}>To <input type="date" className="form-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></label>
        <button type="button" className="btn btn-sm" onClick={clearFilter}>Clear</button>
        <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{filteredLogs.length} of {logs.length} shown</span>
      </div>

      {loading ? <p>Loading...</p> : filteredLogs.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)' }}>{logs.length === 0 ? 'No activity recorded yet.' : 'No activity in this date range.'}</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Time</th><th>User</th><th>Role</th><th>Action</th><th>Details</th></tr></thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.log_id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{new Date(log.created_at).toLocaleString()}</td>
                  <td>{log.user_name || '—'}</td>
                  <td>{log.user_role || '—'}</td>
                  <td><span className={`badge ${ACTION_COLORS[log.action] || 'badge-fulfilled'}`}>{log.action.replace(/_/g, ' ')}</span></td>
                  <td>{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}