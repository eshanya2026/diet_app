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
            <stop offset="0%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#f472b6" />
          </linearGradient>
          <linearGradient id="weightAreaGradient" x1="0%" y1="1" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#ec4899" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0.22" />
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

  useEffect(() => {
    if (!formSuccess) return;
    const t = setTimeout(() => setFormSuccess(''), 3000);
    return () => clearTimeout(t);
  }, [formSuccess]);

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
    setEntries((prev) => [
      { date: new Date().toISOString().slice(0, 10), weight: w, note: note.trim() || undefined },
      ...prev,
    ]);
    setWeight('');
    setNote('');
    setFormSuccess('Entry added.');
  };

  const removeEntry = (index) => {
    setRemoveConfirmIndex(null);
    setEntries((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="theme-bg">
      <PageHeader title="Weight log" description="Track your weight over time" />

      <div className="card theme-card shadow-theme mb-4">
        <div className="card-body">
          <h2 className="h6 fw-semibold theme-text mb-3">Add entry</h2>
          <form onSubmit={addEntry} className="row g-3">
            <div className="col-12 col-md-auto">
              <label htmlFor="weight-input" className="form-label text-muted small mb-1">
                Weight (kg)
              </label>
              <input
                id="weight-input"
                type="number"
                step={0.1}
                min={MIN_WEIGHT_KG}
                max={MAX_WEIGHT_KG}
                className="form-control theme-input"
                placeholder="e.g. 72.5"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                aria-invalid={!!formError}
                aria-describedby={formError ? 'weight-error' : undefined}
              />
            </div>
            <div className="col-12 col-md-auto">
              <label htmlFor="weight-note" className="form-label text-muted small mb-1">
                Note (optional)
              </label>
              <input
                id="weight-note"
                type="text"
                className="form-control theme-input"
                placeholder="e.g. morning"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <div className="col-12 col-md-auto d-flex align-items-end">
              <button type="submit" className="btn btn-theme-primary cursor-pointer">
                Add
              </button>
            </div>
            {formError && (
              <div id="weight-error" className="col-12 text-danger small" role="alert">
                {formError}
              </div>
            )}
            {formSuccess && (
              <div className="col-12 text-success small" role="status">
                {formSuccess}
              </div>
            )}
          </form>
        </div>
      </div>

      <div className="weight-trend-card card theme-card mb-4">
        <div className="card-body">
          <h2 className="weight-trend-title theme-text">Weight trend</h2>
          <WeightSummary entries={entries} />
          <WeightTrendChart entries={entries} />
        </div>
      </div>

      <div className="card theme-card shadow-theme">
        <div className="card-body">
          <h2 className="h6 fw-semibold theme-text mb-3">History</h2>
          {entries.length === 0 ? (
            <div className="weight-history-empty">
              <p className="text-muted small mb-0">No entries yet. Add your first weight above.</p>
            </div>
          ) : (
            <ul className="list-group list-group-flush border-0">
              {entries.slice(0, HISTORY_PAGE_SIZE).map((entry, i) => (
                <li
                  key={`${entry.date}-${i}`}
                  className="list-group-item d-flex justify-content-between align-items-center theme-card border-theme border-bottom"
                >
                  <span className="theme-text">
                    {formatHistoryDate(entry.date)} — {Number(entry.weight).toFixed(1)} kg
                    {entry.note ? ` (${entry.note})` : ''}
                  </span>
                  {removeConfirmIndex === i ? (
                    <span className="d-flex align-items-center gap-2">
                      <span className="text-muted small">Remove?</span>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger cursor-pointer"
                        onClick={() => removeEntry(i)}
                        aria-label="Confirm remove"
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm theme-card border-theme cursor-pointer"
                        onClick={() => setRemoveConfirmIndex(null)}
                        aria-label="Cancel"
                      >
                        No
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-sm btn-link text-danger p-0 cursor-pointer"
                      onClick={() => setRemoveConfirmIndex(i)}
                      aria-label={`Remove entry ${i + 1}`}
                    >
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
