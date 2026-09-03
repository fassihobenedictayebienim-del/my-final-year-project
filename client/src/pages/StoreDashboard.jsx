import { useAuth } from '../context/AuthContext';

export default function StoreDashboard() {
  const { user, logout } = useAuth();
  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
      <h1>Store Manager Dashboard</h1>
      <p>Welcome, {user.name}.</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}