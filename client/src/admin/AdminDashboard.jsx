/**
 * Admin dashboard: stats cards and usage charts.
 */

import { useState, useEffect } from 'react';
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from 'recharts';
import { getDashboardStats, getAnalytics } from '../api/adminApi';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [sRes, aRes] = await Promise.all([
          getDashboardStats(),
          getAnalytics(30),
        ]);
        if (!cancelled) {
          if (sRes.success) setStats(sRes.data);
          if (aRes.success) setAnalytics(aRes.data);
        }
      } catch (e) {
        if (!cancelled) setError(e?.error?.message ?? 'Failed to load dashboard.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return <p className="text-muted">Loading dashboard…</p>;
  }
  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  const cards = [
    { title: 'Total Registered Users', value: stats?.total_users ?? 0 },
    { title: 'Total Diet Plans Generated', value: stats?.total_diet_plans ?? 0 },
    { title: 'Total User Logins', value: stats?.total_user_logins ?? 0 },
    { title: 'Active Users Today', value: stats?.active_users_today ?? 0 },
  ];

  const mergeDaily = (reg = [], logins = [], plans = []) => {
    const byDate = {};
    [...reg, ...logins, ...plans].forEach(({ _id }) => { byDate[_id] = byDate[_id] ?? _id; });
    const dates = Object.keys(byDate).sort();
    return dates.map((date) => ({
      date,
      registrations: reg.find((r) => r._id === date)?.count ?? 0,
      logins: logins.find((l) => l._id === date)?.count ?? 0,
      dietPlans: plans.find((p) => p._id === date)?.count ?? 0,
    }));
  };

  const chartData = mergeDaily(
    analytics?.daily_registrations ?? [],
    analytics?.daily_logins ?? [],
    analytics?.daily_diet_plans ?? []
  );

  return (
    <div>
      <h4 className="mb-4">Dashboard</h4>
      <div className="row g-3 mb-4">
        {cards.map((c) => (
          <div key={c.title} className="col-12 col-sm-6 col-xl-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="text-muted small text-uppercase">{c.title}</div>
                <div className="h3 mb-0">{c.value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <h6 className="card-title mb-3">Application usage (last 30 days)</h6>
          <div style={{ height: 320 }}>
            {chartData.length === 0 ? (
              <p className="text-muted small">No data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="registrations" stroke="#0d6efd" name="Registrations" strokeWidth={2} />
                  <Line type="monotone" dataKey="logins" stroke="#198754" name="Logins" strokeWidth={2} />
                  <Line type="monotone" dataKey="dietPlans" stroke="#fd7e14" name="Diet plans" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
