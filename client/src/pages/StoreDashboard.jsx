import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function StoreDashboard() {
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
        <h1>Store Manager Dashboard</h1>
        <button onClick={logout}>Logout</button>
      </div>
      <p>Welcome, {user.name}.</p>

      <nav style={{ marginBottom: 24 }}>
        <Link to="/store/requests" style={{ marginRight: 16 }}>Stock Requests</Link>
        <Link to="/store/sales" style={{ marginRight: 16 }}>Record Sale</Link>
      </nav>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!data ? (
        <p>Loading...</p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
            <div style={{ padding: 16, border: '1px solid #ccc', borderRadius: 4 }}>
              <p style={{ color: '#666', margin: 0 }}>Store Inventory Value</p>
              <p style={{ fontSize: 24, fontWeight: 'bold', margin: '4px 0' }}>GHS {Number(data.total_inventory_value).toFixed(2)}</p>
            </div>
            <div style={{ padding: 16, border: '1px solid #ccc', borderRadius: 4 }}>
              <p style={{ color: '#666', margin: 0 }}>Today's Sales Revenue</p>
              <p style={{ fontSize: 24, fontWeight: 'bold', margin: '4px 0' }}>GHS {Number(data.today_sales_total).toFixed(2)}</p>
            </div>
            <div style={{ padding: 16, border: '1px solid #ccc', borderRadius: 4 }}>
              <p style={{ color: '#666', margin: 0 }}>Transactions Today</p>
              <p style={{ fontSize: 24, fontWeight: 'bold', margin: '4px 0' }}>{data.today_sales_count}</p>
            </div>
          </div>

          <h3>Recent Sales</h3>
          {data.recent_sales.length === 0 ? (
            <p style={{ color: '#666' }}>No sales recorded yet.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #333', textAlign: 'left' }}>
                  <th style={{ padding: 8 }}>Product</th>
                  <th style={{ padding: 8 }}>Qty</th>
                  <th style={{ padding: 8 }}>Total</th>
                  <th style={{ padding: 8 }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_sales.map((s) => (
                  <tr key={s.sale_id} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: 8 }}>{s.Product?.product_name}</td>
                    <td style={{ padding: 8 }}>{s.quantity}</td>
                    <td style={{ padding: 8 }}>GHS {Number(s.total_price).toFixed(2)}</td>
                    <td style={{ padding: 8 }}>{new Date(s.sale_date).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}