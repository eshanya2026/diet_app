/**
 * Generate diet plan: health form and AI generation.
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { generateDiet, checkHealth } from '../api/dietApi';

const ACTIVITY_OPTIONS = [
  { value: '', label: 'Select' },
  { value: 'low', label: 'Low (sedentary)' },
  { value: 'medium', label: 'Medium (lightly active)' },
  { value: 'high', label: 'High (very active)' },
];

const DIET_OPTIONS = [
  { value: '', label: 'Select' },
  { value: 'veg', label: 'Vegetarian' },
  { value: 'non-veg', label: 'Non-Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
];

const GOAL_OPTIONS = [
  { value: '', label: 'Select' },
  { value: 'weight loss', label: 'Weight Loss' },
  { value: 'weight gain', label: 'Weight Gain' },
  { value: 'muscle gain', label: 'Muscle Gain' },
];

const PLAN_TYPE_OPTIONS = [
  { value: 'daily', label: 'Daily (1 day)' },
  { value: 'weekly', label: 'Weekly (7 days)' },
];

const CUISINE_OPTIONS = [
  { value: 'Mixed', label: 'Any / Mixed' },
  { value: 'South Indian', label: 'South Indian' },
  { value: 'North Indian', label: 'North Indian' },
  { value: 'Kerala', label: 'Kerala' },
  { value: 'Tamil', label: 'Tamil' },
  { value: 'Andhra', label: 'Andhra' },
];

export default function Generate() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    age: '',
    gender: '',
    height: '',
    weight: '',
    activity_level: '',
    diet_preference: '',
    health_conditions: [],
    goal: '',
    cuisine_preference: 'Mixed',
    plan_type: 'daily',
  });

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setForm((f) => {
        const arr = f.health_conditions.includes(value)
          ? f.health_conditions.filter((c) => c !== value)
          : [...f.health_conditions, value];
        return { ...f, health_conditions: arr };
      });
      return;
    }
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const conditions = form.health_conditions.length ? form.health_conditions : ['none'];
      const payload = {
        ...form,
        health_conditions: conditions,
        cuisine_preference: form.cuisine_preference ?? 'Mixed',
        plan_type: form.plan_type || 'daily',
      };
      const res = await generateDiet(payload, isAuthenticated);
      if (res.success && res.data) {
        sessionStorage.setItem('latestDietResult', JSON.stringify(res.data));
        if (!isAuthenticated && res.data.user?.id) sessionStorage.setItem('dietUserId', res.data.user.id);
        navigate('/result');
      } else {
        setError('Could not generate diet plan. Please try again.');
      }
    } catch (err) {
      let text = err?.error?.messages ?? err?.error?.message;
      text = Array.isArray(text) ? text.join(' ') : (text || 'Something went wrong. Try again.');
      if (err?.error?.code === 'SERVER_ERROR' && /database|connection|mongodb|save|unable/i.test(text)) {
        try {
          const health = await checkHealth();
          if (!health.ok && health.error) {
            text = 'Database is unavailable. Check MongoDB Atlas (Network Access and connection string in .env). Your plan can still be generated once the connection works.';
          }
        } catch (_) {}
        if (!/Database is unavailable/.test(text)) {
          text = text.replace(/save user|unable to save user/gi, 'save to database').trim();
        }
      }
      setError(text);
    } finally {
      setLoading(false);
    }
  };

  // Helper to toggle arrays (e.g. for health conditions)
  const handleToggleArray = (field, value) => {
    setForm(f => {
      const arr = f[field].includes(value)
        ? f[field].filter(c => c !== value)
        : [...f[field], value];
      return { ...f, [field]: arr };
    });
  };

  // Helper to toggle singles (e.g. for diet, cuisine)
  const handleToggleSingle = (field, value) => {
    setForm(f => ({ ...f, [field]: value === f[field] ? '' : value }));
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-8 font-display">
      {/* Header & Progress */}
      <div className="mb-10">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h2 className="text-3xl !font-bold text-slate-900 dark:text-white">Generate Diet Plan</h2>
            <p className="text-slate-500 mt-2 text-lg">Personalize your nutrition strategy with AI.</p>
          </div>
        </div>
        <div className="w-full h-1 bg-[rgb(244,37,89)] rounded-full mt-4"></div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 border border-red-200 rounded-xl">
          {error}
        </div>
      )}

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="space-y-10">
        
        {/* Section 1: Basic Stats */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined text-[rgb(244,37,89)]">person</span>
            <h3 className="text-xl !font-bold text-slate-900 dark:text-white">Physical Profile</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm !font-bold text-slate-900 dark:text-white ml-1">Full Name</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-3.5 rounded-xl border border-primary/20 bg-white dark:bg-background-dark/30 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900 dark:text-white outline-none"
                placeholder="e.g. Sarah Mitchell"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm !font-bold text-slate-900 dark:text-white ml-1">Age</label>
                <input
                  type="number"
                  name="age"
                  min="5" max="120"
                  value={form.age}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3.5 rounded-xl border border-primary/20 bg-white dark:bg-background-dark/30 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900 dark:text-white outline-none"
                  placeholder="Years"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm !font-bold text-slate-900 dark:text-white ml-1">Gender</label>
                <select
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3.5 rounded-xl border border-primary/20 bg-white dark:bg-background-dark/30 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900 dark:text-white outline-none appearance-none cursor-pointer"
                >
                  <option value="">Select</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="non-binary">Non-binary</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm !font-bold text-slate-900 dark:text-white ml-1">Height (cm)</label>
              <input
                type="number"
                name="height"
                min="100" max="250" step="0.1"
                value={form.height}
                onChange={handleChange}
                required
                className="w-full px-4 py-3.5 rounded-xl border border-primary/20 bg-white dark:bg-background-dark/30 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900 dark:text-white outline-none"
                placeholder="175"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm !font-bold text-slate-900 dark:text-white ml-1">Current Weight (kg)</label>
              <input
                type="number"
                name="weight"
                min="20" max="300" step="0.1"
                value={form.weight}
                onChange={handleChange}
                required
                className="w-full px-4 py-3.5 rounded-xl border border-primary/20 bg-white dark:bg-background-dark/30 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900 dark:text-white outline-none"
                placeholder="70"
              />
            </div>
          </div>
        </section>

        {/* Section 2: Activity Level */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined text-[rgb(244,37,89)]">bolt</span>
            <h3 className="text-xl !font-bold text-slate-900 dark:text-white">Activity Level</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            
            <div onClick={() => handleToggleSingle('activity_level', 'low')} className={`p-4 rounded-2xl border-2 cursor-pointer transition-all group relative ${form.activity_level === 'low' ? 'border-primary bg-primary/5' : 'border-primary/10 bg-white dark:bg-background-dark/40 hover:!border-primary/40 hover:!bg-primary/5'}`}>
              {form.activity_level === 'low' && (
                <div className="absolute top-2 right-2 h-5 w-5 bg-primary rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-[14px] font-bold">check</span>
                </div>
              )}
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center mb-3 transition-colors ${form.activity_level === 'low' ? '!bg-[rgb(244,37,89)] text-white' : 'bg-[rgb(244,37,89)]/10 !text-[rgb(244,37,89)] group-hover:!bg-[rgb(244,37,89)] group-hover:!text-white'}`}>
                <span className="material-symbols-outlined">chair</span>
              </div>
              <h4 className="!text-sm !font-bold text-slate-900 dark:text-white">Sedentary</h4>
              <p className="!text-xs text-slate-500 mt-1 leading-relaxed">Little to no exercise, desk job</p>
            </div>

            <div onClick={() => handleToggleSingle('activity_level', 'medium')} className={`p-4 rounded-2xl border-2 cursor-pointer transition-all group relative ${form.activity_level === 'medium' ? 'border-primary bg-primary/5' : 'border-primary/10 bg-white dark:bg-background-dark/40 hover:!border-primary/40 hover:!bg-primary/5'}`}>
              {form.activity_level === 'medium' && (
                  <div className="absolute top-2 right-2 h-5 w-5 bg-primary rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-[14px] font-bold">check</span>
                  </div>
                )}
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center mb-3 transition-colors ${form.activity_level === 'medium' ? '!bg-[rgb(244,37,89)] text-white' : 'bg-[rgb(244,37,89)]/10 !text-[rgb(244,37,89)] group-hover:!bg-[rgb(244,37,89)] group-hover:!text-white'}`}>
                <span className="material-symbols-outlined">directions_walk</span>
              </div>
              <h4 className="!text-sm !font-bold text-slate-900 dark:text-white">Lightly Active</h4>
              <p className="!text-xs text-slate-500 mt-1 leading-relaxed">Light exercise 1-3 days/week</p>
            </div>

            <div onClick={() => handleToggleSingle('activity_level', 'high')} className={`p-4 rounded-2xl border-2 cursor-pointer transition-all group relative ${form.activity_level === 'high' ? 'border-primary bg-primary/5' : 'border-primary/10 bg-white dark:bg-background-dark/40 hover:!border-primary/40 hover:!bg-primary/5'}`}>
                {form.activity_level === 'high' && (
                  <div className="absolute top-2 right-2 h-5 w-5 bg-primary rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-[14px] font-bold">check</span>
                  </div>
                )}
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center mb-3 transition-colors ${form.activity_level === 'high' ? '!bg-[rgb(244,37,89)] text-white' : 'bg-[rgb(244,37,89)]/10 !text-[rgb(244,37,89)] group-hover:!bg-[rgb(244,37,89)] group-hover:!text-white'}`}>
                <span className="material-symbols-outlined">fitness_center</span>
              </div>
              <h4 className="!text-sm !font-bold text-slate-900 dark:text-white">Moderately Active</h4>
              <p className="!text-xs text-slate-500 mt-1 leading-relaxed">Moderate exercise 3-5 days/week</p>
            </div>

            <div onClick={() => handleToggleSingle('activity_level', 'very_high')} className={`p-4 rounded-2xl border-2 cursor-pointer transition-all group relative ${form.activity_level === 'very_high' ? 'border-primary bg-primary/5' : 'border-primary/10 bg-white dark:bg-background-dark/40 hover:!border-primary/40 hover:!bg-primary/5'}`}>
              {form.activity_level === 'very_high' && (
                  <div className="absolute top-2 right-2 h-5 w-5 bg-primary rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-[14px] font-bold">check</span>
                  </div>
                )}
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center mb-3 transition-colors ${form.activity_level === 'very_high' ? '!bg-[rgb(244,37,89)] text-white' : 'bg-[rgb(244,37,89)]/10 !text-[rgb(244,37,89)] group-hover:!bg-[rgb(244,37,89)] group-hover:!text-white'}`}>
                <span className="material-symbols-outlined">speed</span>
              </div>
              <h4 className="!text-sm !font-bold text-slate-900 dark:text-white">Very Active</h4>
              <p className="!text-xs text-slate-500 mt-1 leading-relaxed">Hard exercise 6-7 days/week</p>
            </div>

          </div>
        </section>

        {/* Section 3: Preferences & Conditions */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <span className="material-symbols-outlined text-[rgb(244,37,89)]">eco</span>
              <h3 className="text-xl !font-bold text-slate-900 dark:text-white">Dietary Preferences</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {DIET_OPTIONS.filter(o => o.value !== '').map((diet) => {
                const isSelected = form.diet_preference === diet.value;
                return (
                  <button
                    key={diet.value}
                    type="button"
                    onClick={() => handleToggleSingle('diet_preference', diet.value)}
                    className={`px-4 py-2 !rounded-xl !border-2 !text-sm font-semibold transition-colors cursor-pointer ${isSelected ? 'border-primary bg-primary text-white' : 'border-primary/20 !bg-transparent dark:!bg-transparent text-slate-600 dark:text-slate-300 hover:!border-primary/40 hover:!bg-primary/5 hover:!text-primary'}`}
                  >
                    {diet.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-6">
              <span className="material-symbols-outlined text-[rgb(244,37,89)]">medical_services</span>
              <h3 className="text-xl !font-bold text-slate-900 dark:text-white">Health Conditions</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                  { value: 'diabetes', label: 'Diabetes' },
                  { value: 'hypertension', label: 'Hypertension' },
                  { value: 'pcos', label: 'PCOS' },
                  { value: 'thyroid', label: 'Thyroid' },
                  { value: 'high_cholesterol', label: 'High Cholesterol' },
                  { value: 'anemia', label: 'Anemia' },
                  { value: 'obesity', label: 'Obesity' },
                  { value: 'underweight', label: 'Underweight' },
                  { value: 'none', label: 'None' },
              ].map((cond) => {
                const isSelected = form.health_conditions.includes(cond.value);
                return (
                  <button
                    key={cond.value}
                    type="button"
                    onClick={() => handleToggleArray('health_conditions', cond.value)}
                    className={`px-4 py-2 !rounded-xl !border-2 !text-sm font-semibold transition-colors cursor-pointer ${isSelected ? 'border-primary bg-primary/10 text-primary' : 'border-primary/20 !bg-transparent dark:!bg-transparent text-slate-600 dark:text-slate-300 hover:!border-primary/40 hover:!bg-primary/5 hover:!text-primary'}`}
                  >
                    {cond.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Section 4: Goals & Settings (Missing initially from code.html, but required for the app) */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-primary/10">
          <div className="space-y-2">
            <label className="text-sm !font-bold text-slate-900 dark:text-white ml-1 flex items-center gap-2">
              <span className="material-symbols-outlined text-[rgb(244,37,89)] text-base">flag</span>
              Goal
            </label>
            <select
              name="goal"
              value={form.goal}
              onChange={handleChange}
              required
              className="w-full px-4 py-3.5 rounded-xl border border-primary/20 bg-white dark:bg-background-dark/30 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900 dark:text-white outline-none appearance-none cursor-pointer"
            >
              {GOAL_OPTIONS.map((o) => <option key={o.value || 'e'} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm !font-bold text-slate-900 dark:text-white ml-1 flex items-center gap-2">
              <span className="material-symbols-outlined text-[rgb(244,37,89)] text-base">restaurant</span>
              Cuisine
            </label>
            <select
              name="cuisine_preference"
              value={form.cuisine_preference ?? 'Mixed'}
              onChange={handleChange}
              className="w-full px-4 py-3.5 rounded-xl border border-primary/20 bg-white dark:bg-background-dark/30 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900 dark:text-white outline-none appearance-none cursor-pointer"
            >
              {CUISINE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm !font-bold text-slate-900 dark:text-white ml-1 flex items-center gap-2">
              <span className="material-symbols-outlined text-[rgb(244,37,89)] text-base">calendar_month</span>
              Plan Type
            </label>
            <select
              name="plan_type"
              value={form.plan_type}
              onChange={handleChange}
              className="w-full px-4 py-3.5 rounded-xl border border-primary/20 bg-white dark:bg-background-dark/30 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900 dark:text-white outline-none appearance-none cursor-pointer"
            >
              {PLAN_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </section>

        {/* Navigation Buttons */}
        <div className="pt-10 flex items-center justify-between border-t border-primary/10">
          <Link to="/history" className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold !text-[rgb(244,37,89)] hover:bg-primary/5 transition-all no-underline">
              Previous Plans
          </Link>
          <button type="submit" disabled={loading} className="flex items-center gap-2 px-8 py-3.5 !bg-[rgb(244,37,89)] text-white rounded-xl font-bold shadow-xl shadow-primary/20 hover:brightness-110 transition-all border-none cursor-pointer disabled:opacity-50">
              {loading ? 'Generating...' : (form.plan_type === 'weekly' ? 'Generate 7-Day Plan' : 'Generate Diet')}
              {!loading && <span className="material-symbols-outlined">auto_awesome</span>}
          </button>
        </div>

      </form>
    </div>
  );
}
