import { useAuth } from '../context/AuthContext';

export default function WarehouseDashboard() {
  const { user, logout } = useAuth();
  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
      <h1>Warehouse Manager Dashboard</h1>
      <p>Welcome, {user.name}.</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}