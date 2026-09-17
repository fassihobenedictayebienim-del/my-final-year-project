import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getInitials, getAvatarColor } from '../utils/avatarUtils';
import api from '../services/api';
import ProfileModal from './ProfileModal';
import ChangePasswordModal from './ChangePasswordModal';

const ROLE_LABEL = {
  administrator: 'Administrator',
  warehouse_manager: 'Warehouse Manager',
  store_manager: 'Store Manager',
};

export default function AccountMenu() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [fullProfile, setFullProfile] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  return (
    <div className="account-menu" ref={menuRef}>
      <button
        className="account-avatar-btn"
        style={{ background: getAvatarColor(user.user_id) }}
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
      >
        {getInitials(user.name)}
      </button>

      {open && (
        <div className="account-dropdown">
          <div className="account-dropdown-header">
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>{user.name}</p>
            <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--color-text-muted)' }}>{ROLE_LABEL[user.role] || user.role}</p>
          </div>

                    <button
            className="account-dropdown-item"
            onClick={async () => {
              try {
                const response = await api.get('/auth/me');
                setFullProfile(response.data.user);
                setShowProfile(true);
              } catch (_err) {
                setFullProfile(user); // fallback to what we already have
                setShowProfile(true);
              }
              setOpen(false);
            }}
          >
             Profile
          </button>
          <button className="account-dropdown-item" onClick={() => { setShowChangePassword(true); setOpen(false); }}>
             Change Password
          </button>

          <div className="account-dropdown-divider" />

          <div className="account-dropdown-item account-dropdown-appearance">
            <span> Appearance</span>
            <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>

          <div className="account-dropdown-divider" />

          <button className="account-dropdown-item account-dropdown-danger" onClick={logout}>
             Logout
          </button>
        </div>
      )}

            {showProfile && <ProfileModal user={fullProfile || user} onClose={() => setShowProfile(false)} />}
      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
    </div>
  );
}
