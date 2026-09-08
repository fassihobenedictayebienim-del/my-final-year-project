import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../services/api';

export default function WarehouseDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/reports/dashboard').then((res) => setData(res.data)).catch(() => setError('Failed to load dashboard.'));
  }, []);

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>Warehouse Dashboard</h1>
          <p>Overview of your warehouse inventory and pending work.</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {!data ? (
        <p>Loading...</p>
      ) : (
        <div className="stat-grid cols-3">
          <div className="card">
            <p className="stat-label">Warehouse Inventory Value</p>
            <p className="stat-value">GHS {Number(data.total_inventory_value).toFixed(2)}</p>
          </div>
          <div className={`card ${data.low_stock_count > 0 ? 'stat-card alert' : ''}`}>
            <p className="stat-label">Low-Stock Products</p>
            <p className="stat-value">{data.low_stock_count} {data.low_stock_count > 0 && '⚠️'}</p>
            {data.low_stock_count > 0 && <Link to="/warehouse/shipments">Record a shipment &rarr;</Link>}
          </div>
          <div className={`card ${data.pending_requests_count > 0 ? 'stat-card pending' : ''}`}>
            <p className="stat-label">Pending Requests</p>
            <p className="stat-value">{data.pending_requests_count}</p>
            {data.pending_requests_count > 0 && <Link to="/warehouse/requests">Review now &rarr;</Link>}
          </div>
        </div>
      )}
    </Layout>
  );
}