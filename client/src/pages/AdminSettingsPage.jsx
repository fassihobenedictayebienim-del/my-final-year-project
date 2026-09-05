import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function AdminSettingsPage() {
  const [locations, setLocations] = useState({ warehouses: [], stores: [] });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [editingLocation, setEditingLocation] = useState(null); // e.g. "warehouse-1" or "store-2"
  const [locationEditData, setLocationEditData] = useState({});

  const [resettingUserId, setResettingUserId] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [locRes, usersRes] = await Promise.all([
        api.get('/locations'),
        api.get('/users'),
      ]);
      setLocations(locRes.data);
      setUsers(usersRes.data.users);
    } catch (err) {
      setError('Failed to load settings.');
    } finally {
      setLoading(false);
    }
  }

  function startEditLocation(type, loc) {
    setEditingLocation(`${type}-${type === 'warehouse' ? loc.warehouse_id : loc.store_id}`);
    setLocationEditData({ name: loc.name, location: loc.location });
  }

  async function saveLocation(type, id) {
    setError('');
    setSuccess('');
    try {
      await api.put(`/locations/${type}s/${id}`, locationEditData);
      setSuccess('Location updated successfully.');
      setEditingLocation(null);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update location.');
    }
  }

  async function handleResetPassword(user_id) {
    setError('');
    setSuccess('');
    if (!newPassword || newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    try {
      const response = await api.put(`/users/${user_id}/reset-password`, { newPassword });
      setSuccess(response.data.message);
      setResettingUserId(null);
      setNewPassword('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password.');
    }
  }

  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif', maxWidth: 900, margin: '0 auto' }}>
      <Link to="/admin">&larr; Back to Dashboard</Link>
      <h1>System Settings</h1>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <h3>Warehouse</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #333', textAlign: 'left' }}>
                <th style={{ padding: 8 }}>Name</th>
                <th style={{ padding: 8 }}>Location</th>
                <th style={{ padding: 8 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {locations.warehouses.map((w) => {
                const key = `warehouse-${w.warehouse_id}`;
                return (
                  <tr key={key} style={{ borderBottom: '1px solid #ddd' }}>
                    {editingLocation === key ? (
                      <>
                        <td style={{ padding: 8 }}>
                          <input value={locationEditData.name} onChange={(e) => setLocationEditData({ ...locationEditData, name: e.target.value })} />
                        </td>
                        <td style={{ padding: 8 }}>
                          <input value={locationEditData.location} onChange={(e) => setLocationEditData({ ...locationEditData, location: e.target.value })} />
                        </td>
                        <td style={{ padding: 8 }}>
                          <button onClick={() => saveLocation('warehouse', w.warehouse_id)} style={{ marginRight: 4 }}>Save</button>
                          <button onClick={() => setEditingLocation(null)}>Cancel</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ padding: 8 }}>{w.name}</td>
                        <td style={{ padding: 8 }}>{w.location}</td>
                        <td style={{ padding: 8 }}>
                          <button onClick={() => startEditLocation('warehouse', w)}>Edit</button>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>

          <h3>Stores</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #333', textAlign: 'left' }}>
                <th style={{ padding: 8 }}>Name</th>
                <th style={{ padding: 8 }}>Location</th>
                <th style={{ padding: 8 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {locations.stores.map((s) => {
                const key = `store-${s.store_id}`;
                return (
                  <tr key={key} style={{ borderBottom: '1px solid #ddd' }}>
                    {editingLocation === key ? (
                      <>
                        <td style={{ padding: 8 }}>
                          <input value={locationEditData.name} onChange={(e) => setLocationEditData({ ...locationEditData, name: e.target.value })} />
                        </td>
                        <td style={{ padding: 8 }}>
                          <input value={locationEditData.location} onChange={(e) => setLocationEditData({ ...locationEditData, location: e.target.value })} />
                        </td>
                        <td style={{ padding: 8 }}>
                          <button onClick={() => saveLocation('store', s.store_id)} style={{ marginRight: 4 }}>Save</button>
                          <button onClick={() => setEditingLocation(null)}>Cancel</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ padding: 8 }}>{s.name}</td>
                        <td style={{ padding: 8 }}>{s.location}</td>
                        <td style={{ padding: 8 }}>
                          <button onClick={() => startEditLocation('store', s)}>Edit</button>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>

          <h3>Reset a User's Password</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #333', textAlign: 'left' }}>
                <th style={{ padding: 8 }}>Name</th>
                <th style={{ padding: 8 }}>Role</th>
                <th style={{ padding: 8 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.user_id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: 8 }}>{u.name}</td>
                  <td style={{ padding: 8 }}>{u.role}</td>
                  <td style={{ padding: 8 }}>
                    {resettingUserId === u.user_id ? (
                      <>
                        <input
                          type="password"
                          placeholder="New password (min 8 chars)"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          style={{ marginRight: 8, padding: 4 }}
                        />
                        <button onClick={() => handleResetPassword(u.user_id)} style={{ marginRight: 4 }}>Confirm</button>
                        <button onClick={() => { setResettingUserId(null); setNewPassword(''); }}>Cancel</button>
                      </>
                    ) : (
                      <button onClick={() => setResettingUserId(u.user_id)}>Reset Password</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}