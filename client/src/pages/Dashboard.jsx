/**
 * Dashboard: welcome, daily calorie goal, weekly compliance bar chart, and quick actions.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { IconScale, IconDocumentText } from '../components/Icons';
import { getCompliance, getUserSettings } from '../api/dietApi';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Monday first
const RING_RADIUS = 42;
const RING_STROKE = 8;

const MEAL_SLOTS = [
  { key: 'breakfast', label: 'Breakfast', settingsField: 'breakfast_time', defaultTime: '08:00' },
  { key: 'lunch', label: 'Lunch', settingsField: 'lunch_time', defaultTime: '13:00' },
  { key: 'dinner', label: 'Dinner', settingsField: 'dinner_time', defaultTime: '20:00' },
];

function getLatestResult() {
  try {
    const raw = sessionStorage.getItem('latestDietResult');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getUserId() {
  try {
    return sessionStorage.getItem('dietUserId') ?? null;
  } catch {
    return null;
  }
}

function parseMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const [hh, mm] = timeStr.split(':').map((v) => parseInt(v, 10));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

function toDisplayTime(timeStr) {
  const mins = parseMinutes(timeStr);
  if (mins == null) return timeStr || '1:00 PM';
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const suffix = h24 >= 12 ? 'PM' : 'AM';
  const h12 = ((h24 + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

function buildWeeklyBars(logs) {
  const byDay = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  logs.forEach((log) => {
    const dateStr = log.log_date;
    const pct = log.summary?.percent;
    if (!dateStr || pct == null) return;
    try {
      const [y, m, d] = dateStr.split('-').map((n) => Number(n));
      const dayOfWeek = new Date(y, m - 1, d).getDay(); // 0=Sun..6=Sat
      byDay[dayOfWeek].push(pct);
    } catch {
      // ignore bad dates
    }
  });
  return WEEKDAY_ORDER.map((dayIndex, i) => {
    const arr = byDay[dayIndex] ?? [];
    const avg = arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
    return { label: WEEKDAYS[i], used: avg };
  });
}

export default function Dashboard() {
  const lastResult = getLatestResult();
  const userId = getUserId();
  const [weeklyBars, setWeeklyBars] = useState(() => WEEKDAYS.map((d) => ({ label: d, used: 0 })));
  const [overallCompliance, setOverallCompliance] = useState(0);
  const [nextMeal, setNextMeal] = useState({
    label: 'Lunch',
    timeDisplay: '1:00 PM',
    food: 'Brown rice + dal + salad',
  });

  useEffect(() => {
    if (!userId) return;
    getCompliance(userId, { limit: 30 })
      .then((res) => {
        if (!res?.success) return;
        const logs = Array.isArray(res.data) ? res.data : [];
        setWeeklyBars(buildWeeklyBars(logs));
        if (typeof res.summary?.overall_percent === 'number') {
          setOverallCompliance(res.summary.overall_percent);
        }
      })
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    if (!lastResult) {
      setNextMeal({
        label: 'Lunch',
        timeDisplay: '1:00 PM',
        food: 'Brown rice + dal + salad',
      });
      return;
    }

    const plan = lastResult.diet_plan ?? {};
    const chart = plan.diet_chart ?? {};
    const isWeekly =
      plan.plan_type === 'weekly' || (Array.isArray(chart.days) && chart.days.length > 0);
    const baseChart =
      isWeekly && Array.isArray(chart.days) && chart.days[0] ? chart.days[0] : chart;

    const buildFromSlot = (slot, time24) => {
      const mealTextRaw = baseChart?.[slot.key];
      const mealText =
        typeof mealTextRaw === 'string' && mealTextRaw.trim().length > 0
          ? mealTextRaw.trim()
          : slot.key === 'lunch'
            ? 'Brown rice + dal + salad'
            : 'As per your diet plan.';

      const fallbackTimeFromChart =
        typeof baseChart?.[`${slot.key}_time`] === 'string' && baseChart[`${slot.key}_time`];
      const timeBase = time24 || fallbackTimeFromChart || slot.defaultTime;

      return {
        label: slot.label,
        timeDisplay: toDisplayTime(timeBase),
        food: mealText,
      };
    };

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    let cancelled = false;

    const chooseWithSettings = (settings) => {
      const slotsWithTimes = MEAL_SLOTS.map((slot) => {
        const settingsTime =
          settings && typeof settings[slot.settingsField] === 'string'
            ? settings[slot.settingsField]
            : null;
        const time24 = settingsTime || baseChart?.[`${slot.key}_time`] || slot.defaultTime;
        return {
          slot,
          time24,
          minutes: parseMinutes(time24),
        };
      })
        .filter((entry) => entry.minutes != null)
        .sort((a, b) => a.minutes - b.minutes);

      if (!slotsWithTimes.length) {
        return buildFromSlot(MEAL_SLOTS[1], null); // fallback to lunch
      }

      const upcoming =
        slotsWithTimes.find((entry) => entry.minutes >= nowMinutes) ?? slotsWithTimes[0];
      return buildFromSlot(upcoming.slot, upcoming.time24);
    };

    if (!userId) {
      setNextMeal(chooseWithSettings(null));
      return;
    }

    getUserSettings(userId)
      .then((res) => {
        if (cancelled) return;
        if (!res?.success) {
          setNextMeal(chooseWithSettings(null));
          return;
        }
        const settings = res.data ?? {};
        setNextMeal(chooseWithSettings(settings));
      })
      .catch(() => {
        if (cancelled) return;
        setNextMeal(chooseWithSettings(null));
      });

    return () => {
      cancelled = true;
    };
  }, [userId, lastResult]);

  const dailyTarget = (() => {
    const calStr = lastResult?.diet_plan?.diet_chart?.calories;
    const n = calStr ? parseInt(String(calStr).replace(/\D/g, ''), 10) : NaN;
    return Number.isFinite(n) && n > 0 ? n : 2000;
  })();
  const percent = overallCompliance > 0 ? Math.min(100, overallCompliance) : 0;
  const used = Math.round((percent / 100) * dailyTarget);
  const circumference = 2 * Math.PI * RING_RADIUS;
  const offset = circumference - (percent / 100) * circumference;

  const bmiValue = lastResult?.diet_plan?.bmi ?? null;
  const bmiCategory = lastResult?.diet_plan?.bmi_category ?? null;
  const bmiAdvice = (() => {
    if (!bmiCategory) {
      return 'Generate a plan to see your BMI status and personalised guidance.';
    }
    const c = String(bmiCategory).toLowerCase();
    if (c.includes('under')) {
      return 'You are below the healthy range. A gentle calorie surplus and professional guidance can help.';
    }
    if (c.includes('normal')) {
      return 'You are in the healthy range. Focus on consistency, movement, and balanced meals.';
    }
    if (c.includes('over')) {
      return 'You are above the healthy range. A modest calorie deficit and more activity can move you toward your goal.';
    }
    if (c.includes('obese')) {
      return 'You are significantly above the healthy range. Aim for small, sustainable changes and consider expert support.';
    }
    return 'Use this as a rough guide only. Body composition and how you feel also matter.';
  })();

  const motivation = (() => {
    const comp = typeof overallCompliance === 'number' ? overallCompliance : 0;
    const cat = (bmiCategory || '').toLowerCase();

    if (!lastResult) {
      return {
        title: 'Start small, stay consistent',
        text: 'Generate your first plan and aim to follow it for just one day. One good day often leads to the next.',
      };
    }

    if (cat.includes('under')) {
      if (comp < 60) {
        return {
          title: 'Fuel your body regularly',
          text: 'Being underweight, your job is to nourish. Try not to skip meals and add at least one calorie-dense snack today.',
        };
      }
      return {
        title: 'You are building strength',
        text: 'Great job showing up for meals. Keep adding wholesome calories and protein to support healthy weight gain.',
      };
    }

    if (cat.includes('normal')) {
      if (comp < 60) {
        return {
          title: 'Protect your healthy range',
          text: 'You are in the healthy BMI range. Even 3–4 disciplined days a week are enough to maintain it long term.',
        };
      }
      return {
        title: 'Consistency beats perfection',
        text: 'Your adherence is solid. Keep pairing this plan with regular movement and good sleep for long-term health.',
      };
    }

    if (cat.includes('over') || cat.includes('obese')) {
      if (comp < 50) {
        return {
          title: 'One decision at a time',
          text: 'Weight change comes from hundreds of small choices. Focus on just the next meal, not the entire month.',
        };
      }
      return {
        title: 'Progress, not punishment',
        text: 'You are following your plan—awesome work. Even a 5–10% weight loss can significantly improve health markers.',
      };
    }

    return {
      title: 'Your health, your pace',
      text: 'Listen to your body, follow the plan as best you can today, and adjust gently rather than giving up.',
    };
  })();

  return (
    <div className="theme-bg">
      <PageHeader title="Dashboard" description="Overview and quick actions">
        <div className="btn-group" role="group" aria-label="Quick actions">
          <Link to="/generate" className="btn btn-theme-primary btn-sm">
            Generate plan
          </Link>
          <Link to="/compliance" className="btn btn-outline-theme btn-sm ms-2">
            Log compliance
          </Link>
          <Link to="/history" className="btn btn-outline-theme btn-sm ms-2">
            View history
          </Link>
        </div>
      </PageHeader>

      <div className="row g-4 mb-4">
        <div className="col-lg-5">
          <div className="card theme-card shadow-theme h-100">
            <div className="card-body">
              <h2 className="h6 fw-semibold theme-text mb-3">Daily calorie goal</h2>
              <div className="d-flex align-items-center gap-3">
                <div className="dashboard-circle-wrap">
                  <svg className="dashboard-circle-svg" width={140} height={140} viewBox="0 0 100 100">
                    <circle
                      className="dashboard-circle-bg"
                      cx="50"
                      cy="50"
                      r={RING_RADIUS}
                      fill="none"
                      strokeWidth={RING_STROKE}
                    />
                    <circle
                      className="dashboard-circle-fill"
                      cx="50"
                      cy="50"
                      r={RING_RADIUS}
                      fill="none"
                      strokeWidth={RING_STROKE}
                      strokeDasharray={circumference}
                      strokeDashoffset={offset}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="dashboard-circle-center">
                    <div className="fw-bold theme-text" style={{ fontSize: '1.1rem' }}>
                      {used.toLocaleString()} kcal
                    </div>
                    <div className="small text-muted">of {dailyTarget} kcal</div>
                  </div>
                </div>
                <div className="small text-muted">
                  <p className="mb-1">
                    This is an estimate based on your current weekly compliance. Aim for steady progress
                    rather than perfection.
                  </p>
                  <p className="mb-0">
                    Weekly adherence: <span className="theme-text fw-semibold">{percent}%</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-7">
          <div className="card theme-card shadow-theme h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <div>
                  <h2 className="h6 fw-semibold theme-text mb-0">Weekly compliance</h2>
                  <p className="small text-muted mb-0">How closely you followed the plan over the last days</p>
                </div>
                <span className="badge bg-primary rounded-pill">{percent}%</span>
              </div>
              <div className="d-flex align-items-end justify-content-between gap-2" style={{ minHeight: 120 }}>
                {weeklyBars.map(({ label, used: u }) => (
                  <div key={label} className="d-flex flex-column align-items-center flex-grow-1">
                    <div className="dashboard-compliance-bar w-100 mb-1" style={{ maxWidth: 38 }}>
                      <div className="dashboard-compliance-remaining" style={{ height: `${100 - u}%` }} />
                      <div className="dashboard-compliance-used" style={{ height: `${u}%` }} />
                    </div>
                    <span className="small text-muted">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card theme-card shadow-theme mb-4">
        <div className="card-body d-flex flex-column flex-md-row align-items-start align-items-md-center gap-3">
          <div className="flex-grow-1">
            <div className="small text-uppercase text-muted mb-1">Next meal reminder</div>
            <h2 className="h6 fw-semibold theme-text mb-1">
              {nextMeal.label}
            </h2>
            <p className="small mb-1">
              Time:{' '}
              <span className="theme-text fw-semibold">
                {nextMeal.timeDisplay}
              </span>
            </p>
            <p className="small mb-0">
              Food:{' '}
              <span className="theme-text fw-semibold">
                {nextMeal.food}
              </span>
            </p>
          </div>
        </div>
        <p className="small text-muted mb-0 mt-2">
          Seeing your upcoming meal helps you stay consistent and improves diet compliance.
        </p>
      </div>

      <div className="card theme-card shadow-theme mb-4">
        <div className="card-body">
          <div className="small text-uppercase text-muted mb-1">Motivation / Health tip</div>
          <h2 className="h6 fw-semibold theme-text mb-1">{motivation.title}</h2>
          <p className="small text-muted mb-0">{motivation.text}</p>
        </div>
      </div>

      {lastResult && (
        <div className="row g-3 mb-4">
          <div className="col-md-6">
            <div className="card theme-card shadow-theme h-100">
              <div className="card-body">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <IconScale className="theme-text opacity-85" width={20} height={20} aria-hidden />
                  <h2 className="h6 fw-semibold theme-text mb-0">BMI status</h2>
                </div>
                <p className="mb-1 theme-text">
                  <span className="fw-semibold">{bmiValue ?? '—'}</span>{' '}
                  <span className="small text-muted">kg/m²</span>
                </p>
                <p className="small mb-2">
                  Category:{' '}
                  <span className="fw-semibold text-primary">
                    {bmiCategory ?? 'Not available'}
                  </span>
                </p>
                <p className="small text-muted mb-0">{bmiAdvice}</p>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card theme-card shadow-theme h-100">
              <div className="card-body">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <IconDocumentText className="theme-text opacity-85" width={20} height={20} aria-hidden />
                  <h2 className="h6 fw-semibold theme-text mb-0">Latest plan</h2>
                </div>
                <p className="text-muted small mb-2">
                  {lastResult.user?.name ?? 'Your'} · BMI {lastResult.diet_plan?.bmi ?? '—'} ({lastResult.diet_plan?.bmi_category ?? '—'})
                </p>
                <Link to="/result" className="btn btn-theme-primary btn-sm cursor-pointer">View plan</Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
