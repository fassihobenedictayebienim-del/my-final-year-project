import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

export default function WarehouseDashboard() {
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [summary, setSummary] = useState([]);
  const [error, setError] = useState('');
  const [editingReorder, setEditingReorder] = useState(null);
  const [reorderValue, setReorderValue] = useState('');

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    try {
      const [dashRes, summaryRes] = await Promise.all([
        api.get('/reports/dashboard'),
        api.get('/inventory/summary'),
      ]);
      setData(dashRes.data);
      setSummary(summaryRes.data.summary);
    } catch (err) {
      setError('Failed to load dashboard.');
    }
  }

  function statusBadge(status) {
    if (status === 'out') return <span className="stock-badge out-of-stock">🔴 Out of Stock</span>;
    if (status === 'low') return <span className="stock-badge low-stock">🟠 Reorder Required</span>;
    return <span className="stock-badge in-stock">🟢 In Stock</span>;
  }

  function startEditReorder(product_id, currentLevel) {
    setEditingReorder(product_id);
    setReorderValue(currentLevel);
  }

  async function saveReorderLevel(product_id) {
    try {
      await api.put(`/inventory/reorder-level/${product_id}`, { reorder_level: reorderValue });
      showToast('Reorder level updated.');
      setEditingReorder(null);
      fetchAll();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update reorder level.', 'error');
    }
  }

  return (
    <Layout>
      <div className="page-header">
        <div><h1>Warehouse Dashboard</h1><p>Overview of your warehouse inventory and pending work.</p></div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {!data ? <p>Loading...</p> : (
        <div className="stat-grid cols-3">
          <div className="card"><p className="stat-label">Warehouse Inventory Value</p><p className="stat-value">GHS {Number(data.total_inventory_value).toFixed(2)}</p></div>
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

      <h3>Stock Status &amp; Reorder</h3>
      {summary.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)' }}>No stock recorded at the warehouse yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Product</th><th>Total Stock</th><th>Reorder Level</th><th>Status</th><th>Low Variants</th><th>Actions</th></tr></thead>
            <tbody>
              {summary.map((row) => (
                <tr key={row.product_id}>
                  <td>{row.product_name}</td>
                  <td>{row.total_quantity}</td>
                  <td>
                    {editingReorder === row.product_id ? (
                      <input className="form-input" type="number" min="0" value={reorderValue} onChange={(e) => setReorderValue(e.target.value)} style={{ width: 80 }} />
                    ) : row.reorder_level}
                  </td>
                  <td>{statusBadge(row.status)}</td>
                  <td>
                    {row.low_variants.length === 0 ? '—' : row.low_variants.map((v) => (
                      <span key={v.variant_id} className={`stock-badge ${v.flag === 'out' ? 'out-of-stock' : 'low-stock'}`} style={{ marginRight: 4 }}>
                        {v.color}/{v.size}: {v.quantity}
                      </span>
                    ))}
                  </td>
                  <td>
                    {editingReorder === row.product_id ? (
                      <div className="action-buttons">
                        <button className="btn btn-sm btn-success" onClick={() => saveReorderLevel(row.product_id)}>Save</button>
                        <button className="btn btn-sm" onClick={() => setEditingReorder(null)}>Cancel</button>
                      </div>
                    ) : (
                      <button className="btn btn-sm" onClick={() => startEditReorder(row.product_id, row.reorder_level)}>Set Reorder Level</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}