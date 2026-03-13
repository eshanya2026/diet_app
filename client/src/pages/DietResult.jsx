/**
 * Diet result: plan display, macros, diet score, grocery list.
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { generateGroceryList, swapMeal } from '../api/dietApi';
import MacroChart from '../components/MacroChart';

function safeText(val) {
  return typeof val === 'string' ? val : '';
}

const MEAL_SLOTS = [
  { key: 'breakfast', title: 'Breakfast' },
  { key: 'mid_snack', title: 'Mid-Morning Snack' },
  { key: 'lunch', title: 'Lunch' },
  { key: 'evening_snack', title: 'Evening Snack' },
  { key: 'dinner', title: 'Dinner' },
];

const DAY_LABELS = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];

export default function DietResult() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [groceryItems, setGroceryItems] = useState(null);
  const [groceryLoading, setGroceryLoading] = useState(false);
  const [groceryError, setGroceryError] = useState('');
  const [selectedDay, setSelectedDay] = useState(0);
  const [swapLoadingSlot, setSwapLoadingSlot] = useState(null);
  const [swapError, setSwapError] = useState('');

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('latestDietResult');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && (parsed.diet_plan || parsed.user)) setData(parsed);
        else navigate('/generate', { replace: true });
      } else {
        navigate('/generate', { replace: true });
      }
    } catch {
      navigate('/generate', { replace: true });
    }
  }, [navigate]);

  const handlePrint = () => window.print();

  const handleGenerateGrocery = () => {
    const dietChart = data?.diet_plan?.diet_chart;
    if (!dietChart) return;
    const chartForGrocery = Array.isArray(dietChart.days) && dietChart.days[0]
      ? dietChart.days[0]
      : dietChart;
    setGroceryError('');
    setGroceryLoading(true);
    setGroceryItems(null);
    generateGroceryList(chartForGrocery)
      .then((res) => {
        if (res.success && res.data?.items) setGroceryItems(res.data.items);
        else setGroceryError(res?.error?.message ?? 'Could not generate list.');
      })
      .catch((err) => {
        const msg = err?.error?.message ?? 'Failed to load grocery list.';
        const details = err?.error?.details;
        setGroceryError(details ? `${msg} (${details})` : msg);
      })
      .finally(() => setGroceryLoading(false));
  };

  const handleCopyGrocery = () => {
    if (!groceryItems?.length) return;
    const text = groceryItems
      .map((i) => `${i.name} — ${i.quantity} ${i.unit ? i.unit : ''}`.trim())
      .join('\n');
    navigator.clipboard?.writeText(text).catch(() => {});
  };

  const handleSwapMeal = (slotKey) => {
    const current = activeChart?.[slotKey];
    if (!current || typeof current !== 'string' || !current.trim()) return;
    setSwapError('');
    setSwapLoadingSlot(slotKey);
    const user = data?.user ?? {};
    const payload = {
      meal_slot: slotKey,
      current_meal: current,
      health_condition: user.health_conditions?.[0] ?? 'none',
      cuisine_preference: user.cuisine_preference ?? 'Mixed',
      diet_preference: user.diet_preference ?? 'veg',
    };
    swapMeal(payload)
      .then((res) => {
        if (!res?.success || !res?.data?.alternative_meal) {
          setSwapError(res?.error?.message ?? 'Could not get alternative.');
          return;
        }
        const altPortion = res?.data?.alternative_portion ?? '';
        const next = JSON.parse(JSON.stringify(data));
        const plan = next?.diet_plan ?? {};
        const chart = plan.diet_chart ?? {};
        const portionKey = `${slotKey}_portion`;
        if (isWeekly && Array.isArray(chart.days) && chart.days[selectedDay]) {
          chart.days[selectedDay] = {
            ...chart.days[selectedDay],
            [slotKey]: res.data.alternative_meal,
            [portionKey]: altPortion,
          };
        } else {
          chart[slotKey] = res.data.alternative_meal;
          if (Object.prototype.hasOwnProperty.call(chart, portionKey)) {
            chart[portionKey] = altPortion;
          }
        }
        setData(next);
        try {
          sessionStorage.setItem('latestDietResult', JSON.stringify(next));
        } catch (_) {}
      })
      .catch((err) => {
        setSwapError(err?.error?.message ?? 'Swap failed. Try again.');
      })
      .finally(() => setSwapLoadingSlot(null));
  };

  if (data == null) {
    return (
      <div className="theme-bg min-vh-100 d-flex align-items-center justify-content-center">
        <p className="text-muted mb-0">Loading…</p>
      </div>
    );
  }

  const user = data.user ?? {};
  const plan = data.diet_plan ?? {};
  const chart = plan.diet_chart ?? {};
  const isWeekly = plan.plan_type === 'weekly' || (Array.isArray(chart.days) && chart.days.length >= 7);
  const days = isWeekly && Array.isArray(chart.days) ? chart.days : null;
  const activeChart = isWeekly && days && days[selectedDay] ? days[selectedDay] : chart;
  const suggestions = Array.isArray(chart.suggestions) ? chart.suggestions : [];
  const notSaved = data.saved === false;
  const metaParts = [user.age && `${user.age} yrs`, user.gender, user.diet_preference].filter(Boolean);
  const protein = plan.protein_g ?? activeChart.protein_g ?? chart.protein_g;
  const carbs = plan.carbs_g ?? activeChart.carbs_g ?? chart.carbs_g;
  const fat = plan.fat_g ?? activeChart.fat_g ?? chart.fat_g;
  const hasMacros = [protein, carbs, fat].some((n) => typeof n === 'number' && n > 0);
  const dietScore = plan.diet_score;

  return (
    <div className="theme-bg min-vh-100">
      <div className="container py-4" style={{ maxWidth: 960 }}>
        {notSaved && (
          <div className="alert alert-info theme-card border-theme mb-3" role="alert">
            Plan generated successfully. It was not saved to history because the database is unavailable. Fix MongoDB connection to save future plans.
          </div>
        )}
        <header className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2 no-print">
          <div>
            <h1 className="h4 fw-semibold theme-text mb-1">
              {isWeekly ? 'Your Weekly Diet Plan' : 'Your Diet Plan'}
            </h1>
            <p className="text-muted mb-0">
              {isWeekly ? '7-day personalized Indian diet chart.' : 'Personalized Indian diet chart.'}
            </p>
          </div>
          <div className="d-flex gap-2 flex-wrap">
            <button type="button" className="btn theme-card border-theme btn-sm" onClick={handlePrint}>Print / Save PDF</button>
            <Link to="/generate" className="btn theme-card border-theme btn-sm">New Plan</Link>
            <Link to="/history" className="btn btn-theme-primary btn-sm">View History</Link>
          </div>
        </header>

        <section className="card theme-card shadow-theme mb-3">
          <div className="card-body p-3 p-md-4">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
              <div>
                <h2 className="h5 fw-semibold theme-text mb-1">{safeText(user.name) || 'Diet Plan'}</h2>
                <p className="text-muted mb-0">{metaParts.join(' · ')}</p>
              </div>
              <div className="d-flex align-items-center gap-3 flex-wrap">
                {typeof dietScore === 'number' && (
                  <div className="text-center">
                    <div className="small text-uppercase text-muted">Diet score</div>
                    <span className="badge bg-primary rounded-pill">{dietScore}/100</span>
                  </div>
                )}
                <div className="text-md-end">
                  <div className="small text-uppercase text-muted mb-1">BMI</div>
                  <div className="d-flex align-items-baseline gap-2">
                    <span className="h4 fw-bold theme-text">{plan.bmi ?? '—'}</span>
                    <span className="badge theme-card border-theme theme-text rounded-pill">{plan.bmi_category ?? '—'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {isWeekly && days && (
          <section className="mb-3 no-print">
            <div className="d-flex flex-wrap gap-2">
              {DAY_LABELS.map((label, idx) => (
                <button
                  key={label}
                  type="button"
                  className={`btn btn-sm ${selectedDay === idx ? 'btn-theme-primary' : 'theme-card border-theme'}`}
                  onClick={() => setSelectedDay(idx)}
                  aria-pressed={selectedDay === idx}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="row g-3">
          {MEAL_SLOTS.map(({ key, title }) => {
            const timeKey = `${key}_time`;
            const portionKey = `${key}_portion`;
            const time = safeText(activeChart[timeKey]);
            const portion = safeText(activeChart[portionKey]);
            const items = safeText(activeChart[key]);
            return (
              <div key={key} className="col-12 col-md-6">
                <div className="card theme-card shadow-theme h-100">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="small text-uppercase text-muted">{title}</span>
                      <div className="d-flex align-items-center gap-2">
                        {time ? <span className="badge theme-card border-theme theme-text rounded-pill small">{time}</span> : null}
                        <button
                          type="button"
                          className="btn btn-sm theme-card border-theme no-print"
                          onClick={() => handleSwapMeal(key)}
                          disabled={swapLoadingSlot !== null || !(items || '').trim()}
                          aria-label={`Swap ${title}`}
                        >
                          {swapLoadingSlot === key ? (
                            <span className="spinner-border spinner-border-sm" aria-hidden />
                          ) : (
                            'Swap'
                          )}
                        </button>
                      </div>
                    </div>
                    <p className="mb-0 theme-text">{items || '—'}</p>
                    {portion ? <p className="small text-muted mt-2 mb-0">Portion: {portion}</p> : null}
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {swapError && (
          <div className="alert alert-warning py-2 small no-print" role="alert">
            {swapError}
          </div>
        )}

        {hasMacros && (
          <section className="mt-3">
            <div className="card theme-card shadow-theme">
              <div className="card-body">
                <h3 className="h6 fw-semibold theme-text mb-2">Visual Nutrition — Macro Chart</h3>
                <p className="text-muted small mb-3">Daily distribution of protein, carbs, and fat (grams per day).</p>
                <div className="row align-items-center">
                  <div className="col-12 col-md-5 col-lg-4">
                    <MacroChart protein={protein} carbs={carbs} fat={fat} height={200} />
                  </div>
                  <div className="col-12 col-md-7 col-lg-8">
                    <div className="d-flex flex-wrap gap-3 theme-text">
                      <div className="d-flex align-items-center gap-2">
                        <span className="rounded-circle d-inline-block" style={{ width: 12, height: 12, background: '#be185d' }} aria-hidden />
                        <span><strong>Protein</strong> {protein ?? 0}g</span>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <span className="rounded-circle d-inline-block" style={{ width: 12, height: 12, background: '#db2777' }} aria-hidden />
                        <span><strong>Carbs</strong> {carbs ?? 0}g</span>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <span className="rounded-circle d-inline-block" style={{ width: 12, height: 12, background: '#f472b6' }} aria-hidden />
                        <span><strong>Fat</strong> {fat ?? 0}g</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="row g-3 mt-3">
          <div className="col-12 col-md-4">
            <div className="card theme-card shadow-theme h-100">
              <div className="card-body">
                <div className="small text-uppercase text-muted mb-2">
                  {isWeekly ? 'Daily calories' : 'Estimated Calories'}
                </div>
                <p className="h5 mb-0 theme-text">{safeText(chart.calories) || plan.calories || '—'}</p>
              </div>
            </div>
          </div>
          {hasMacros && (
            <div className="col-12 col-md-4">
              <div className="card theme-card shadow-theme h-100">
                <div className="card-body">
                  <div className="small text-uppercase text-muted mb-2">Macros (per day)</div>
                  <p className="mb-0 theme-text small">
                    P: {protein ?? '—'}g · C: {carbs ?? '—'}g · F: {fat ?? '—'}g
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className={hasMacros ? 'col-12 col-md-4' : 'col-12 col-md-8'}>
            <div className="card theme-card shadow-theme h-100">
              <div className="card-body">
                <div className="small text-uppercase text-muted mb-2">Health Suggestions</div>
                <ul className="mb-0 ps-3 theme-text small">
                  {suggestions.length === 0 ? (
                    <li>No specific suggestions. Follow the plan and stay hydrated.</li>
                  ) : (
                    suggestions.slice(0, 4).map((s, i) => <li key={i}>{safeText(s)}</li>)
                  )}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-3 no-print">
          <div className="card theme-card shadow-theme">
            <div className="card-body">
              <h3 className="h6 fw-semibold theme-text mb-2">Grocery list</h3>
              <p className="text-muted small mb-2">Generate a shopping list from this plan (requires AI).</p>
              <button
                type="button"
                className="btn btn-theme-primary btn-sm"
                onClick={handleGenerateGrocery}
                disabled={groceryLoading}
              >
                {groceryLoading ? 'Generating…' : 'Generate grocery list'}
              </button>
              {groceryError && <p className="small text-danger mt-2 mb-0">{groceryError}</p>}
              {groceryItems && groceryItems.length > 0 && (
                <div className="mt-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="small fw-semibold theme-text">Items</span>
                    <button type="button" className="btn btn-sm theme-card border-theme" onClick={handleCopyGrocery}>Copy</button>
                  </div>
                  <ul className="list-unstyled small theme-text mb-0">
                    {groceryItems.map((item, i) => (
                      <li key={i}>{item.name} — {item.quantity}{item.unit ? ` ${item.unit}` : ''}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mt-4 d-flex flex-column flex-md-row gap-2 no-print">
          <Link to="/generate" className="btn btn-theme-primary flex-grow-1">Generate New Plan</Link>
          <Link to="/history" className="btn theme-card border-theme">View History</Link>
        </section>
      </div>
    </div>
  );
}
