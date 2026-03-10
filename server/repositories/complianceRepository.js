/**
 * Diet compliance logs: log and list by user/plan/date.
 */

import { ObjectId } from 'mongodb';
import { getDb } from '../config/db.js';

const MEAL_KEYS = ['breakfast', 'mid_snack', 'lunch', 'evening_snack', 'dinner'];

function normalizeMeals(meals) {
  if (meals == null || typeof meals !== 'object') return {};
  const out = {};
  for (const key of MEAL_KEYS) {
    out[key] = Boolean(meals[key]);
  }
  return out;
}

/**
 * @param {{ user_id: string, plan_id: string, log_date: string, meals: object }} log
 * @returns {Promise<object|null>}
 */
export async function createComplianceLog(log) {
  const db = await getDb();
  const col = db.collection('diet_compliance');
  let userOid;
  let planOid;
  try {
    userOid = new ObjectId(log.user_id);
    planOid = new ObjectId(log.plan_id);
  } catch {
    return null;
  }
  const logDate = String(log.log_date ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(logDate)) return null;

  const doc = {
    user_id: userOid,
    plan_id: planOid,
    log_date: logDate,
    meals: normalizeMeals(log.meals),
    created_at: new Date(),
  };
  const result = await col.insertOne(doc);
  const created = await col.findOne({ _id: result.insertedId });
  return created;
}

/**
 * @param {{ user_id: string, plan_id?: string, from?: string, to?: string, limit?: number }} options
 * @returns {Promise<object[]>}
 */
export async function findComplianceByUser(options = {}) {
  const { user_id: userId, plan_id: planId, from: fromDate, to: toDate, limit = 100 } = options;
  let userOid;
  try {
    userOid = new ObjectId(userId);
  } catch {
    return [];
  }
  const db = await getDb();
  const col = db.collection('diet_compliance');
  const filter = { user_id: userOid };
  if (planId) {
    try {
      filter.plan_id = new ObjectId(planId);
    } catch {
      return [];
    }
  }
  if (fromDate && /^\d{4}-\d{2}-\d{2}$/.test(String(fromDate).trim())) {
    filter.log_date = filter.log_date || {};
    filter.log_date.$gte = String(fromDate).trim();
  }
  if (toDate && /^\d{4}-\d{2}-\d{2}$/.test(String(toDate).trim())) {
    filter.log_date = filter.log_date || {};
    filter.log_date.$lte = String(toDate).trim();
  }
  const cursor = col.find(filter).sort({ log_date: -1, created_at: -1 }).limit(limit);
  return cursor.toArray();
}

/**
 * Get or update compliance for a single day (upsert by user + plan + log_date).
 * @param {{ user_id: string, plan_id: string, log_date: string, meals: object }} log
 * @returns {Promise<object|null>}
 */
export async function upsertComplianceLog(log) {
  const db = await getDb();
  const col = db.collection('diet_compliance');
  let userOid;
  let planOid;
  try {
    userOid = new ObjectId(log.user_id);
    planOid = new ObjectId(log.plan_id);
  } catch {
    return null;
  }
  const logDate = String(log.log_date ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(logDate)) return null;

  const doc = {
    user_id: userOid,
    plan_id: planOid,
    log_date: logDate,
    meals: normalizeMeals(log.meals),
    updated_at: new Date(),
  };
  const result = await col.findOneAndUpdate(
    { user_id: userOid, plan_id: planOid, log_date: logDate },
    { $set: doc },
    { upsert: true, returnDocument: 'after' }
  );
  return result ?? null;
}
