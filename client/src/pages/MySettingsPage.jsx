import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function MySettingsPage() {
  const { user } = useAuth();
  const backLink = user.role === 'store_manager' ? '/store' : user.role === 'warehouse_manager' ? '/warehouse' : '/admin';

  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      const response = await api.get('/auth/me');
      setProfile(response.data.user);
    } catch (err) {
      setError('Failed to load profile.');
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
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    try {
      await api.put('/auth/change-password', { currentPassword, newPassword });
      setSuccess('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password.');
    }
  }

  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif', maxWidth: 600, margin: '0 auto' }}>
      <a href={backLink}>&larr; Back to Dashboard</a>
      <h1>My Settings</h1>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}

      {profile && (
        <div style={{ padding: 16, border: '1px solid #ccc', borderRadius: 4, marginBottom: 24 }}>
          <p><strong>Name:</strong> {profile.name}</p>
          <p><strong>Email:</strong> {profile.email}</p>
          <p><strong>Role:</strong> {roleLabel(profile.role)}</p>
          <p style={{ color: '#666', fontSize: 13 }}>
            To change your name or email, contact your Administrator.
          </p>
        </div>
      )}

      <h3>Change Password</h3>
      <form onSubmit={handleChangePassword} style={{ padding: 16, border: '1px solid #ccc', borderRadius: 4 }}>
        <div style={{ marginBottom: 8 }}>
          <input
            type="password"
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            style={{ padding: 6, width: '100%' }}
          />
        </div>
        <div style={{ marginBottom: 8 }}>
          <input
            type="password"
            placeholder="New password (min 8 characters)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
            style={{ padding: 6, width: '100%' }}
          />
        </div>
        <div style={{ marginBottom: 8 }}>
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            style={{ padding: 6, width: '100%' }}
          />
        </div>
        <button type="submit" style={{ padding: '8px 16px' }}>Change Password</button>
      </form>
    </div>
  );
}