/**
 * Water intake tracker: daily target in ml, progress circle, log, and reminder status.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { getUserSettings } from '../api/dietApi';

const STORAGE_KEY = 'water_log';
const GOAL_ML_KEY = 'water_goal_ml';
const USER_ID_KEY = 'dietUserId';
const DEFAULT_GOAL_ML = 2000;
const MIN_GOAL_ML = 100;
const MAX_GOAL_ML = 10000;
const GLASS_ML = 250;
const WATER_RING_RADIUS = 72;
const WATER_RING_STROKE = 12;

/** Assume values &lt; 100 are legacy "glasses" and convert to ml (1 glass = 250 ml). */
function migrateLogToMl(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const out = {};
  for (const [date, value] of Object.entries(raw)) {
    const num = Number(value);
    if (Number.isFinite(num)) {
      out[date] = num < 100 ? Math.round(num * GLASS_ML) : Math.round(num);
    }
  }
  return out;
}

function getUserId() {
  try {
    return sessionStorage.getItem(USER_ID_KEY) ?? null;
  } catch {
    return null;
  }
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function loadLog() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return migrateLogToMl(parsed);
  } catch {
    return {};
  }
}

function saveLog(log) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
  } catch (_) {}
}

function parseGoalMlFromStorage() {
  try {
    const g = localStorage.getItem(GOAL_ML_KEY);
    const n = g ? parseInt(g, 10) : DEFAULT_GOAL_ML;
    return Number.isFinite(n) ? Math.max(MIN_GOAL_ML, Math.min(MAX_GOAL_ML, n)) : DEFAULT_GOAL_ML;
  } catch {
    return DEFAULT_GOAL_ML;
  }
}

export default function Water() {
  const [goalMl, setGoalMl] = useState(parseGoalMlFromStorage);
  const [goalMlInput, setGoalMlInput] = useState(() => String(parseGoalMlFromStorage()));
  const [log, setLog] = useState(loadLog);
  const [reminderStatus, setReminderStatus] = useState(null);
  const [reminderStatusLoading, setReminderStatusLoading] = useState(false);
  const today = getTodayKey();
  const todayMl = log[today] ?? 0;

  useEffect(() => {
    saveLog(log);
  }, [log]);

  useEffect(() => {
    const value = Math.max(MIN_GOAL_ML, Math.min(MAX_GOAL_ML, goalMl));
    localStorage.setItem(GOAL_ML_KEY, String(value));
  }, [goalMl]);

  useEffect(() => {
    const userId = getUserId();
    if (!userId) {
      setReminderStatus(null);
      return;
    }
    setReminderStatusLoading(true);
    getUserSettings(userId)
      .then((res) => {
        if (res?.success && res.data) {
          setReminderStatus(typeof res.data.water_reminders_enabled === 'boolean' ? res.data.water_reminders_enabled : false);
        } else {
          setReminderStatus(false);
        }
      })
      .catch(() => setReminderStatus(null))
      .finally(() => setReminderStatusLoading(false));
  }, []);

  const addMl = (amount) => {
    const safe = Math.max(0, Math.floor(Number(amount)) || 0);
    if (safe === 0) return;
    setLog((prev) => ({ ...prev, [today]: (prev[today] ?? 0) + safe }));
  };

  const removeMl = (amount = 250) => {
    const safe = Math.max(0, Math.floor(Number(amount)) || 0);
    if (safe === 0 || todayMl <= 0) return;
    setLog((prev) => ({ ...prev, [today]: Math.max(0, (prev[today] ?? 0) - safe) }));
  };

  const progress = goalMl > 0 ? Math.min(100, (todayMl / goalMl) * 100) : 0;
  const circumference = 2 * Math.PI * WATER_RING_RADIUS;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const progressMessage =
    progress >= 100
      ? 'You did it! Stay hydrated.'
      : progress >= 75
        ? 'Almost there!'
        : progress >= 50
          ? 'Halfway there.'
          : progress >= 25
            ? 'Great start.'
            : 'Tap below to log water.';

  const quickAddOptions = [
    { ml: 250, label: '250 ml' },
    { ml: 500, label: '500 ml' },
    { ml: GLASS_ML, label: 'Glass' },
  ];

  return (
    <div className="theme-bg">
      <PageHeader title="Water tracker" description="Hit your daily target" />

      {/* Hero progress card – app-style */}
      <div className="water-hero">
        <div className="water-hero-inner">
          <div className="water-circle-wrap" aria-hidden>
            <svg className="water-circle-svg" viewBox="0 0 180 180" width={180} height={180}>
              <defs>
                <linearGradient id="waterGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0ea5e9" />
                  <stop offset="50%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#22d3ee" />
                </linearGradient>
                <filter id="waterShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0ea5e9" floodOpacity="0.3" />
                </filter>
              </defs>
              <circle
                className="water-circle-bg"
                cx="90"
                cy="90"
                r={WATER_RING_RADIUS}
                fill="none"
                strokeWidth={WATER_RING_STROKE}
              />
              <circle
                className="water-circle-fill"
                cx="90"
                cy="90"
                r={WATER_RING_RADIUS}
                fill="none"
                strokeWidth={WATER_RING_STROKE}
                stroke="url(#waterGradient)"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                transform="rotate(-90 90 90)"
                style={{ filter: 'url(#waterShadow)' }}
              />
            </svg>
            <div className="water-circle-center">
              <span className="water-droplet-icon" role="img" aria-label="Water">💧</span>
              <span className="water-circle-percent water-circle-percent-hero" aria-label={`${Math.round(progress)}% of daily goal`}>
                {Math.round(progress)}%
              </span>
              <span className="water-circle-value theme-text fw-bold">{todayMl.toLocaleString()}</span>
              <span className="water-circle-goal text-muted small">/ {goalMl.toLocaleString()} ml</span>
            </div>
          </div>
          <p className="water-hero-message theme-text">{progressMessage}</p>

          <div className="water-quick-add" role="group" aria-label="Quick add water">
            {quickAddOptions.map(({ ml, label }) => (
              <button
                key={ml}
                type="button"
                className="water-chip cursor-pointer"
                onClick={() => addMl(ml)}
                aria-label={`Add ${label}`}
              >
                <span className="water-chip-icon">+</span>
                <span className="water-chip-label">{label}</span>
              </button>
            ))}
          </div>
          {todayMl > 0 && (
            <button
              type="button"
              className="water-undo cursor-pointer"
              onClick={() => removeMl(250)}
              aria-label="Remove 250 ml"
            >
              Undo last 250 ml
            </button>
          )}
        </div>
      </div>

      {/* Reminder + goal in one compact card */}
      <div className="card theme-card shadow-theme water-settings-card">
        <div className="card-body py-3">
          <div className="water-settings-row">
            <div className="water-setting-block">
              <span className="text-muted small">Reminders</span>
              {reminderStatusLoading ? (
                <span className="theme-text small">…</span>
              ) : getUserId() == null ? (
                <span className="theme-text small">—</span>
              ) : reminderStatus === true ? (
                <span className="text-success small fw-semibold">On (every 2 hrs)</span>
              ) : (
                <span className="text-muted small">Off</span>
              )}
            </div>
            <div className="water-setting-block">
              <label htmlFor="water-goal-ml" className="text-muted small mb-0">Daily target</label>
              <input
                id="water-goal-ml"
                type="number"
                min={MIN_GOAL_ML}
                max={MAX_GOAL_ML}
                step={50}
                className="form-control form-control-sm theme-input water-goal-ml-input"
                value={goalMlInput}
                onChange={(e) => setGoalMlInput(e.target.value)}
                onBlur={() => {
                  const v = parseInt(goalMlInput.trim(), 10);
                  const clamped = Number.isFinite(v)
                    ? Math.max(MIN_GOAL_ML, Math.min(MAX_GOAL_ML, v))
                    : goalMl;
                  setGoalMl(clamped);
                  setGoalMlInput(String(clamped));
                }}
                aria-label="Daily water target in milliliters"
              />
              <span className="text-muted small ms-1">ml</span>
            </div>
            <Link to="/settings" className="water-settings-link small">Settings</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
