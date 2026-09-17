import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import { formatCurrency } from '../utils/currency';

const today = () => new Date().toISOString().slice(0, 10);
const reference = () => `SHP-${today().replaceAll('-', '')}-${String(Date.now()).slice(-6)}`;
const dateLabel = (value) => new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString();

export default function ShipmentPage() {
  const { showToast } = useToast();
  const [products, setProducts] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productVariants, setProductVariants] = useState([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [quantities, setQuantities] = useState({});
  const [batchItems, setBatchItems] = useState([]);
  const [shipmentReference, setShipmentReference] = useState(reference);
  const [dateReceived, setDateReceived] = useState(today);
  const [newColor, setNewColor] = useState('');
  const [newSize, setNewSize] = useState('');
  const [newQuantity, setNewQuantity] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedHistory, setExpandedHistory] = useState({});

  useEffect(() => {
    let current = true;

    async function loadInitialData() {
      try {
        const [productsResponse, shipmentsResponse] = await Promise.all([
          api.get('/products'),
          api.get('/shipments'),
        ]);
        if (!current) return;
        setProducts(productsResponse.data.products || []);
        setShipments(shipmentsResponse.data.shipments || []);
      } catch {
        if (current) showToast('Failed to load shipment data.', 'error');
      } finally {
        if (current) setLoading(false);
      }
    }

    loadInitialData();
    return () => { current = false; };
  }, [showToast]);

  async function refreshShipments() {
    const response = await api.get('/shipments');
    setShipments(response.data.shipments || []);
  }

  async function chooseProduct(product) {
    setSelectedProduct(product);
    setProductVariants([]);
    setQuantities({});
    setNewColor('');
    setNewSize('');
    setNewQuantity('');
    setLoadingVariants(true);

    try {
      const response = await api.get(`/products/${product.product_id}/variants`);
      setProductVariants(response.data.variants || []);
    } catch {
      showToast('Failed to load this product’s variants.', 'error');
    } finally {
      setLoadingVariants(false);
    }
  }

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) => [product.product_id, product.product_name]
      .join(' ').toLowerCase().includes(query));
  }, [products, search]);

  function addExistingVariants() {
    const lines = productVariants
      .map((variant) => ({ ...variant, quantity: Number(quantities[variant.variant_id] || 0) }))
      .filter((variant) => Number.isInteger(variant.quantity) && variant.quantity > 0);

    if (!lines.length) {
      showToast('Enter a shipment quantity for at least one variant.', 'error');
      return;
    }

    setBatchItems((items) => {
      const nextItems = [...items];
      lines.forEach((line) => {
        const position = nextItems.findIndex((item) => item.variant_id === line.variant_id);
        const item = {
          variant_id: line.variant_id,
          product_id: selectedProduct.product_id,
          product_name: selectedProduct.product_name,
          color: line.color,
          size: line.size,
          quantity: line.quantity,
        };
        if (position >= 0) nextItems[position] = { ...nextItems[position], quantity: nextItems[position].quantity + line.quantity };
        else nextItems.push(item);
      });
      return nextItems;
    });
    setQuantities({});
    showToast(`${lines.length} variant(s) added to the current shipment.`);
  }

  function addNewVariant() {
    const quantity = Number(newQuantity);
    const color = newColor.trim();
    const size = newSize.trim();
    if (!color || !size) return showToast('Enter both a colour and a size.', 'error');
    if (!Number.isInteger(quantity) || quantity <= 0) return showToast('Quantity must be a positive whole number.', 'error');

    const existsInCatalog = productVariants.some((variant) => (
      variant.color.toLowerCase() === color.toLowerCase() && variant.size.toLowerCase() === size.toLowerCase()
    ));
    const existsInBatch = batchItems.some((item) => (
      !item.variant_id && item.product_id === selectedProduct.product_id
      && item.color.toLowerCase() === color.toLowerCase() && item.size.toLowerCase() === size.toLowerCase()
    ));
    if (existsInCatalog || existsInBatch) return showToast('That colour and size already exists. Enter its quantity in the table above.', 'error');

    setBatchItems((items) => [...items, {
      product_id: selectedProduct.product_id,
      product_name: selectedProduct.product_name,
      color,
      size,
      quantity,
    }]);
    setNewColor('');
    setNewSize('');
    setNewQuantity('');
    showToast('New variant added to the current shipment.');
  }

  async function recordShipment(event) {
    event.preventDefault();
    if (!batchItems.length) return showToast('Add at least one item before recording the shipment.', 'error');
    setSubmitting(true);
    try {
      const response = await api.post('/shipments/batch', {
        shipment_reference: shipmentReference,
        date_received: dateReceived,
        items: batchItems.map((item) => item.variant_id
          ? { variant_id: item.variant_id, quantity: item.quantity }
          : { product_id: item.product_id, color: item.color, size: item.size, quantity: item.quantity }),
      });
      showToast(`Shipment ${response.data.batch.shipment_reference} recorded successfully.`);
      setBatchItems([]);
      setShipmentReference(reference());
      setSelectedProduct(null);
      setProductVariants([]);
      setQuantities({});
      await refreshShipments();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to record the shipment.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  const filteredShipments = shipments.filter((shipment) => {
    const received = new Date(shipment.date_received);
    return (!startDate || received >= new Date(`${startDate}T00:00:00`))
      && (!endDate || received <= new Date(`${endDate}T23:59:59`));
  });

  const historyGroups = Object.values(filteredShipments.reduce((groups, shipment) => {
    const batch = shipment.ShipmentBatch;
    const dateKey = String(shipment.date_received).slice(0, 10);
    const key = batch ? `batch-${batch.shipment_batch_id}` : `date-${dateKey}`;
    if (!groups[key]) groups[key] = {
      key,
      date: batch?.date_received || shipment.date_received,
      title: batch ? `Shipment ${batch.shipment_reference}` : dateLabel(dateKey),
      subtitle: batch ? `Received ${dateLabel(batch.date_received)}` : 'Individual shipments recorded on this date',
      rows: [],
    };
    groups[key].rows.push(shipment);
    return groups;
  }, {})).sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>Record Shipment</h1>
          <p>Select a product, enter quantities for its variants, then record the full delivery once.</p>
        </div>
      </div>

      <form onSubmit={recordShipment} className="form-card" style={{ marginBottom: 28 }}>
        <div className="form-row">
          <div style={{ flex: 1 }}>
            <label className="form-label">Shipment Reference</label>
            <input className="form-input" value={shipmentReference} onChange={(event) => setShipmentReference(event.target.value)} required maxLength="50" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="form-label">Date Received</label>
            <input className="form-input" type="date" value={dateReceived} onChange={(event) => setDateReceived(event.target.value)} required style={{ width: '100%' }} />
          </div>
        </div>

        <label className="form-label">Find Product</label>
        <input className="form-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search product ID or product name" style={{ width: '100%', marginBottom: 12 }} />
        <div className="shipment-product-list">
          {visibleProducts.map((product) => (
            <button key={product.product_id} type="button" onClick={() => chooseProduct(product)} className={`shipment-product-option ${selectedProduct?.product_id === product.product_id ? 'selected' : ''}`}>
              <strong>{product.product_name}</strong>
              <span style={{ display: 'block', color: 'var(--color-text-muted)', fontSize: 12 }}>{product.product_id} · {formatCurrency(product.unit_price)}</span>
            </button>
          ))}
          {!visibleProducts.length && <div className="empty-state">No matching products found.</div>}
        </div>

        {selectedProduct && (
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 20 }}>
            <h3 style={{ marginTop: 0 }}>{selectedProduct.product_name}</h3>
            {loadingVariants ? <div className="loading-row">Loading variants...</div> : (
              <>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead><tr><th>Colour</th><th>Size</th><th>Current Quantity</th><th>Shipment Quantity</th></tr></thead>
                    <tbody>{productVariants.map((variant) => (
                      <tr key={variant.variant_id}>
                        <td>{variant.color}</td><td>{variant.size}</td><td>{variant.quantity}</td>
                        <td><input className="form-input" type="number" min="0" step="1" value={quantities[variant.variant_id] || ''} onChange={(event) => setQuantities((values) => ({ ...values, [variant.variant_id]: event.target.value }))} placeholder="0" /></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
                <button type="button" className="btn btn-secondary" onClick={addExistingVariants} style={{ marginTop: 12 }}>Add Entered Variants to Shipment</button>

                <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 22, paddingTop: 18 }}>
                  <h4>Add New Colour / Size</h4>
                  <div className="form-row" style={{ alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}><label className="form-label">Colour</label><input className="form-input" value={newColor} onChange={(event) => setNewColor(event.target.value)} /></div>
                    <div style={{ flex: 1 }}><label className="form-label">Size</label><input className="form-input" value={newSize} onChange={(event) => setNewSize(event.target.value)} /></div>
                    <div style={{ flex: 1 }}><label className="form-label">Shipment Quantity</label><input className="form-input" type="number" min="1" step="1" value={newQuantity} onChange={(event) => setNewQuantity(event.target.value)} /></div>
                    <button type="button" className="btn btn-secondary" onClick={addNewVariant}>Add New Variant</button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        <h3>Current Shipment</h3>
        {!batchItems.length ? <div className="empty-state">No variants added yet.</div> : (
          <div className="table-wrap"><table className="data-table"><thead><tr><th>Product</th><th>Colour</th><th>Size</th><th>Quantity</th><th>Action</th></tr></thead><tbody>
            {batchItems.map((item, index) => <tr key={item.variant_id || `new-${index}`}><td>{item.product_name}</td><td>{item.color}</td><td>{item.size}</td><td>{item.quantity}</td><td><button type="button" className="btn btn-sm btn-secondary" onClick={() => setBatchItems((items) => items.filter((_, position) => position !== index))}>Remove</button></td></tr>)}
          </tbody></table></div>
        )}
        <button type="submit" className="btn btn-primary" disabled={submitting || !batchItems.length} style={{ marginTop: 16 }}>{submitting ? 'Recording Shipment...' : `Record Shipment (${batchItems.length} Items)`}</button>
      </form>

      <h3>Shipment History</h3>
      <div className="form-row" style={{ alignItems: 'flex-end', marginBottom: 16 }}>
        <div><label className="form-label">From</label><input type="date" className="form-input" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></div>
        <div><label className="form-label">To</label><input type="date" className="form-input" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></div>
        <button type="button" className="btn btn-sm btn-secondary" onClick={() => { setStartDate(''); setEndDate(''); }}>Clear</button>
      </div>
      {loading ? <div className="loading-row">Loading shipments...</div> : !historyGroups.length ? <div className="empty-state">No shipments found.</div> : historyGroups.map((group) => {
        const total = group.rows.reduce((sum, row) => sum + Number(row.quantity), 0);
        const open = Boolean(expandedHistory[group.key]);
        return <div key={group.key} className="card" style={{ marginBottom: 12, padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: '14px 16px' }}><div><h4 style={{ margin: 0 }}>{group.title}</h4><small>{group.subtitle} · {group.rows.length} item(s) · Total: {total}</small></div><button type="button" className="btn btn-sm btn-secondary" onClick={() => setExpandedHistory((state) => ({ ...state, [group.key]: !state[group.key] }))}>{open ? 'Hide Items' : 'View Items'}</button></div>
          {open && <div style={{ borderTop: '1px solid var(--color-border)', padding: 16 }}><div className="table-wrap"><table className="data-table"><thead><tr><th>Product</th><th>Colour</th><th>Size</th><th>Quantity</th></tr></thead><tbody>{group.rows.map((row) => <tr key={row.shipment_id}><td>{row.ProductVariant?.Product?.product_name}</td><td>{row.ProductVariant?.color}</td><td>{row.ProductVariant?.size}</td><td>{row.quantity}</td></tr>)}</tbody></table></div></div>}
        </div>;
      })}
    </Layout>
  );
}
