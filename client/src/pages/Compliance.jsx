/**
 * Diet compliance tracker: log daily meal adherence and view history.
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { IconChartBar, IconChecklist } from '../components/Icons';
import { getHistory, logCompliance, getCompliance } from '../api/dietApi';

const MEAL_LABELS = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'mid_snack', label: 'Mid-morning snack' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'evening_snack', label: 'Evening snack' },
  { key: 'dinner', label: 'Dinner' },
];

function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString(undefined, { dateStyle: 'medium' });
  } catch {
    return dateStr;
  }
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
/** getDay(): 0=Sun, 1=Mon, ... 6=Sat. Order for chart: Mon(1), Tue(2), ..., Sun(0). */
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function getWeeklyAdherenceByDay(logs) {
  const byDay = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  for (const log of logs) {
    const dateStr = log.log_date;
    if (!dateStr) continue;
    const pct = log.summary?.percent;
    if (pct == null) continue;
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dayOfWeek = new Date(y, m - 1, d).getDay();
      byDay[dayOfWeek].push(pct);
    } catch {
      // skip invalid date
    }
  }
  return WEEKDAY_ORDER.map((dayIndex, i) => {
    const values = byDay[dayIndex] ?? [];
    const avg = values.length > 0
      ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
      : null;
    return { day: WEEKDAY_LABELS[i], percent: avg };
  });
}

const WEEKLY_GOAL_DAYS = 5;

function getWeekStartDate() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateStr(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function getCurrentWeekProgress(logs) {
  const start = getWeekStartDate();
  const startStr = toDateStr(start);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const endStr = toDateStr(end);
  const inWeek = logs.filter((log) => {
    const d = log.log_date;
    return d && d >= startStr && d < endStr;
  });
  const uniqueDays = new Set(inWeek.map((l) => l.log_date));
  return { count: uniqueDays.size, goal: WEEKLY_GOAL_DAYS };
}

function getStreak(logs) {
  const sorted = [...logs]
    .map((l) => l.log_date)
    .filter(Boolean)
    .sort((a, b) => b.localeCompare(a));
  const uniq = [...new Set(sorted)];
  const today = todayStr();
  if (uniq.length === 0 || uniq[0] !== today) return 0;
  let streak = 0;
  let expected = today;
  for (const d of uniq) {
    if (d !== expected) break;
    streak++;
    const next = new Date(expected.replace(/-/g, '/'));
    next.setDate(next.getDate() - 1);
    expected = toDateStr(next);
  }
  return streak;
}

function getBestStreak(logs) {
  const dates = [...new Set(logs.map((l) => l.log_date).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  if (dates.length === 0) return 0;
  let best = 1;
  let current = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1].replace(/-/g, '/'));
    prev.setDate(prev.getDate() + 1);
    const nextStr = toDateStr(prev);
    if (dates[i] === nextStr) {
      current++;
    } else {
      if (current > best) best = current;
      current = 1;
    }
  }
  return current > best ? current : best;
}

function getGoalImpactMessage(goal, percent) {
  const g = (goal ?? '').toLowerCase();
  const p = Number(percent) || 0;
  if (p >= 80) {
    if (g.includes('weight loss')) return 'Strong adherence supports your calorie deficit and weight loss progress.';
    if (g.includes('weight gain') || g.includes('muscle')) return 'Strong adherence helps you hit your surplus and build toward your goal.';
    return 'Sticking to your plan is helping you stay on track.';
  }
  if (p >= 50) {
    if (g.includes('weight loss')) return 'Good start — try to follow more meals to see better weight loss results.';
    if (g.includes('weight gain') || g.includes('muscle')) return 'Consistency matters — aim for more days on plan to support gains.';
    return 'Every meal you follow counts. Try to increase adherence for better results.';
  }
  if (p > 0) {
    return 'Low adherence so far. Small steps help — log daily and aim to follow at least 3–4 meals.';
  }
  return 'Start logging to see how compliance impacts your goal.';
}

export default function Compliance() {
  const [plans, setPlans] = useState([]);
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    plan_id: '',
    log_date: todayStr(),
    meals: { breakfast: false, mid_snack: false, lunch: false, evening_snack: false, dinner: false },
  });

  const fetchPlans = useCallback(async () => {
    try {
      const res = await getHistory();
      return res?.success && Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
  }, []);

  const fetchCompliance = useCallback(async () => {
    try {
      const res = await getCompliance({ limit: 30 });
      return { data: res?.data ?? [], summary: res?.summary ?? null };
    } catch {
      return { data: [], summary: null };
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [planList, { data: logData, summary: sum }] = await Promise.all([
        fetchPlans(),
        fetchCompliance(),
      ]);
      if (!cancelled) {
        setPlans(planList);
        setLogs(logData);
        setSummary(sum);
        setForm((f) => ({
          ...f,
          plan_id: planList.length > 0 ? (planList[0].id ?? '') : f.plan_id,
        }));
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [fetchPlans, fetchCompliance]);

  const handleMealChange = (key) => {
    setForm((f) => ({
      ...f,
      meals: { ...f.meals, [key]: !f.meals[key] },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.plan_id) {
      setError('Select a diet plan to track against.');
      return;
    }
    setSubmitLoading(true);
    try {
      const res = await logCompliance({
        plan_id: form.plan_id,
        log_date: form.log_date,
        meals: form.meals,
      });
      if (res?.success && res?.data) {
        setSuccess(`Saved: ${res.data.summary?.followed ?? 0}/5 meals followed for ${formatDate(form.log_date)}.`);
        const { data: logData, summary: sum } = await fetchCompliance();
        setLogs(logData);
        setSummary(sum);
      } else {
        setError(res?.error?.message ?? 'Failed to save. Try again.');
      }
    } catch (err) {
      const msg = err?.error?.message ?? err?.error?.messages ?? 'Something went wrong. Try again.';
      setError(Array.isArray(msg) ? msg.join(' ') : msg);
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="theme-bg">
        <PageHeader title="Compliance Tracker" description="Track your daily diet adherence." />
        <div className="d-flex align-items-center gap-2 text-muted">
          <span className="spinner-border spinner-border-sm" aria-hidden />
          <span>Loading…</span>
        </div>
      </div>
    );
  }

  if (!loading && plans.length === 0) {
    return (
      <div className="theme-bg">
        <PageHeader title="Compliance Tracker" description="Track your daily diet adherence." />
        <div className="card theme-card shadow-theme">
          <div className="card-body text-center py-4">
            <p className="text-muted mb-3">Generate a diet plan first so we can track your compliance.</p>
            <Link to="/generate" className="btn btn-theme-primary">Generate diet plan</Link>
          </div>
        </div>
      </div>
    );
  }

  const selectedPlan = plans.find((p) => p.id === form.plan_id) ?? plans[0];
  const goal = selectedPlan?.goal ?? null;
  const adherencePercent = summary?.overall_percent ?? 0;
  const goalLabel = goal ? goal.replace(/\b\w/g, (c) => c.toUpperCase()) : 'Your diet goal';
  const weeklyAdherence = getWeeklyAdherenceByDay(logs);
  const hasWeeklyData = weeklyAdherence.some((row) => row.percent != null);
  const weekProgress = getCurrentWeekProgress(logs);
  const streak = getStreak(logs);
  const bestStreak = getBestStreak(logs);

  const handleExportCsv = () => {
    if (!logs.length) return;
    const headers = ['Date', 'Plan ID', 'Meals followed', 'Total meals', 'Adherence %'];
    const rows = logs.map((l) => [
      l.log_date ?? '',
      l.plan_id ?? '',
      l.summary?.followed ?? '',
      l.summary?.total ?? 5,
      l.summary?.percent ?? '',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance-${todayStr()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 min-w-0 overflow-y-auto font-display">
      <header className="mb-8 p-8 pb-0">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white">Compliance Tracker</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Track your dietary adherence and reach your goals.</p>
      </header>

      <main className="p-8 pt-0">
        {/* Quick Stats Row from code.html */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-background-dark/30 p-6 rounded-2xl border border-primary/5 shadow-sm">
            <p className="text-xs text-slate-500 font-bold mb-1 uppercase tracking-widest">Days Logged</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900 dark:text-white">{summary?.days_logged ?? 0}</span>
              <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded uppercase">Live</span>
            </div>
          </div>
          <div className="bg-white dark:bg-background-dark/30 p-6 rounded-2xl border border-primary/5 shadow-sm">
            <p className="text-xs text-slate-500 font-bold mb-1 uppercase tracking-widest">Meals Followed</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900 dark:text-white">
                {summary?.total_meals_followed ?? 0}
                <span className="text-slate-400 text-lg font-medium ml-1">/ {summary?.total_meals_possible ?? 0}</span>
              </span>
            </div>
          </div>
          <div className="bg-white dark:bg-background-dark/30 p-6 rounded-2xl border border-primary/5 shadow-sm">
            <p className="text-xs text-slate-500 font-bold mb-1 uppercase tracking-widest">Adherence %</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900 dark:text-white">{summary?.overall_percent ?? 0}%</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${adherencePercent >= 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-[rgb(244,37,89)]/10 !text-[rgb(244,37,89)]'}`}>
                {adherencePercent >= 80 ? 'Excellent' : adherencePercent >= 50 ? 'Good' : 'Keep Going'}
              </span>
            </div>
          </div>
          <div className="bg-white dark:bg-background-dark/30 p-6 rounded-2xl border border-primary/5 shadow-sm">
            <p className="text-xs text-slate-500 font-bold mb-1 uppercase tracking-widest">Current Streak</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900 dark:text-white">{streak} Days</span>
              {streak > 5 && <span className="material-symbols-outlined !text-[rgb(244,37,89)] text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Insights & Charts */}
          <div className="lg:col-span-2 space-y-8">
            {/* Achievement Card from code.html */}
            <div className="bg-white dark:bg-background-dark/30 rounded-2xl overflow-hidden shadow-sm border border-primary/5 flex flex-col md:flex-row">
            <div className="md:w-1/4 bg-[rgb(244,37,89)]/5 flex items-center justify-center p-6">
              <div className="w-20 h-20 rounded-full bg-[rgb(244,37,89)]/20 flex items-center justify-center border-4 border-[rgb(244,37,89)]/10 shadow-inner">
                <span className="material-symbols-outlined text-4xl !text-[rgb(244,37,89)]" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
              </div>
            </div>
              <div className="p-6 md:w-3/4 flex flex-col justify-center">
                <p className="text-primary text-[9px] font-bold uppercase tracking-widest mb-1">Achievement Unlocked</p>
                <h3 className="text-lg font-bold mb-1 text-slate-900 dark:text-white">Best Streak: {bestStreak} Days</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs mb-4 leading-relaxed font-medium">
                  {bestStreak > 0 ? "You're doing amazing! Keep maintaining your consistency to reach your weight loss goal faster." : "Start logging today to begin your journey and earn your first streak achievement!"}
                </p>
                <button className="!bg-[rgb(244,37,89)] text-white text-[9px] font-bold uppercase tracking-widest px-5 py-2 rounded-lg self-start hover:scale-[1.05] transition-all shadow-md">
                  View History
                </button>
              </div>
            </div>

            {/* Weekly Adherence Chart from code.html */}
            <div className="bg-white dark:bg-background-dark/30 p-6 rounded-2xl border border-primary/5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Weekly Adherence</h3>
                <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Current Week</span>
              </div>
              <div className="flex items-end justify-between h-40 gap-2">
                {weeklyAdherence.map(({ day, percent }) => (
                  <div key={day} className="flex-1 flex flex-col items-center gap-2 h-full">
                    <div className="w-full bg-[rgb(244,37,89)]/5 rounded-t-lg relative group h-full flex items-end overflow-hidden">
                      <div
                        className={`w-full rounded-t-lg transition-all duration-700 ${percent === null ? 'bg-slate-100 dark:bg-slate-800' : (percent >= 80 ? 'bg-emerald-500' : 'bg-[rgb(244,37,89)]')}`}
                        style={{ height: `${percent ?? 5}%` }}
                      ></div>
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] py-1 px-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 font-bold shadow-lg">
                        {percent != null ? `${percent}%` : 'Pending'}
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{day[0]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Goal Impact Section from code.html */}
            <div className="bg-white dark:bg-background-dark/30 p-6 rounded-2xl border border-primary/5 shadow-sm">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="size-8 rounded-lg bg-[rgb(244,37,89)]/10 flex items-center justify-center !text-[rgb(244,37,89)]">
                      <span className="material-symbols-outlined font-bold text-lg">trending_up</span>
                    </div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white uppercase">Goal Impact: {goalLabel}</h3>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed font-medium">
                    {getGoalImpactMessage(goal, adherencePercent)}
                  </p>
                </div>
                <Link to="/history" className="flex items-center gap-1.5 !text-[rgb(244,37,89)] font-bold text-[9px] hover:underline whitespace-nowrap uppercase tracking-widest group">
                  Detailed Progress
                  <span className="material-symbols-outlined text-xs group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column: Actions */}
          <div className="space-y-8">
            {/* Log Today Section from code.html */}
            <div className="bg-white dark:bg-background-dark/30 p-6 rounded-2xl border border-primary/5 shadow-sm">
              <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-white tracking-tight">Log Today</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="compliance-plan" className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Diet Plan</label>
                  <select
                    id="compliance-plan"
                    className="!w-full !block h-10 rounded-lg border-primary/10 bg-primary/[0.03] text-xs font-semibold focus:border-primary focus:ring-primary dark:text-white px-3"
                    value={form.plan_id}
                    onChange={(e) => setForm((f) => ({ ...f, plan_id: e.target.value }))}
                    required
                  >
                    <option value="">Select plan</option>
                    {plans.map((p) => (
                      <option key={p.id ?? p.created_at} value={p.id ?? ''}>
                        {formatDate(p.created_at?.slice(0, 10))} — BMI {p.bmi ?? '—'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="compliance-date" className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Date</label>
                  <input
                    id="compliance-date"
                    className="!w-full !block h-10 rounded-lg border-primary/10 bg-primary/[0.03] text-xs font-semibold focus:border-primary focus:ring-primary dark:text-white px-3"
                    type="date"
                    value={form.log_date}
                    onChange={(e) => setForm((f) => ({ ...f, log_date: e.target.value || todayStr() }))}
                    max={todayStr()}
                  />
                </div>
                <div className="space-y-3 pt-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Meals Followed</label>
                  <div className="space-y-2 !flex !flex-col">
                    {MEAL_LABELS.map(({ key, label }) => (
                      <label key={key} className="!w-full !flex !items-center !justify-between p-3 rounded-lg border border-primary/10 bg-white dark:bg-transparent cursor-pointer hover:bg-primary/5 transition-all !m-0 !gap-0">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{label}</span>
                        <input
                          checked={form.meals[key] ?? false}
                          onChange={() => handleMealChange(key)}
                          className="rounded text-primary focus:ring-primary h-5 w-5 border-primary/20 flex-shrink-0"
                          type="checkbox"
                        />
                      </label>
                    ))}
                  </div>
                </div>

                {error && <div className="!text-[rgb(244,37,89)] text-[10px] font-bold bg-[rgb(244,37,89)]/5 p-3 rounded-lg border border-[rgb(244,37,89)]/10">{error}</div>}
                {success && <div className="text-emerald-600 text-[10px] font-bold bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg border border-emerald-100 dark:border-emerald-900/20">{success}</div>}

                <button
                  className="w-full !bg-[rgb(244,37,89)] text-white py-3 rounded-lg font-bold text-xs hover:scale-[1.01] transition-all shadow-lg shadow-primary/20 mt-1 disabled:opacity-50"
                  type="submit"
                  disabled={submitLoading}
                >
                  {submitLoading ? 'Saving...' : 'Save Compliance'}
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white dark:bg-background-dark/30 rounded-2xl border border-primary/5 shadow-sm overflow-hidden text-xs">
          <div className="p-6 border-b border-primary/5 flex items-center justify-between">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Recent Logs</h3>
            {logs.length > 0 && (
              <button
                type="button"
                onClick={handleExportCsv}
                className="!text-[rgb(244,37,89)] text-[9px] font-bold hover:underline uppercase tracking-widest"
              >
                Export History (CSV)
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-primary/[0.03] text-slate-400 text-[9px] font-bold uppercase tracking-widest">
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Meals Followed</th>
                  <th className="px-6 py-4">Adherence Score</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/5">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-slate-400 italic text-xs font-medium">
                      No compliance logs yet. Use the "Log Today" form above to start tracking.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const percent = log.summary?.percent ?? 0;
                    const followed = log.summary?.followed ?? 0;
                    const total = log.summary?.total ?? 5;
                    return (
                      <tr key={log.id ?? log.log_date} className="hover:bg-primary/[0.02] transition-colors group">
                        <td className="px-6 py-4 text-xs font-bold text-slate-900 dark:text-white">{formatDate(log.log_date)}</td>
                        <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400 font-bold tracking-tight">{followed} / {total}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                              <div
                                className={`h-full rounded-full transition-all duration-1000 ${percent >= 80 ? 'bg-emerald-500' : percent >= 50 ? 'bg-[rgb(244,37,89)]' : 'bg-red-400'}`}
                                style={{ width: `${percent}%` }}
                              ></div>
                            </div>
                            <span className={`text-[9px] font-bold ${percent >= 80 ? 'text-emerald-500' : '!text-[rgb(244,37,89)]'}`}>{percent}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest shadow-sm ${percent >= 100 ? 'bg-emerald-100 text-emerald-700' : percent >= 70 ? 'bg-[rgb(244,37,89)]/10 !text-[rgb(244,37,89)]' : 'bg-slate-100 text-slate-600'}`}>
                            {percent >= 100 ? 'Perfect' : percent >= 70 ? 'Good' : 'In Progress'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="text-slate-300 hover:!text-[rgb(244,37,89)] transition-all hover:scale-110 active:scale-95">
                            <span className="material-symbols-outlined text-lg">edit</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
