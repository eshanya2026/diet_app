/**
 * User registration page. Redirects to home if already logged in.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { registerUser } from '../api/dietApi';

export default function Register() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [name, setName] = useState('');
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
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      setError('Email and password are required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const res = await registerUser(trimmedName || trimmedEmail.split('@')[0], trimmedEmail, password);
      if (!res?.success) {
        setError(res?.error?.message ?? 'Registration failed.');
        return;
      }
      await login(trimmedEmail, password);
      navigate('/', { replace: true });
    } catch (err) {
      const message = err?.error?.message ?? err?.message ?? 'Registration failed. Try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="theme-bg min-vh-100 d-flex align-items-center justify-content-center p-3">
      <div className="card theme-card shadow-theme" style={{ maxWidth: 400, width: '100%' }}>
        <div className="card-body p-4">
          <PageHeader title="Register" description="Create your account" />
          <form onSubmit={handleSubmit} className="mt-3">
            <div className="mb-3">
              <label htmlFor="reg-name" className="form-label theme-text">Name</label>
              <input
                id="reg-name"
                type="text"
                className="form-control theme-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
              />
            </div>
            <div className="mb-3">
              <label htmlFor="reg-email" className="form-label theme-text">Email</label>
              <input
                id="reg-email"
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
              <label htmlFor="reg-password" className="form-label theme-text">Password</label>
              <input
                id="reg-password"
                type="password"
                className="form-control theme-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                autoComplete="new-password"
                minLength={6}
                required
              />
            </div>
            {error && (
              <div className="alert alert-danger py-2 small mb-3" role="alert">
                {error}
              </div>
            )}
            <button type="submit" className="btn btn-theme-primary w-100 mb-2" disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </button>
            <p className="text-center text-muted small mb-0">
              Already have an account? <Link to="/login">Login</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
