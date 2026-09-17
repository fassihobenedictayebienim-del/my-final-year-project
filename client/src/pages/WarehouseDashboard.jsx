import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import Layout from '../components/Layout';
import { useToast } from '../context/ToastContext';
import StatusPie from '../components/StatusPie';
import api from '../services/api';

const RANGES = [{ label: '7D', value: 7 }, { label: '30D', value: 30 }, { label: '90D', value: 90 }];

export default function WarehouseDashboard() {
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [days, setDays] = useState(30);
  const [editingReorder, setEditingReorder] = useState(null);
  const [reorderValue, setReorderValue] = useState('');

  useEffect(() => { fetchDashboard(days); }, [days]);

  async function fetchDashboard(range) {
    try {
      const response = await api.get('/dashboard/warehouse', { params: { days: range } });
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

  function startEditReorder(product_id, currentLevel) {
    setEditingReorder(product_id);
    setReorderValue(currentLevel);
  }

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
        <div><h1>Warehouse Dashboard</h1><p>Overview of your warehouse inventory and pending work.</p></div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {!data ? (
        <div className="loading-row"><span className="spinner" style={{ borderTopColor: 'var(--color-primary)', borderColor: 'var(--color-border)' }} /> Loading dashboard...</div>
      ) : (
        <>
          <div className="stat-grid cols-3">
            <div className="card"><p className="stat-label">📦 Total Warehouse Stock</p><p className="stat-value">{data.kpis.total_warehouse_stock}</p></div>
            <div className="card"><p className="stat-label">💰 Warehouse Inventory Value</p><p className="stat-value">GHS {Number(data.kpis.warehouse_inventory_value).toFixed(2)}</p></div>
            <div className={`card ${data.kpis.pending_store_requests > 0 ? 'stat-card pending' : ''}`}>
              <p className="stat-label">📋 Pending Store Requests</p><p className="stat-value">{data.kpis.pending_store_requests}</p>
              {data.kpis.pending_store_requests > 0 && <Link to="/warehouse/requests">Review now &rarr;</Link>}
            </div>
            <div className={`card ${data.kpis.products_below_reorder > 0 ? 'stat-card alert' : ''}`}>
              <p className="stat-label">⚠️ Below Reorder Level</p><p className="stat-value">{data.kpis.products_below_reorder}</p>
              {data.kpis.products_below_reorder > 0 && <Link to="/warehouse/shipments">Record a shipment &rarr;</Link>}
            </div>
            <div className="card"><p className="stat-label">🚚 Recent Transfers</p><p className="stat-value">{data.kpis.recent_transfers_count}</p></div>
            <div className={`card ${data.kpis.variants_needing_attention > 0 ? 'stat-card alert' : ''}`}>
              <p className="stat-label">🎯 Variants Needing Attention</p>
              <p className="stat-value">{data.kpis.variants_needing_attention}</p>
              <p className="stat-sub">Individual colour/size problems</p>
            </div>
          </div>
          

          <div className="chart-card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <h3>Stock Movement (Received vs. Dispatched)</h3>
              <div className="range-tabs">
                {RANGES.map((r) => (
                  <button key={r.value} className={`range-tab ${days === r.value ? 'active' : ''}`} onClick={() => setDays(r.value)}>{r.label}</button>
                ))}
              </div>
            </div>
            {data.stock_movement_trend.every((d) => d.received === 0 && d.dispatched === 0) ? (
              <div className="chart-empty">No movement recorded in this period.</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={data.stock_movement_trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12.5 }} />
                  <Legend wrapperStyle={{ fontSize: 12.5 }} />
                  <Line type="monotone" dataKey="received" name="Received" stroke="var(--color-success)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="dispatched" name="Dispatched" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="chart-grid">
            <div className="chart-card">
              <h3>Stock Transferred to Stores</h3>
              {data.stock_transferred_to_stores.every((d) => d.quantity === 0) ? <div className="chart-empty">No transfers in this period.</div> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.stock_transferred_to_stores}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="store_name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12.5 }} />
                    <Bar dataKey="quantity" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="chart-card">
              <h3>Top-Moving Products</h3>
              {data.top_moving_products.length === 0 ? <div className="chart-empty">No movement in this period.</div> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.top_moving_products} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="product_name" tick={{ fontSize: 11 }} width={110} />
                    <Tooltip formatter={(v) => [v, 'Units moved']} contentStyle={{ borderRadius: 8, fontSize: 12.5 }} />
                    <Bar dataKey="quantity_moved" fill="var(--color-success)" radius={[0, 4, 4, 0]} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="chart-grid">
            <div className="chart-card"><h3>Stock Status</h3><StatusPie inStock={data.stock_status.in_stock} lowStock={data.stock_status.low_stock} outOfStock={data.stock_status.out_of_stock} /></div>
            <div className="chart-card">
              <h3>Recent Stock Transfers</h3>
              {data.recent_transfers.length === 0 ? (
                <div className="empty-state"><span className="empty-state-icon">🚚</span>No transfers yet.</div>
              ) : (
                <table className="data-table">
                  <thead><tr><th>Store</th><th>Qty</th><th>Status</th><th>Date</th></tr></thead>
                  <tbody>
                    {data.recent_transfers.map((t) => (
                      <tr key={t.transfer_id}><td>Store {t.store_id}</td><td>{t.quantity}</td><td><span className={`badge badge-${t.status === 'received' ? 'fulfilled' : 'approved'}`}>{t.status}</span></td><td>{new Date(t.date).toLocaleDateString()}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
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
                      <td><Link to="/warehouse/shipments" className="btn btn-sm">Record Shipment</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h3>Warehouse Low-Stock Products</h3>
          {data.warehouse_low_stock_products.length === 0 ? (
            <div className="empty-state"><span className="empty-state-icon">✅</span>Everything is above its reorder level.</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Product</th><th>Total Stock</th><th>Reorder Level</th><th>Status</th><th>Low Variants</th><th>Actions</th></tr></thead>
                <tbody>
                  {data.warehouse_low_stock_products.map((row) => (
                    <tr key={row.product_id}>
                      <td>{row.product_name}</td>
                      <td>{row.total_quantity}</td>
                      <td>{editingReorder === row.product_id ? (
                        <input className="form-input" type="number" min="0" value={reorderValue} onChange={(e) => setReorderValue(e.target.value)} style={{ width: 80 }} />
                      ) : row.reorder_level}</td>
                      <td>{statusBadge(row.status)}</td>
                      <td>{row.low_variants.length === 0 ? '—' : row.low_variants.map((v) => (
                        <span key={v.variant_id} className={`stock-badge ${v.flag === 'out' ? 'out-of-stock' : 'low-stock'}`} style={{ marginRight: 4 }}>{v.color}/{v.size}: {v.quantity}</span>
                      ))}</td>
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
