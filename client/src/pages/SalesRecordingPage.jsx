import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import { formatCurrency } from '../utils/currency';

export default function SalesRecordingPage() {
  const { showToast } = useToast();
  const [storeInventory, setStoreInventory] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  const [variantId, setVariantId] = useState('');
  const [quantity, setQuantity] = useState('');

  // eslint-disable-next-line react-hooks/exhaustive-deps -- Load sales data once when the page opens.
  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [inventoryRes, salesRes] = await Promise.all([api.get('/inventory'), api.get('/sales')]);
      setStoreInventory(inventoryRes.data.inventory);
      setSales(salesRes.data.sales);
    } catch (_err) {
      showToast('Failed to load data.', 'error');
    } finally {
      setLoading(false);
    }
  }

  const selectedRow = storeInventory.find((r) => String(r.variant_id) === String(variantId));
  const estimatedTotal = selectedRow && quantity ? Number(selectedRow.ProductVariant.Product.unit_price) * Number(quantity) : null;

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const response = await api.post('/sales', { variant_id: variantId, quantity });
      showToast(`Sale recorded successfully — ${formatCurrency(response.data.sale.total_price)}.`);
      setVariantId('');
      setQuantity('');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to record sale.', 'error');
    }
  }

  const isToday = (dateStr) => new Date(dateStr).toDateString() === new Date().toDateString();
  const salesToday = sales.filter((s) => isToday(s.sale_date));
  const totalToday = salesToday.reduce((sum, s) => sum + Number(s.total_price), 0);
  const itemsSoldToday = salesToday.reduce((sum, s) => sum + s.quantity, 0);

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>Sales Recording</h1>
          <p>Record a sale by exact colour and size, and view today's totals.</p>
        </div>
      </div>

      <div className="stat-grid cols-2" style={{ marginBottom: 8 }}>
        <div className="card"><p className="stat-label">🛒 Items Sold Today</p><p className="stat-value">{itemsSoldToday}</p></div>
        <div className="card"><p className="stat-label">💰 Revenue Today</p><p className="stat-value">{formatCurrency(totalToday)}</p></div>
      </div>

      <h3>Record Sale</h3>
      <form onSubmit={handleSubmit} className="form-card">
        <div className="form-row">
          <div style={{ flex: 1 }}>
            <label className="form-label">Colour / Size</label>
            <select className="form-input" value={variantId} onChange={(e) => setVariantId(e.target.value)} required style={{ width: '100%' }}>
              <option value="">Select colour / size</option>
              {storeInventory.map((row) => (
                <option key={row.variant_id} value={row.variant_id}>
                  {row.ProductVariant.Product.product_name} — {row.ProductVariant.color} / {row.ProductVariant.size} — {row.quantity} in stock
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Quantity Sold</label>
            <input className="form-input" type="number" placeholder="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} required min="1" style={{ width: 140 }} />
          </div>
        </div>
        {selectedRow && <p className="form-hint">{selectedRow.quantity} unit(s) available at your store for this variant.</p>}
        {estimatedTotal !== null && (
          <div className="card" style={{ marginBottom: 14, padding: '10px 16px', display: 'inline-block' }}>
            <p className="stat-label" style={{ margin: 0 }}>Estimated Total</p>
            <p className="stat-value" style={{ fontSize: 20, margin: '2px 0 0' }}>{formatCurrency(estimatedTotal)}</p>
          </div>
        )}
        <div><button type="submit" className="btn btn-primary">Record Sale</button></div>
      </form>

      <h3>Today's Sales</h3>
      {loading ? (
        <div className="loading-row"><span className="spinner" style={{ borderTopColor: 'var(--color-primary)', borderColor: 'var(--color-border)' }} /> Loading...</div>
      ) : salesToday.length === 0 ? (
        <div className="empty-state"><span className="empty-state-icon">🛒</span>No sales recorded yet today.</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Product</th><th>Colour</th><th>Size</th><th>Qty</th><th>Total</th><th>Time</th></tr></thead>
            <tbody>
              {salesToday.map((s) => (
                <tr key={s.sale_id}>
                  <td>{s.ProductVariant?.Product?.product_name}</td>
                  <td>{s.ProductVariant?.color}</td>
                  <td>{s.ProductVariant?.size}</td>
                  <td>{s.quantity}</td>
                  <td>{formatCurrency(s.total_price)}</td>
                  <td>{new Date(s.sale_date).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
