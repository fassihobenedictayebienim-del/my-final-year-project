import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

export default function ShipmentPage() {
  const { showToast } = useToast();
  const [inventory, setInventory] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [variantId, setVariantId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [dateReceived, setDateReceived] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [inventoryRes, shipmentsRes] = await Promise.all([api.get('/inventory'), api.get('/shipments')]);
      setInventory(inventoryRes.data.inventory);
      setShipments(shipmentsRes.data.shipments);
    } catch (err) {
      showToast('Failed to load data.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const response = await api.post('/shipments', { variant_id: variantId, quantity, date_received: dateReceived });
      showToast(`Shipment recorded — new quantity: ${response.data.new_warehouse_quantity}.`);
      setVariantId('');
      setQuantity('');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to record shipment.', 'error');
    }
  }

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>Record Shipment</h1>
          <p>Restock an existing colour/size variant. To add a brand-new product or variant, use Product Management.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="form-card">
        <div className="form-row">
          <select className="form-input" value={variantId} onChange={(e) => setVariantId(e.target.value)} required style={{ flex: 1 }}>
            <option value="">Select a variant</option>
            {inventory.map((row) => (
              <option key={row.variant_id} value={row.variant_id}>
                {row.ProductVariant.Product.product_name} — {row.ProductVariant.color} / {row.ProductVariant.size} — currently {row.quantity}
              </option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <input className="form-input" type="number" placeholder="Quantity received" value={quantity} onChange={(e) => setQuantity(e.target.value)} required min="1" style={{ flex: 1 }} />
          <input className="form-input" type="date" value={dateReceived} onChange={(e) => setDateReceived(e.target.value)} style={{ flex: 1 }} />
        </div>
        <button type="submit" className="btn btn-primary">Record Shipment</button>
      </form>

      <h3>Shipment History</h3>
      {loading ? <p>Loading...</p> : shipments.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)' }}>No shipments recorded yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Product</th><th>Colour</th><th>Size</th><th>Quantity</th><th>Date Received</th></tr></thead>
            <tbody>
              {shipments.map((s) => (
                <tr key={s.shipment_id}>
                  <td>{s.ProductVariant?.Product?.product_name}</td>
                  <td>{s.ProductVariant?.color}</td>
                  <td>{s.ProductVariant?.size}</td>
                  <td>{s.quantity}</td>
                  <td>{new Date(s.date_received).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}