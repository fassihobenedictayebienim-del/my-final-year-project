import { useState } from 'react';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

export default function ChangePasswordModal({ onClose }) {
  const { showToast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('New password and confirmation do not match.', 'error');
      return;
    }
    try {
      await api.put('/auth/change-password', { currentPassword, newPassword });
      showToast('Password changed successfully.');
      onClose();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to change password.', 'error');
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ margin: 0, border: 'none', padding: 0 }}>Change Password</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-row"><input className="form-input" type="password" placeholder="Current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required style={{ width: '100%' }} /></div>
          <div className="form-row"><input className="form-input" type="password" placeholder="New password (min 8 characters)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} style={{ width: '100%' }} /></div>
          <div className="form-row"><input className="form-input" type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required style={{ width: '100%' }} /></div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Change Password</button>
        </form>
      </div>
    </div>
  );
}