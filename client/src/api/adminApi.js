/**
 * Admin API client. All requests require Authorization: Bearer <token>.
 */

const API_BASE = '/api';

function getAdminToken() {
  return sessionStorage.getItem('adminToken') ?? localStorage.getItem('adminToken') ?? '';
}

async function request(path, options = {}) {
  const token = getAdminToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw { status: res.status, ...data };
  return data;
}

export async function adminLogin(email, password) {
  const res = await fetch(`${API_BASE}/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw { status: res.status, ...data };
  return data;
}

export async function adminSeed(email, password) {
  const res = await fetch(`${API_BASE}/admin/auth/seed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw { status: res.status, ...data };
  return data;
}

export async function getDashboardStats() {
  return request('/admin/dashboard/stats');
}

export async function getUsers(limit, skip) {
  const params = new URLSearchParams();
  if (limit != null) params.set('limit', limit);
  if (skip != null) params.set('skip', skip);
  return request(`/admin/users?${params}`);
}

export async function getUserById(id) {
  return request(`/admin/users/${encodeURIComponent(id)}`);
}

export async function deleteUser(id) {
  return request(`/admin/users/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function getDietPlans(period, limit, skip) {
  const params = new URLSearchParams();
  if (period) params.set('period', period);
  if (limit != null) params.set('limit', limit);
  if (skip != null) params.set('skip', skip);
  return request(`/admin/diet-plans?${params}`);
}

export async function getLoginActivity(limit, skip) {
  const params = new URLSearchParams();
  if (limit != null) params.set('limit', limit);
  if (skip != null) params.set('skip', skip);
  return request(`/admin/login-activity?${params}`);
}

export async function getAnalytics(days) {
  const params = days != null ? `?days=${days}` : '';
  return request(`/admin/analytics${params}`);
}

export async function getSystemHealth() {
  const res = await fetch(`${API_BASE}/health`);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, ...data };
}

export function setAdminToken(token, persist = false) {
  if (persist) localStorage.setItem('adminToken', token ?? '');
  else sessionStorage.setItem('adminToken', token ?? '');
}

export function clearAdminToken() {
  sessionStorage.removeItem('adminToken');
  localStorage.removeItem('adminToken');
}

export function hasAdminToken() {
  return Boolean(getAdminToken());
}
