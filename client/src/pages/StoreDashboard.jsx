import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import Layout from '../components/Layout';
import { useToast } from '../context/ToastContext';
import StatusPie from '../components/StatusPie';
import api from '../services/api';

const RANGES = [{ label: '7D', value: 7 }, { label: '30D', value: 30 }, { label: '90D', value: 90 }];

export default function StoreDashboard() {
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [days, setDays] = useState(30);
  const [editingReorder, setEditingReorder] = useState(null);
  const [reorderValue, setReorderValue] = useState('');

  useEffect(() => { fetchDashboard(days); }, [days]);

  async function fetchDashboard(range) {
    try {
      const response = await api.get('/dashboard/store', { params: { days: range } });
      setData(response.data);
    } catch (_err) {
      setError('Failed to load dashboard.');
    }
  }

  function statusBadge(status) {
    if (status === 'out') return <span className="stock-badge out-of-stock">🔴 Out of Stock</span>;
    if (status === 'low') return <span className="stock-badge low-stock">🟠 Reorder Required</span>;
    return <span className="stock-badge in-stock">🟢 In Stock</span>;
  }

  function startEditReorder(product_id, currentLevel) { setEditingReorder(product_id); setReorderValue(currentLevel); }

  async function saveReorderLevel(product_id) {
    try {
      await api.put(`/inventory/reorder-level/${product_id}`, { reorder_level: reorderValue });
      showToast('Reorder level updated.');
      setEditingReorder(null);
      fetchDashboard(days);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update reorder level.', 'error');
    }
  }

  return (
    <Layout>
      <div className="page-header">
        <div><h1>Store Dashboard</h1><p>Overview of your store's inventory and sales.</p></div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {!data ? (
        <div className="loading-row"><span className="spinner" style={{ borderTopColor: 'var(--color-primary)', borderColor: 'var(--color-border)' }} /> Loading dashboard...</div>
      ) : (
        <>
          <div className="stat-grid cols-3">
            <div className="card"><p className="stat-label">📦 Current Store Stock</p><p className="stat-value">{data.kpis.current_store_stock}</p></div>
            <div className="card"><p className="stat-label">🛒 Today's Sales</p><p className="stat-value">{data.kpis.todays_sales_count}</p></div>
            <div className="card"><p className="stat-label">💰 Today's Revenue</p><p className="stat-value">GHS {Number(data.kpis.todays_revenue).toFixed(2)}</p></div>
            <div className={`card ${data.kpis.low_stock_products_count > 0 ? 'stat-card alert' : ''}`}><p className="stat-label">⚠️ Low-Stock Products</p><p className="stat-value">{data.kpis.low_stock_products_count}</p></div>
            <div className={`card ${data.kpis.pending_stock_requests > 0 ? 'stat-card pending' : ''}`}><p className="stat-label">📋 Pending Requests</p><p className="stat-value">{data.kpis.pending_stock_requests}</p></div>
            <div className={`card ${data.kpis.variants_needing_attention > 0 ? 'stat-card alert' : ''}`}>
              <p className="stat-label">🎯 Variants Needing Attention</p>
              <p className="stat-value">{data.kpis.variants_needing_attention}</p>
              <p className="stat-sub">Individual colour/size problems</p>
            </div>
          </div>

          <div className="chart-card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <h3>Sales Trend</h3>
              <div className="range-tabs">
                {RANGES.map((r) => <button key={r.value} className={`range-tab ${days === r.value ? 'active' : ''}`} onClick={() => setDays(r.value)}>{r.label}</button>)}
              </div>
            </div>
            {data.sales_trend.every((d) => d.revenue === 0) ? <div className="chart-empty">No sales recorded in this period.</div> : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={data.sales_trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`GHS ${v}`, 'Revenue']} contentStyle={{ borderRadius: 8, fontSize: 12.5 }} />
                  <Line type="monotone" dataKey="revenue" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="chart-grid">
            <div className="chart-card">
              <h3>Top-Selling Products</h3>
              {data.top_selling_products.length === 0 ? <div className="chart-empty">No sales in this period.</div> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.top_selling_products} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="product_name" tick={{ fontSize: 11 }} width={110} />
                    <Tooltip formatter={(v) => [v, 'Units sold']} contentStyle={{ borderRadius: 8, fontSize: 12.5 }} />
                    <Bar dataKey="quantity_sold" fill="var(--color-primary)" radius={[0, 4, 4, 0]} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="chart-card">
              <h3>Current Stock by Product</h3>
              {data.current_stock_by_product.every((d) => d.quantity === 0) ? <div className="chart-empty">No stock recorded yet.</div> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.current_stock_by_product}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="product_name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12.5 }} />
                    <Bar dataKey="quantity" fill="var(--color-success)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="chart-card" style={{ marginBottom: 16 }}>
            <h3>Stock Status</h3>
            <StatusPie inStock={data.stock_status.in_stock} lowStock={data.stock_status.low_stock} outOfStock={data.stock_status.out_of_stock} />
          </div>

          <h3>Inventory Alerts</h3>
          {data.variant_alerts.length === 0 ? (
            <div className="empty-state" style={{ marginBottom: 24 }}><span className="empty-state-icon">✅</span>No variant-level stock problems right now.</div>
          ) : (
            <div className="table-wrap" style={{ marginBottom: 24 }}>
              <table className="data-table">
                <thead><tr><th>Product</th><th>Colour</th><th>Size</th><th>Quantity</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {data.variant_alerts.map((v) => (
                    <tr key={v.variant_id}>
                      <td>{v.product_name}</td>
                      <td>{v.color}</td>
                      <td>{v.size}</td>
                      <td>{v.quantity}</td>
                      <td>{v.status === 'out' ? <span className="stock-badge out-of-stock">🔴 Out of Stock</span> : <span className="stock-badge low-stock">🟠 Low Stock</span>}</td>
                      <td><Link to="/store/inventory" className="btn btn-sm">View Inventory</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h3>Products Below Store Reorder Level</h3>
          {data.products_below_reorder.length === 0 ? (
            <div className="empty-state"><span className="empty-state-icon">✅</span>Everything is above your reorder level.</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Product</th><th>Total Stock</th><th>Reorder Level</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {data.products_below_reorder.map((row) => (
                    <tr key={row.product_id}>
                      <td>{row.product_name}</td>
                      <td>{row.total_quantity}</td>
                      <td>{editingReorder === row.product_id ? (
                        <input className="form-input" type="number" min="0" value={reorderValue} onChange={(e) => setReorderValue(e.target.value)} style={{ width: 80 }} />
                      ) : row.reorder_level}</td>
                      <td>{statusBadge(row.status)}</td>
                      <td>{editingReorder === row.product_id ? (
                        <div className="action-buttons">
                          <button className="btn btn-sm btn-success" onClick={() => saveReorderLevel(row.product_id)}>Save</button>
                          <button className="btn btn-sm" onClick={() => setEditingReorder(null)}>Cancel</button>
                        </div>
                      ) : (
                        <button className="btn btn-sm" onClick={() => startEditReorder(row.product_id, row.reorder_level)}>Set Reorder Level</button>
                      )}</td>
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
