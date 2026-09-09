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

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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

  const filteredShipments = shipments.filter((s) => {
    const d = new Date(s.date_received);
    if (startDate && d < new Date(startDate)) return false;
    if (endDate && d > new Date(endDate + 'T23:59:59')) return false;
    return true;
  });

  function clearFilter() { setStartDate(''); setEndDate(''); }

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
      <div className="form-row" style={{ alignItems: 'center', marginBottom: 16 }}>
        <label style={{ fontSize: 13 }}>From <input type="date" className="form-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
        <label style={{ fontSize: 13 }}>To <input type="date" className="form-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></label>
        <button type="button" className="btn btn-sm" onClick={clearFilter}>Clear</button>
        <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{filteredShipments.length} of {shipments.length} shown</span>
      </div>

      {loading ? <p>Loading...</p> : filteredShipments.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)' }}>{shipments.length === 0 ? 'No shipments recorded yet.' : 'No shipments in this date range.'}</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Product</th><th>Colour</th><th>Size</th><th>Quantity</th><th>Date Received</th></tr></thead>
            <tbody>
              {filteredShipments.map((s) => (
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