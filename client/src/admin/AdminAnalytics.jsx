/**
 * Admin Analytics page: charts for registrations, logins, diet plans.
 */

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { getAnalytics } from '../api/adminApi';

export default function AdminAnalytics() {
  const [data, setData] = useState(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    getAnalytics(days)
      .then((res) => {
        if (res.success) setData(res.data);
      })
      .catch((e) => setError(e?.error?.message ?? 'Failed to load analytics.'))
      .finally(() => setLoading(false));
  }, [days]);

  const merge = (reg = [], logins = [], plans = []) => {
    const byDate = {};
    [...reg, ...logins, ...plans].forEach(({ _id }) => { byDate[_id] = byDate[_id] ?? _id; });
    return Object.keys(byDate).sort().map((date) => ({
      date,
      Registrations: reg.find((r) => r._id === date)?.count ?? 0,
      Logins: logins.find((l) => l._id === date)?.count ?? 0,
      'Diet plans': plans.find((p) => p._id === date)?.count ?? 0,
    }));
  };

  const chartData = data ? merge(
    data.daily_registrations ?? [],
    data.daily_logins ?? [],
    data.daily_diet_plans ?? []
  ) : [];

  return (
    <div>
      <h4 className="mb-4">Analytics</h4>
      <div className="mb-3">
        <label className="form-label">Period: </label>
        <select className="form-select form-select-sm" style={{ width: 'auto' }} value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : chartData.length === 0 ? (
        <p className="text-muted">No data for this period.</p>
      ) : (
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <div style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="Registrations" fill="#0d6efd" stackId="a" />
                  <Bar dataKey="Logins" fill="#198754" stackId="a" />
                  <Bar dataKey="Diet plans" fill="#fd7e14" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
