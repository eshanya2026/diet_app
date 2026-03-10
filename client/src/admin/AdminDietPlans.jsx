/**
 * Admin Diet Plans page: table with period filter.
 */

import { useState, useEffect } from 'react';
import { getDietPlans } from '../api/adminApi';

const PERIODS = [
  { value: 'all', label: 'All' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
];

export default function AdminDietPlans() {
  const [list, setList] = useState([]);
  const [period, setPeriod] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    getDietPlans(period, 200, 0)
      .then((res) => {
        if (res.success) setList(res.data ?? []);
      })
      .catch((e) => setError(e?.error?.message ?? 'Failed to load diet plans.'))
      .finally(() => setLoading(false));
  }, [period]);

  return (
    <div>
      <h4 className="mb-4">Diet Plans</h4>
      <div className="mb-3 d-flex flex-wrap align-items-center gap-2">
        <label className="form-label mb-0">Filter:</label>
        <select
          className="form-select form-select-sm"
          style={{ width: 'auto' }}
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover bg-white shadow-sm rounded">
            <thead className="table-light">
              <tr>
                <th>User email</th>
                <th>Goal</th>
                <th>Calories</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={4} className="text-muted">No diet plans.</td></tr>
              ) : (
                list.map((p) => (
                  <tr key={p.id}>
                    <td>{p.user_email}</td>
                    <td>{p.goal || '—'}</td>
                    <td>{p.calories || '—'}</td>
                    <td>{p.creation_date ? new Date(p.creation_date).toLocaleString() : '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
