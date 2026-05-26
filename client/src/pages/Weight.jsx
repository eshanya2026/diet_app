/**
 * Weight log: add entries, weight trend chart, summary stats, and history list.
 */

import { useState, useEffect, useMemo } from 'react';
import PageHeader from '../components/PageHeader';

const STORAGE_KEY = 'weight_log';
const CHART_DAYS = 90;
const MIN_WEIGHT_KG = 20;
const MAX_WEIGHT_KG = 300;
const CHART_PADDING = { top: 8, right: 8, bottom: 22, left: 36 };
const CHART_INNER_WIDTH = 220;
const CHART_INNER_HEIGHT = 100;
const HISTORY_PAGE_SIZE = 30;

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveEntries(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (_) {}
}

function formatChartDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const mon = d.toLocaleDateString('en-US', { month: 'short' });
  const day = d.getDate();
  return `${mon} ${day}`;
}

function formatHistoryDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  d.setHours(0, 0, 0, 0);
  if (d.getTime() === today.getTime()) return 'Today';
  if (d.getTime() === yesterday.getTime()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Weight trend chart: line chart with date (X) and weight kg (Y) axes.
 */
function WeightTrendChart({ entries }) {
  const sorted = useMemo(() => {
    const list = (entries ?? [])
      .slice(0, CHART_DAYS)
      .map((e) => ({ ...e, weight: Number(e.weight) }))
      .filter((e) => Number.isFinite(e.weight));
    list.sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));
    return list;
  }, [entries]);

  if (sorted.length === 0) {
    return (
      <div className="weight-trend-chart weight-trend-chart--empty">
        <p className="text-muted small mb-0">Add weight entries above to see your trend chart.</p>
      </div>
    );
  }

  const weights = sorted.map((e) => e.weight);
  const minWeight = Math.min(...weights);
  const maxWeight = Math.max(...weights);
  const paddingKg = Math.max(0.5, (maxWeight - minWeight) * 0.1) || 1;
  const yMin = minWeight - paddingKg;
  const yMax = maxWeight + paddingKg;
  const yRange = yMax - yMin;

  const width = CHART_PADDING.left + CHART_INNER_WIDTH + CHART_PADDING.right;
  const height = CHART_PADDING.top + CHART_INNER_HEIGHT + CHART_PADDING.bottom;
  const x0 = CHART_PADDING.left;
  const y0 = CHART_PADDING.top;
  const x1 = x0 + CHART_INNER_WIDTH;
  const y1 = y0 + CHART_INNER_HEIGHT;

  const xScale = (i) =>
    sorted.length <= 1 ? x0 + CHART_INNER_WIDTH / 2 : x0 + (i / (sorted.length - 1)) * CHART_INNER_WIDTH;
  const yScale = (w) => y1 - ((w - yMin) / yRange) * CHART_INNER_HEIGHT;

  const pathD = sorted
    .map((e, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(e.weight)}`)
    .join(' ');

  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) => yMin + (yRange * i) / yTicks);

  const xTickStep = Math.max(1, Math.floor(sorted.length / 6));
  const xTickIndices =
    sorted.length <= 6
      ? sorted.map((_, i) => i)
      : Array.from(
          { length: Math.ceil(sorted.length / xTickStep) },
          (_, i) => Math.min(i * xTickStep, sorted.length - 1)
        );

  return (
    <div
      className="weight-trend-chart"
      role="img"
      aria-label={`Weight trend: ${sorted.length} entries from ${formatChartDate(sorted[0].date)} to ${formatChartDate(sorted[sorted.length - 1].date)}`}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="weight-trend-chart-svg"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="weightLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgb(244, 37, 89)" />
            <stop offset="100%" stopColor="rgba(244, 37, 89, 0.8)" />
          </linearGradient>
          <linearGradient id="weightAreaGradient" x1="0%" y1="1" x2="0%" y2="0%">
            <stop offset="0%" stopColor="rgb(244, 37, 89)" stopOpacity="0.08" />
            <stop offset="100%" stopColor="rgb(244, 37, 89)" stopOpacity="0.22" />
          </linearGradient>
          <filter id="weightLineGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {yTickValues.map((v, i) => {
          const y = yScale(v);
          return (
            <g key={i}>
              <line x1={x0} y1={y} x2={x1} y2={y} className="weight-trend-grid" strokeDasharray="2 2" />
              <text x={x0 - 6} y={y + 4} textAnchor="end" className="weight-trend-axis-label">
                {v.toFixed(1)}
              </text>
            </g>
          );
        })}
        {xTickIndices.map((i) => {
          const x = xScale(i);
          const label = sorted[i] ? formatChartDate(sorted[i].date) : '';
          return (
            <text key={i} x={x} y={y1 + 16} textAnchor="middle" className="weight-trend-axis-label">
              {label}
            </text>
          );
        })}
        <path
          d={`${pathD} L ${xScale(sorted.length - 1)} ${y1} L ${x0} ${y1} Z`}
          fill="url(#weightAreaGradient)"
          className="weight-trend-area"
        />
        <path
          d={pathD}
          fill="none"
          stroke="url(#weightLineGradient)"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="weight-trend-line"
          style={{ filter: 'url(#weightLineGlow)' }}
        />
        {sorted.map((e, i) => (
          <circle
            key={`${e.date}-${i}`}
            cx={xScale(i)}
            cy={yScale(e.weight)}
            r="3.5"
            className="weight-trend-dot"
            fill="var(--theme-card-bg)"
            stroke="url(#weightLineGradient)"
            strokeWidth="2"
          />
        ))}
      </svg>
      <div className="weight-trend-chart-y-label">Weight (kg)</div>
    </div>
  );
}

function WeightSummary({ entries }) {
  const sorted = useMemo(() => {
    const list = [...(entries ?? [])].filter((e) => Number.isFinite(Number(e.weight)));
    list.sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));
    return list;
  }, [entries]);

  if (sorted.length === 0) return null;

  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const firstW = Number(first.weight);
  const lastW = Number(last.weight);
  const change = lastW - firstW;
  const changeStr =
    change === 0 ? 'No change' : change > 0 ? `+${change.toFixed(1)} kg` : `${change.toFixed(1)} kg`;

  return (
    <div className="weight-summary" role="group" aria-label="Weight summary">
      <div className="weight-summary-pill">
        <span className="weight-summary-pill-label">Latest</span>
        <span className="weight-summary-pill-value">{lastW.toFixed(1)} kg</span>
      </div>
      <div className="weight-summary-pill">
        <span className="weight-summary-pill-label">Start</span>
        <span className="weight-summary-pill-value">{firstW.toFixed(1)} kg</span>
      </div>
      <div className="weight-summary-pill weight-summary-pill--change">
        <span className="weight-summary-pill-label">Change</span>
        <span className={`weight-summary-pill-value ${change < 0 ? 'weight-summary--loss' : change > 0 ? 'weight-summary--gain' : ''}`}>
          {changeStr}
        </span>
      </div>
    </div>
  );
}

export default function Weight() {
  const [entries, setEntries] = useState(loadEntries);
  const [weight, setWeight] = useState('');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [removeConfirmIndex, setRemoveConfirmIndex] = useState(null);

  useEffect(() => {
    saveEntries(entries);
  }, [entries]);

  // Derived metrics
  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => b.date.localeCompare(a.date));
  }, [entries]);

  const latestEntry = sortedEntries[0];
  const firstEntry = sortedEntries[sortedEntries.length - 1];
  
  const latestWeight = latestEntry ? Number(latestEntry.weight) : 0;
  const startWeight = firstEntry ? Number(firstEntry.weight) : 0;
  const totalChange = latestEntry && firstEntry ? latestWeight - startWeight : 0;
  const totalChangePercent = startWeight > 0 ? (totalChange / startWeight) * 100 : 0;

  // Milestone logic (assuming a default goal of 70kg or user-defined eventually)
  const goalWeight = 70; 
  const weightToGoal = Math.max(0, latestWeight - goalWeight);
  const progressToGoal = firstEntry ? Math.min(100, Math.max(0, ((startWeight - latestWeight) / (startWeight - goalWeight)) * 100)) : 0;

  const addEntry = (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    const w = parseFloat(weight);
    if (Number.isNaN(w) || weight.trim() === '') {
      setFormError('Enter a weight.');
      return;
    }
    if (w < MIN_WEIGHT_KG || w > MAX_WEIGHT_KG) {
      setFormError(`Weight must be between ${MIN_WEIGHT_KG} and ${MAX_WEIGHT_KG} kg.`);
      return;
    }
    const newEntry = { 
      date: new Date().toISOString().slice(0, 10), 
      weight: w, 
      note: note.trim() || undefined 
    };
    setEntries((prev) => [newEntry, ...prev]);
    setWeight('');
    setNote('');
    setFormSuccess('Weight logged successfully!');
    setTimeout(() => setFormSuccess(''), 3000);
  };

  const removeEntry = (index) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
    setRemoveConfirmIndex(null);
  };

  return (
    <div className="font-display">
      <div className="w-full mx-auto px-8 py-8 space-y-8">
        {/* Header Section */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100 italic">Weight Tracker</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Monitor your progress and stay on track with your goals</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Removed header buttons */}
          </div>
        </header>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800/40 p-6 rounded-2xl border border-primary/5 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Latest Weight</p>
              <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                <span className="material-symbols-outlined">monitor_weight</span>
              </div>
            </div>
            <p className="text-3xl font-black text-slate-900 dark:text-slate-100">
              {latestWeight.toFixed(1)} <span className="text-sm font-bold text-slate-400">kg</span>
            </p>
            <p className={`text-sm font-bold mt-2 flex items-center gap-1 ${totalChange <= 0 ? 'text-emerald-500' : 'text-primary'}`}>
              <span className="material-symbols-outlined text-sm">{totalChange <= 0 ? 'trending_down' : 'trending_up'}</span>
              {Math.abs(totalChangePercent).toFixed(1)}% {totalChange <= 0 ? 'loss' : 'gain'}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800/40 p-6 rounded-2xl border border-primary/5 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Start Weight</p>
              <div className="size-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 group-hover:bg-slate-200 transition-all">
                <span className="material-symbols-outlined">flag</span>
              </div>
            </div>
            <p className="text-3xl font-black text-slate-900 dark:text-slate-100">
              {startWeight.toFixed(1)} <span className="text-sm font-bold text-slate-400">kg</span>
            </p>
            <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-tight">
              Started on {firstEntry ? formatHistoryDate(firstEntry.date) : 'N/A'}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800/40 p-6 rounded-2xl border border-primary/5 shadow-sm hover:shadow-md transition-all group border-b-4 border-b-primary/40">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Total Change</p>
              <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                <span className="material-symbols-outlined">bar_chart</span>
              </div>
            </div>
            <p className="text-3xl font-black text-primary">
              {totalChange > 0 ? '+' : ''}{totalChange.toFixed(1)} <span className="text-sm font-bold text-slate-400">kg</span>
            </p>
            <p className="text-sm font-bold text-primary mt-2 uppercase tracking-tighter">Overall Progress</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Chart & History */}
          <div className="lg:col-span-2 space-y-8">
            {/* Weight Trend Chart */}
            <div className="bg-white dark:bg-slate-800/40 p-8 rounded-2xl border border-primary/5 shadow-sm">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Weight Trend</h3>
                <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl">
                  {['30D', '3M', '6M'].map((period) => (
                    <button key={period} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${period === '3M' ? 'bg-white dark:bg-slate-600 shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700'}`}>
                      {period}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-[280px] w-full relative">
                <WeightTrendChart entries={entries} />
              </div>
            </div>

            {/* Weight History */}
            <div className="bg-white dark:bg-slate-800/40 rounded-2xl border border-primary/5 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-primary/5 flex justify-between items-center bg-white dark:bg-slate-800">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Weight History</h3>
                <button className="text-[10px] font-bold text-primary hover:underline uppercase tracking-widest">Export Data</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/80">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Date</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">Weight</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">Change</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Notes</th>
                      <th className="px-6 py-4 w-20"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary/5">
                    {sortedEntries.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="px-6 py-12 text-center text-slate-400 font-bold italic text-xs">
                          No history logged yet.
                        </td>
                      </tr>
                    ) : (
                      sortedEntries.slice(0, 10).map((entry, i) => (
                        <tr key={`${entry.date}-${i}`} className="hover:bg-primary/5 transition-colors group">
                          <td className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400">
                            {formatHistoryDate(entry.date)}
                          </td>
                          <td className="px-6 py-4 text-sm font-black text-slate-900 dark:text-slate-100 text-center">
                            {Number(entry.weight).toFixed(1)} <span className="text-[10px] text-slate-400 font-bold">kg</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {i < sortedEntries.length - 1 ? (
                              (() => {
                                const diff = Number(entry.weight) - Number(sortedEntries[i + 1].weight);
                                return (
                                  <span className={`text-xs font-bold ${diff < 0 ? 'text-emerald-500' : diff > 0 ? 'text-primary' : 'text-slate-400'}`}>
                                    {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                                  </span>
                                );
                              })()
                            ) : (
                              <span className="text-xs font-bold text-slate-300">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-xs font-medium text-slate-500 italic max-w-xs truncate">
                            {entry.note || '—'}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {removeConfirmIndex === i ? (
                              <div className="flex gap-1.5 justify-end">
                                <button onClick={() => removeEntry(i)} className="text-[9px] py-1 px-2.5 bg-primary text-white font-bold rounded-lg transition-all hover:scale-105">Del</button>
                                <button onClick={() => setRemoveConfirmIndex(null)} className="text-[9px] py-1 px-2.5 bg-slate-100 dark:bg-slate-700 text-slate-500 font-bold rounded-lg">No</button>
                              </div>
                            ) : (
                              <button 
                                onClick={() => setRemoveConfirmIndex(i)}
                                className="material-symbols-outlined text-slate-300 hover:text-primary transition-colors text-lg opacity-0 group-hover:opacity-100"
                              >
                                delete
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {sortedEntries.length > 10 && (
                <div className="p-4 bg-slate-50/50 dark:bg-slate-800/20 text-center border-t border-primary/5">
                  <button className="text-[10px] font-bold text-slate-400 hover:text-primary transition-colors uppercase tracking-widest">
                    View All History <span className="material-symbols-outlined text-xs align-middle">arrow_forward</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Add New Entry Form */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800/40 p-6 rounded-2xl border border-primary/5 shadow-sm sticky top-8">
              <div className="flex items-center gap-2 mb-8">
                <span className="material-symbols-outlined text-primary text-2xl">add_circle</span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Track Progress</h3>
              </div>
              
              <form onSubmit={addEntry} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2.5">Current Weight (kg)</label>
                  <div className="relative group">
                    <input 
                      className={`w-full bg-slate-50 dark:bg-slate-800/80 border ${formError ? 'border-primary' : 'border-primary/10'} rounded-2xl px-5 py-4 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none text-2xl font-black text-slate-900 dark:text-slate-100 transition-all`} 
                      placeholder="00.0" 
                      step="0.1" 
                      type="number"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                    />
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 font-bold text-slate-300 group-focus-within:text-primary transition-colors">kg</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2.5">Optional Notes</label>
                  <textarea 
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-primary/10 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none text-sm resize-none font-medium text-slate-700 dark:text-slate-300 min-h-[120px]" 
                    placeholder="How are you feeling today?" 
                    rows="3"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  ></textarea>
                </div>

                <div className="pt-2">
                  <button className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/30 hover:shadow-primary/40 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group" type="submit">
                    <span className="material-symbols-outlined group-hover:rotate-12 transition-transform">save</span>
                    Log Today's Weight
                  </button>
                </div>
                
                {formError && <p className="text-[10px] font-bold text-primary text-center mt-3">{formError}</p>}
                {formSuccess && <p className="text-[10px] font-bold text-emerald-500 text-center mt-3">{formSuccess}</p>}
              </form>

              <div className="mt-10 pt-10 border-t border-primary/5">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Milestone Tracker</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-xs font-bold text-slate-500">Goal: {goalWeight} kg</span>
                    <span className="text-xs font-black text-primary">{weightToGoal.toFixed(1)} kg to go</span>
                  </div>
                  <div className="w-full bg-primary/5 h-3 rounded-full overflow-hidden">
                    <div 
                      className="bg-primary h-full rounded-full shadow-[0_0_12px_rgba(244,37,89,0.3)] transition-all duration-1000 ease-out"
                      style={{ width: `${progressToGoal}%` }}
                    ></div>
                  </div>
                  <p className="text-[10px] text-center text-slate-400 italic">
                    You're doing great! You've lost {Math.round(progressToGoal)}% of your target weight.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
