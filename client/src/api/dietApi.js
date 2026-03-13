/**
 * API client for diet app. User-scoped endpoints require JWT (sent when useAuth: true).
 */
const API_BASE = '/api';

const AUTH_TOKEN_KEY = 'diet_app_token';

export function getAuthToken() {
  try {
    return sessionStorage.getItem(AUTH_TOKEN_KEY) ?? '';
  } catch {
    return '';
  }
}

function buildHeaders(options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (options.useAuth) {
    const token = getAuthToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: buildHeaders(options),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw { status: res.status, ...data };
  return data;
}

export async function generateDiet(payload, useAuth = false) {
  return request('/generate-diet', {
    method: 'POST',
    body: JSON.stringify(payload),
    useAuth,
  });
}

/** Requires JWT. Returns history for the authenticated user. */
export async function getHistory(options = {}) {
  const params = new URLSearchParams();
  if (options.limit != null) params.set('limit', String(options.limit));
  if (options.skip != null) params.set('skip', String(options.skip));
  const qs = params.toString();
  return request(`/history${qs ? `?${qs}` : ''}`, { useAuth: true });
}

/** Generate grocery list from diet chart. Requires GEMINI_API_KEY. */
export async function generateGroceryList(dietChart) {
  return request('/grocery-list', {
    method: 'POST',
    body: JSON.stringify({ diet_chart: dietChart }),
  });
}

/** Check DB connection; returns { success, error } when DB is down. */
export async function checkHealth() {
  const res = await fetch(`${API_BASE}/health`);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, ...data };
}

/** Log or update diet compliance for a day. Requires JWT. Body: plan_id, log_date?, meals */
export async function logCompliance(payload) {
  return request('/compliance', {
    method: 'POST',
    body: JSON.stringify(payload),
    useAuth: true,
  });
}

/** Suggest an alternative meal for a slot. Body: { meal_slot, current_meal, constraints? } */
export async function swapMeal(body) {
  return request('/swap-meal', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** Get compliance logs for authenticated user. Options: plan_id, from, to, limit. Requires JWT. */
export async function getCompliance(options = {}) {
  const params = new URLSearchParams();
  if (options.plan_id) params.set('plan_id', options.plan_id);
  if (options.from) params.set('from', options.from);
  if (options.to) params.set('to', options.to);
  if (options.limit != null) params.set('limit', String(options.limit));
  return request(`/compliance?${params.toString()}`, { useAuth: true });
}

/** Get meal reminder settings for authenticated user. Requires JWT. */
export async function getUserSettings() {
  return request('/settings', { useAuth: true });
}

/** Update meal reminder settings. Requires JWT. Body: breakfast_time, lunch_time, dinner_time, reminders_enabled, etc. */
export async function updateUserSettings(payload) {
  return request('/settings', {
    method: 'PUT',
    body: JSON.stringify(payload),
    useAuth: true,
  });
}

/** User login. Returns { success, data: { token, user: { id, email, name } } }. */
export async function loginUser(email, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: String(email ?? '').trim(), password: String(password ?? '') }),
  });
}

/** User registration. Returns { success, data: { id, email, name } }. */
export async function registerUser(name, email, password) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: String(name ?? '').trim(),
      email: String(email ?? '').trim().toLowerCase(),
      password: String(password ?? ''),
    }),
  });
}

/** Get current user profile. Requires JWT. */
export async function getMe() {
  return request('/auth/me', { useAuth: true });
}

/** Update profile (name). Requires JWT. Body: { name }. */
export async function updateProfile(payload) {
  return request('/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
    useAuth: true,
  });
}

/** Change password. Requires JWT. Body: { current_password, new_password }. */
export async function changePassword(currentPassword, newPassword) {
  return request('/auth/me/change-password', {
    method: 'POST',
    body: JSON.stringify({
      current_password: String(currentPassword ?? ''),
      new_password: String(newPassword ?? ''),
    }),
    useAuth: true,
  });
}
