/**
 * In-memory request cache for diet generation. Reduces duplicate work for same payload.
 */

import crypto from 'crypto';

const MAX_ENTRIES = 500;
const TTL_MS = 60 * 60 * 1000; // 1 hour

/** @type {Map<string, { value: unknown; expires: number }>} */
const store = new Map();

function prune() {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (v.expires <= now) store.delete(k);
  }
  while (store.size > MAX_ENTRIES) {
    const first = store.keys().next().value;
    if (first != null) store.delete(first);
  }
}

/**
 * Hash validated payload to a cache key.
 * @param {object} data - Normalized request data (name, age, gender, etc.)
 * @returns {string} Stable hash string
 */
export function getRequestHash(data) {
  if (data == null || typeof data !== 'object') return '';
  try {
    const str = JSON.stringify(data);
    return crypto.createHash('sha256').update(str).digest('hex');
  } catch {
    return '';
  }
}

/**
 * Get cached diet result by key.
 * @param {string} key - From getRequestHash
 * @returns {unknown|null} Cached raw diet object or null
 */
export function getCached(key) {
  if (typeof key !== 'string' || !key) return null;
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expires <= Date.now()) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

/**
 * Store diet result for key.
 * @param {string} key - From getRequestHash
 * @param {unknown} value - Raw diet object to cache
 */
export function setCached(key, value) {
  if (typeof key !== 'string' || !key) return;
  store.set(key, { value, expires: Date.now() + TTL_MS });
  prune();
}
