import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function WarehouseDashboard() {
  const { user, logout } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    try {
      const response = await api.get('/reports/dashboard');
      setData(response.data);
    } catch (err) {
      setError('Failed to load dashboard.');
    }
  }

  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Warehouse Manager Dashboard</h1>
        <button onClick={logout}>Logout</button>
      </div>
      <p>Welcome, {user.name}.</p>

      <nav style={{ marginBottom: 24 }}>
        <Link to="/warehouse/products" style={{ marginRight: 16 }}>Manage Products</Link>
        <Link to="/warehouse/shipments" style={{ marginRight: 16 }}>Record Shipment</Link>
        <Link to="/warehouse/requests" style={{ marginRight: 16 }}>Stock Requests</Link>
      </nav>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!data ? (
        <p>Loading...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <div style={{ padding: 16, border: '1px solid #ccc', borderRadius: 4 }}>
            <p style={{ color: '#666', margin: 0 }}>Warehouse Inventory Value</p>
            <p style={{ fontSize: 24, fontWeight: 'bold', margin: '4px 0' }}>GHS {Number(data.total_inventory_value).toFixed(2)}</p>
          </div>
          <div style={{ padding: 16, border: '1px solid #ccc', borderRadius: 4, background: data.low_stock_count > 0 ? '#f8d7da' : 'inherit' }}>
            <p style={{ color: '#666', margin: 0 }}>Low-Stock Products</p>
            <p style={{ fontSize: 24, fontWeight: 'bold', margin: '4px 0' }}>
              {data.low_stock_count} {data.low_stock_count > 0 && '⚠️'}
            </p>
            {data.low_stock_count > 0 && (
              <Link to="/warehouse/shipments" style={{ fontSize: 13 }}>Record a shipment &rarr;</Link>
            )}
          </div>
          <div style={{ padding: 16, border: '1px solid #ccc', borderRadius: 4, background: data.pending_requests_count > 0 ? '#fff3cd' : 'inherit' }}>
            <p style={{ color: '#666', margin: 0 }}>Pending Requests</p>
            <p style={{ fontSize: 24, fontWeight: 'bold', margin: '4px 0' }}>{data.pending_requests_count}</p>
            {data.pending_requests_count > 0 && (
              <Link to="/warehouse/requests" style={{ fontSize: 13 }}>Review now &rarr;</Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}