import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function ShipmentPage() {
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [dateReceived, setDateReceived] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [productsRes, inventoryRes, shipmentsRes] = await Promise.all([
        api.get('/products'),
        api.get('/inventory'),
        api.get('/shipments'),
      ]);
      setProducts(productsRes.data.products);
      setInventory(inventoryRes.data.inventory);
      setShipments(shipmentsRes.data.shipments);
    } catch (err) {
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  }

  function getQuantity(product_id) {
    const row = inventory.find((i) => i.product_id === product_id);
    return row ? row.quantity : 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const response = await api.post('/shipments', {
        product_id: productId,
        quantity,
        date_received: dateReceived,
      });
      setSuccess(`Shipment recorded. Warehouse quantity for this product is now ${response.data.new_warehouse_quantity}.`);
      setProductId('');
      setQuantity('');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record shipment.');
    }
  }

  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif', maxWidth: 900, margin: '0 auto' }}>
      <Link to="/warehouse">&larr; Back to Dashboard</Link>
      <h1>Record Shipment</h1>
      <p style={{ color: '#666' }}>
        Use this when a shipment arrives for a product already in the system. To register a brand-new product for the
        first time, use Product Management instead.
      </p>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}

      <form onSubmit={handleSubmit} style={{ marginBottom: 32, padding: 16, border: '1px solid #ccc', borderRadius: 4 }}>
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
                {p.product_id} — {p.product_name} {p.size ? `(${p.size})` : ''} {p.color ? `- ${p.color}` : ''} — currently {getQuantity(p.product_id)} in warehouse
              </option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: 8, display: 'flex', gap: 8 }}>
          <input
            type="number"
            placeholder="Quantity received"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
            min="1"
            style={{ padding: 6, flex: 1 }}
          />
          <input
            type="date"
            value={dateReceived}
            onChange={(e) => setDateReceived(e.target.value)}
            style={{ padding: 6, flex: 1 }}
          />
        </div>
        <button type="submit" style={{ padding: '8px 16px' }}>Record Shipment</button>
      </form>

      <h3>Shipment History</h3>
      {loading ? (
        <p>Loading...</p>
      ) : shipments.length === 0 ? (
        <p style={{ color: '#666' }}>No shipments recorded yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #333', textAlign: 'left' }}>
              <th style={{ padding: 8 }}>Product ID</th>
              <th style={{ padding: 8 }}>Product</th>
              <th style={{ padding: 8 }}>Quantity</th>
              <th style={{ padding: 8 }}>Date Received</th>
            </tr>
          </thead>
          <tbody>
            {shipments.map((s) => (
              <tr key={s.shipment_id} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: 8, fontFamily: 'monospace' }}>{s.product_id}</td>
                <td style={{ padding: 8 }}>{s.Product?.product_name}</td>
                <td style={{ padding: 8 }}>{s.quantity}</td>
                <td style={{ padding: 8 }}>{new Date(s.date_received).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}