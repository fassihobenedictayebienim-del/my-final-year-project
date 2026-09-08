import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';

const ACTION_COLORS = {
  LOGIN: 'badge-fulfilled',
  PRODUCT_CREATED: 'badge-approved',
  PRODUCT_UPDATED: 'badge-pending',
  PRODUCT_DELETED: 'badge-rejected',
  SHIPMENT_RECORDED: 'badge-approved',
  STOCK_REQUEST_CREATED: 'badge-pending',
  REQUEST_APPROVED: 'badge-approved',
  REQUEST_REJECTED: 'badge-rejected',
  RECEIPT_CONFIRMED: 'badge-fulfilled',
  SALE_RECORDED: 'badge-approved',
  USER_CREATED: 'badge-fulfilled',
  USER_UPDATED: 'badge-pending',
  PASSWORD_RESET: 'badge-rejected',
  PASSWORD_CHANGED: 'badge-pending',
  LOCATION_UPDATED: 'badge-pending',
};

export default function ActivityLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/activity-logs')
      .then((res) => setLogs(res.data.logs))
      .catch(() => setError('Failed to load activity log.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>Activity Log</h1>
          <p>A record of key actions taken across the system (most recent 200).</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? <p>Loading...</p> : logs.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)' }}>No activity recorded yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Time</th><th>User</th><th>Role</th><th>Action</th><th>Details</th></tr></thead>
            <tbody>
              {logs.map((log) => (
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