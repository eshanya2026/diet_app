/**
 * Admin Users page: table with view and delete.
 */

import { useState, useEffect } from 'react';
import { getUsers, getUserById, deleteUser } from '../api/adminApi';

export default function AdminUsers() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getUsers(200, 0);
      if (res.success) setList(res.data ?? []);
    } catch (e) {
      setError(e?.error?.message ?? 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleView = async (id) => {
    setDetail(null);
    try {
      const res = await getUserById(id);
      if (res.success) setDetail(res.data);
    } catch {
      setDetail({ error: 'Failed to load user.' });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this user? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await deleteUser(id);
      setList((prev) => prev.filter((u) => u.id !== id));
      setDetail((d) => (d?.id === id ? null : d));
    } catch (e) {
      alert(e?.error?.message ?? 'Delete failed.');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <p className="text-muted">Loading users…</p>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div>
      <h4 className="mb-4">Users</h4>
      <div className="table-responsive">
        <table className="table table-hover bg-white shadow-sm rounded">
          <thead className="table-light">
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Age</th>
              <th>Goal</th>
              <th>Diet</th>
              <th>Registered</th>
              <th className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan={7} className="text-muted">No users yet.</td></tr>
            ) : (
              list.map((u) => (
                <tr key={u.id}>
                  <td>{u.name || '—'}</td>
                  <td>{u.email || '—'}</td>
                  <td>{u.age ?? '—'}</td>
                  <td>{u.goal || '—'}</td>
                  <td>{u.diet_preference || '—'}</td>
                  <td>{u.registration_date ? new Date(u.registration_date).toLocaleDateString() : '—'}</td>
                  <td className="text-end">
                    <button type="button" className="btn btn-sm btn-outline-primary me-1" onClick={() => handleView(u.id)}>View</button>
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(u.id)} disabled={deletingId === u.id}>
                      {deletingId === u.id ? '…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {detail && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">User details</h5>
                <button type="button" className="btn-close" onClick={() => setDetail(null)} aria-label="Close" />
              </div>
              <div className="modal-body">
                {detail.error ? (
                  <p className="text-danger">{detail.error}</p>
                ) : (
                  <dl className="mb-0">
                    <dt>Name</dt><dd>{detail.name || '—'}</dd>
                    <dt>Email</dt><dd>{detail.email || '—'}</dd>
                    <dt>Age</dt><dd>{detail.age ?? '—'}</dd>
                    <dt>Gender</dt><dd>{detail.gender || '—'}</dd>
                    <dt>Height</dt><dd>{detail.height ?? '—'}</dd>
                    <dt>Weight</dt><dd>{detail.weight ?? '—'}</dd>
                    <dt>Goal</dt><dd>{detail.goal || '—'}</dd>
                    <dt>Diet preference</dt><dd>{detail.diet_preference || '—'}</dd>
                    <dt>Registered</dt><dd>{detail.registration_date ? new Date(detail.registration_date).toLocaleString() : '—'}</dd>
                  </dl>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
