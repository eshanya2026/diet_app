/**
 * Admin login page. Seed (first admin) form when no admins exist.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { adminLogin, adminSeed, setAdminToken, getSystemHealth } from '../api/adminApi';

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSeed, setIsSeed] = useState(false);
  const [health, setHealth] = useState(null);

  const from = location.state?.from?.pathname ?? '/admin';

  useEffect(() => {
    let cancelled = false;
    async function loadHealth() {
      try {
        const h = await getSystemHealth();
        if (!cancelled) setHealth(h);
      } catch {
        if (!cancelled) setHealth({ ok: false });
      }
    }
    loadHealth();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const fn = isSeed ? adminSeed : adminLogin;
      const res = await fn(email.trim(), password);
      if (res.success && res.data?.token) {
        setAdminToken(res.data.token, true);
        navigate(from, { replace: true });
        return;
      }
    } catch (err) {
      setError(err?.error?.message ?? 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center theme-bg">
      <div
        className="card theme-card shadow-theme"
        style={{ width: '100%', maxWidth: 420 }}
      >
        <div className="card-body p-4 p-md-5">
          <div className="mb-3 text-center">
            <div className="fw-bold theme-text" style={{ fontSize: '1.4rem' }}>Diet AI Admin</div>
            <p className="text-muted small mb-0">Secure access to users, plans, and analytics.</p>
          </div>
          {health && (
            <div
              className={`alert py-2 small mb-3 ${
                health.ok && health.db === 'connected' ? 'alert-success' : 'alert-warning'
              }`}
              role="status"
            >
              {health.ok
                ? health.db === 'connected'
                  ? 'System health: API online, database connected.'
                  : 'System health: API online, database unavailable – history and analytics may be limited.'
                : 'System health: API unreachable. Check the server before logging in.'}
            </div>
          )}
          <h4 className="h6 fw-semibold theme-text mb-3 text-center">Admin Login</h4>
          {error && (
            <div className="alert alert-danger py-2 small" role="alert">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="section-spacing">
            <div>
              <label htmlFor="admin-email" className="form-label theme-text">Email</label>
              <input
                id="admin-email"
                type="email"
                className="form-control theme-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="admin-password" className="form-label theme-text">Password</label>
              <input
                id="admin-password"
                type="password"
                className="form-control theme-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={isSeed ? 'new-password' : 'current-password'}
              />
            </div>
            <div className="form-check small">
              <input
                id="admin-seed"
                type="checkbox"
                className="form-check-input"
                checked={isSeed}
                onChange={(e) => setIsSeed(e.target.checked)}
              />
              <label className="form-check-label theme-text" htmlFor="admin-seed">
                Create first admin (seed)
              </label>
            </div>
            <button type="submit" className="btn btn-theme-primary w-100" disabled={loading}>
              {loading ? 'Please wait…' : isSeed ? 'Create Admin' : 'Login'}
            </button>
          </form>
          <p className="text-muted small mt-3 mb-0 text-center">
            <Link to="/login" className="text-primary">Back to Diet AI (user login)</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
