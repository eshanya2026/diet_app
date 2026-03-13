import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { getHistory } from '../api/dietApi';

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function History() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [plans, setPlans] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getHistory()
      .then((res) => {
        if (res.success && Array.isArray(res.data)) setPlans(res.data);
      })
      .catch((err) => {
        setError(err?.status === 401 ? 'Please log in again.' : 'Could not load history. Try again later.');
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return plans;
    const q = search.toLowerCase().trim();
    return plans.filter((plan) => {
      const chart = plan.diet_chart ?? {};
      const firstDay = Array.isArray(chart.days) && chart.days[0] ? chart.days[0] : chart;
      const text = [
        firstDay.breakfast,
        firstDay.lunch,
        firstDay.dinner,
        chart.calories,
        plan.created_at,
        plan.bmi,
        Array.isArray(chart.days) ? 'weekly' : '',
      ].join(' ').toLowerCase();
      return text.includes(q);
    });
  }, [plans, search]);

  return (
    <div className="theme-bg">
      <PageHeader
        title="Diet Plan History"
        description="Search and view past plans."
      >
        <Link to="/generate" className="btn btn-theme-primary btn-sm cursor-pointer">New Plan</Link>
      </PageHeader>

      {!loading && plans.length > 0 && (
        <div className="mb-3">
          <input
            type="search"
            className="form-control theme-input"
            placeholder="Search plans (meals, date, BMI...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search history"
          />
        </div>
      )}

      {error && <div className="alert alert-info theme-card border-theme" role="alert">{error}</div>}

      {loading && (
        <div className="d-flex align-items-center mb-3">
          <div className="spinner-border spinner-border-sm me-2 theme-text" aria-hidden="true" />
          <span className="text-muted small">Loading history...</span>
        </div>
      )}

      {!loading && !error && plans.length === 0 && (
        <div className="alert alert-info theme-card border-theme" role="alert">
          No diet plans found. Generate a plan from Generate Plan.
        </div>
      )}

      {!loading && filtered.length === 0 && plans.length > 0 && (
        <div className="alert alert-info theme-card border-theme" role="alert">No plans match your search.</div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="row g-3">
          {filtered.map((plan) => {
            const chart = plan.diet_chart ?? {};
            const isWeekly = Array.isArray(chart.days) && chart.days.length >= 7;
            const dayChart = isWeekly && chart.days[0] ? chart.days[0] : chart;
            const suggestions = Array.isArray(chart.suggestions) ? chart.suggestions : [];
            const mealKeys = [
              ['Breakfast', 'breakfast'],
              ['Mid-morning snack', 'mid_snack'],
              ['Lunch', 'lunch'],
              ['Evening snack', 'evening_snack'],
              ['Dinner', 'dinner'],
            ];
            return (
              <div key={plan.id ?? Math.random()} className="col-12">
                <article className="card theme-card shadow-theme">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start mb-2 flex-wrap gap-2">
                      <h2 className="h6 fw-semibold theme-text mb-1">
                        {isWeekly ? 'Weekly diet plan' : 'Diet plan'}
                      </h2>
                      <div className="d-flex align-items-center gap-2">
                        {isWeekly && (
                          <span className="badge bg-secondary rounded-pill small">7 days</span>
                        )}
                        {plan.diet_score != null && (
                          <span className="badge bg-primary rounded-pill small">Score: {plan.diet_score}/100</span>
                        )}
                        <p className="text-muted small mb-0">{formatDate(plan.created_at)}</p>
                      </div>
                    </div>
                    <p className="small mb-2 text-muted">
                      BMI: {plan.bmi != null ? plan.bmi : 'N/A'}
                      {(dayChart.protein_g != null || dayChart.carbs_g != null || dayChart.fat_g != null || chart.protein_g != null) && (
                        <span className="ms-2">
                          · P: {dayChart.protein_g ?? chart.protein_g ?? '—'}g C: {dayChart.carbs_g ?? chart.carbs_g ?? '—'}g F: {dayChart.fat_g ?? chart.fat_g ?? '—'}g
                        </span>
                      )}
                    </p>
                    {isWeekly && (
                      <p className="small text-muted mb-2">Preview: Day 1 meals below. Generate a new plan to view full week.</p>
                    )}
                    <ul className="mb-2 small theme-text">
                      {mealKeys.map(([label, key]) => {
                        const value = dayChart[key] ?? '';
                        const time = dayChart[`${key}_time`];
                        const portion = dayChart[`${key}_portion`];
                        const extra = [time, portion].filter(Boolean).join(' · ');
                        return (
                          <li key={label}>
                            <strong>{label}{extra ? ` (${extra})` : ''}:</strong> {String(value)}
                          </li>
                        );
                      })}
                    </ul>
                    <div className="text-uppercase small text-muted fw-semibold mb-1">Suggestions</div>
                    <ul className="mb-0 small theme-text">
                      {suggestions.length === 0 ? <li>No specific suggestions.</li> : suggestions.map((s, i) => <li key={i}>{String(s)}</li>)}
                    </ul>
                  </div>
                </article>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
