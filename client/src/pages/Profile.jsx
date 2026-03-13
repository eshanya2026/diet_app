/**
 * User profile page: view and edit name, change password.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { updateProfile as updateProfileApi, changePassword as changePasswordApi } from '../api/dietApi';

const MIN_PASSWORD_LENGTH = 6;

export default function Profile() {
  const navigate = useNavigate();
  const { user, isAuthenticated, setUser } = useAuth();
  const [nameInput, setNameInput] = useState(user?.name ?? '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });

  if (!isAuthenticated || !user) {
    navigate('/login', { replace: true });
    return null;
  }

  const displayName = user.name?.trim() || user.email?.split('@')[0] || 'User';

  const handleSaveName = async (e) => {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (trimmed === (user?.name ?? '')) {
      setProfileMessage({ type: 'muted', text: 'No change to save.' });
      return;
    }
    setProfileSaving(true);
    setProfileMessage({ type: '', text: '' });
    try {
      const res = await updateProfileApi({ name: trimmed });
      if (res?.success && res?.data) {
        setUser(res.data);
        setNameInput(res.data.name ?? '');
        setProfileMessage({ type: 'success', text: 'Name updated.' });
      } else {
        setProfileMessage({ type: 'error', text: res?.error?.message ?? 'Failed to update.' });
      }
    } catch (err) {
      setProfileMessage({
        type: 'error',
        text: err?.error?.message ?? err?.message ?? 'Failed to update name.',
      });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMessage({ type: '', text: '' });
    if (!currentPassword || !newPassword) {
      setPasswordMessage({ type: 'error', text: 'Current and new password are required.' });
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setPasswordMessage({ type: 'error', text: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }
    setPasswordSaving(true);
    try {
      const res = await changePasswordApi(currentPassword, newPassword);
      if (res?.success) {
        setPasswordMessage({ type: 'success', text: 'Password updated.' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordMessage({ type: 'error', text: res?.error?.message ?? 'Failed to change password.' });
      }
    } catch (err) {
      setPasswordMessage({
        type: 'error',
        text: err?.error?.message ?? err?.message ?? 'Failed to change password.',
      });
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="theme-bg">
      <PageHeader title="Profile" description="Your account details" />
      <div className="card theme-card shadow-theme mb-3">
        <div className="card-body">
          <div className="d-flex align-items-center gap-3 mb-3">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center theme-bg-secondary"
              style={{ width: 56, height: 56 }}
              aria-hidden
            >
              <span className="theme-text" style={{ fontSize: '1.5rem' }}>
                {(nameInput.trim() || displayName).charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="h5 theme-text mb-0">{displayName}</h2>
              <p className="text-muted small mb-0">{user.email ?? '—'}</p>
            </div>
          </div>
          <dl className="mb-0 small">
            <dt className="text-muted">Email</dt>
            <dd className="theme-text mb-3">{user.email ?? '—'}</dd>
          </dl>
          <form onSubmit={handleSaveName} className="mb-0">
            <label htmlFor="profile-name" className="form-label theme-text small">Display name</label>
            <div className="d-flex flex-wrap gap-2 align-items-center">
              <input
                id="profile-name"
                type="text"
                className="form-control theme-input"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Your name"
                maxLength={100}
                style={{ maxWidth: 240 }}
              />
              <button type="submit" className="btn btn-theme-primary btn-sm" disabled={profileSaving}>
                {profileSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
            {profileMessage.text && (
              <p className={`small mt-2 mb-0 ${profileMessage.type === 'success' ? 'text-success' : profileMessage.type === 'error' ? 'text-danger' : 'text-muted'}`}>
                {profileMessage.text}
              </p>
            )}
          </form>
        </div>
      </div>

      <div className="card theme-card shadow-theme mb-3">
        <div className="card-body">
          <h3 className="h6 fw-semibold theme-text mb-3">Change password</h3>
          <form onSubmit={handleChangePassword}>
            <div className="mb-2">
              <label htmlFor="profile-current-pw" className="form-label theme-text small">Current password</label>
              <input
                id="profile-current-pw"
                type="password"
                className="form-control theme-input"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Current password"
                autoComplete="current-password"
              />
            </div>
            <div className="mb-2">
              <label htmlFor="profile-new-pw" className="form-label theme-text small">New password</label>
              <input
                id="profile-new-pw"
                type="password"
                className="form-control theme-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
              />
            </div>
            <div className="mb-3">
              <label htmlFor="profile-confirm-pw" className="form-label theme-text small">Confirm new password</label>
              <input
                id="profile-confirm-pw"
                type="password"
                className="form-control theme-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                autoComplete="new-password"
              />
            </div>
            <button type="submit" className="btn btn-outline-secondary btn-sm" disabled={passwordSaving}>
              {passwordSaving ? 'Updating…' : 'Change password'}
            </button>
            {passwordMessage.text && (
              <p className={`small mt-2 mb-0 ${passwordMessage.type === 'success' ? 'text-success' : 'text-danger'}`}>
                {passwordMessage.text}
              </p>
            )}
          </form>
        </div>
      </div>

      <Link to="/settings" className="btn btn-outline-secondary btn-sm">
        Settings &amp; reminders
      </Link>
    </div>
  );
}
