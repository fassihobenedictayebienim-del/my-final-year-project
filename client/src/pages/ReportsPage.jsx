import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function ReportsPage() {
  const { user } = useAuth();
  const backLink = user.role === 'store_manager' ? '/store' : user.role === 'warehouse_manager' ? '/warehouse' : '/admin';

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

  function handleFilter(e) {
    e.preventDefault();
    fetchSalesReport(startDate, endDate);
  }

  function clearFilter() {
    setStartDate('');
    setEndDate('');
    fetchSalesReport();
  }

  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif', maxWidth: 950, margin: '0 auto' }}>
      <Link to={backLink}>&larr; Back to Dashboard</Link>
      <h1>Reports</h1>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {inventoryData && (
        <div style={{ marginBottom: 32 }}>
          <h3>Inventory Value {user.role === 'store_manager' ? '(Your Store)' : user.role === 'warehouse_manager' ? '(Warehouse)' : '(All Locations)'}</h3>
          <div style={{ padding: 16, border: '1px solid #ccc', borderRadius: 4, marginBottom: 12 }}>
            <p style={{ fontSize: 24, fontWeight: 'bold', margin: 0 }}>GHS {Number(inventoryData.total_value).toFixed(2)}</p>
          </div>
          {inventoryData.breakdown.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #333', textAlign: 'left' }}>
                  <th style={{ padding: 6 }}>Product</th>
                  <th style={{ padding: 6 }}>Location</th>
                  <th style={{ padding: 6 }}>Qty</th>
                  <th style={{ padding: 6 }}>Unit Price</th>
                  <th style={{ padding: 6 }}>Value</th>
                </tr>
              </thead>
              <tbody>
                {inventoryData.breakdown.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: 6 }}>{row.product_name}</td>
                    <td style={{ padding: 6 }}>{row.warehouse_id ? 'Warehouse' : `Store ${row.store_id}`}</td>
                    <td style={{ padding: 6 }}>{row.quantity}</td>
                    <td style={{ padding: 6 }}>GHS {Number(row.unit_price).toFixed(2)}</td>
                    <td style={{ padding: 6 }}>GHS {Number(row.value).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <h3>Sales Report</h3>
      <form onSubmit={handleFilter} style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        <label>
          From:{' '}
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ padding: 6 }} />
        </label>
        <label>
          To:{' '}
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ padding: 6 }} />
        </label>
        <button type="submit" style={{ padding: '6px 16px' }}>Filter</button>
        <button type="button" onClick={clearFilter} style={{ padding: '6px 16px' }}>Clear</button>
      </form>

      {loading ? (
        <p>Loading...</p>
      ) : salesData ? (
        <>
          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            <div style={{ padding: 12, border: '1px solid #ccc', borderRadius: 4, flex: 1 }}>
              <p style={{ color: '#666', margin: 0, fontSize: 13 }}>Total Transactions</p>
              <p style={{ fontSize: 20, fontWeight: 'bold', margin: '4px 0' }}>{salesData.summary.count}</p>
            </div>
            <div style={{ padding: 12, border: '1px solid #ccc', borderRadius: 4, flex: 1 }}>
              <p style={{ color: '#666', margin: 0, fontSize: 13 }}>Total Quantity Sold</p>
              <p style={{ fontSize: 20, fontWeight: 'bold', margin: '4px 0' }}>{salesData.summary.total_quantity}</p>
            </div>
            <div style={{ padding: 12, border: '1px solid #ccc', borderRadius: 4, flex: 1 }}>
              <p style={{ color: '#666', margin: 0, fontSize: 13 }}>Total Revenue</p>
              <p style={{ fontSize: 20, fontWeight: 'bold', margin: '4px 0' }}>GHS {Number(salesData.summary.total_revenue).toFixed(2)}</p>
            </div>
          </div>

          {salesData.sales.length === 0 ? (
            <p style={{ color: '#666' }}>No sales found for this period.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #333', textAlign: 'left' }}>
                  <th style={{ padding: 8 }}>Product</th>
                  {user.role !== 'store_manager' && <th style={{ padding: 8 }}>Store</th>}
                  <th style={{ padding: 8 }}>Qty</th>
                  <th style={{ padding: 8 }}>Total</th>
                  <th style={{ padding: 8 }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {salesData.sales.map((s) => (
                  <tr key={s.sale_id} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: 8 }}>{s.Product?.product_name} {s.Product?.size ? `(${s.Product.size})` : ''} {s.Product?.color ? `- ${s.Product.color}` : ''}</td>
                    {user.role !== 'store_manager' && <td style={{ padding: 8 }}>Store {s.store_id}</td>}
                    <td style={{ padding: 8 }}>{s.quantity}</td>
                    <td style={{ padding: 8 }}>GHS {Number(s.total_price).toFixed(2)}</td>
                    <td style={{ padding: 8 }}>{new Date(s.sale_date).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      ) : null}
    </div>
  );
}