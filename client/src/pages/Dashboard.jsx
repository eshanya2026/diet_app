/**
 * Dashboard: welcome, daily calorie goal, weekly compliance bar chart, and quick actions.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { IconScale, IconDocumentText } from '../components/Icons';
import { getCompliance, getUserSettings } from '../api/dietApi';
import { useAuth } from '../context/AuthContext';

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
  const { user } = useAuth();
  const lastResult = getLatestResult();
  const [weeklyBars, setWeeklyBars] = useState(() => WEEKDAYS.map((d) => ({ label: d, used: 0 })));
  const [overallCompliance, setOverallCompliance] = useState(0);
  const [nextMeal, setNextMeal] = useState({
    label: 'Lunch',
    timeDisplay: '1:00 PM',
    food: 'Brown rice + dal + salad',
  });
  const [complianceError, setComplianceError] = useState(false);

  useEffect(() => {
    setComplianceError(false);
    getCompliance({ limit: 30 })
      .then((res) => {
        if (!res?.success) return;
        const logs = Array.isArray(res.data) ? res.data : [];
        setWeeklyBars(buildWeeklyBars(logs));
        if (typeof res.summary?.overall_percent === 'number') {
          setOverallCompliance(res.summary.overall_percent);
        }
      })
      .catch(() => setComplianceError(true));
  }, []);

  useEffect(() => {
    const result = getLatestResult();
    if (!result) {
      setNextMeal({
        label: 'Lunch',
        timeDisplay: '1:00 PM',
        food: 'Brown rice + dal + salad',
      });
      return;
    }

    const plan = result.diet_plan ?? {};
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

    getUserSettings()
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
  }, []);

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
    <div className="max-w-full mx-auto space-y-8">
      {/* Welcome & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
            Welcome back, {user?.name ? user.name.split(' ')[0] : 'User'}! 👋
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {bmiAdvice.split('.')[0]}.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/compliance" className="flex items-center gap-2 px-5 py-2.5 !bg-[rgb(244,37,89)] text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform !no-underline">
            <span className="material-symbols-outlined text-xl">add_circle</span>
            Log Meal
          </Link>
          <Link to="/water" className="flex items-center gap-2 px-5 py-2.5 bg-[rgb(244,37,89)]/10 !text-[rgb(244,37,89)] rounded-xl font-bold text-sm hover:brightness-95 transition-all !no-underline">
            <span className="material-symbols-outlined text-xl">water_drop</span>
            Add Water
          </Link>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Calorie Circular Progress & Macros*/}
        <div className="lg:col-span-2 bg-white dark:bg-background-dark/30 rounded-3xl p-8 border border-primary/5 shadow-sm flex flex-col md:flex-row items-center gap-12">
          {/* Circular Progress */}
          <div className="relative size-56 flex-shrink-0">
            <svg className="size-full" viewBox="0 0 100 100">
              <circle className="!text-[rgb(244,37,89)]/10" cx="50" cy="50" fill="none" r="45" stroke="currentColor" strokeWidth="8"></circle>
              <circle
                className="!text-[rgb(244,37,89)] -rotate-90 origin-center transition-all duration-1000"
                cx="50"
                cy="50"
                fill="none"
                r="45"
                stroke="currentColor"
                strokeDasharray="282.7"
                strokeDashoffset={282.7 - (percent / 100) * 282.7}
                strokeLinecap="round"
                strokeWidth="8"
              ></circle>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center -mb-2">
              <span className="text-4xl font-bold text-slate-900 dark:text-white leading-none">{used.toLocaleString()}</span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Kcal used</span>
            </div>
          </div>

          <div className="flex-1 space-y-6 w-full">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold m-0 p-0 text-slate-900 dark:text-slate-100">Daily Calorie Goal</h3>
              <span className="!text-[rgb(244,37,89)] font-bold bg-[rgb(244,37,89)]/10 px-3 py-1 rounded-full text-xs">{percent}% Reached</span>
            </div>
            
            <div className="space-y-5">
              {/* Proteins Array */}
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 flex-shrink-0">
                  <span className="material-symbols-outlined">egg</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <span className="truncate pr-2">Proteins</span>
                    <span className="flex-shrink-0">{Math.round((lastResult?.diet_plan?.protein_g || 120) * (percent/100))}g / {lastResult?.diet_plan?.protein_g || 120}g</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 rounded-full" style={{ width: `${percent}%` }}></div>
                  </div>
                </div>
              </div>

              {/* Carbs Array */}
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 flex-shrink-0">
                  <span className="material-symbols-outlined">bakery_dining</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <span className="truncate pr-2">Carbs</span>
                    <span className="flex-shrink-0">{Math.round((lastResult?.diet_plan?.carbs_g || 200) * (percent/100))}g / {lastResult?.diet_plan?.carbs_g || 200}g</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(percent + 5, 100)}%` }}></div>
                  </div>
                </div>
              </div>

              {/* Fats Array */}
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 flex-shrink-0">
                  <span className="material-symbols-outlined">opacity</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <span className="truncate pr-2">Fats</span>
                    <span className="flex-shrink-0">{Math.round((lastResult?.diet_plan?.fat_g || 65) * (percent/100))}g / {lastResult?.diet_plan?.fat_g || 65}g</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.max(percent - 5, 0)}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Meal Suggestion Card (Next Meal) */}
        <div className="bg-white dark:bg-background-dark/30 rounded-3xl overflow-hidden border border-primary/5 shadow-sm flex flex-col">
          <div className="relative h-48">
            <img alt="Meal Suggestion" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCASe-A6YaFquqdXIisd7N2v-_wID4mgTTmUq39vxEiVbWFev7cLQz1V5yMHmXj8RyID1sQebUhdkcIpXtwo2hcMuayDnVjFn6nLkC6utbzG0ShmtXGt3bwc1ljLt3SBvsTYqheVZSN0tzlkQz4PuFcfd8kRnXt1zsa1SpU79hc4OQuzw5ObZ_AxpP3EEryHSQgNlkwUwpeym58qljGA3oU8tKttgQ-ngXps7qitb7vKM3V5nGPvZKU1Us98NtGMEwOug9Cuy5MgnY"/>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
            <div className="absolute bottom-4 left-4 right-4">
              <span className="!bg-[rgb(244,37,89)] text-white text-[10px] font-bold uppercase px-2 py-1 rounded-md">Upcoming: {nextMeal.label}</span>
              <h4 className="text-white font-bold text-lg mt-1 mb-0 leading-tight">{nextMeal.food}</h4>
            </div>
          </div>
          <div className="p-6 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1 text-slate-500 text-sm">
                <span className="material-symbols-outlined text-lg">schedule</span>
                <span>{nextMeal.timeDisplay}</span>
              </div>
              <div className="flex items-center gap-1 !text-[rgb(244,37,89)] text-sm font-bold">
                <span className="material-symbols-outlined text-lg">local_fire_department</span>
                <span>Est. {Math.round(dailyTarget * 0.35)} Kcal</span>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 flex-1">
               {motivation.text}
            </p>
            <Link to="/result" className="block text-center w-full border-2 border-[rgb(244,37,89)]/20 !text-[rgb(244,37,89)] py-2 rounded-xl font-bold hover:!bg-[rgb(244,37,89)] hover:text-white transition-all !no-underline">
              View Full Plan
            </Link>
          </div>
        </div>
      </div>

      {/* Weekly Compliance Chart Section */}
      <div className="bg-white dark:bg-background-dark/30 rounded-3xl p-8 border border-primary/5 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-bold m-0 p-0 text-slate-900 dark:text-slate-100">Weekly Compliance</h3>
            <p className="text-sm text-slate-500 m-0">Your average calorie intake vs target last 7 days</p>
          </div>
          <select className="bg-[rgb(244,37,89)]/5 border-none rounded-lg text-sm font-bold py-2 pl-3 pr-8 focus:ring-1 focus:ring-[rgb(244,37,89)]/30 text-slate-700 dark:text-slate-300">
            <option>This Week</option>
            <option>Last Week</option>
          </select>
        </div>
        
        <div className="h-64 flex items-end justify-between gap-2">
          {weeklyBars.map(({ label, used: u }, index) => {
             // Assuming dailyTarget is 100% height, u is percentage of dailyTarget
             const isToday = index === new Date().getDay() - 1 || (new Date().getDay() === 0 && index === 6);
             const heightPct = u > 0 ? Math.min(u, 100) : 0;
             const mappedKcal = Math.round(dailyTarget * (u / 100));

             return (
              <div key={label} className="flex-1 flex flex-col items-center gap-3">
                <div className="w-full max-w-[40px] bg-[rgb(244,37,89)]/20 rounded-t-lg relative group h-48">
                  <div 
                    className={`absolute bottom-0 w-full ${u === 0 ? 'bg-[rgb(244,37,89)]/40' : 'bg-[rgb(244,37,89)]'} rounded-t-lg transition-all`} 
                    style={{ height: `${u === 0 ? 0 : heightPct}%` }}
                  ></div>
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] py-1 px-2 rounded whitespace-nowrap z-10">
                    {u === 0 ? 'Pending' : `${mappedKcal} kcal`}
                  </div>
                </div>
                <span className={`text-xs font-bold ${isToday ? '!text-[rgb(244,37,89)]' : 'text-slate-400'}`}>{label}</span>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
