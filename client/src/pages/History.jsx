import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { getHistory } from '../api/dietApi';
import { useAuth } from '../context/AuthContext';

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function History() {
  const navigate = useNavigate();
  const { user } = useAuth();
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

  const handleViewDetails = (plan) => {
    try {
      const resultData = {
        user: user || {},
        diet_plan: plan,
        saved: true
      };
      sessionStorage.setItem('latestDietResult', JSON.stringify(resultData));
      navigate('/result');
    } catch (err) {
      console.error('Failed to view plan details:', err);
    }
  };

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
    <div className="flex-1 min-w-0 overflow-y-auto font-display">
      {/* Header section from code.html */}
      <header className="bg-white dark:bg-background-dark/30 border-b border-primary/5 sticky top-0 z-10 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Diet Plan History</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Review and track your previous nutritional journeys</p>
          </div>
          <div className="flex items-center gap-3">
            {!loading && plans.length > 0 && (
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">search</span>
                <input
                  className="pl-10 pr-4 py-2 bg-primary/5 border-none rounded-lg text-sm w-64 focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white placeholder:text-slate-400 transition-all outline-none"
                  placeholder="Search past plans..."
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            )}
            <Link to="/generate" className="!bg-primary/10 !text-primary hover:!bg-primary hover:!text-white px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 !no-underline">
              <span className="material-symbols-outlined text-sm">add</span>
              New Plan
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-8 py-10 space-y-8">
        {/* Summary Stats section moved to top */}
        {!loading && plans.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6 border-b border-primary/5">
            <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 text-center md:text-left">
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Average Score</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">
                {(plans.reduce((acc, p) => acc + (p.diet_score || 0), 0) / plans.length).toFixed(1)}
              </p>
              <p className="text-[10px] text-slate-500 mt-2 uppercase font-semibold tracking-wider">Based on all plans</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-900/20 text-center md:text-left">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Total Plans</p>
              <div className="flex items-center justify-center md:justify-start gap-2">
                <span className="material-symbols-outlined text-emerald-600">inventory</span>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">{plans.length}</p>
              </div>
              <p className="text-[10px] text-slate-500 mt-2 uppercase font-semibold tracking-wider">Consistency focus</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-2xl border border-blue-100 dark:border-blue-900/20 text-center md:text-left">
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">BMI Average</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">
                {(plans.filter(p => p.bmi).reduce((acc, p) => acc + p.bmi, 0) / (plans.filter(p => p.bmi).length || 1)).toFixed(1)}
              </p>
              <p className="text-[10px] text-slate-500 mt-2 uppercase font-semibold tracking-wider">Historical track</p>
            </div>
          </div>
        )}
        {error && (
          <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-xl" role="alert">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-3 py-10 justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-slate-500 font-medium">Retrieving your nutritional history...</span>
          </div>
        )}

        {!loading && !error && plans.length === 0 && (
          <div className="text-center py-20 bg-white dark:bg-background-dark/40 rounded-2xl border border-primary/5">
            <span className="material-symbols-outlined text-6xl text-slate-200 mb-4">history</span>
            <p className="text-slate-500">No diet plans found. Start your journey today!</p>
            <Link to="/generate" className="inline-block mt-4 text-primary font-bold hover:underline decoration-2 underline-offset-4">Generate your first plan &rarr;</Link>
          </div>
        )}

        {!loading && filtered.length === 0 && plans.length > 0 && (
          <div className="text-center py-10">
            <p className="text-slate-500 italic">No plans match your search query.</p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="space-y-8">
            {filtered.map((plan) => {
              const chart = plan.diet_chart ?? {};
              const isWeekly = Array.isArray(chart.days) && chart.days.length >= 7;
              const dayChart = isWeekly && chart.days[0] ? chart.days[0] : chart;
              const suggestions = Array.isArray(chart.suggestions) ? chart.suggestions : [];
              const mealItems = [
                dayChart.breakfast,
                dayChart.lunch,
                dayChart.dinner,
              ].filter(Boolean);

              return (
                <div key={plan.id ?? Math.random()} className="bg-white dark:bg-background-dark/40 rounded-2xl border border-primary/5 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                  <div className="p-6 md:p-8">
                    <div className="flex flex-col">
                      <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                        <div className="flex gap-4">
                          <div
                            className="w-24 h-24 rounded-xl bg-center bg-cover border border-primary/10 shrink-0 bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
                            style={{ backgroundImage: `url('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop')` }}
                          >
                            {!plan.image_url && <span className="material-symbols-outlined text-slate-300">restaurant</span>}
                          </div>
                          <div className="flex flex-col">
                            <span className={`text-[10px] font-bold tracking-[0.2em] px-2 py-0.5 rounded w-fit mb-2 uppercase ${isWeekly ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' : 'text-blue-600 bg-blue-50 dark:bg-blue-900/20'}`}>
                              {isWeekly ? 'Weekly' : 'Daily'} Plan
                            </span>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white capitalize">
                              {plan.goal?.replace('_', ' ') || (isWeekly ? 'Weekly Health' : 'Custom Nutrition')} Plan
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">{formatDate(plan.created_at)}</p>
                            <div className="flex items-center gap-4 mt-3">
                              <div className="flex items-center gap-1">
                                <span className="!text-[rgb(244,37,89)] font-bold text-lg">{plan.diet_score ?? '—'}</span>
                                <span className="text-slate-400 text-[10px] font-medium uppercase tracking-tighter">Score</span>
                              </div>
                              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700"></div>
                              <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">BMI: <span className="text-slate-900 dark:text-white">{plan.bmi != null ? plan.bmi : 'N/A'}</span></div>
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleViewDetails(plan)}
                          className="!bg-primary text-white text-[10px] font-bold px-4 py-2 rounded-lg hover:brightness-110 transition-all uppercase tracking-wider border-none cursor-pointer"
                        >
                          View Details
                        </button>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                        {/* Macro Targets */}
                        <div className="space-y-3">
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Macro Targets</h4>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="bg-primary/5 p-3 rounded-lg text-center">
                              <p className="!text-[rgb(244,37,89)] font-bold text-lg leading-tight">{dayChart.protein_g ?? chart.protein_g ?? '—'}g</p>
                              <p className="text-[9px] text-slate-500 font-medium uppercase">Protein</p>
                            </div>
                            <div className="bg-primary/5 p-3 rounded-lg text-center">
                              <p className="!text-[rgb(244,37,89)] font-bold text-lg leading-tight">{dayChart.carbs_g ?? chart.carbs_g ?? '—'}g</p>
                              <p className="text-[9px] text-slate-500 font-medium uppercase">Carbs</p>
                            </div>
                            <div className="bg-primary/5 p-3 rounded-lg text-center">
                              <p className="!text-[rgb(244,37,89)] font-bold text-lg leading-tight">{dayChart.fat_g ?? chart.fat_g ?? '—'}g</p>
                              <p className="text-[9px] text-slate-500 font-medium uppercase">Fats</p>
                            </div>
                          </div>
                        </div>

                        {/* Meal Preview */}
                        <div className="space-y-3">
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Plan Preview</h4>
                          <ul className="space-y-2 m-0 p-0 list-none">
                            {mealItems.length > 0 ? mealItems.slice(0, 3).map((meal, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                                <span className="material-symbols-outlined !text-[rgb(244,37,89)] text-base mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                <span className="line-clamp-1">{String(meal)}</span>
                              </li>
                            )) : (
                                <li className="text-slate-400 italic text-sm">No meal data available.</li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}


      </div>
    </div>
  );
}
