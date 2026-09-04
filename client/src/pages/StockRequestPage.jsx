import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function StockRequestPage() {
  const [products, setProducts] = useState([]);
  const [warehouseStock, setWarehouseStock] = useState([]);
  const [requests, setRequests] = useState([]);
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
      const [productsRes, stockRes, requestsRes] = await Promise.all([
        api.get('/products'),
        api.get('/inventory/warehouse-stock'),
        api.get('/stock-requests'),
      ]);
      setProducts(productsRes.data.products);
      setWarehouseStock(stockRes.data.inventory);
      setRequests(requestsRes.data.requests);
    } catch (err) {
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  }

  function getAvailableQty(product_id) {
    const row = warehouseStock.find((s) => s.product_id === product_id);
    return row ? row.quantity : 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await api.post('/stock-requests', { product_id: productId, quantity });
      setSuccess('Request submitted successfully.');
      setProductId('');
      setQuantity('');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit request.');
    }
  }

  async function handleConfirmReceipt(request_id) {
    setError('');
    try {
      await api.put(`/stock-requests/${request_id}/confirm-receipt`);
      setSuccess('Receipt confirmed. Your inventory has been updated.');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to confirm receipt.');
    }
  }

  function statusColor(status) {
    if (status === 'pending') return '#fff3cd';
    if (status === 'approved') return '#d4edda';
    if (status === 'rejected') return '#f8d7da';
    if (status === 'fulfilled') return '#d1ecf1';
    return '#eee';
  }

  const selectedAvailable = productId ? getAvailableQty(productId) : null;

  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif', maxWidth: 900, margin: '0 auto' }}>
      <Link to="/store">&larr; Back to Dashboard</Link>
      <h1>Stock Request</h1>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}

      <h3>Warehouse Stock Available</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #333', textAlign: 'left' }}>
            <th style={{ padding: 8 }}>Product ID</th>
            <th style={{ padding: 8 }}>Product</th>
            <th style={{ padding: 8 }}>Available at Warehouse</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.product_id} style={{ borderBottom: '1px solid #ddd' }}>
              <td style={{ padding: 8, fontFamily: 'monospace' }}>{p.product_id}</td>
              <td style={{ padding: 8 }}>{p.product_name} {p.size ? `(${p.size})` : ''} {p.color ? `- ${p.color}` : ''}</td>
              <td style={{ padding: 8 }}>{getAvailableQty(p.product_id)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>New Request</h3>
      <form onSubmit={handleSubmit} style={{ marginBottom: 32, padding: 16, border: '1px solid #ccc', borderRadius: 4 }}>
        <select
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          required
          style={{ padding: 6, marginRight: 8 }}
        >
          <option value="">Select a product</option>
          {products.map((p) => (
            <option key={p.product_id} value={p.product_id}>
              {p.product_id} — {p.product_name} {p.size ? `(${p.size})` : ''} {p.color ? `- ${p.color}` : ''} — {getAvailableQty(p.product_id)} available
            </option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Quantity"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          required
          min="1"
          style={{ padding: 6, marginRight: 8, width: 100 }}
        />
        <button type="submit" style={{ padding: '6px 16px' }}>Submit Request</button>
        {selectedAvailable !== null && (
          <p style={{ marginTop: 8, color: '#666' }}>
            {selectedAvailable} unit(s) currently available at the warehouse for this product.
          </p>
        )}
      </form>

      <h3>Past Requests + Status</h3>
      {loading ? (
        <p>Loading...</p>
      ) : requests.length === 0 ? (
        <p>No requests yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #333', textAlign: 'left' }}>
              <th style={{ padding: 8 }}>ID</th>
              <th style={{ padding: 8 }}>Product</th>
              <th style={{ padding: 8 }}>Quantity</th>
              <th style={{ padding: 8 }}>Date</th>
              <th style={{ padding: 8 }}>Status</th>
              <th style={{ padding: 8 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.request_id} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: 8 }}>{r.request_id}</td>
                <td style={{ padding: 8 }}>{r.Product?.product_name}</td>
                <td style={{ padding: 8 }}>{r.quantity}</td>
                <td style={{ padding: 8 }}>{new Date(r.request_date).toLocaleDateString()}</td>
                <td style={{ padding: 8 }}>
                  <span style={{ background: statusColor(r.status), padding: '2px 8px', borderRadius: 4 }}>
                    {r.status}
                  </span>
                </td>
                <td style={{ padding: 8 }}>
                  {r.status === 'approved' && (
                    <button onClick={() => handleConfirmReceipt(r.request_id)}>Confirm Receipt</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}