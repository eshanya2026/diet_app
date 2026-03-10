/**
 * Login logs collection: create log, list for admin, stats for dashboard.
 */

import { getDb } from '../config/db.js';

export async function createLoginLog(entry) {
  const db = await getDb();
  const col = db.collection('login_logs');
  const doc = {
    user_id: entry.user_id ?? null,
    email: String(entry.email ?? '').trim(),
    login_time: entry.login_time ?? new Date(),
    ip_address: String(entry.ip_address ?? '').trim(),
    device_info: String(entry.device_info ?? '').trim(),
  };
  const result = await col.insertOne(doc);
  return col.findOne({ _id: result.insertedId });
}

export async function findLoginLogs(limit = 100, skip = 0) {
  const db = await getDb();
  const col = db.collection('login_logs');
  const cursor = col.find({}).sort({ login_time: -1 }).skip(skip).limit(limit);
  return cursor.toArray();
}

export async function countLoginLogs() {
  const db = await getDb();
  return db.collection('login_logs').countDocuments();
}

export async function countActiveUsersToday() {
  const db = await getDb();
  const col = db.collection('login_logs');
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const docs = await col.find({ login_time: { $gte: startOfDay } }).toArray();
  const userIds = new Set(docs.map((d) => String(d.user_id ?? d.email ?? '')).filter(Boolean));
  return userIds.size;
}

export async function getDailyLoginCounts(days = 30) {
  const db = await getDb();
  const col = db.collection('login_logs');
  const start = new Date();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);
  const pipeline = [
    { $match: { login_time: { $gte: start } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$login_time' } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ];
  return col.aggregate(pipeline).toArray();
}
