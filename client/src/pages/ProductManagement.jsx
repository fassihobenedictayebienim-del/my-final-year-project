import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function ProductManagement() {
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    product_id: '', product_name: '', size: '', color: '', unit_price: '', reorder_level: '', initial_quantity: '',
  });

  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [productsRes, inventoryRes] = await Promise.all([
        api.get('/products'),
        api.get('/inventory'),
      ]);
      setProducts(productsRes.data.products);
      setInventory(inventoryRes.data.inventory);
    } catch (err) {
      setError('Failed to load products.');
    } finally {
      setLoading(false);
    }
  }

  function getQuantity(product_id) {
    const row = inventory.find((i) => i.product_id === product_id);
    return row ? row.quantity : 0;
  }

  async function handleAddProduct(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const response = await api.post('/products', formData);
      setSuccess(response.data.message);
      setFormData({ product_id: '', product_name: '', size: '', color: '', unit_price: '', reorder_level: '', initial_quantity: '' });
      setShowForm(false);
      fetchData();
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
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update product.');
    }
  }

  async function handleDelete(product_id) {
    if (!window.confirm('Delete this product? This cannot be undone.')) return;
    try {
      await api.delete(`/products/${product_id}`);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete product.');
    }
  }

  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif', maxWidth: 950, margin: '0 auto' }}>
      <Link to="/warehouse">&larr; Back to Dashboard</Link>
      <h1>Product Management</h1>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}

      <button onClick={() => setShowForm(!showForm)} style={{ marginBottom: 16, padding: '8px 16px' }}>
        {showForm ? 'Cancel' : '+ Add New Product'}
      </button>

      {showForm && (
        <form onSubmit={handleAddProduct} style={{ marginBottom: 24, padding: 16, border: '1px solid #ccc', borderRadius: 4 }}>
          <div style={{ marginBottom: 8 }}>
            <input
              placeholder="Product ID (printed on packaging, e.g. YD77B)"
              value={formData.product_id}
              onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
              required
              style={{ padding: 6, marginRight: 8, width: 240 }}
            />
            <input
              placeholder="Product name"
              value={formData.product_name}
              onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
              required
              style={{ padding: 6, marginRight: 8 }}
            />
          </div>
          <div style={{ marginBottom: 8 }}>
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
          <div style={{ marginBottom: 8 }}>
            <input
              type="number"
              placeholder="Quantity received now (optional)"
              value={formData.initial_quantity}
              onChange={(e) => setFormData({ ...formData, initial_quantity: e.target.value })}
              style={{ padding: 6, marginRight: 8, width: 220 }}
            />
          </div>
          <p style={{ color: '#666', fontSize: 13 }}>
            If you're registering this product because a shipment just arrived, enter the quantity received above —
            this will be recorded as the product's first shipment. Leave blank to register the product with 0 stock
            (e.g. if you're setting it up ahead of the actual delivery).
          </p>
          <button type="submit" style={{ padding: '6px 16px' }}>Save Product</button>
        </form>
      )}

      {loading ? (
        <p>Loading products...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #333', textAlign: 'left' }}>
              <th style={{ padding: 8 }}>Product ID</th>
              <th style={{ padding: 8 }}>Name</th>
              <th style={{ padding: 8 }}>Size</th>
              <th style={{ padding: 8 }}>Color</th>
              <th style={{ padding: 8 }}>Unit Price</th>
              <th style={{ padding: 8 }}>Warehouse Qty</th>
              <th style={{ padding: 8 }}>Reorder Level</th>
              <th style={{ padding: 8 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const qty = getQuantity(p.product_id);
              const isLow = qty <= p.reorder_level;
              return (
                <tr key={p.product_id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: 8, fontFamily: 'monospace' }}>{p.product_id}</td>
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
                      <td style={{ padding: 8 }}>{qty}</td>
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
                      <td style={{ padding: 8, color: isLow ? 'red' : 'inherit', fontWeight: isLow ? 'bold' : 'normal' }}>
                        {qty} {isLow && '⚠️'}
                      </td>
                      <td style={{ padding: 8 }}>{p.reorder_level}</td>
                      <td style={{ padding: 8 }}>
                        <button onClick={() => startEdit(p)} style={{ marginRight: 4 }}>Edit</button>
                        <button onClick={() => handleDelete(p.product_id)}>Delete</button>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}