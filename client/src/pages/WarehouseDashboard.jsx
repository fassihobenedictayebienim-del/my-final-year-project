import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function WarehouseDashboard() {
  const { user, logout } = useAuth();
  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
      <h1>Warehouse Manager Dashboard</h1>
      <p>Welcome, {user.name}.</p>
      <nav style={{ marginBottom: 24 }}>
        <Link to="/warehouse/products" style={{ marginRight: 16 }}>Manage Products</Link>
      </nav>
      <button onClick={logout}>Logout</button>
    </div>
  );
}