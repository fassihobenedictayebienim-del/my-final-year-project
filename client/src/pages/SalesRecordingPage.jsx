import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function SalesRecordingPage() {
  const [products, setProducts] = useState([]);
  const [storeInventory, setStoreInventory] = useState([]);
  const [todaySales, setTodaySales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [productsRes, inventoryRes, salesRes] = await Promise.all([
        api.get('/products'),
        api.get('/inventory'), // already filtered to this Store Manager's own store
        api.get('/sales'),
      ]);
      setProducts(productsRes.data.products);
      setStoreInventory(inventoryRes.data.inventory);
      setTodaySales(salesRes.data.sales);
    } catch (err) {
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  }

  function getStoreQty(product_id) {
    const row = storeInventory.find((i) => i.product_id === product_id);
    return row ? row.quantity : 0;
  }

  function getProductPrice(product_id) {
    const p = products.find((pr) => pr.product_id === product_id);
    return p ? Number(p.unit_price) : 0;
  }

  const availableQty = productId ? getStoreQty(productId) : null;
  const estimatedTotal = productId && quantity ? (getProductPrice(productId) * Number(quantity)).toFixed(2) : null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const response = await api.post('/sales', { product_id: productId, quantity });
      setSuccess(`Sale recorded — GHS ${Number(response.data.sale.total_price).toFixed(2)} total.`);
      setProductId('');
      setQuantity('');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record sale.');
    }
  }

  // "today" filter, since the sales endpoint returns full history
  const isToday = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  };
  const salesToday = todaySales.filter((s) => isToday(s.sale_date));
  const totalToday = salesToday.reduce((sum, s) => sum + Number(s.total_price), 0);
  const itemsSoldToday = salesToday.reduce((sum, s) => sum + s.quantity, 0);

  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif', maxWidth: 900, margin: '0 auto' }}>
      <Link to="/store">&larr; Back to Dashboard</Link>
      <h1>Sales Recording</h1>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}

      <div style={{ display: 'flex', gap: 32 }}>
        <div style={{ flex: 1 }}>
          <h3>Record Sale</h3>
          <form onSubmit={handleSubmit} style={{ padding: 16, border: '1px solid #ccc', borderRadius: 4 }}>
            <div style={{ marginBottom: 8 }}>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                required
                style={{ padding: 6, width: '100%' }}
              >
                <option value="">Select a product</option>
                {products.map((p) => (
                  <option key={p.product_id} value={p.product_id}>
                    {p.product_id} — {p.product_name} {p.size ? `(${p.size})` : ''} {p.color ? `- ${p.color}` : ''} — {getStoreQty(p.product_id)} in stock
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 8 }}>
              <input
                type="number"
                placeholder="Quantity sold"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                min="1"
                style={{ padding: 6, width: '100%' }}
              />
            </div>
            {availableQty !== null && (
              <p style={{ color: '#666', fontSize: 13 }}>{availableQty} unit(s) available at your store.</p>
            )}
            {estimatedTotal !== null && (
              <p style={{ fontWeight: 'bold' }}>Estimated total: GHS {estimatedTotal}</p>
            )}
            <button type="submit" style={{ padding: '8px 16px', width: '100%' }}>Record Sale</button>
          </form>
        </div>

        <div style={{ flex: 1 }}>
          <h3>Daily Summary</h3>
          <div style={{ padding: 16, border: '1px solid #ccc', borderRadius: 4, marginBottom: 16 }}>
            <p><strong>Items sold today:</strong> {itemsSoldToday}</p>
            <p><strong>Revenue today:</strong> GHS {totalToday.toFixed(2)}</p>
          </div>

          <h4>Today's Sales</h4>
          {loading ? (
            <p>Loading...</p>
          ) : salesToday.length === 0 ? (
            <p style={{ color: '#666' }}>No sales recorded yet today.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #333', textAlign: 'left' }}>
                  <th style={{ padding: 6 }}>Product</th>
                  <th style={{ padding: 6 }}>Qty</th>
                  <th style={{ padding: 6 }}>Total</th>
                  <th style={{ padding: 6 }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {salesToday.map((s) => (
                  <tr key={s.sale_id} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: 6 }}>{s.Product?.product_name}</td>
                    <td style={{ padding: 6 }}>{s.quantity}</td>
                    <td style={{ padding: 6 }}>GHS {Number(s.total_price).toFixed(2)}</td>
                    <td style={{ padding: 6 }}>{new Date(s.sale_date).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}