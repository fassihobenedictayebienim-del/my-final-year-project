import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

export default function StockRequestPage() {
  const { showToast } = useToast();
  const [warehouseStock, setWarehouseStock] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const [variantId, setVariantId] = useState('');
  const [quantity, setQuantity] = useState('');

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [stockRes, requestsRes] = await Promise.all([
        api.get('/inventory/warehouse-stock'), api.get('/stock-requests'),
      ]);
      setWarehouseStock(stockRes.data.inventory);
      setRequests(requestsRes.data.requests);
    } catch (err) {
      showToast('Failed to load data.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await api.post('/stock-requests', { variant_id: variantId, quantity });
      showToast('Stock request submitted.');
      setVariantId('');
      setQuantity('');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit request.', 'error');
    }
  }

  async function handleConfirmReceipt(request_id) {
    try {
      await api.put(`/stock-requests/${request_id}/confirm-receipt`);
      showToast('Stock transfer completed.');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to confirm receipt.', 'error');
    }
  }

  const selectedRow = warehouseStock.find((r) => String(r.variant_id) === String(variantId));

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>Stock Request</h1>
          <p>Request a specific colour/size from the warehouse and track your past requests.</p>
        </div>
      </div>

      <h3>Warehouse Stock Available</h3>
      <div className="table-wrap" style={{ marginBottom: 24 }}>
        <table className="data-table">
          <thead><tr><th>Product</th><th>Colour</th><th>Size</th><th>Available at Warehouse</th></tr></thead>
          <tbody>
            {warehouseStock.map((row) => (
              <tr key={row.variant_id}>
                <td>{row.ProductVariant.Product.product_name}</td>
                <td>{row.ProductVariant.color}</td>
                <td>{row.ProductVariant.size}</td>
                <td>{row.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>New Request</h3>
      <form onSubmit={handleSubmit} className="form-card">
        <div className="form-row">
          <select className="form-input" value={variantId} onChange={(e) => setVariantId(e.target.value)} required style={{ flex: 1 }}>
            <option value="">Select colour / size</option>
            {warehouseStock.map((row) => (
              <option key={row.variant_id} value={row.variant_id}>
                {row.ProductVariant.Product.product_name} — {row.ProductVariant.color} / {row.ProductVariant.size} — {row.quantity} available
              </option>
            ))}
          </select>
          <input className="form-input" type="number" placeholder="Quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)} required min="1" style={{ width: 120 }} />
          <button type="submit" className="btn btn-primary">Submit Request</button>
        </div>
        {selectedRow && <p className="form-hint">{selectedRow.quantity} unit(s) currently available at the warehouse for this exact variant.</p>}
      </form>

      <h3>Past Requests + Status</h3>
      {loading ? <p>Loading...</p> : requests.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)' }}>No requests yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>ID</th><th>Product</th><th>Colour</th><th>Size</th><th>Quantity</th><th>Date</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.request_id}>
                  <td>{r.request_id}</td>
                  <td>{r.ProductVariant?.Product?.product_name}</td>
                  <td>{r.ProductVariant?.color}</td>
                  <td>{r.ProductVariant?.size}</td>
                  <td>{r.quantity}</td>
                  <td>{new Date(r.request_date).toLocaleDateString()}</td>
                  <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                  <td>{r.status === 'approved' && <button className="btn btn-sm btn-success" onClick={() => handleConfirmReceipt(r.request_id)}>Confirm Receipt</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}