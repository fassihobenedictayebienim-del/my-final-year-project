import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

export default function UserManagementPage() {
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '', role: 'store_manager', warehouse_id: '', store_id: '' });

  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  // eslint-disable-next-line react-hooks/exhaustive-deps -- Load users once when the page opens.
  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const response = await api.get('/users');
      setUsers(response.data.users);
    } catch (_err) {
      showToast('Failed to load users.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const payload = { name: formData.name, email: formData.email, phone: formData.phone, password: formData.password, role: formData.role };
      if (formData.role === 'warehouse_manager') payload.warehouse_id = formData.warehouse_id;
      if (formData.role === 'store_manager') payload.store_id = formData.store_id;

      await api.post('/auth/register', payload);
      showToast(`Account created for ${formData.name}.`);
      setFormData({ name: '', email: '', phone: '', password: '', role: 'store_manager', warehouse_id: '', store_id: '' });
      setShowForm(false);
      fetchUsers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create account.', 'error');
    }
  }

  function startEdit(u) {
  setEditingId(u.user_id);
  setEditData({ name: u.name, email: u.email, phone: u.phone || '', role: u.role, warehouse_id: u.warehouse_id || '', store_id: u.store_id || '' });
}

  async function handleSaveEdit(user_id) {
    try {
      const payload = { name: editData.name, email: editData.email, phone: editData.phone, role: editData.role };
      if (editData.role === 'warehouse_manager') payload.warehouse_id = editData.warehouse_id;
      if (editData.role === 'store_manager') payload.store_id = editData.store_id;

      await api.put(`/users/${user_id}`, payload);
      showToast('User updated successfully.');
      setEditingId(null);
      fetchUsers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update user.', 'error');
    }
  }

  function roleLabel(role) {
    if (role === 'administrator') return 'Administrator';
    if (role === 'warehouse_manager') return 'Warehouse Manager';
    if (role === 'store_manager') return 'Store Manager';
    return role;
  }

  function roleBadge(role) {
    if (role === 'administrator') return <span className="badge badge-fulfilled">{roleLabel(role)}</span>;
    if (role === 'warehouse_manager') return <span className="badge badge-approved">{roleLabel(role)}</span>;
    return <span className="badge badge-pending">{roleLabel(role)}</span>;
  }

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>User Management</h1>
          <p>Create and manage accounts across all roles.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ Add New User'}</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="form-card">
          <div className="form-row">
            <div style={{ flex: 1 }}>
              <label className="form-label">Full Name</label>
              <input className="form-input" type="text" placeholder="Full name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required style={{ width: '100%' }} />
            </div>
          </div>
          <div className="form-row">
                       <div style={{ flex: 1 }}>
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="name@moae.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required style={{ width: '100%' }} />
            </div>
          </div>
          <div className="form-row">
            <div style={{ flex: 1 }}>
              <label className="form-label">Phone (optional)</label>
              <input className="form-input" type="tel" placeholder="e.g. 024 123 4567" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} style={{ width: '100%' }} />
            </div>
          </div>
          <div className="form-row">
            <div style={{ flex: 1 }}>
              <label className="form-label">Temporary Password</label>
              <input className="form-input" type="password" placeholder="Min. 8 characters" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required style={{ width: '100%' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label">Role</label>
              <select className="form-input" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} style={{ width: '100%' }}>
                <option value="store_manager">Store Manager</option>
                <option value="warehouse_manager">Warehouse Manager</option>
                <option value="administrator">Administrator</option>
              </select>
            </div>
          </div>
          {formData.role === 'warehouse_manager' && (
            <div className="form-row">
              <div><label className="form-label">Warehouse ID</label><input className="form-input" type="number" placeholder="1" value={formData.warehouse_id} onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })} required /></div>
            </div>
          )}
          {formData.role === 'store_manager' && (
            <div className="form-row">
              <div><label className="form-label">Store ID</label><input className="form-input" type="number" placeholder="1 or 2" value={formData.store_id} onChange={(e) => setFormData({ ...formData, store_id: e.target.value })} required /></div>
            </div>
          )}
          <button type="submit" className="btn btn-primary">Create Account</button>
        </form>
      )}

      {loading ? (
        <div className="loading-row"><span className="spinner" style={{ borderTopColor: 'var(--color-primary)', borderColor: 'var(--color-border)' }} /> Loading users...</div>
      ) : users.length === 0 ? (
        <div className="empty-state"><span className="empty-state-icon">👥</span>No users yet.</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Location</th><th>Created</th><th>Actions</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.user_id}>
                  {editingId === u.user_id ? (
                    <>
                      <td><input className="form-input" value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} style={{ width: 110 }} /></td>
                                            <td><input className="form-input" value={editData.email} onChange={(e) => setEditData({ ...editData, email: e.target.value })} style={{ width: 160 }} /></td>
                      <td><input className="form-input" value={editData.phone} onChange={(e) => setEditData({ ...editData, phone: e.target.value })} style={{ width: 120 }} placeholder="Phone" /></td>
                      <td>
                        <select className="form-input" value={editData.role} onChange={(e) => setEditData({ ...editData, role: e.target.value })}>
                          <option value="store_manager">Store Manager</option>
                          <option value="warehouse_manager">Warehouse Manager</option>
                          <option value="administrator">Administrator</option>
                        </select>
                      </td>
                      <td>
                        {editData.role === 'warehouse_manager' && <input className="form-input" type="number" placeholder="Warehouse ID" value={editData.warehouse_id} onChange={(e) => setEditData({ ...editData, warehouse_id: e.target.value })} style={{ width: 90 }} />}
                        {editData.role === 'store_manager' && <input className="form-input" type="number" placeholder="Store ID" value={editData.store_id} onChange={(e) => setEditData({ ...editData, store_id: e.target.value })} style={{ width: 90 }} />}
                        {editData.role === 'administrator' && <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                      </td>
                      <td>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td>
                        <div className="action-buttons">
                          <button className="btn btn-sm btn-success" onClick={() => handleSaveEdit(u.user_id)}>Save</button>
                          <button className="btn btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{u.name}</td>
                      <td>{u.email}</td>
                      <td>{u.phone || '—'}</td>
                      <td>{roleBadge(u.role)}</td>
                      <td>{u.warehouse_id ? `Warehouse ${u.warehouse_id}` : u.store_id ? `Store ${u.store_id}` : '—'}</td>
                      <td>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td><button className="btn btn-sm" onClick={() => startEdit(u)}>Edit</button></td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
