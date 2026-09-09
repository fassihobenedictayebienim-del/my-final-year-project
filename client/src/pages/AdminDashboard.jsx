import { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import Layout from '../components/Layout';
import StatusPie from '../components/StatusPie';
import api from '../services/api';

const RANGES = [{ label: '7D', value: 7 }, { label: '30D', value: 30 }, { label: '90D', value: 90 }];

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [days, setDays] = useState(30);

  useEffect(() => { fetchDashboard(days); }, [days]);

  async function fetchDashboard(range) {
    try {
      const response = await api.get('/dashboard/admin', { params: { days: range } });
      setData(response.data);
    } catch (err) {
      setError('Failed to load dashboard.');
    }
  }

  return (
    <Layout>
      <div className="page-header">
        <div><h1>Administrator Dashboard</h1><p>System-wide overview across all locations.</p></div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {!data ? <p>Loading...</p> : (
        <>
          <div className="stat-grid cols-3">
            <div className="card"><p className="stat-label">Total Products</p><p className="stat-value">{data.kpis.total_products}</p></div>
            <div className="card"><p className="stat-label">Total Inventory Qty</p><p className="stat-value">{data.kpis.total_inventory_quantity}</p></div>
            <div className="card"><p className="stat-label">Total Inventory Value</p><p className="stat-value">GHS {Number(data.kpis.total_inventory_value).toFixed(2)}</p></div>
            <div className="card"><p className="stat-label">Total Sales</p><p className="stat-value">GHS {Number(data.kpis.total_sales).toFixed(2)}</p></div>
            <div className="card"><p className="stat-label">Number of Stores</p><p className="stat-value">{data.kpis.number_of_stores}</p></div>
            <div className={`card ${data.kpis.low_stock_count > 0 ? 'stat-card alert' : ''}`}><p className="stat-label">Low-Stock Products</p><p className="stat-value">{data.kpis.low_stock_count}</p></div>
          </div>

          <div className="chart-card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Overall Sales Trend</h3>
              <div className="range-tabs">
                {RANGES.map((r) => (
                  <button key={r.value} className={`range-tab ${days === r.value ? 'active' : ''}`} onClick={() => setDays(r.value)}>{r.label}</button>
                ))}
              </div>
            </div>
            {data.sales_trend.every((d) => d.revenue === 0) ? (
              <div className="chart-empty">No sales recorded in this period.</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={data.sales_trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`GHS ${v}`, 'Revenue']} />
                  <Line type="monotone" dataKey="revenue" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="chart-grid">
            <div className="chart-card">
              <h3>Sales by Store</h3>
              {data.sales_by_store.every((d) => d.revenue === 0) ? <div className="chart-empty">No sales yet.</div> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.sales_by_store}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="store_name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [`GHS ${v}`, 'Revenue']} />
                    <Bar dataKey="revenue" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="chart-card">
              <h3>Inventory by Location</h3>
              {data.inventory_by_location.every((d) => d.quantity === 0) ? <div className="chart-empty">No inventory yet.</div> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.inventory_by_location}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="location_name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="quantity" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
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
                    <Tooltip formatter={(v) => [v, 'Units sold']} />
                    <Bar dataKey="quantity_sold" fill="var(--color-primary)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="chart-card">
              <h3>Stock Status</h3>
              <StatusPie inStock={data.stock_status.in_stock} lowStock={data.stock_status.low_stock} outOfStock={data.stock_status.out_of_stock} />
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}