import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/reports/dashboard').then((res) => setData(res.data)).catch(() => setError('Failed to load dashboard.'));
  }, []);

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>Administrator Dashboard</h1>
          <p>System-wide overview across all locations.</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {!data ? <p>Loading...</p> : (
        <div className="stat-grid cols-2">
          <div className="card">
            <p className="stat-label">Total Products</p>
            <p className="stat-value">{data.total_products}</p>
          </div>
          <div className="card">
            <p className="stat-label">Total Inventory Value</p>
            <p className="stat-value">GHS {Number(data.total_inventory_value).toFixed(2)}</p>
          </div>
          <div className={`card ${data.pending_requests_count > 0 ? 'stat-card pending' : ''}`}>
            <p className="stat-label">Pending Stock Requests</p>
            <p className="stat-value">{data.pending_requests_count}</p>
          </div>
          <div className="card">
            <p className="stat-label">Total Sales (all time)</p>
            <p className="stat-value">GHS {Number(data.total_sales_all_time).toFixed(2)}</p>
          </div>
        </div>
      )}
    </Layout>
  );
}