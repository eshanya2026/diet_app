/**
 * Admin Login Activity page: table of recent logins.
 */

import { useState, useEffect } from 'react';
import { getLoginActivity } from '../api/adminApi';

export default function AdminLoginActivity() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getLoginActivity(200, 0)
      .then((res) => {
        if (res.success) setList(res.data ?? []);
      })
      .catch((e) => setError(e?.error?.message ?? 'Failed to load login activity.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-muted">Loading…</p>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div>
      <h4 className="mb-4">Login Activity</h4>
      <div className="table-responsive">
        <table className="table table-hover bg-white shadow-sm rounded">
          <thead className="table-light">
            <tr>
              <th>Email</th>
              <th>Login time</th>
              <th>IP address</th>
              <th>Device</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan={4} className="text-muted">No login records yet.</td></tr>
            ) : (
              list.map((l) => (
                <tr key={l.id}>
                  <td>{l.email}</td>
                  <td>{l.login_time ? new Date(l.login_time).toLocaleString() : '—'}</td>
                  <td>{l.ip_address}</td>
                  <td className="text-break small">{l.device_info || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
