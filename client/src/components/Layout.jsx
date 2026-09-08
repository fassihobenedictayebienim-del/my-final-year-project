import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const NAV_BY_ROLE = {
  administrator: [
  { to: '/admin', label: 'Dashboard', icon: '📊' },
  { to: '/admin/users', label: 'Users', icon: '👥' },
  { to: '/reports', label: 'Reports', icon: '📈' },
  { to: '/admin/activity', label: 'Activity Log', icon: '📜' },
],
  warehouse_manager: [
    { to: '/warehouse', label: 'Dashboard', icon: '📊' },
    { to: '/warehouse/products', label: 'Products', icon: '📦' },
    { to: '/warehouse/shipments', label: 'Shipments', icon: '🚚' },
    { to: '/warehouse/requests', label: 'Requests', icon: '📋' },
    { to: '/reports', label: 'Reports', icon: '📈' },
  ],
  store_manager: [
    { to: '/store', label: 'Dashboard', icon: '📊' },
    { to: '/store/requests', label: 'Requests', icon: '📋' },
    { to: '/store/sales', label: 'Sales', icon: '🛒' },
    { to: '/reports', label: 'Reports', icon: '📈' },
  ],
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const links = user ? NAV_BY_ROLE[user.role] || [] : [];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <strong>Mike Oppong Agyei</strong>
          <span>Inventory Management</span>
        </div>
        <nav className="sidebar-nav">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`sidebar-link ${location.pathname === l.to ? 'active' : ''}`}
            >
              <span className="sidebar-icon">{l.icon}</span> {l.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <Link to="/settings" className={`sidebar-link ${location.pathname === '/settings' ? 'active' : ''}`}>
            <span className="sidebar-icon">👤</span> My Settings
          </Link>
        </div>
      </aside>

      <div className="main-area">
        <div className="topbar">
          <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{user?.name}</span>
          <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button className="btn btn-sm" onClick={logout}>Logout</button>
        </div>
        <div className="page-container">{children}</div>
      </div>
    </div>
  );
}