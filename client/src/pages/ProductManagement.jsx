import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function ProductManagement() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // form state for adding a new product
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    product_name: '', size: '', color: '', unit_price: '', reorder_level: '',
  });

  // track which product is currently being edited (by product_id), or null
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    setLoading(true);
    try {
      const response = await api.get('/products');
      setProducts(response.data.products);
    } catch (err) {
      setError('Failed to load products.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddProduct(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/products', formData);
      setFormData({ product_name: '', size: '', color: '', unit_price: '', reorder_level: '' });
      setShowForm(false);
      fetchProducts();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add product.');
    }
  }

  function startEdit(product) {
    setEditingId(product.product_id);
    setEditData({
      product_name: product.product_name,
      size: product.size || '',
      color: product.color || '',
      unit_price: product.unit_price,
      reorder_level: product.reorder_level,
    });
  }

  async function handleSaveEdit(product_id) {
    try {
      await api.put(`/products/${product_id}`, editData);
      setEditingId(null);
      fetchProducts();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update product.');
    }
  }

  async function handleDelete(product_id) {
    if (!window.confirm('Delete this product? This cannot be undone.')) return;
    try {
      await api.delete(`/products/${product_id}`);
      fetchProducts();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete product.');
    }
  }

  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif', maxWidth: 900, margin: '0 auto' }}>
      <Link to="/warehouse">&larr; Back to Dashboard</Link>
      <h1>Product Management</h1>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <button onClick={() => setShowForm(!showForm)} style={{ marginBottom: 16, padding: '8px 16px' }}>
        {showForm ? 'Cancel' : '+ Add New Product'}
      </button>

      {showForm && (
        <form onSubmit={handleAddProduct} style={{ marginBottom: 24, padding: 16, border: '1px solid #ccc', borderRadius: 4 }}>
          <div style={{ marginBottom: 8 }}>
            <input
              placeholder="Product name"
              value={formData.product_name}
              onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
              required
              style={{ padding: 6, marginRight: 8 }}
            />
            <input
              placeholder="Size (e.g. 37-42)"
              value={formData.size}
              onChange={(e) => setFormData({ ...formData, size: e.target.value })}
              style={{ padding: 6, marginRight: 8 }}
            />
            <input
              placeholder="Color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              style={{ padding: 6, marginRight: 8 }}
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <input
              type="number"
              step="0.01"
              placeholder="Unit price (GHS)"
              value={formData.unit_price}
              onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
              required
              style={{ padding: 6, marginRight: 8 }}
            />
            <input
              type="number"
              placeholder="Reorder level"
              value={formData.reorder_level}
              onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
              style={{ padding: 6, marginRight: 8 }}
            />
          </div>
          <button type="submit" style={{ padding: '6px 16px' }}>Save Product</button>
        </form>
      )}

      {loading ? (
        <p>Loading products...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #333', textAlign: 'left' }}>
              <th style={{ padding: 8 }}>ID</th>
              <th style={{ padding: 8 }}>Name</th>
              <th style={{ padding: 8 }}>Size</th>
              <th style={{ padding: 8 }}>Color</th>
              <th style={{ padding: 8 }}>Unit Price</th>
              <th style={{ padding: 8 }}>Reorder Level</th>
              <th style={{ padding: 8 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.product_id} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: 8 }}>{p.product_id}</td>
                {editingId === p.product_id ? (
                  <>
                    <td style={{ padding: 8 }}>
                      <input value={editData.product_name} onChange={(e) => setEditData({ ...editData, product_name: e.target.value })} style={{ width: 100 }} />
                    </td>
                    <td style={{ padding: 8 }}>
                      <input value={editData.size} onChange={(e) => setEditData({ ...editData, size: e.target.value })} style={{ width: 60 }} />
                    </td>
                    <td style={{ padding: 8 }}>
                      <input value={editData.color} onChange={(e) => setEditData({ ...editData, color: e.target.value })} style={{ width: 60 }} />
                    </td>
                    <td style={{ padding: 8 }}>
                      <input type="number" step="0.01" value={editData.unit_price} onChange={(e) => setEditData({ ...editData, unit_price: e.target.value })} style={{ width: 70 }} />
                    </td>
                    <td style={{ padding: 8 }}>
                      <input type="number" value={editData.reorder_level} onChange={(e) => setEditData({ ...editData, reorder_level: e.target.value })} style={{ width: 60 }} />
                    </td>
                    <td style={{ padding: 8 }}>
                      <button onClick={() => handleSaveEdit(p.product_id)} style={{ marginRight: 4 }}>Save</button>
                      <button onClick={() => setEditingId(null)}>Cancel</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ padding: 8 }}>{p.product_name}</td>
                    <td style={{ padding: 8 }}>{p.size}</td>
                    <td style={{ padding: 8 }}>{p.color}</td>
                    <td style={{ padding: 8 }}>GHS {Number(p.unit_price).toFixed(2)}</td>
                    <td style={{ padding: 8 }}>{p.reorder_level}</td>
                    <td style={{ padding: 8 }}>
                      <button onClick={() => startEdit(p)} style={{ marginRight: 4 }}>Edit</button>
                      <button onClick={() => handleDelete(p.product_id)}>Delete</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}