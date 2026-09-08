import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';

export default function StoreDashboard() {
  const [data, setData] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.get('/reports/dashboard'), api.get('/inventory')])
      .then(([dashRes, invRes]) => { setData(dashRes.data); setInventory(invRes.data.inventory); })
      .catch(() => setError('Failed to load dashboard.'));
  }, []);

  function stockBadge(qty) {
    if (qty === 0) return <span className="stock-badge out-of-stock">🔴 Out of Stock</span>;
    if (qty <= 5) return <span className="stock-badge low-stock">🟠 Low Stock</span>;
    return <span className="stock-badge in-stock">🟢 In Stock</span>;
  }

  return (
    <Layout>
      <div className="page-header">
        <div><h1>Store Dashboard</h1><p>Overview of your store's inventory and today's sales.</p></div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {!data ? <p>Loading...</p> : (
        <>
          <div className="stat-grid cols-3">
            <div className="card"><p className="stat-label">Store Inventory Value</p><p className="stat-value">GHS {Number(data.total_inventory_value).toFixed(2)}</p></div>
            <div className="card"><p className="stat-label">Today's Sales Revenue</p><p className="stat-value">GHS {Number(data.today_sales_total).toFixed(2)}</p></div>
            <div className="card"><p className="stat-label">Transactions Today</p><p className="stat-value">{data.today_sales_count}</p></div>
          </div>

          <h3>Current Stock</h3>
          {inventory.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>No stock recorded at your store yet.</p>
          ) : (
            <div className="table-wrap" style={{ marginBottom: 24 }}>
              <table className="data-table">
                <thead><tr><th>Product</th><th>Colour</th><th>Size</th><th>Quantity</th><th>Status</th></tr></thead>
                <tbody>
                  {inventory.map((row) => (
                    <tr key={row.inventory_id}>
                      <td>{row.ProductVariant?.Product?.product_name}</td>
                      <td>{row.ProductVariant?.color}</td>
                      <td>{row.ProductVariant?.size}</td>
                      <td>{row.quantity}</td>
                      <td>{stockBadge(row.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h3>Recent Sales</h3>
          {data.recent_sales.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>No sales recorded yet.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Product</th><th>Colour</th><th>Size</th><th>Qty</th><th>Total</th><th>Date</th></tr></thead>
                <tbody>
                  {data.recent_sales.map((s) => (
                    <tr key={s.sale_id}>
                      <td>{s.ProductVariant?.Product?.product_name}</td>
                      <td>{s.ProductVariant?.color}</td>
                      <td>{s.ProductVariant?.size}</td>
                      <td>{s.quantity}</td>
                      <td>GHS {Number(s.total_price).toFixed(2)}</td>
                      <td>{new Date(s.sale_date).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}