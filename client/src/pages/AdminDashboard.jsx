import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function AdminDashboard() {
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
        <h1>Administrator Dashboard</h1>
        <button onClick={logout}>Logout</button>
      </div>
      <p>Welcome, {user.name}.</p>

      <nav style={{ marginBottom: 24 }}>
        <Link to="/reports">Reports</Link>
      </nav>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!data ? (
        <p>Loading...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginTop: 24 }}>
          <div style={{ padding: 16, border: '1px solid #ccc', borderRadius: 4 }}>
            <p style={{ color: '#666', margin: 0 }}>Total Products</p>
            <p style={{ fontSize: 28, fontWeight: 'bold', margin: '4px 0' }}>{data.total_products}</p>
          </div>
          <div style={{ padding: 16, border: '1px solid #ccc', borderRadius: 4 }}>
            <p style={{ color: '#666', margin: 0 }}>Total Inventory Value</p>
            <p style={{ fontSize: 28, fontWeight: 'bold', margin: '4px 0' }}>GHS {Number(data.total_inventory_value).toFixed(2)}</p>
          </div>
          <div style={{ padding: 16, border: '1px solid #ccc', borderRadius: 4, background: data.pending_requests_count > 0 ? '#fff3cd' : 'inherit' }}>
            <p style={{ color: '#666', margin: 0 }}>Pending Stock Requests</p>
            <p style={{ fontSize: 28, fontWeight: 'bold', margin: '4px 0' }}>{data.pending_requests_count}</p>
          </div>
          <div style={{ padding: 16, border: '1px solid #ccc', borderRadius: 4 }}>
            <p style={{ color: '#666', margin: 0 }}>Total Sales (all time)</p>
            <p style={{ fontSize: 28, fontWeight: 'bold', margin: '4px 0' }}>GHS {Number(data.total_sales_all_time).toFixed(2)}</p>
          </div>
        </div>
      )}
    </div>
  );
}