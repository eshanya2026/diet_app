/**
 * Water intake tracker: daily target in ml, progress circle, log, and reminder status.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { getUserSettings, updateUserSettings } from '../api/dietApi';

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
    setReminderStatusLoading(true);
    getUserSettings()
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

  const toggleReminders = async () => {
    if (reminderStatusLoading) return;
    const nextValue = !reminderStatus;
    setReminderStatusLoading(true);
    try {
      const res = await updateUserSettings({ water_reminders_enabled: nextValue });
      if (res?.success) {
        setReminderStatus(nextValue);
      }
    } catch (err) {
      console.error('Failed to update reminders:', err);
    } finally {
      setReminderStatusLoading(false);
    }
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
    <div className="font-display">
      <div className="w-full mx-auto px-8 py-8 space-y-8">
        {/* Header Section */}
        <header className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Water Tracker</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Stay hydrated, stay healthy.</p>
          </div>
          <div className="flex gap-2">
            {/* Removed header buttons */}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left Column: Visual Progress */}
          <div className="lg:col-span-2 space-y-8 text-center">
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-primary/10 shadow-sm relative overflow-hidden flex flex-col items-center justify-center min-h-[460px]">
              {/* Background Pattern/Decoration */}
              <div className="absolute -top-24 -right-24 size-64 bg-primary/5 rounded-full blur-3xl"></div>
              
              {/* Main Visualization - High Fidelity Circle Liquid Fill */}
              <div className="relative size-64 flex items-center justify-center">
                {/* Circular Container */}
                <div className="relative size-full rounded-full border-8 border-sky-500/10 flex items-center justify-center overflow-hidden shadow-2xl bg-white dark:bg-slate-900 shadow-sky-500/5">
                  
                  {/* Liquid Fill Group */}
                  <div 
                    className="absolute bottom-0 left-0 w-full transition-all duration-1000 ease-in-out bg-sky-500"
                    style={{ height: `${progress}%` }}
                  >
                    {/* Secondary Wave (Back) */}
                    <div className="absolute top-0 left-[-200%] w-[400%] h-24 -translate-y-[80%] opacity-40 animate-wave-slow">
                      <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-full fill-sky-400">
                        <path d="M0,60 C300,0 300,120 600,60 C900,0 900,120 1200,60 L1200,120 L0,120 Z" />
                      </svg>
                    </div>

                    {/* Primary Wave (Front) */}
                    <div className="absolute top-0 left-[-200%] w-[400%] h-24 -translate-y-[90%] animate-wave">
                      <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-full fill-sky-500">
                        <path d="M0,60 C300,0 300,120 600,60 C900,0 900,120 1200,60 L1200,120 L0,120 Z" />
                      </svg>
                    </div>
                  </div>
                  
                  {/* Inner Content - Floats above liquid */}
                  <div className="relative z-10 flex flex-col items-center">
                    <span className={`material-symbols-outlined ${progress > 45 ? 'text-white' : 'text-sky-500'} text-5xl mb-2 fill-1 transition-colors duration-500`}>water_drop</span>
                    <div className={`text-5xl font-bold ${progress > 55 ? 'text-white' : 'text-slate-900 dark:text-slate-100'} transition-colors duration-500`}>{todayMl.toLocaleString()}</div>
                    <div className={`text-[10px] font-bold tracking-widest uppercase mt-1 ${progress > 65 ? 'text-white/70' : 'text-slate-400'} transition-colors duration-500`}>/ {goalMl.toLocaleString()} ml</div>
                  </div>
                </div>
              </div>

              <div className="mt-10">
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{progressMessage}</h3>
                <p className="text-[11px] text-slate-500 mt-2 font-medium">
                  {progress >= 100 ? "You've crushed your goal today!" : `You've reached ${Math.round(progress)}% of your daily goal. ${Math.max(0, goalMl - todayMl).toLocaleString()}ml to go!`}
                </p>
              </div>

              {/* Progress Bar Secondary */}
              <div className="w-full mt-8 max-w-sm">
                <div className="h-2 w-full bg-sky-500/10 rounded-full overflow-hidden">
                  <div className="h-full bg-sky-500 rounded-full transition-all duration-700" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            </div>

            {/* Quick Add Controls */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-primary/10 shadow-sm text-left">
              <div className="flex items-center justify-between mb-6">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-sm">
                  <span className="material-symbols-outlined text-sky-500 text-xl">add_circle</span>
                  Quick Add
                </h4>
                {todayMl > 0 && (
                  <button onClick={() => removeMl(250)} className="text-[10px] font-bold text-sky-500 hover:underline flex items-center gap-1 uppercase tracking-widest transition-all">
                    <span className="material-symbols-outlined text-sm">history</span> Undo
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-4">
                {quickAddOptions.map(({ ml, label }) => (
                  <button 
                    key={label}
                    onClick={() => addMl(ml)}
                    className="group flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-sky-500/5 hover:border-sky-500/40 hover:bg-sky-500/5 transition-all"
                  >
                    <span className="material-symbols-outlined text-sky-500/60 group-hover:text-sky-500 text-xl">
                      {label === 'Glass' ? 'local_drink' : label === '500 ml' ? 'water_bottle' : 'local_drink'}
                    </span>
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{label === 'Glass' ? '+Glass' : `+${ml}ml`}</span>
                  </button>
                ))}
              </div>
              <div className="mt-5">
                <button 
                  onClick={() => {
                    const amount = window.prompt("Enter custom amount in ml (e.g., 300):");
                    if (amount) {
                      const ml = parseInt(amount, 10);
                      if (!isNaN(ml) && ml > 0) {
                        addMl(ml);
                      }
                    }
                  }}
                  className="w-full py-3.5 bg-slate-50 dark:bg-slate-700/30 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 text-xs font-bold hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">edit</span>
                  Custom Amount
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Settings and Logs */}
          <div className="space-y-8">
            {/* Goal Settings */}
            <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-sky-500/10 shadow-sm">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2 text-sm">
                <span className="material-symbols-outlined text-sky-500 text-xl px-0.5">tune</span>
                Tracker Settings
              </h4>
              <div className="space-y-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Daily Target</label>
                  <div className="flex items-center gap-3">
                    <input 
                      className="w-full bg-sky-500/5 border-none rounded-lg text-lg font-bold text-sky-500 focus:ring-2 focus:ring-sky-500/20 p-2.5" 
                      type="number" 
                      value={goalMlInput}
                      onChange={(e) => setGoalMlInput(e.target.value)}
                      onBlur={() => {
                        const v = parseInt(goalMlInput.trim(), 10);
                        const clamped = Number.isFinite(v) ? Math.max(MIN_GOAL_ML, Math.min(MAX_GOAL_ML, v)) : goalMl;
                        setGoalMl(clamped);
                        setGoalMlInput(String(clamped));
                      }}
                    />
                    <span className="text-xs font-bold text-slate-500">ml</span>
                  </div>
                </div>
                <div className="flex items-center justify-between py-2 border-t border-slate-50 dark:border-slate-700/50">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Smart Reminders</span>
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">
                      {reminderStatus === true ? "Every 2 hours" : "Currently disabled"}
                    </span>
                  </div>
                  <div 
                    onClick={toggleReminders}
                    className={`relative inline-flex items-center cursor-pointer group ${reminderStatusLoading ? 'opacity-50' : ''}`}
                  >
                    <div className={`w-10 h-5 rounded-full transition-colors ${reminderStatus === true ? 'bg-sky-500' : 'bg-slate-300'}`}></div>
                    <div className={`absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-transform ${reminderStatus === true ? 'translate-x-5' : 'translate-x-0'}`}></div>
                  </div>
                </div>
                <Link to="/settings" className="block w-full py-3 border border-sky-500/20 !text-sky-500 font-bold rounded-xl text-[11px] uppercase tracking-widest text-center hover:bg-sky-500/5 transition-all !no-underline">
                  Update Goal
                </Link>
              </div>
            </section>

            {/* Recent Logs (Simulated from actual data - only showing today's totals or undo) */}
            <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-sky-500/10 shadow-sm flex flex-col min-h-[360px]">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2 text-sm">
                <span className="material-symbols-outlined text-sky-500 text-xl">receipt_long</span>
                Daily Summary
              </h4>
              <div className="space-y-4 flex-grow">
                {todayMl > 0 ? (
                  <div className="flex items-center justify-between p-3.5 bg-sky-500/5 rounded-2xl border border-sky-500/10">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-500">
                        <span className="material-symbols-outlined text-xl">water_drop</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{todayMl} ml</span>
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Total Intake</span>
                      </div>
                    </div>
                    {/* Placeholder for log time/delete if we had full log data in state */}
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Today</span>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 py-10">
                    <span className="material-symbols-outlined text-4xl mb-2 text-sky-500">water_drop</span>
                    <p className="text-[10px] font-bold uppercase tracking-widest">No water logged yet</p>
                  </div>
                )}
              </div>
              <button className="mt-6 w-full text-[10px] font-bold text-slate-400 hover:text-sky-500 transition-colors flex items-center justify-center gap-1 uppercase tracking-widest">
                View Full History <span className="material-symbols-outlined text-xs">arrow_forward</span>
              </button>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
