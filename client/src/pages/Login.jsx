/**
 * User login page. Redirects to home if already logged in.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    navigate('/', { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err?.error?.message ?? err?.message ?? 'Login failed. Check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="theme-bg min-vh-100 d-flex align-items-center justify-content-center p-3">
      <div className="card theme-card shadow-theme" style={{ maxWidth: 400, width: '100%' }}>
        <div className="card-body p-4">
          <PageHeader title="Login" description="Sign in to your account" />
          <form onSubmit={handleSubmit} className="mt-3">
            <div className="mb-3">
              <label htmlFor="login-email" className="form-label theme-text">Email</label>
              <input
                id="login-email"
                type="email"
                className="form-control theme-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
            <div className="mb-3">
              <label htmlFor="login-password" className="form-label theme-text">Password</label>
              <input
                id="login-password"
                type="password"
                className="form-control theme-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            {error && (
              <div className="alert alert-danger py-2 small mb-3" role="alert">
                {error}
              </div>
            )}
            <button type="submit" className="btn btn-theme-primary w-100 mb-2" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
            <p className="text-center text-muted small mb-0">
              Don&apos;t have an account? <Link to="/register">Register</Link>
            </p>
            <p className="text-center text-muted small mt-2 mb-0">
              <Link to="/admin/login">Admin login</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
