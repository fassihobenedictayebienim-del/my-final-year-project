import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AccountMenu from './AccountMenu';

const NAV_BY_ROLE = {
  administrator: [
    { to: '/admin', label: 'Dashboard', icon: '📊' },
    { to: '/admin/users', label: 'Users', icon: '👥' },
    { to: '/admin/settings', label: 'System Settings', icon: '⚙️' },
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
    { to: '/store/inventory', label: 'My Inventory', icon: '📦' },
    { to: '/store/requests', label: 'Requests', icon: '📋' },
    { to: '/store/sales', label: 'Sales', icon: '🛒' },
    { to: '/reports', label: 'Reports', icon: '📈' },
  ],
};

export default function Layout({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const links = user ? NAV_BY_ROLE[user.role] || [] : [];

  function closeSidebarOnNav() { setSidebarOpen(false); }

  return (
    <div className="app-shell">
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <strong>Mike Oppong Agyei</strong>
          <span>Inventory Management</span>
        </div>
        <nav className="sidebar-nav">
          {links.map((l) => (
            <Link key={l.to} to={l.to} onClick={closeSidebarOnNav} className={`sidebar-link ${location.pathname === l.to ? 'active' : ''}`}>
              <span className="sidebar-icon">{l.icon}</span> {l.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="main-area">
        <div className="topbar">
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
          </button>
          <div className="topbar-spacer" />
          <AccountMenu />
        </div>
        <div className="page-container">{children}</div>
      </div>
    </div>
  );
}