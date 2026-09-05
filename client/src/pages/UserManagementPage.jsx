import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', role: 'store_manager', warehouse_id: '', store_id: '',
  });

  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const response = await api.get('/users');
      setUsers(response.data.users);
    } catch (err) {
      setError('Failed to load users.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const payload = { name: formData.name, email: formData.email, password: formData.password, role: formData.role };
      if (formData.role === 'warehouse_manager') payload.warehouse_id = formData.warehouse_id;
      if (formData.role === 'store_manager') payload.store_id = formData.store_id;

      await api.post('/auth/register', payload);
      setSuccess(`Account created for ${formData.name}.`);
      setFormData({ name: '', email: '', password: '', role: 'store_manager', warehouse_id: '', store_id: '' });
      setShowForm(false);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create account.');
    }
  }

  function startEdit(u) {
    setEditingId(u.user_id);
    setEditData({
      name: u.name,
      email: u.email,
      role: u.role,
      warehouse_id: u.warehouse_id || '',
      store_id: u.store_id || '',
    });
  }

  async function handleSaveEdit(user_id) {
    setError('');
    setSuccess('');
    try {
      const payload = { name: editData.name, email: editData.email, role: editData.role };
      if (editData.role === 'warehouse_manager') payload.warehouse_id = editData.warehouse_id;
      if (editData.role === 'store_manager') payload.store_id = editData.store_id;

      await api.put(`/users/${user_id}`, payload);
      setSuccess('User updated successfully.');
      setEditingId(null);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user.');
    }
  }

  function roleLabel(role) {
    if (role === 'administrator') return 'Administrator';
    if (role === 'warehouse_manager') return 'Warehouse Manager';
    if (role === 'store_manager') return 'Store Manager';
    return role;
  }

  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif', maxWidth: 950, margin: '0 auto' }}>
      <Link to="/admin">&larr; Back to Dashboard</Link>
      <h1>User Management</h1>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}

      <button onClick={() => setShowForm(!showForm)} style={{ marginBottom: 16, padding: '8px 16px' }}>
        {showForm ? 'Cancel' : '+ Add New User'}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ marginBottom: 24, padding: 16, border: '1px solid #ccc', borderRadius: 4 }}>
          <div style={{ marginBottom: 8 }}>
            <input
              placeholder="Full name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              style={{ padding: 6, marginRight: 8 }}
            />
            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              style={{ padding: 6, marginRight: 8 }}
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <input
              type="password"
              placeholder="Temporary password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              style={{ padding: 6, marginRight: 8 }}
            />
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              style={{ padding: 6, marginRight: 8 }}
            >
              <option value="store_manager">Store Manager</option>
              <option value="warehouse_manager">Warehouse Manager</option>
              <option value="administrator">Administrator</option>
            </select>
          </div>
          {formData.role === 'warehouse_manager' && (
            <div style={{ marginBottom: 8 }}>
              <input
                type="number"
                placeholder="Warehouse ID (e.g. 1)"
                value={formData.warehouse_id}
                onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
                required
                style={{ padding: 6 }}
              />
            </div>
          )}
          {formData.role === 'store_manager' && (
            <div style={{ marginBottom: 8 }}>
              <input
                type="number"
                placeholder="Store ID (1 or 2)"
                value={formData.store_id}
                onChange={(e) => setFormData({ ...formData, store_id: e.target.value })}
                required
                style={{ padding: 6 }}
              />
            </div>
          )}
          <button type="submit" style={{ padding: '6px 16px' }}>Create Account</button>
        </form>
      )}

      {loading ? (
        <p>Loading users...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #333', textAlign: 'left' }}>
              <th style={{ padding: 8 }}>Name</th>
              <th style={{ padding: 8 }}>Email</th>
              <th style={{ padding: 8 }}>Role</th>
              <th style={{ padding: 8 }}>Location</th>
              <th style={{ padding: 8 }}>Created</th>
              <th style={{ padding: 8 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.user_id} style={{ borderBottom: '1px solid #ddd' }}>
                {editingId === u.user_id ? (
                  <>
                    <td style={{ padding: 8 }}>
                      <input value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} style={{ width: 110 }} />
                    </td>
                    <td style={{ padding: 8 }}>
                      <input value={editData.email} onChange={(e) => setEditData({ ...editData, email: e.target.value })} style={{ width: 160 }} />
                    </td>
                    <td style={{ padding: 8 }}>
                      <select value={editData.role} onChange={(e) => setEditData({ ...editData, role: e.target.value })}>
                        <option value="store_manager">Store Manager</option>
                        <option value="warehouse_manager">Warehouse Manager</option>
                        <option value="administrator">Administrator</option>
                      </select>
                    </td>
                    <td style={{ padding: 8 }}>
                      {editData.role === 'warehouse_manager' && (
                        <input
                          type="number"
                          placeholder="Warehouse ID"
                          value={editData.warehouse_id}
                          onChange={(e) => setEditData({ ...editData, warehouse_id: e.target.value })}
                          style={{ width: 90 }}
                        />
                      )}
                      {editData.role === 'store_manager' && (
                        <input
                          type="number"
                          placeholder="Store ID"
                          value={editData.store_id}
                          onChange={(e) => setEditData({ ...editData, store_id: e.target.value })}
                          style={{ width: 90 }}
                        />
                      )}
                      {editData.role === 'administrator' && <span style={{ color: '#999' }}>—</span>}
                    </td>
                    <td style={{ padding: 8 }}>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: 8 }}>
                      <button onClick={() => handleSaveEdit(u.user_id)} style={{ marginRight: 4 }}>Save</button>
                      <button onClick={() => setEditingId(null)}>Cancel</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ padding: 8 }}>{u.name}</td>
                    <td style={{ padding: 8 }}>{u.email}</td>
                    <td style={{ padding: 8 }}>{roleLabel(u.role)}</td>
                    <td style={{ padding: 8 }}>
                      {u.warehouse_id ? `Warehouse ${u.warehouse_id}` : u.store_id ? `Store ${u.store_id}` : '—'}
                    </td>
                    <td style={{ padding: 8 }}>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: 8 }}>
                      <button onClick={() => startEdit(u)}>Edit</button>
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