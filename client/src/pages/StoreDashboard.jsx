import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function StoreDashboard() {
  const { user, logout } = useAuth();
  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
      <h1>Store Manager Dashboard</h1>
      <p>Welcome, {user.name}.</p>
      <nav style={{ marginBottom: 24 }}>
        <Link to="/store/requests" style={{ marginRight: 16 }}>Stock Requests</Link>
        <Link to="/store/sales" style={{ marginRight: 16 }}>Record Sale</Link>
      </nav>
      <button onClick={logout}>Logout</button>
    </div>
  );
}