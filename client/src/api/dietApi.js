/**
 * API client for diet app. All requests go to the backend (server); the frontend never talks to MongoDB directly.
 */
const API_BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw { status: res.status, ...data };
  return data;
}

export async function generateDiet(payload) {
  return request('/generate-diet', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getHistory(userId) {
  return request(`/history?user_id=${encodeURIComponent(userId)}`);
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

/** Log or update diet compliance for a day. */
export async function logCompliance(payload) {
  return request('/compliance', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Suggest an alternative meal for a slot. Body: { meal_slot, current_meal, constraints? } */
export async function swapMeal(body) {
  return request('/swap-meal', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** Get compliance logs for a user. Options: plan_id, from (YYYY-MM-DD), to (YYYY-MM-DD), limit */
export async function getCompliance(userId, options = {}) {
  const params = new URLSearchParams({ user_id: userId });
  if (options.plan_id) params.set('plan_id', options.plan_id);
  if (options.from) params.set('from', options.from);
  if (options.to) params.set('to', options.to);
  if (options.limit != null) params.set('limit', String(options.limit));
  return request(`/compliance?${params.toString()}`);
}

/** Get meal reminder settings for a user. */
export async function getUserSettings(userId) {
  return request(`/settings?user_id=${encodeURIComponent(userId)}`);
}

/** Update meal reminder settings for a user. */
export async function updateUserSettings(payload) {
  return request('/settings', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
