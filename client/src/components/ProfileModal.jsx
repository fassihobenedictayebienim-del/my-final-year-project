import { getInitials, getAvatarColor } from '../utils/avatarUtils';

const ROLE_LABEL = {
  administrator: 'Administrator',
  warehouse_manager: 'Warehouse Manager',
  store_manager: 'Store Manager',
};

export default function ProfileModal({ user, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ margin: 0, border: 'none', padding: 0 }}>Profile</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div
            style={{
              width: 52, height: 52, borderRadius: '50%', background: getAvatarColor(user.user_id),
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
              fontWeight: 700, fontSize: 17, flexShrink: 0,
            }}
          >
            {getInitials(user.name)}
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>{user.name}</p>
            <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 13 }}>{ROLE_LABEL[user.role] || user.role}</p>
          </div>
        </div>

        <div className="card" style={{ background: 'var(--color-bg)' }}>
          <p style={{ margin: '0 0 10px' }}><strong>Full Name:</strong> {user.name}</p>
          <p style={{ margin: '0 0 10px' }}><strong>Email:</strong> {user.email}</p>
          <p style={{ margin: '0 0 10px' }}>
            <strong>Phone:</strong>{' '}
            {user.phone ? user.phone : <span style={{ color: 'var(--color-text-muted)' }}>Not set — contact your Administrator to add one.</span>}
          </p>
          <p style={{ margin: 0 }}><strong>Role:</strong> {ROLE_LABEL[user.role] || user.role}</p>
        </div>

        <p className="form-hint" style={{ marginTop: 14, marginBottom: 0 }}>
          To change your name, email, or phone, contact your Administrator.
        </p>
      </div>
    </div>
  );
}