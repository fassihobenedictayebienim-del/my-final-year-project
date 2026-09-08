import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

export default function AdminSettingsPage() {
  const { showToast } = useToast();
  const [locations, setLocations] = useState({ warehouses: [], stores: [] });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editingLocation, setEditingLocation] = useState(null);
  const [locationEditData, setLocationEditData] = useState({});

  const [resettingUserId, setResettingUserId] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [locRes, usersRes] = await Promise.all([api.get('/locations'), api.get('/users')]);
      setLocations(locRes.data);
      setUsers(usersRes.data.users);
    } catch (err) {
      showToast('Failed to load settings.', 'error');
    } finally {
      setLoading(false);
    }
  }

  function startEditLocation(type, loc) {
    setEditingLocation(`${type}-${type === 'warehouse' ? loc.warehouse_id : loc.store_id}`);
    setLocationEditData({ name: loc.name, location: loc.location });
  }

  async function saveLocation(type, id) {
    try {
      await api.put(`/locations/${type}s/${id}`, locationEditData);
      showToast('Location updated successfully.');
      setEditingLocation(null);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update location.', 'error');
    }
  }

  async function handleResetPassword(user_id) {
    if (!newPassword || newPassword.length < 8) {
      showToast('New password must be at least 8 characters.', 'error');
      return;
    }
    try {
      const response = await api.put(`/users/${user_id}/reset-password`, { newPassword });
      showToast(response.data.message);
      setResettingUserId(null);
      setNewPassword('');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to reset password.', 'error');
    }
  }

  function locationRow(type, loc, key) {
    const id = type === 'warehouse' ? loc.warehouse_id : loc.store_id;
    return (
      <tr key={key}>
        {editingLocation === key ? (
          <>
            <td><input className="form-input" value={locationEditData.name} onChange={(e) => setLocationEditData({ ...locationEditData, name: e.target.value })} /></td>
            <td><input className="form-input" value={locationEditData.location} onChange={(e) => setLocationEditData({ ...locationEditData, location: e.target.value })} /></td>
            <td>
              <button className="btn btn-sm btn-success" onClick={() => saveLocation(type, id)}>Save</button>{' '}
              <button className="btn btn-sm" onClick={() => setEditingLocation(null)}>Cancel</button>
            </td>
          </>
        ) : (
          <>
            <td>{loc.name}</td>
            <td>{loc.location}</td>
            <td><button className="btn btn-sm" onClick={() => startEditLocation(type, loc)}>Edit</button></td>
          </>
        )}
      </tr>
    );
  }

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>System Settings</h1>
          <p>Manage locations and reset user passwords.</p>
        </div>
      </div>

      {loading ? <p>Loading...</p> : (
        <>
          <h3>Warehouse</h3>
          <div className="table-wrap" style={{ marginBottom: 24 }}>
            <table className="data-table">
              <thead><tr><th>Name</th><th>Location</th><th>Actions</th></tr></thead>
              <tbody>{locations.warehouses.map((w) => locationRow('warehouse', w, `warehouse-${w.warehouse_id}`))}</tbody>
            </table>
          </div>

          <h3>Stores</h3>
          <div className="table-wrap" style={{ marginBottom: 24 }}>
            <table className="data-table">
              <thead><tr><th>Name</th><th>Location</th><th>Actions</th></tr></thead>
              <tbody>{locations.stores.map((s) => locationRow('store', s, `store-${s.store_id}`))}</tbody>
            </table>
          </div>

          <h3>Reset a User's Password</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Name</th><th>Role</th><th>Actions</th></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.user_id}>
                    <td>{u.name}</td>
                    <td>{u.role}</td>
                    <td>
                      {resettingUserId === u.user_id ? (
                        <>
                          <input className="form-input" type="password" placeholder="New password (min 8 chars)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={{ marginRight: 8, width: 200 }} />
                          <button className="btn btn-sm btn-success" onClick={() => handleResetPassword(u.user_id)}>Confirm</button>{' '}
                          <button className="btn btn-sm" onClick={() => { setResettingUserId(null); setNewPassword(''); }}>Cancel</button>
                        </>
                      ) : (
                        <button className="btn btn-sm" onClick={() => setResettingUserId(u.user_id)}>Reset Password</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Layout>
  );
}