/**
 * Generate diet plan: health form and AI generation.
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
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

export default function Generate() {
  const navigate = useNavigate();
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
      const payload = { ...form, health_conditions: conditions, plan_type: form.plan_type || 'daily' };
      const res = await generateDiet(payload);
      if (res.success && res.data) {
        sessionStorage.setItem('latestDietResult', JSON.stringify(res.data));
        if (res.data.user?.id) sessionStorage.setItem('dietUserId', res.data.user.id);
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

  return (
    <div className="theme-bg">
      <PageHeader
        title="Generate diet plan"
        description="Enter your health details for a custom Indian diet plan. Choose daily or weekly."
      />
      <div className="card theme-card shadow-theme">
        <div className="card-body p-3 p-md-4">
          <form onSubmit={handleSubmit} className="row g-3">
            <div className="col-12 col-md-6">
              <label htmlFor="name" className="form-label theme-text">Name</label>
              <input type="text" className="form-control theme-input" id="name" name="name" value={form.name} onChange={handleChange} required />
            </div>
            <div className="col-6 col-md-3">
              <label htmlFor="age" className="form-label theme-text">Age</label>
              <input type="number" className="form-control theme-input" id="age" name="age" min={5} max={120} value={form.age} onChange={handleChange} required />
            </div>
            <div className="col-6 col-md-3">
              <label htmlFor="gender" className="form-label theme-text">Gender</label>
              <select className="form-select theme-input" id="gender" name="gender" value={form.gender} onChange={handleChange} required>
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="col-6 col-md-3">
              <label htmlFor="height" className="form-label theme-text">Height (cm)</label>
              <input type="number" className="form-control theme-input" id="height" name="height" min={100} max={250} step={0.1} value={form.height} onChange={handleChange} required />
            </div>
            <div className="col-6 col-md-3">
              <label htmlFor="weight" className="form-label theme-text">Weight (kg)</label>
              <input type="number" className="form-control theme-input" id="weight" name="weight" min={20} max={300} step={0.1} value={form.weight} onChange={handleChange} required />
            </div>
            <div className="col-12 col-md-6">
              <label htmlFor="activity_level" className="form-label theme-text">Activity Level</label>
              <select className="form-select theme-input" id="activity_level" name="activity_level" value={form.activity_level} onChange={handleChange} required>
                {ACTIVITY_OPTIONS.map((o) => <option key={o.value || 'e'} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="col-12 col-md-6">
              <label htmlFor="diet_preference" className="form-label theme-text">Diet Preference</label>
              <select className="form-select theme-input" id="diet_preference" name="diet_preference" value={form.diet_preference} onChange={handleChange} required>
                {DIET_OPTIONS.map((o) => <option key={o.value || 'e'} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="col-12">
              <label className="form-label theme-text d-block">Health conditions</label>
              <div className="row g-2">
                {[
                  { value: 'diabetes', label: 'Diabetes' },
                  { value: 'hypertension', label: 'Hypertension (high BP)' },
                  { value: 'pcos', label: 'PCOS' },
                  { value: 'thyroid', label: 'Thyroid' },
                  { value: 'high_cholesterol', label: 'High cholesterol' },
                  { value: 'anemia', label: 'Anemia' },
                  { value: 'obesity', label: 'Obesity' },
                  { value: 'underweight', label: 'Underweight' },
                  { value: 'none', label: 'None of the above' },
                ].map((cond) => (
                  <div key={cond.value} className="col-6 col-md-4 col-lg-3">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        value={cond.value}
                        id={`cond-${cond.value}`}
                        checked={form.health_conditions.includes(cond.value)}
                        onChange={handleChange}
                      />
                      <label className="form-check-label theme-text small" htmlFor={`cond-${cond.value}`}>
                        {cond.label}
                      </label>
                    </div>
                  </div>
                ))}
              </div>
              <div className="form-text text-muted">Select all that apply. If none, choose &quot;None of the above&quot;.</div>
            </div>
            <div className="col-12 col-md-6">
              <label htmlFor="goal" className="form-label theme-text">Goal</label>
              <select className="form-select theme-input" id="goal" name="goal" value={form.goal} onChange={handleChange} required>
                {GOAL_OPTIONS.map((o) => <option key={o.value || 'e'} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="col-12 col-md-6">
              <label htmlFor="plan_type" className="form-label theme-text">Plan type</label>
              <select className="form-select theme-input" id="plan_type" name="plan_type" value={form.plan_type} onChange={handleChange}>
                {PLAN_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            {error && (
              <div className="col-12">
                <div className="alert alert-danger mb-0" role="alert">{error}</div>
              </div>
            )}
            <div className="col-12 d-flex flex-column flex-md-row gap-2 mt-2">
              <button type="submit" className="btn btn-theme-primary flex-grow-1" disabled={loading}>
                {loading ? 'Generating...' : form.plan_type === 'weekly' ? 'Generate Weekly Diet Plan' : 'Generate Diet Plan'}
                {loading && <span className="spinner-border spinner-border-sm ms-2" aria-hidden="true" />}
              </button>
              <Link to="/history" className="btn theme-card border-theme">View Previous Plans</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
