/**
 * Diet plans collection: create and list by user.
 * Uses MongoDB driver via lib/mongodb.js and config/db.js.
 */

import { ObjectId } from 'mongodb';
import { getDb } from '../config/db.js';

export async function createDietPlan(plan) {
  const db = await getDb();
  const col = db.collection('diet_plans');
  const doc = {
    user_id: plan.user_id,
    bmi: plan.bmi,
    diet_chart: plan.diet_chart ?? {},
    suggestions: plan.suggestions ?? [],
    calories: plan.calories ?? null,
    diet_score: plan.diet_score ?? null,
    goal: plan.goal ?? null,
    created_at: plan.created_at ?? new Date(),
  };
  const result = await col.insertOne(doc);
  const created = await col.findOne({ _id: result.insertedId });
  return created;
}

export async function findDietPlanById(planId) {
  try {
    const oid = new ObjectId(planId);
    const db = await getDb();
    return db.collection('diet_plans').findOne({ _id: oid });
  } catch {
    return null;
  }
}

const DEFAULT_HISTORY_LIMIT = 100;
const MAX_HISTORY_LIMIT = 500;

export async function findDietPlansByUserId(userId, options = {}) {
  let oid;
  try {
    oid = new ObjectId(userId);
  } catch {
    return [];
  }
  const limit = Math.min(MAX_HISTORY_LIMIT, Math.max(1, Number(options.limit) || DEFAULT_HISTORY_LIMIT));
  const skip = Math.max(0, Number(options.skip) || 0);
  const db = await getDb();
  const col = db.collection('diet_plans');
  const cursor = col.find({ user_id: oid }).sort({ created_at: -1 }).skip(skip).limit(limit);
  return cursor.toArray();
}

export async function countDietPlans() {
  const db = await getDb();
  return db.collection('diet_plans').countDocuments();
}

export async function findDietPlansFiltered(options = {}) {
  const db = await getDb();
  const col = db.collection('diet_plans');
  const { period = 'all', limit = 100, skip = 0 } = options;
  const filter = {};
  if (period === 'today' || period === 'week' || period === 'month') {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    if (period === 'week') start.setDate(start.getDate() - 7);
    else if (period === 'month') start.setMonth(start.getMonth() - 1);
    filter.created_at = { $gte: start };
  }
  const cursor = col
    .aggregate([
      { $match: filter },
      { $sort: { created_at: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'user_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    ])
    .toArray();
  return cursor;
}

export async function getDailyDietPlanCounts(days = 30) {
  const db = await getDb();
  const col = db.collection('diet_plans');
  const start = new Date();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);
  const pipeline = [
    { $match: { created_at: { $gte: start } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ];
  return col.aggregate(pipeline).toArray();
}
