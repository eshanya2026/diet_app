/**
 * Settings: theme, data, and smart meal reminders.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import PageHeader from '../components/PageHeader';
import { getUserSettings, updateUserSettings } from '../api/dietApi';

const STORAGE_KEYS = ['diet_app_theme', 'latestDietResult', 'dietUserId', 'water_log', 'weight_log'];

function getUserId() {
  try {
    return sessionStorage.getItem('dietUserId') ?? null;
  } catch {
    return null;
  }
}

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const [userId] = useState(getUserId);
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [waterRemindersEnabled, setWaterRemindersEnabled] = useState(false);
  const [times, setTimes] = useState({
    breakfast_time: '08:00',
    lunch_time: '13:00',
    dinner_time: '20:00',
  });
  const [settingsError, setSettingsError] = useState('');
  const [settingsSaved, setSettingsSaved] = useState('');
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoadingSettings(true);
    getUserSettings(userId)
      .then((res) => {
        if (res?.success && res.data) {
          setRemindersEnabled(Boolean(res.data.reminders_enabled));
          setWaterRemindersEnabled(Boolean(res.data.water_reminders_enabled));
          setTimes({
            breakfast_time: res.data.breakfast_time || '08:00',
            lunch_time: res.data.lunch_time || '13:00',
            dinner_time: res.data.dinner_time || '20:00',
          });
        }
      })
      .catch((err) => {
        setSettingsError(err?.error?.message ?? 'Failed to load reminder settings.');
      })
      .finally(() => setLoadingSettings(false));
  }, [userId]);

  const handleClearData = () => {
    if (!window.confirm('Clear all local data (plans, water, weight)? This cannot be undone.')) return;
    STORAGE_KEYS.forEach((k) => localStorage.removeItem(k));
    sessionStorage.clear();
    setTheme(theme);
    window.alert('Data cleared. Reload the page.');
  };

  const handleTimeChange = (key, value) => {
    setTimes((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveReminders = async () => {
    if (!userId) {
      setSettingsError('Generate a diet plan first so we can link reminders to your user.');
      return;
    }
    setSettingsError('');
    setSettingsSaved('');
    setSavingSettings(true);
    try {
      const res = await updateUserSettings({
        user_id: userId,
        ...times,
        reminders_enabled: remindersEnabled,
        water_reminders_enabled: waterRemindersEnabled,
      });
      if (res?.success) {
        setSettingsSaved('Reminder settings saved.');
      } else {
        setSettingsError(res?.error?.message ?? 'Failed to save reminder settings.');
      }
    } catch (err) {
      setSettingsError(err?.error?.message ?? 'Failed to save reminder settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="theme-bg">
      <PageHeader title="Settings" description="Preferences and reminders" />

      <div className="card theme-card shadow-theme mb-3">
        <div className="card-body">
          <h2 className="h6 fw-semibold theme-text mb-2">Smart meal reminders</h2>
          {!userId && (
            <p className="text-muted small mb-2">
              Generate a diet plan first so we can attach reminders to your user.
            </p>
          )}
          {userId && (
            <>
              <p className="text-muted small mb-2">
                Get gentle reminders around meal times. Keep this tab open to receive notifications.
              </p>
              <div className="form-check form-switch mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="reminders-enabled"
                  checked={remindersEnabled}
                  onChange={(e) => setRemindersEnabled(e.target.checked)}
                  disabled={loadingSettings}
                />
                <label className="form-check-label theme-text" htmlFor="reminders-enabled">
                  Enable meal reminders
                </label>
              </div>
              <div className="form-check form-switch mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="water-reminders-enabled"
                  checked={waterRemindersEnabled}
                  onChange={(e) => setWaterRemindersEnabled(e.target.checked)}
                  disabled={loadingSettings}
                />
                <label className="form-check-label theme-text" htmlFor="water-reminders-enabled">
                  Enable water reminders
                </label>
              </div>
              {waterRemindersEnabled && (
                <p className="text-muted small mb-3">You’ll get a reminder every 2 hours (keep this tab open).</p>
              )}
              <div className="row g-3">
                <div className="col-12 col-md-4">
                  <label htmlFor="rem-breakfast" className="form-label theme-text">Breakfast time</label>
                  <input
                    id="rem-breakfast"
                    type="time"
                    className="form-control theme-input"
                    value={times.breakfast_time}
                    onChange={(e) => handleTimeChange('breakfast_time', e.target.value)}
                    disabled={!remindersEnabled || loadingSettings}
                  />
                </div>
                <div className="col-12 col-md-4">
                  <label htmlFor="rem-lunch" className="form-label theme-text">Lunch time</label>
                  <input
                    id="rem-lunch"
                    type="time"
                    className="form-control theme-input"
                    value={times.lunch_time}
                    onChange={(e) => handleTimeChange('lunch_time', e.target.value)}
                    disabled={!remindersEnabled || loadingSettings}
                  />
                </div>
                <div className="col-12 col-md-4">
                  <label htmlFor="rem-dinner" className="form-label theme-text">Dinner time</label>
                  <input
                    id="rem-dinner"
                    type="time"
                    className="form-control theme-input"
                    value={times.dinner_time}
                    onChange={(e) => handleTimeChange('dinner_time', e.target.value)}
                    disabled={!remindersEnabled || loadingSettings}
                  />
                </div>
              </div>
              {settingsError && <p className="text-danger small mt-2 mb-0">{settingsError}</p>}
              {settingsSaved && !settingsError && <p className="text-success small mt-2 mb-0">{settingsSaved}</p>}
              <div className="mt-3">
                <button
                  type="button"
                  className="btn btn-theme-primary btn-sm"
                  onClick={handleSaveReminders}
                  disabled={savingSettings || loadingSettings || !userId}
                >
                  {savingSettings ? 'Saving…' : 'Save reminders'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="card theme-card shadow-theme mb-3">
        <div className="card-body">
          <h2 className="h6 fw-semibold theme-text mb-2">Data</h2>
          <p className="text-muted small mb-2">Clear all data stored in this browser (diet results, water log, weight log).</p>
          <button
            type="button"
            className="btn btn-outline-danger btn-sm cursor-pointer"
            onClick={handleClearData}
            aria-label="Clear all local data"
          >
            Clear all data
          </button>
        </div>
      </div>

      <div className="card theme-card shadow-theme mb-3">
        <div className="card-body">
          <h2 className="h6 fw-semibold theme-text mb-2">Admin</h2>
          <p className="text-muted small mb-2">Administrators can monitor users and analytics from the admin panel.</p>
          <Link to="/admin/login" className="btn btn-outline-secondary btn-sm">Open admin panel</Link>
        </div>
      </div>
    </div>
  );
}
