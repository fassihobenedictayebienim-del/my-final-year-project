import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

export default function MySettingsPage() {
  const { user: authUser } = useAuth();
  const { showToast } = useToast();
  const isAdmin = authUser.role === 'administrator';

  const [profile, setProfile] = useState(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [locations, setLocations] = useState({ warehouses: [], stores: [] });
  const [users, setUsers] = useState([]);
  const [loadingAdmin, setLoadingAdmin] = useState(isAdmin);
  const [editingLocation, setEditingLocation] = useState(null);
  const [locationEditData, setLocationEditData] = useState({});
  const [resettingUserId, setResettingUserId] = useState(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');

  useEffect(() => {
    api.get('/auth/me').then((res) => setProfile(res.data.user)).catch(() => showToast('Failed to load profile.', 'error'));
    if (isAdmin) fetchAdminData();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Load profile and administrator data once when the page opens.
  }, []);

  async function fetchAdminData() {
    setLoadingAdmin(true);
    try {
      const [locRes, usersRes] = await Promise.all([api.get('/locations'), api.get('/users')]);
      setLocations(locRes.data);
      setUsers(usersRes.data.users);
    } catch (_err) {
      showToast('Failed to load system settings.', 'error');
    } finally {
      setLoadingAdmin(false);
    }
  }

  function roleLabel(role) {
    if (role === 'administrator') return 'Administrator';
    if (role === 'warehouse_manager') return 'Warehouse Manager';
    if (role === 'store_manager') return 'Store Manager';
    return role;
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('New password and confirmation do not match.', 'error');
      return;
    }
    try {
      await api.put('/auth/change-password', { currentPassword, newPassword });
      showToast('Password changed successfully.');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to change password.', 'error');
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
      fetchAdminData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update location.', 'error');
    }
  }

  async function handleResetUserPassword(user_id) {
    if (!resetPasswordValue || resetPasswordValue.length < 8) {
      showToast('New password must be at least 8 characters.', 'error');
      return;
    }
    try {
      const response = await api.put(`/users/${user_id}/reset-password`, { newPassword: resetPasswordValue });
      showToast(response.data.message);
      setResettingUserId(null);
      setResetPasswordValue('');
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
              <div className="action-buttons">
                <button className="btn btn-sm btn-success" onClick={() => saveLocation(type, id)}>Save</button>
                <button className="btn btn-sm" onClick={() => setEditingLocation(null)}>Cancel</button>
              </div>
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
          <h1>{isAdmin ? 'Settings' : 'My Settings'}</h1>
          <p>{isAdmin ? 'Your profile, plus system-wide locations and user management.' : 'View your profile and change your password.'}</p>
        </div>
      </div>

      {profile && (
        <div className="card" style={{ marginBottom: 24, maxWidth: 420 }}>
          <p style={{ margin: '0 0 6px' }}><strong>Name:</strong> {profile.name}</p>
          <p style={{ margin: '0 0 6px' }}><strong>Email:</strong> {profile.email}</p>
          <p style={{ marginBottom: 0 }}><strong>Role:</strong> {roleLabel(profile.role)}</p>
          <p className="form-hint" style={{ marginTop: 10, marginBottom: 0 }}>To change your name or email, contact your Administrator.</p>
        </div>
      )}

      <h3>Change Password</h3>
      <form onSubmit={handleChangePassword} className="form-card" style={{ maxWidth: 400 }}>
        <div className="form-row"><input className="form-input" type="password" placeholder="Current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required style={{ width: '100%' }} /></div>
        <div className="form-row"><input className="form-input" type="password" placeholder="New password (min 8 characters)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} style={{ width: '100%' }} /></div>
        <div className="form-row"><input className="form-input" type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required style={{ width: '100%' }} /></div>
        <button type="submit" className="btn btn-primary">Change Password</button>
      </form>

      {isAdmin && (
        <>
          {loadingAdmin ? (
            <div className="loading-row"><span className="spinner" style={{ borderTopColor: 'var(--color-primary)', borderColor: 'var(--color-border)' }} /> Loading system settings...</div>
          ) : (
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
                    {users.filter((u) => u.user_id !== authUser.user_id).map((u) => (
                      <tr key={u.user_id}>
                        <td>{u.name}</td>
                        <td>{roleLabel(u.role)}</td>
                        <td>
                          {resettingUserId === u.user_id ? (
                            <div className="action-buttons">
                              <input className="form-input" type="password" placeholder="New password (min 8 chars)" value={resetPasswordValue} onChange={(e) => setResetPasswordValue(e.target.value)} style={{ width: 200 }} />
                              <button className="btn btn-sm btn-success" onClick={() => handleResetUserPassword(u.user_id)}>Confirm</button>
                              <button className="btn btn-sm" onClick={() => { setResettingUserId(null); setResetPasswordValue(''); }}>Cancel</button>
                            </div>
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
        </>
      )}
    </Layout>
  );
}
