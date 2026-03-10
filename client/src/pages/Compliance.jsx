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
  const [userId, setUserId] = useState('');
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

  const fetchPlans = useCallback(async (uid) => {
    if (!uid) return [];
    try {
      const res = await getHistory(uid);
      return res?.success && Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
  }, []);

  const fetchCompliance = useCallback(async (uid) => {
    if (!uid) return { data: [], summary: null };
    try {
      const res = await getCompliance(uid, { limit: 30 });
      return { data: res?.data ?? [], summary: res?.summary ?? null };
    } catch {
      return { data: [], summary: null };
    }
  }, []);

  useEffect(() => {
    const uid = sessionStorage.getItem('dietUserId') ?? '';
    setUserId(uid);
    if (!uid) {
      setLoading(false);
      setPlans([]);
      setLogs([]);
      setSummary(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const [planList, { data: logData, summary: sum }] = await Promise.all([
        fetchPlans(uid),
        fetchCompliance(uid),
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
    if (!userId) {
      setError('Generate a diet plan first so we know who you are.');
      return;
    }
    if (!form.plan_id) {
      setError('Select a diet plan to track against.');
      return;
    }
    setSubmitLoading(true);
    try {
      const res = await logCompliance({
        user_id: userId,
        plan_id: form.plan_id,
        log_date: form.log_date,
        meals: form.meals,
      });
      if (res?.success && res?.data) {
        setSuccess(`Saved: ${res.data.summary?.followed ?? 0}/5 meals followed for ${formatDate(form.log_date)}.`);
        const { data: logData, summary: sum } = await fetchCompliance(userId);
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

  if (!userId) {
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
    <div className="theme-bg">
      <PageHeader
        title="Compliance Tracker"
        description="Log which meals you followed each day and see your adherence over time."
      />

      {summary && (
        <>
          <div className="row g-3 mb-4">
            <div className="col-6 col-lg">
              <div className="card theme-card shadow-theme h-100">
                <div className="card-body py-3 text-center">
                  <div className="text-muted small text-uppercase mb-1">Days logged</div>
                  <div className="h3 mb-0 theme-text fw-bold">{summary.days_logged ?? 0}</div>
                </div>
              </div>
            </div>
            <div className="col-6 col-lg">
              <div className="card theme-card shadow-theme h-100">
                <div className="card-body py-3 text-center">
                  <div className="text-muted small text-uppercase mb-1">Meals followed</div>
                  <div className="h3 mb-0 theme-text fw-bold">{summary.total_meals_followed ?? 0}<span className="fw-normal text-muted small"> / {summary.total_meals_possible ?? 0}</span></div>
                </div>
              </div>
            </div>
            <div className="col-6 col-lg">
              <div className="card theme-card shadow-theme h-100">
                <div className="card-body py-3 text-center">
                  <div className="text-muted small text-uppercase mb-1">Adherence</div>
                  <div className="h3 mb-0 theme-text fw-bold">{summary.overall_percent ?? 0}%</div>
                </div>
              </div>
            </div>
            <div className="col-6 col-lg">
              <div className="card theme-card shadow-theme h-100">
                <div className="card-body py-3 text-center">
                  <div className="text-muted small text-uppercase mb-1">This week</div>
                  <div className="h3 mb-0 theme-text fw-bold">{weekProgress.count}<span className="fw-normal text-muted small"> / {weekProgress.goal}</span></div>
                </div>
              </div>
            </div>
            <div className="col-6 col-lg">
              <div className="card theme-card shadow-theme h-100">
                <div className="card-body py-3 text-center">
                  <div className="text-muted small text-uppercase mb-1">Current streak</div>
                  <div className="h3 mb-0 theme-text fw-bold">{streak} day{streak !== 1 ? 's' : ''}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card theme-card shadow-theme mb-4 overflow-hidden" style={{ borderLeft: '4px solid var(--theme-primary)', background: 'linear-gradient(135deg, var(--theme-card-bg) 0%, var(--theme-bg-secondary) 100%)' }}>
            <div className="card-body py-4 d-flex flex-column flex-md-row align-items-center gap-3">
              <div className="d-flex align-items-center justify-content-center rounded-circle bg-primary bg-opacity-10 flex-shrink-0" style={{ width: 64, height: 64 }}>
                <span className="fs-2" role="img" aria-label="Trophy">🏆</span>
              </div>
              <div className="flex-grow-1 text-center text-md-start">
                <div className="small text-muted text-uppercase fw-semibold mb-1">Best streak</div>
                <div className="h2 mb-1 theme-text fw-bold">{bestStreak} day{bestStreak !== 1 ? 's' : ''}</div>
                <p className="small text-muted mb-0">Longest run of consecutive days you logged. Beat your record by staying consistent.</p>
              </div>
              <span className="badge bg-primary rounded-pill px-3 py-2 flex-shrink-0" style={{ fontSize: '1.1rem' }}>
                {bestStreak} day{bestStreak !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </>
      )}

      {plans.length > 0 && (
        <div className="card theme-card shadow-theme mb-4" style={{ borderLeft: '4px solid var(--theme-accent)' }}>
          <div className="card-body">
            <h2 className="h6 fw-semibold theme-text mb-2">Goal impact</h2>
            <p className="mb-1 theme-text small">
              <span className="text-muted">Your goal: </span>
              <strong>{goalLabel}</strong>
            </p>
            <p className="mb-0 theme-text small">
              {getGoalImpactMessage(goal, adherencePercent)}
            </p>
            {summary && (
              <p className="mb-0 mt-2 text-muted small">
                Recent adherence: <strong className="theme-text">{adherencePercent}%</strong>
                {adherencePercent >= 70 && ' — keep it up!'}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="card theme-card shadow-theme mb-4">
        <div className="card-body">
          <div className="d-flex align-items-center gap-2 mb-3">
            <IconChartBar className="theme-text opacity-85" width={22} height={22} aria-hidden />
            <h2 className="h6 fw-semibold theme-text mb-0">Weekly adherence</h2>
          </div>
          {!hasWeeklyData ? (
            <p className="text-muted small mb-0">Log compliance for a few days to see your pattern by weekday (Mon–Sun).</p>
          ) : (
            <div className="d-flex align-items-end justify-content-between gap-2" style={{ minHeight: 140 }}>
              {weeklyAdherence.map(({ day, percent }) => (
                <div key={day} className="d-flex flex-column align-items-center flex-grow-1">
                  <div className="dashboard-compliance-bar w-100 mb-1" style={{ maxWidth: 36 }}>
                    <div className="dashboard-compliance-remaining" style={{ height: `${100 - (percent ?? 0)}%` }} />
                    <div className="dashboard-compliance-used" style={{ height: `${percent ?? 0}%` }} />
                  </div>
                  <span className="small text-muted">{day}</span>
                  <span className="small fw-semibold theme-text">{percent != null ? `${percent}%` : '—'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card theme-card shadow-theme mb-4">
        <div className="card-body">
          <div className="d-flex align-items-center gap-2 mb-3">
            <IconChecklist className="theme-text opacity-85" width={22} height={22} aria-hidden />
            <h2 className="h6 fw-semibold theme-text mb-0">Log today</h2>
          </div>
          <form onSubmit={handleSubmit} className="row g-3">
            <div className="col-12 col-md-4">
              <label htmlFor="compliance-plan" className="form-label theme-text small fw-semibold">Diet plan</label>
              <select
                id="compliance-plan"
                className="form-select theme-input"
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
            <div className="col-12 col-md-4">
              <label htmlFor="compliance-date" className="form-label theme-text small fw-semibold">Date</label>
              <input
                id="compliance-date"
                type="date"
                className="form-control theme-input"
                value={form.log_date}
                onChange={(e) => setForm((f) => ({ ...f, log_date: e.target.value || todayStr() }))}
                max={todayStr()}
              />
            </div>
            <div className="col-12">
              <span className="form-label theme-text small fw-semibold d-block mb-2">Meals followed</span>
              <div className="row g-2">
                {MEAL_LABELS.map(({ key, label }) => (
                  <div key={key} className="col-6 col-md-4">
                    <div className="form-check theme-card rounded px-3 py-2" style={{ minHeight: 44 }}>
                      <input
                        id={`meal-${key}`}
                        type="checkbox"
                        className="form-check-input mt-1"
                        checked={form.meals[key] ?? false}
                        onChange={() => handleMealChange(key)}
                      />
                      <label className="form-check-label theme-text w-100 cursor-pointer" htmlFor={`meal-${key}`}>
                        {label}
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {error && <div className="col-12"><div className="alert alert-danger mb-0 small">{error}</div></div>}
            {success && <div className="col-12"><div className="alert alert-success mb-0 small">{success}</div></div>}
            <div className="col-12">
              <button type="submit" className="btn btn-theme-primary px-4" disabled={submitLoading}>
                {submitLoading ? 'Saving…' : 'Save compliance'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card theme-card shadow-theme">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
            <h2 className="h6 fw-semibold theme-text mb-0">Recent logs</h2>
            {logs.length > 0 && (
              <button type="button" className="btn btn-sm btn-outline-theme" onClick={handleExportCsv}>
                Export CSV
              </button>
            )}
          </div>
          {logs.length === 0 ? (
            <div className="text-center py-4">
              <div className="text-muted mb-2" style={{ fontSize: '2rem' }} role="img" aria-hidden>📋</div>
              <p className="text-muted small mb-0">No compliance logs yet.</p>
              <p className="text-muted small mb-0">Use the form above to log which meals you followed.</p>
            </div>
          ) : (
            <ul className="list-unstyled mb-0">
              {logs.map((log, i) => (
                <li
                  key={log.id ?? log.log_date}
                  className="d-flex justify-content-between align-items-center py-3 px-3 rounded mb-2 theme-bg-secondary"
                  style={i < logs.length - 1 ? { marginBottom: '0.5rem' } : undefined}
                >
                  <span className="theme-text fw-medium">{formatDate(log.log_date)}</span>
                  <span className="badge bg-primary rounded-pill px-3 py-2">
                    {log.summary?.followed ?? 0}/5 · {log.summary?.percent ?? 0}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
