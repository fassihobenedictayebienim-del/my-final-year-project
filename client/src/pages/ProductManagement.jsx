import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

export default function ProductManagement() {
  const { showToast } = useToast();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [productData, setProductData] = useState({ product_id: '', product_name: '', unit_price: '', reorder_level: '' });
  const [variantRows, setVariantRows] = useState([{ color: '', size: '', quantity: '' }]);

  const [expandedProduct, setExpandedProduct] = useState(null);
  const [variantDetail, setVariantDetail] = useState({});
  const [newVariant, setNewVariant] = useState({ color: '', size: '' });

  useEffect(() => { fetchProducts(); }, []);

  async function fetchProducts() {
    setLoading(true);
    try {
      const response = await api.get('/products');
      setProducts(response.data.products);
    } catch (err) {
      showToast('Failed to load products.', 'error');
    } finally {
      setLoading(false);
    }
  }

  function addVariantRow() {
    setVariantRows([...variantRows, { color: '', size: '', quantity: '' }]);
  }
  function removeVariantRow(index) {
    setVariantRows(variantRows.filter((_, i) => i !== index));
  }
  function updateVariantRow(index, field, value) {
    const updated = [...variantRows];
    updated[index][field] = value;
    setVariantRows(updated);
  }

  const totalFromVariants = variantRows.reduce((sum, v) => sum + (Number(v.quantity) || 0), 0);

  async function handleCreateProduct(e) {
    e.preventDefault();
    const cleanVariants = variantRows.filter((v) => v.color.trim() && v.size.trim());
    if (cleanVariants.length === 0) {
      showToast('Add at least one variant with a colour and size.', 'error');
      return;
    }
    try {
      const response = await api.post('/products', { ...productData, variants: cleanVariants });
      showToast(response.data.message);
      setProductData({ product_id: '', product_name: '', unit_price: '', reorder_level: '' });
      setVariantRows([{ color: '', size: '', quantity: '' }]);
      setShowForm(false);
      fetchProducts();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create product.', 'error');
    }
  }

  async function toggleExpand(product_id) {
    if (expandedProduct === product_id) {
      setExpandedProduct(null);
      return;
    }
    setExpandedProduct(product_id);
    if (!variantDetail[product_id]) {
      try {
        const response = await api.get(`/products/${product_id}/variants`);
        setVariantDetail((prev) => ({ ...prev, [product_id]: response.data.variants }));
      } catch (err) {
        showToast('Failed to load variants.', 'error');
      }
    }
  }

  async function handleAddVariant(product_id) {
    if (!newVariant.color.trim() || !newVariant.size.trim()) {
      showToast('Enter both a colour and a size.', 'error');
      return;
    }
    try {
      await api.post(`/products/${product_id}/variants`, newVariant);
      showToast('Variant added successfully.');
      setNewVariant({ color: '', size: '' });
      const response = await api.get(`/products/${product_id}/variants`);
      setVariantDetail((prev) => ({ ...prev, [product_id]: response.data.variants }));
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to add variant.', 'error');
    }
  }

  async function handleDeleteVariant(product_id, variant_id) {
    if (!window.confirm('Delete this variant? This cannot be undone.')) return;
    try {
      await api.delete(`/products/variants/${variant_id}`);
      showToast('Variant deleted successfully.');
      const response = await api.get(`/products/${product_id}/variants`);
      setVariantDetail((prev) => ({ ...prev, [product_id]: response.data.variants }));
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete variant.', 'error');
    }
  }

  async function handleDeleteProduct(product_id) {
    if (!window.confirm('Delete this product and all its variants? This cannot be undone.')) return;
    try {
      await api.delete(`/products/${product_id}`);
      showToast('Product deleted successfully.');
      fetchProducts();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete product.', 'error');
    }
  }

  function variantBadge(qty) {
    if (qty === 0) return <span className="stock-badge out-of-stock">🔴 Out</span>;
    if (qty <= 5) return <span className="stock-badge low-stock">🟠 Low</span>;
    return <span className="stock-badge in-stock">🟢 OK</span>;
  }

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>Product Management</h1>
          <p>Manage products and their colour/size variants.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add New Product'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreateProduct} className="form-card">
          <div className="form-row">
            <input className="form-input" placeholder="Product ID (e.g. P1021)" value={productData.product_id} onChange={(e) => setProductData({ ...productData, product_id: e.target.value })} required style={{ width: 200 }} />
            <input className="form-input" placeholder="Product name" value={productData.product_name} onChange={(e) => setProductData({ ...productData, product_name: e.target.value })} required style={{ flex: 1 }} />
          </div>
          <div className="form-row">
            <input className="form-input" type="number" step="0.01" placeholder="Unit price (GHS)" value={productData.unit_price} onChange={(e) => setProductData({ ...productData, unit_price: e.target.value })} required />
            <input className="form-input" type="number" placeholder="Warehouse reorder level" value={productData.reorder_level} onChange={(e) => setProductData({ ...productData, reorder_level: e.target.value })} />
          </div>

          <p className="form-hint" style={{ marginTop: 16 }}><strong>Variants received</strong> — add one row per colour/size combination physically counted from this shipment.</p>

          {variantRows.map((row, i) => (
            <div className="form-row" key={i}>
              <input className="form-input" placeholder="Colour" value={row.color} onChange={(e) => updateVariantRow(i, 'color', e.target.value)} style={{ width: 140 }} />
              <input className="form-input" placeholder="Size" value={row.size} onChange={(e) => updateVariantRow(i, 'size', e.target.value)} style={{ width: 100 }} />
              <input className="form-input" type="number" placeholder="Quantity" value={row.quantity} onChange={(e) => updateVariantRow(i, 'quantity', e.target.value)} style={{ width: 120 }} />
              {variantRows.length > 1 && (
                <button type="button" className="btn btn-sm btn-danger" onClick={() => removeVariantRow(i)}>Remove</button>
              )}
            </div>
          ))}
          <button type="button" className="btn btn-sm" onClick={addVariantRow} style={{ marginBottom: 12 }}>+ Add Variant Row</button>

          <p style={{ fontWeight: 700, margin: '4px 0 14px' }}>Total pairs from variants: {totalFromVariants}</p>

          <button type="submit" className="btn btn-primary">Save Product</button>
        </form>
      )}

      {loading ? <p>Loading products...</p> : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Product ID</th><th>Name</th><th>Unit Price</th><th>Actions</th></tr></thead>
            <tbody>
              {products.map((p) => (
                <>
                  <tr key={p.product_id}>
                    <td className="mono">{p.product_id}</td>
                    <td>{p.product_name}</td>
                    <td>GHS {Number(p.unit_price).toFixed(2)}</td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn btn-sm" onClick={() => toggleExpand(p.product_id)}>
                          {expandedProduct === p.product_id ? 'Hide Variants' : 'View Variants'}
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDeleteProduct(p.product_id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                  {expandedProduct === p.product_id && (
                    <tr>
                      <td colSpan={4} style={{ background: 'var(--color-bg)', padding: 16 }}>
                        {!variantDetail[p.product_id] ? <p>Loading variants...</p> : (
                          <>
                            <table className="data-table" style={{ marginBottom: 12 }}>
                              <thead><tr><th>Colour</th><th>Size</th><th>Quantity (your location)</th><th>Status</th><th>Actions</th></tr></thead>
                              <tbody>
                                {variantDetail[p.product_id].map((v) => (
                                  <tr key={v.variant_id}>
                                    <td>{v.color}</td>
                                    <td>{v.size}</td>
                                    <td>{v.quantity}</td>
                                    <td>{variantBadge(v.quantity)}</td>
                                    <td><button className="btn btn-sm btn-danger" onClick={() => handleDeleteVariant(p.product_id, v.variant_id)}>Delete</button></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <div className="form-row" style={{ alignItems: 'center' }}>
                              <input className="form-input" placeholder="New colour" value={newVariant.color} onChange={(e) => setNewVariant({ ...newVariant, color: e.target.value })} style={{ width: 140 }} />
                              <input className="form-input" placeholder="New size" value={newVariant.size} onChange={(e) => setNewVariant({ ...newVariant, size: e.target.value })} style={{ width: 100 }} />
                              <button className="btn btn-sm btn-primary" onClick={() => handleAddVariant(p.product_id)}>+ Add Variant</button>
                            </div>
                            <p className="form-hint">New variants start at 0 — use Record Shipment to bring in stock for them.</p>
                          </>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}