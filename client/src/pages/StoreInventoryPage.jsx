import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

export default function StoreInventoryPage() {
  const { showToast } = useToast();
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedProduct, setExpandedProduct] = useState(null);
  const [editingReorder, setEditingReorder] = useState(null);
  const [reorderValue, setReorderValue] = useState('');

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const response = await api.get('/inventory/summary');
      setSummary(response.data.summary);
    } catch (err) {
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

  function variantBadge(qty) {
    if (qty === 0) return <span className="stock-badge out-of-stock">🔴 Out</span>;
    if (qty <= 5) return <span className="stock-badge low-stock">🟠 Low</span>;
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

      {loading ? <p>Loading...</p> : filtered.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)' }}>{summary.length === 0 ? 'No stock recorded at your store yet.' : 'No products match your search.'}</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Product</th><th>Total Stock</th><th>Reorder Level</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map((row) => (
                <>
                  <tr key={row.product_id}>
                    <td>{row.product_name}</td>
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
                      <td colSpan={5} style={{ background: 'var(--color-bg)', padding: 16 }}>
                        <table className="data-table">
                          <thead><tr><th>Colour</th><th>Size</th><th>Quantity</th><th>Status</th></tr></thead>
                          <tbody>
                            {row.variants.map((v) => (
                              <tr key={v.variant_id}>
                                <td>{v.color}</td>
                                <td>{v.size}</td>
                                <td>{v.quantity}</td>
                                <td>{variantBadge(v.quantity)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
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