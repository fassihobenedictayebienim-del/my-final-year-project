import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="4" width="20" height="16" rx="3" /><path d="m3 7 9 6 9-6" />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}
function EyeIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function EyeOffIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a20.3 20.3 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 7 11 7a20.3 20.3 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24" /><path d="M1 1l22 22" />
    </svg>
  );
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus(null);
    setLoading(true);
    try {
      const user = await login(email, password);
      setStatus({ type: 'success', message: 'Login successful' });
      setTimeout(() => {
        if (user.role === 'administrator') navigate('/admin');
        else if (user.role === 'warehouse_manager') navigate('/warehouse');
        else if (user.role === 'store_manager') navigate('/store');
      }, 350);
    } catch (err) {
      setStatus({ type: 'error', message: err.response?.data?.message || 'Invalid email or password' });
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo-group">
            <div className="auth-logo-letter"><span>M</span></div>
            <div className="auth-logo-letter"><span>O</span></div>
            <div className="auth-logo-letter"><span>A</span></div>
            <div className="auth-logo-letter"><span>E</span></div>
          </div>
          <h1>Mike Oppong Agyei Enterprise</h1>
          <p>Management System</p>
        </div>

        {status && (
          <div className={`auth-feedback ${status.type}`}>
            {status.type === 'success' ? '✓' : '⚠'} {status.message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <div className="input-wrap">
              <span className="input-icon"><MailIcon /></span>
              <input id="email" type="email" placeholder="you@moae.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" disabled={loading} />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrap">
              <span className="input-icon"><LockIcon /></span>
              <input id="password" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" disabled={loading} />
              <button type="button" className="password-toggle" onClick={() => setShowPassword((s) => !s)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? (<><span className="spinner" /> Logging in...</>) : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}