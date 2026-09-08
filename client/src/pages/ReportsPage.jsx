import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import api from '../services/api';

export default function ReportsPage() {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [salesData, setSalesData] = useState(null);
  const [inventoryData, setInventoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInventoryValue();
    fetchSalesReport();
  }, []);

  async function fetchInventoryValue() {
    try {
      const response = await api.get('/reports/inventory-value');
      setInventoryData(response.data);
    } catch (err) {
      setError('Failed to load inventory value.');
    }
  }

  async function fetchSalesReport(customStart, customEnd) {
    setLoading(true);
    try {
      const params = {};
      if (customStart) params.start_date = customStart;
      if (customEnd) params.end_date = customEnd;
      const response = await api.get('/reports/sales', { params });
      setSalesData(response.data);
    } catch (err) {
      setError('Failed to load sales report.');
    } finally {
      setLoading(false);
    }
  }

  function handleFilter(e) { e.preventDefault(); fetchSalesReport(startDate, endDate); }
  function clearFilter() { setStartDate(''); setEndDate(''); fetchSalesReport(); }

  // Group the flat breakdown into sections by location, so "All Locations"
  // reads as Warehouse / Store 1 / Store 2 instead of an interleaved list.
  function groupByLocation(breakdown) {
    const groups = {};
    for (const row of breakdown) {
      const key = row.warehouse_id ? `Warehouse ${row.warehouse_id}` : `Store ${row.store_id}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    }
    // Sort so Warehouse comes first, then Store 1, Store 2, ...
    return Object.entries(groups).sort(([a], [b]) => {
      if (a.startsWith('Warehouse')) return -1;
      if (b.startsWith('Warehouse')) return 1;
      return a.localeCompare(b);
    });
  }

  const groupedInventory = inventoryData ? groupByLocation(inventoryData.breakdown) : [];

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>Reports</h1>
          <p>Sales history and inventory value.</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {inventoryData && (
        <div style={{ marginBottom: 28 }}>
          <h3>Inventory Value {user.role === 'store_manager' ? '(Your Store)' : user.role === 'warehouse_manager' ? '(Warehouse)' : '(All Locations)'}</h3>
          <div className="card" style={{ marginBottom: 16 }}>
            <p className="stat-label">Grand Total</p>
            <p className="stat-value" style={{ margin: '4px 0 0' }}>GHS {Number(inventoryData.total_value).toFixed(2)}</p>
          </div>

          {groupedInventory.map(([locationName, rows]) => {
            const subtotal = rows.reduce((sum, r) => sum + Number(r.value), 0);
            return (
              <div key={locationName} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{locationName}</h4>
                  <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                    Subtotal: <strong style={{ color: 'var(--color-text)' }}>GHS {subtotal.toFixed(2)}</strong>
                  </span>
                </div>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead><tr><th>Product</th><th>Colour</th><th>Size</th><th>Qty</th><th>Unit Price</th><th>Value</th></tr></thead>
                    <tbody>
                     {rows.map((row, i) => (
                  <tr key={i}>
                    <td>{row.product_name}</td>
                    <td>{row.color}</td>
                    <td>{row.size}</td>
                    <td>{row.quantity}</td>
                    <td>GHS {Number(row.unit_price).toFixed(2)}</td>
                    <td>GHS {Number(row.value).toFixed(2)}</td>
                  </tr>
              ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <h3>Sales Report</h3>
      <form onSubmit={handleFilter} className="form-row" style={{ alignItems: 'center', marginBottom: 16 }}>
        <label style={{ fontSize: 13 }}>From <input type="date" className="form-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
        <label style={{ fontSize: 13 }}>To <input type="date" className="form-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></label>
        <button type="submit" className="btn btn-primary btn-sm">Filter</button>
        <button type="button" className="btn btn-sm" onClick={clearFilter}>Clear</button>
      </form>

      {loading ? <p>Loading...</p> : salesData && (
        <>
          <div className="stat-grid cols-3">
            <div className="card"><p className="stat-label">Total Transactions</p><p className="stat-value" style={{ fontSize: 20 }}>{salesData.summary.count}</p></div>
            <div className="card"><p className="stat-label">Total Quantity Sold</p><p className="stat-value" style={{ fontSize: 20 }}>{salesData.summary.total_quantity}</p></div>
            <div className="card"><p className="stat-label">Total Revenue</p><p className="stat-value" style={{ fontSize: 20 }}>GHS {Number(salesData.summary.total_revenue).toFixed(2)}</p></div>
          </div>

          {salesData.sales.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>No sales found for this period.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
            <thead>
              <tr>
                <th>Product</th><th>Colour</th><th>Size</th>
                {user.role !== 'store_manager' && <th>Store</th>}
                <th>Qty</th><th>Total</th><th>Date</th>
              </tr>
            </thead>
                <tbody>
                  {salesData.sales.map((s) => (
              <tr key={s.sale_id}>
                <td>{s.ProductVariant?.Product?.product_name}</td>
                <td>{s.ProductVariant?.color}</td>
                <td>{s.ProductVariant?.size}</td>
                {user.role !== 'store_manager' && <td>Store {s.store_id}</td>}
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