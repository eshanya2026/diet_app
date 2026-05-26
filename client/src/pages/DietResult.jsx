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
  const [groceryMinimized, setGroceryMinimized] = useState(false);

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
          const oldDay = chart.days[selectedDay];
          chart.days[selectedDay] = {
            ...oldDay,
            [slotKey]: res.data.alternative_meal,
            [portionKey]: altPortion,
            protein_g: res.data.protein_g ?? oldDay.protein_g,
            carbs_g: res.data.carbs_g ?? oldDay.carbs_g,
            fat_g: res.data.fat_g ?? oldDay.fat_g,
            calories: res.data.calories ?? oldDay.calories,
          };
        } else {
          chart[slotKey] = res.data.alternative_meal;
          if (Object.prototype.hasOwnProperty.call(chart, portionKey)) {
            chart[portionKey] = altPortion;
          }
          chart.protein_g = res.data.protein_g ?? chart.protein_g;
          chart.carbs_g = res.data.carbs_g ?? chart.carbs_g;
          chart.fat_g = res.data.fat_g ?? chart.fat_g;
          chart.calories = res.data.calories ?? chart.calories;
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
      <div className="flex-1 min-h-screen flex items-center justify-center font-display bg-background-light dark:bg-background-dark">
        <div className="flex items-center gap-3 text-slate-500 font-bold animate-pulse">
          <span className="material-symbols-outlined spin">refresh</span>
          <span>Loading Nutrition Plan...</span>
        </div>
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
  const protein = activeChart.protein_g ?? plan.protein_g ?? chart.protein_g ?? 0;
  const carbs = activeChart.carbs_g ?? plan.carbs_g ?? chart.carbs_g ?? 0;
  const fat = activeChart.fat_g ?? plan.fat_g ?? chart.fat_g ?? 0;
  const hasMacros = [protein, carbs, fat].some((n) => typeof n === 'number' && n > 0);
  const dietScore = plan.diet_score ?? 79;
  const caloriesStr = safeText(activeChart.calories) || plan.calories || '1,850';
  const caloriesNum = parseInt(String(caloriesStr).replace(/\D/g, ''), 10) || 1850;

  // Calculate donut chart values
  const totalMacros = protein + carbs + fat;
  const pPct = totalMacros > 0 ? (protein / totalMacros) * 100 : 33.3;
  const cPct = totalMacros > 0 ? (carbs / totalMacros) * 100 : 33.3;
  const fPct = totalMacros > 0 ? (fat / totalMacros) * 100 : 33.4;

  // SVG Circle math: Circumference = 2 * PI * R (R=40 => ~251.3)
  const circumference = 251.32;
  const cOffset = (cPct / 100) * circumference;
  const pOffset = (pPct / 100) * circumference;
  const fOffset = (fPct / 100) * circumference;

  const cRotation = -90;
  const pRotation = -90 + (cPct / 100) * 360;
  const fRotation = pRotation + (pPct / 100) * 360;

  // Placeholder images for meal slots
  const mealImages = {
    breakfast: "https://lh3.googleusercontent.com/aida-public/AB6AXuB7bevdDWEz74WTGfcPk4nCGmfbccjHQyWPLN53IpRAZJ-z5j-AN4FmegSQYZ-nME47M8um5e4Lwd9pvt8jJfPv8Hr4169w0hIs8EM63PJ8QaZANM02m5KBnlBs6XBOWVPa4I8cYsozuwCn7iZ7DDum7jewRc_5frFd3o6pjGFTivvhRcz-QI25OQmqNtAz0RdY33e-uyt_IH-yEXZbUWpCQRVXE98GMjB0MeH-OrvIej8NbyF8ISNl5B53wIypRKmY2hiy8ZSOUvU",
    mid_snack: "https://lh3.googleusercontent.com/aida-public/AB6AXuCWkfoQD2bHDUgCwMo5xHLJE1DdnsgajYFm4Nx_rUkfivgf5XK8XvYkmIK9kHDogDd81nfy2Dx5blJWIvi6myMr1kfrC06bVkcumUtaDJlNjLN30-27u3U1t9By_gcEggVRJBFNGwnpR8pWZ9zMyJIVnTRsySL3coDysQRNSNclPj2D3Awuv_1iBm2CvT1gHrhu1BNXSqtoc2y36mAnfrbsSxplbEW5KayGQcApN-WTMG8vsgZGz4Rg4qutRi9QuCFLqjvb-nJ1ekI",
    lunch: "https://lh3.googleusercontent.com/aida-public/AB6AXuC3gbB3szG61SLnzRlb5pakLE54bfF7kz6Iw0GdaTDRo9W2RqTngoXJ19OLRGK-xiZvFMdej48dsMd9PTxRkDlsW1hFmBi2rPAIYuuWyNL6mw_MmQ_dfU5RfvI_DGKkiCd1xBlToNiystYy3lPIc4nnEOAdQm97fgrOtkpa_ol2vIyS5T1Fa16kW3404UKndSVwdnhErpAYHrBBOte8nphDiIop2ZII-JPkk6oQYC1RfM3k9NkHVbTtjbo32f2hbnBItRK_fyJEPTI",
    evening_snack: "https://lh3.googleusercontent.com/aida-public/AB6AXuDWoltKj-qaIjmJZFeVPF-CS_Lrjf1oPQ9hzqUFMyIc6G2qNEp61i5n4HGP8CkHFbkLFVl4bEEg4OAHPQEwJujqAycHPYqfl5cUkO1M3los2m5CvjI7iHLlAWduRvUpGQ9-PTkyEN_P9S0of19xHHd-kDI69lyltky73KBDDtOAA0JnBBTrKrkWTB0I0qd-rSBOWxXI4jsuFEWH3JIZOZp8cYg01HNfESg4xFGi_lIhBVDNmGfSHslJRL8R8n4p9gXS_pQSDji6ZeI",
    dinner: "https://lh3.googleusercontent.com/aida-public/AB6AXuDkE4J3_IuDYVCqyoTCCnLRERgdICiLIX4PBGAWsrS2G8cdS_1R2DVFRjMXn_wb877xHHnNS5sjijJ6u5J9RlXSHlUc08CvlhYf8H3Xk2dkhQVIlg_GZnNsupPq_iRAUyg-u0kUyMvlYBidowtj4c0UtS5BBR2Y38RC0r9jqBZQSPkud1BV1PtQh2wjNrpTYx9JOwneNBgQyEBnvAPjB7lZrK_Fc-TkGhfKfGOCBjKZn5jyQEipjfYR5sLccdwbXhFm2GdhaQY6EuM"
  };

  return (
    <div className="flex-1 min-w-0 overflow-y-auto font-display bg-background-light dark:bg-background-dark">
      <header className="mb-8 p-8 pb-0">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Your Weekly Diet Plan</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm font-medium">Personalized nutrition for your {plan.goal || 'weight loss'} goals</p>
          </div>
          <div className="flex items-center gap-3 no-print">
            <button onClick={handlePrint} className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors">
              <span className="material-symbols-outlined text-lg">print</span>
              Print PDF
            </button>
            <Link to="/generate" className="flex items-center gap-2 px-5 py-2.5 bg-[rgb(244,37,89)] text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform !no-underline">
              <span className="material-symbols-outlined text-lg">add_circle</span>
              New Plan
            </Link>
          </div>
        </div>
      </header>

      <main className="p-8 pt-0 space-y-8">
        {notSaved && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-4 flex items-center gap-4 no-print text-sm text-blue-700 dark:text-blue-300 font-bold">
            <span className="material-symbols-outlined">info</span>
            <span>Plan generated successfully. It was not saved to history because the database is unavailable. Fix MongoDB connection to save future plans.</span>
          </div>
        )}

        {/* User Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-[rgb(244,37,89)]/5 flex flex-col items-center justify-center shadow-sm">
            <span className="text-slate-500 text-[9px] font-bold uppercase mb-2 tracking-widest">Diet Score</span>
            <div className="relative flex items-center justify-center">
              <svg className="w-20 h-20">
                <circle className="text-[rgb(244,37,89)]/10" cx="40" cy="40" fill="transparent" r="34" stroke="currentColor" strokeWidth="5"></circle>
                <circle className="!text-[rgb(244,37,89)]" cx="40" cy="40" fill="transparent" r="34" stroke="currentColor" strokeDasharray="213.6" strokeDashoffset={213.6 - (dietScore / 100) * 213.6} strokeLinecap="round" strokeWidth="5" transform="rotate(-90 40 40)"></circle>
              </svg>
              <span className="absolute text-xl font-bold !text-[rgb(244,37,89)]">{dietScore}</span>
            </div>
            <p className="text-[9px] text-slate-400 mt-2 font-bold uppercase tracking-tighter">Target: 90/100</p>
          </div>
          <div className="md:col-span-3 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-[rgb(244,37,89)]/5 shadow-sm flex items-center gap-8">
            <div className="flex-1 space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Profile Metrics</p>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">Status: {plan.bmi_category || 'Healthy Weight'}</h3>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Current BMI</p>
                  <p className="text-xl font-bold !text-[rgb(244,37,89)] mt-1">{plan.bmi || '—'}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Age</p>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{user.age ? `${user.age} years` : '—'}</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Gender</p>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200 capitalise">{user.gender || '—'}</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Goal</p>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{plan.goal ? plan.goal.replace(/\b\w/g, l => l.toUpperCase()) : '—'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs for Days */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[rgb(244,37,89)]/5 shadow-sm overflow-hidden">
          {isWeekly && (
            <div className="flex border-b border-slate-100 dark:border-slate-800 overflow-x-auto no-scrollbar scroll-smooth">
              {DAY_LABELS.map((label, idx) => (
                <button
                  key={label}
                  onClick={() => setSelectedDay(idx)}
                  className={`flex-1 min-w-[100px] py-4 text-center border-b-2 transition-all text-[10px] font-bold uppercase tracking-widest ${selectedDay === idx ? 'border-[rgb(244,37,89)] !text-[rgb(244,37,89)]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <div className="p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <span className="material-symbols-outlined !text-[rgb(244,37,89)]">calendar_today</span>
                {isWeekly ? `Day ${selectedDay + 1} Meal Plan` : "Today's Meal Plan"}
              </h3>
              <div className="flex gap-2 w-full md:w-auto no-print">
                <button onClick={handlePrint} className="flex-1 md:flex-none px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-slate-50 transition-colors">Print PDF</button>
                <Link to="/generate" className="flex-1 md:flex-none px-4 py-2 bg-[rgb(244,37,89)]/10 !text-[rgb(244,37,89)] rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-[rgb(244,37,89)]/20 transition-colors !no-underline text-center">New Plan</Link>
              </div>
            </div>

            {/* Meal List */}
            <div className="space-y-4">
              {MEAL_SLOTS.map(({ key, title }) => {
                const timeKey = `${key}_time`;
                const portionKey = `${key}_portion`;
                const time = safeText(activeChart[timeKey]);
                const portion = safeText(activeChart[portionKey]);
                const items = safeText(activeChart[key]);
                const kcal = Math.round(caloriesNum * (key.includes('snack') ? 0.1 : 0.25));

                return (
                  <div key={key} className="flex flex-col md:flex-row md:items-center gap-6 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-[rgb(244,37,89)]/20 transition-all group bg-white dark:bg-transparent">
                    <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 shadow-md">
                      <img alt={title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" src={mealImages[key]} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                        <span className="text-[9px] font-bold !text-[rgb(244,37,89)] uppercase bg-[rgb(244,37,89)]/10 px-2 py-0.5 rounded tracking-widest">
                          {time || (key === 'breakfast' ? '08:00 AM' : key === 'lunch' ? '01:30 PM' : key === 'dinner' ? '08:30 PM' : '11:00 AM')}
                        </span>
                        <h4 className="text-base font-bold text-slate-900 dark:text-white">{title}: {items.split(',')[0]}</h4>
                      </div>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed">{items || '—'} {portion ? `(${portion})` : ''}</p>
                    </div>
                    <div className="flex items-center justify-between md:justify-end gap-8 border-t md:border-t-0 pt-4 md:pt-0 border-slate-50 dark:border-slate-800/50">
                      <div className="text-left md:text-right">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{kcal} kcal</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Est. Macros</p>
                      </div>
                      <button
                        onClick={() => handleSwapMeal(key)}
                        disabled={swapLoadingSlot !== null || !items.trim()}
                        className="p-3 bg-[rgb(244,37,89)]/5 !text-[rgb(244,37,89)] rounded-xl hover:bg-[rgb(244,37,89)] hover:text-white transition-all hover:scale-110 active:scale-95 disabled:opacity-50"
                      >
                        {swapLoadingSlot === key ? <span className="spinner-border spinner-border-sm" /> : <span className="material-symbols-outlined text-xl">swap_horiz</span>}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {swapError && <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 text-[10px] font-bold rounded-lg border border-red-100 dark:border-red-900/20 uppercase tracking-widest">{swapError}</div>}
          </div>
        </div>

        {/* Visual Nutrition and Macro Targets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-[rgb(244,37,89)]/5 shadow-sm h-fit">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-6 uppercase tracking-widest">Visual Nutrition</h3>
            <div className="flex flex-col items-center">
              <div className="relative w-48 h-48 mb-8">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  {/* Carbs */}
                  <circle
                    cx="50" cy="50" fill="transparent" r="40"
                    stroke="rgb(244, 37, 89)"
                    strokeWidth="12"
                    strokeDasharray={`${cOffset} ${circumference}`}
                    transform={`rotate(${cRotation} 50 50)`}
                  />
                  {/* Protein */}
                  <circle
                    cx="50" cy="50" fill="transparent" r="40"
                    stroke="#fb923c"
                    strokeWidth="12"
                    strokeDasharray={`${pOffset} ${circumference}`}
                    transform={`rotate(${pRotation} 50 50)`}
                  />
                  {/* Fats */}
                  <circle
                    cx="50" cy="50" fill="transparent" r="40"
                    stroke="#94a3b8"
                    strokeWidth="12"
                    strokeDasharray={`${fOffset} ${circumference}`}
                    transform={`rotate(${fRotation} 50 50)`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-slate-900 dark:text-white">{caloriesNum.toLocaleString()}</span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Kcal Total</span>
                </div>
              </div>
              <div className="w-full space-y-4">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-[rgb(244,37,89)] shadow-sm shadow-[rgb(244,37,89)]/40"></div>
                    <span className="text-slate-600 dark:text-slate-400">Carbs</span>
                  </div>
                  <span className="text-slate-900 dark:text-white font-bold">{carbs || 185}g</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-orange-400 shadow-sm shadow-orange-400/40"></div>
                    <span className="text-slate-600 dark:text-slate-400">Protein</span>
                  </div>
                  <span className="text-slate-900 dark:text-white font-bold">{protein || 160}g</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-slate-400 shadow-sm shadow-slate-400/40"></div>
                    <span className="text-slate-600 dark:text-slate-400">Fats</span>
                  </div>
                  <span className="text-slate-900 dark:text-white font-bold">{fat || 52}g</span>
                </div>
              </div>
            </div>
          </div>
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-[rgb(244,37,89)] text-white p-8 rounded-2xl shadow-xl shadow-primary/20 relative overflow-hidden">
              <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-8">
                <div>
                  <p className="text-[9px] font-bold text-white/70 uppercase tracking-widest mb-1.5">Daily Calories</p>
                  <p className="text-xl font-bold">{caloriesNum.toLocaleString()} <span className="text-[9px] font-medium opacity-80 ml-0.5">kcal</span></p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-white/70 uppercase tracking-widest mb-1.5">Protein Target</p>
                  <p className="text-xl font-bold">{protein || 160} <span className="text-[9px] font-medium opacity-80 ml-0.5">g</span></p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-white/70 uppercase tracking-widest mb-1.5">Net Carbs</p>
                  <p className="text-xl font-bold">{carbs || 185} <span className="text-[9px] font-medium opacity-80 ml-0.5">g</span></p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-white/70 uppercase tracking-widest mb-1.5">Healthy Fats</p>
                  <p className="text-xl font-bold">{fat || 52} <span className="text-[9px] font-medium opacity-80 ml-0.5">g</span></p>
                </div>
              </div>
              <div className="absolute right-0 top-0 bottom-0 w-32 bg-white/5 skew-x-[-20deg] translate-x-12"></div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-[rgb(244,37,89)]/5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 no-print">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-[rgb(244,37,89)]/10 rounded-full flex items-center justify-center !text-[rgb(244,37,89)] flex-shrink-0 shadow-inner">
                  <span className="material-symbols-outlined text-2xl">shopping_basket</span>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-base">Ready to shop?</h4>
                  <p className="text-[11px] text-slate-500 font-medium">{groceryItems ? "Your grocery list is ready for this plan." : "Generate your grocery list for this week's plan."}</p>
                </div>
              </div>
              <button
                onClick={handleGenerateGrocery}
                disabled={groceryLoading}
                className="w-full md:w-auto bg-slate-900 dark:bg-[rgb(244,37,89)] text-white px-8 py-3.5 rounded-xl text-sm font-bold shadow-lg hover:opacity-90 transition-all hover:scale-[1.02] disabled:opacity-50"
              >
                {groceryLoading ? 'Generating…' : groceryItems ? 'Refresh List' : 'View Grocery List'}
              </button>
            </div>
            {groceryError && <div className="p-4 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl border border-red-100 dark:border-red-900/20">{groceryError}</div>}
            {groceryItems && (
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-[rgb(244,37,89)]/5 shadow-sm animate-in slide-in-from-top-4 duration-500">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                    <span className="material-symbols-outlined !text-[rgb(244,37,89)] text-lg">inventory_2</span>
                    Shopping Items ({groceryItems.length})
                  </h4>
                  <div className="flex items-center gap-4">
                    <button onClick={handleCopyGrocery} className="text-[10px] font-bold !text-[rgb(244,37,89)] uppercase tracking-widest hover:underline">Copy to Clipboard</button>
                    <button 
                      onClick={() => setGroceryMinimized(!groceryMinimized)}
                      className="p-1 px-2 bg-slate-100 dark:bg-slate-800 rounded text-slate-500 hover:text-[rgb(244,37,89)] transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">{groceryMinimized ? 'expand_more' : 'expand_less'}</span>
                    </button>
                  </div>
                </div>
                {!groceryMinimized && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-in fade-in duration-300">
                    {groceryItems.map((item, i) => (
                      <div key={i} className="flex items-center gap-2.5 p-2 rounded-lg bg-primary/5 border border-primary/5">
                        <div className="size-1.5 rounded-full bg-[rgb(244,37,89)]"></div>
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{item.name} <span className="text-slate-400 ml-1 font-medium">— {item.quantity}{item.unit ? ` ${item.unit}` : ''}</span></span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Health Suggestions List */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-[rgb(244,37,89)]/5 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
            <span className="material-symbols-outlined !text-[rgb(244,37,89)] text-xl">verified_user</span>
            Professional Health Suggestions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div className="flex gap-3 group">
              <span className="material-symbols-outlined !text-[rgb(244,37,89)] bg-[rgb(244,37,89)]/10 p-2.5 rounded-xl h-fit group-hover:scale-110 transition-transform text-lg">water_drop</span>
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-white mb-1 flex items-center gap-2">Stay Hydrated</h4>
                <p className="text-[10px] text-slate-500 leading-relaxed font-medium">Drink at least 3.5L of water daily. Hydration improves metabolic rate and aids digestion.</p>
              </div>
            </div>
            <div className="flex gap-3 group">
              <span className="material-symbols-outlined !text-[rgb(244,37,89)] bg-[rgb(244,37,89)]/10 p-2.5 rounded-xl h-fit group-hover:scale-110 transition-transform text-lg">alarm</span>
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-white mb-1 flex items-center gap-2">Meal Timing</h4>
                <p className="text-[10px] text-slate-500 leading-relaxed font-medium">Try to consume your last meal at least 3 hours before sleep to optimize growth hormone.</p>
              </div>
            </div>
            <div className="flex gap-3 group">
              <span className="material-symbols-outlined !text-[rgb(244,37,89)] bg-[rgb(244,37,89)]/10 p-2.5 rounded-xl h-fit group-hover:scale-110 transition-transform text-lg">set_meal</span>
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-white mb-1 flex items-center gap-2">Dynamic Selection</h4>
                <p className="text-[10px] text-slate-500 leading-relaxed font-medium">{suggestions[0] || "Portion sizes suggested for optimal health results."}</p>
              </div>
            </div>
             <div className="flex gap-3 group">
              <span className="material-symbols-outlined !text-[rgb(244,37,89)] bg-[rgb(244,37,89)]/10 p-2.5 rounded-xl h-fit group-hover:scale-110 transition-transform text-lg">self_improvement</span>
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-white mb-1 flex items-center gap-2">Expert Advice</h4>
                <p className="text-[10px] text-slate-500 leading-relaxed font-medium">{suggestions[1] || "Consistent meal schedule is key. Drink more water."}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row gap-4 pt-2 pb-10 no-print">
          <Link to="/generate" className="flex-1 bg-[rgb(244,37,89)] text-white py-3.5 rounded-2xl font-bold text-sm shadow-xl shadow-primary/30 flex items-center justify-center gap-2.5 hover:scale-[1.02] transition-all !no-underline">
            <span className="material-symbols-outlined text-lg">restart_alt</span>
            Generate New Plan
          </Link>
          <Link to="/history" className="flex-1 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 py-3.5 rounded-2xl font-bold text-sm text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all !no-underline">
            <span className="material-symbols-outlined text-lg">history</span>
            View History
          </Link>
        </div>
      </main>
    </div>
  );
}
