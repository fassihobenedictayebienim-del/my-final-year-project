import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AccountMenu from "./AccountMenu";
import {
  Activity,
  BarChart3,
  Boxes,
  ChartNoAxesCombined,
  ClipboardList,
  LayoutDashboard,
  Settings,
  ShoppingCart,
  Truck,
  Users,
} from "lucide-react";

const NAV_BY_ROLE = {
  administrator: [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { to: "/admin/users", label: "Users", icon: Users },
    { to: "/admin/settings", label: "System Settings", icon: Settings },
    { to: "/reports", label: "Reports", icon: BarChart3 },
    { to: "/admin/activity", label: "Activity Log", icon: Activity },
  ],
  warehouse_manager: [
    { to: "/warehouse", label: "Dashboard", icon: LayoutDashboard },
    { to: "/warehouse/products", label: "Products", icon: Boxes },
    { to: "/warehouse/shipments", label: "Shipments", icon: Truck },
    { to: "/warehouse/requests", label: "Requests", icon: ClipboardList },
    { to: "/reports", label: "Reports", icon: BarChart3 },
  ],
  store_manager: [
    { to: "/store", label: "Dashboard", icon: LayoutDashboard },
    { to: "/store/inventory", label: "My Inventory", icon: Boxes },
    { to: "/store/requests", label: "Requests", icon: ClipboardList },
    { to: "/store/sales", label: "Sales", icon: ShoppingCart },
    { to: "/reports", label: "Reports", icon: ChartNoAxesCombined },
  ],
};

export default function Layout({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const links = user ? NAV_BY_ROLE[user.role] || [] : [];

  function closeSidebarOnNav() {
    setSidebarOpen(false);
  }

  return (
    <div className="app-shell">
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <div className="sidebar-logo-group" aria-label="MOAE">
            {["M", "O", "A", "E"].map((letter) => (
              <span key={letter} className="sidebar-logo-letter">
                {letter}
              </span>
            ))}
          </div>
          <span>Inventory Management</span>
        </div>
        <nav className="sidebar-nav">
          {links.map((l) => {
            const Icon = l.icon;
            return (
              <Link
                key={l.to}
                to={l.to}
                onClick={closeSidebarOnNav}
                className={`sidebar-link ${location.pathname === l.to ? "active" : ""}`}
              >
                <Icon className="sidebar-icon" size={18} strokeWidth={1.9} />{" "}
                {l.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="main-area">
        <div className="topbar">
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
          <div className="topbar-spacer" />
          <AccountMenu />
        </div>
        <div className="page-container">{children}</div>
      </div>
    </div>
  );
}
