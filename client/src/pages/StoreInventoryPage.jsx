import { Fragment, useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import { formatCurrency } from '../utils/currency';

export default function StoreInventoryPage() {
  const { showToast } = useToast();
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedProduct, setExpandedProduct] = useState(null);
  const [editingReorder, setEditingReorder] = useState(null);
  const [reorderValue, setReorderValue] = useState('');
  const [editingVariantReorder, setEditingVariantReorder] = useState(null);
  const [variantReorderValue, setVariantReorderValue] = useState('');

  // eslint-disable-next-line react-hooks/exhaustive-deps -- Load store inventory once when the page opens.
  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const response = await api.get('/inventory/summary');
      setSummary(response.data.summary);
    } catch (_err) {
      showToast('Failed to load your store inventory.', 'error');
    } finally {
      setLoading(false);
    }
  }

  function statusBadge(status) {
    if (status === 'out') return <span className="stock-badge out-of-stock">🔴 Out of Stock</span>;
    if (status === 'low') return <span className="stock-badge low-stock">🟠 Reorder Required</span>;
    return <span className="stock-badge in-stock">🟢 In Stock</span>;
  }

  function variantBadge(qty, reorderLevel) {
    if (qty === 0) return <span className="stock-badge out-of-stock">🔴 Out</span>;
    if (reorderLevel > 0 && qty <= reorderLevel) return <span className="stock-badge low-stock">🟠 Low</span>;
    return <span className="stock-badge in-stock">🟢 OK</span>;
  }

  function startEditReorder(product_id, currentLevel) {
    setEditingReorder(product_id);
    setReorderValue(currentLevel);
  }

  async function saveReorderLevel(product_id) {
    try {
      await api.put(`/inventory/reorder-level/${product_id}`, { reorder_level: reorderValue });
      showToast('Reorder level updated.');
      setEditingReorder(null);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update reorder level.', 'error');
    }
  }

  function startEditVariantReorder(variant) {
    setEditingVariantReorder(variant.variant_id);
    setVariantReorderValue(variant.reorder_level);
  }

  async function saveVariantReorder(variant_id) {
    try {
      await api.put(`/inventory/variant-reorder-level/${variant_id}`, { reorder_level: Number(variantReorderValue) });
      setEditingVariantReorder(null);
      fetchData();
      showToast('Variant reorder level updated.');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update the variant reorder level.', 'error');
    }
  }

  const filtered = summary.filter((row) => row.product_name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>My Store Inventory</h1>
          <p>Everything currently in stock at your store, with reorder levels.</p>
        </div>
      </div>

      <div className="form-row" style={{ marginBottom: 16 }}>
        <input
          className="form-input"
          placeholder="Search by product name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%', maxWidth: 320 }}
        />
      </div>

      {loading ? (
        <div className="loading-row"><span className="spinner" style={{ borderTopColor: 'var(--color-primary)', borderColor: 'var(--color-border)' }} /> Loading your inventory...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">📦</span>
          {summary.length === 0 ? 'No stock recorded at your store yet.' : 'No products match your search.'}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Product</th><th>Unit Price</th><th>Total Stock</th><th>Reorder Level</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map((row) => (
                <Fragment key={row.product_id}>
                  <tr>
                    <td>{row.product_name}</td>
                    <td>{formatCurrency(row.unit_price)}</td>
                    <td>{row.total_quantity}</td>
                    <td>
                      {editingReorder === row.product_id ? (
                        <input className="form-input" type="number" min="0" value={reorderValue} onChange={(e) => setReorderValue(e.target.value)} style={{ width: 80 }} />
                      ) : row.reorder_level}
                    </td>
                    <td>{statusBadge(row.status)}</td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn btn-sm" onClick={() => setExpandedProduct(expandedProduct === row.product_id ? null : row.product_id)}>
                          {expandedProduct === row.product_id ? 'Hide Variants' : 'View Variants'}
                        </button>
                        {editingReorder === row.product_id ? (
                          <>
                            <button className="btn btn-sm btn-success" onClick={() => saveReorderLevel(row.product_id)}>Save</button>
                            <button className="btn btn-sm" onClick={() => setEditingReorder(null)}>Cancel</button>
                          </>
                        ) : (
                          <button className="btn btn-sm" onClick={() => startEditReorder(row.product_id, row.reorder_level)}>Set Reorder Level</button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedProduct === row.product_id && (
                    <tr>
                      <td colSpan={6} style={{ background: 'var(--color-bg)', padding: 16 }}>
                        <table className="data-table">
                          <thead><tr><th>Colour</th><th>Size</th><th>Unit Price</th><th>Quantity</th><th>Variant Reorder Level</th><th>Status</th><th>Actions</th></tr></thead>
                          <tbody>
                            {row.variants.map((v) => (
                              <tr key={v.variant_id}>
                                <td>{v.color}</td>
                                <td>{v.size}</td>
                                <td>{formatCurrency(v.unit_price)}</td>
                                <td>{v.quantity}</td>
                                <td>
                                  {editingVariantReorder === v.variant_id ? (
                                    <input className="form-input" type="number" min="0" value={variantReorderValue} onChange={(e) => setVariantReorderValue(e.target.value)} style={{ width: 80 }} />
                                  ) : v.reorder_level}
                                </td>
                                <td>{variantBadge(v.quantity, v.reorder_level)}</td>
                                <td>
                                  {editingVariantReorder === v.variant_id ? (
                                    <div className="action-buttons">
                                      <button className="btn btn-sm btn-success" onClick={() => saveVariantReorder(v.variant_id)}>Save</button>
                                      <button className="btn btn-sm" onClick={() => setEditingVariantReorder(null)}>Cancel</button>
                                    </div>
                                  ) : <button className="btn btn-sm" onClick={() => startEditVariantReorder(v)}>Set Reorder Level</button>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
