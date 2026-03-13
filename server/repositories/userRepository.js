/**
 * Users collection: find or create by profile; list all; auth helpers.
 */

import { ObjectId } from 'mongodb';
import { getDb } from '../config/db.js';

export async function findOrCreateUser(userData) {
  const db = await getDb();
  const col = db.collection('users');

  const filter = {
    name: userData.name ?? '',
    age: userData.age ?? 0,
    gender: userData.gender ?? '',
    height: userData.height ?? 0,
    weight: userData.weight ?? 0,
    diet_preference: userData.diet_preference ?? '',
    goal: userData.goal ?? '',
  };

  let doc = await col.findOne(filter);
  if (doc) return doc;

  const insertDoc = { ...filter };
  const result = await col.insertOne(insertDoc);
  doc = await col.findOne({ _id: result.insertedId });
  return doc;
}

export async function findAllUsers(limit = 500, skip = 0) {
  const db = await getDb();
  const col = db.collection('users');
  const cursor = col.find({}).sort({ _id: -1 }).skip(skip).limit(limit);
  return cursor.toArray();
}

export async function findUserById(id) {
  const db = await getDb();
  const col = db.collection('users');
  try {
    return col.findOne({ _id: new ObjectId(id) });
  } catch {
    return null;
  }
}

export async function findUserByEmail(email) {
  const db = await getDb();
  const col = db.collection('users');
  const normalized = String(email ?? '').trim().toLowerCase();
  if (!normalized) return null;
  return col.findOne({ email: normalized });
}

export async function createUserWithAuth(data) {
  const db = await getDb();
  const col = db.collection('users');
  const email = String(data.email ?? '').trim().toLowerCase();
  if (!email) return null;
  const existing = await col.findOne({ email });
  if (existing) return null;
  const doc = {
    name: String(data.name ?? '').trim(),
    email,
    password_hash: data.password_hash,
    age: data.age ?? 0,
    gender: data.gender ?? '',
    height: data.height ?? 0,
    weight: data.weight ?? 0,
    diet_preference: data.diet_preference ?? '',
    goal: data.goal ?? '',
    created_at: new Date(),
  };
  const result = await col.insertOne(doc);
  return col.findOne({ _id: result.insertedId });
}

export async function countUsers() {
  const db = await getDb();
  return db.collection('users').countDocuments();
}

export async function deleteUserById(id) {
  const db = await getDb();
  const col = db.collection('users');
  try {
    const result = await col.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount === 1;
  } catch {
    return false;
  }
}

export async function updateAuthUserById(userId, updates) {
  const db = await getDb();
  const col = db.collection('users');
  try {
    const oid = new ObjectId(userId);
    const allowed = {};
    if (updates.name !== undefined) allowed.name = String(updates.name ?? '').trim();
    if (updates.password_hash !== undefined) allowed.password_hash = updates.password_hash;
    if (Object.keys(allowed).length === 0) return null;
    const result = await col.findOneAndUpdate(
      { _id: oid, email: { $exists: true, $ne: '' } },
      { $set: allowed },
      { returnDocument: 'after' }
    );
    return result ?? null;
  } catch {
    return null;
  }
}

export async function getDailyRegistrationCounts(days = 30) {
  const db = await getDb();
  const col = db.collection('users');
  const start = new Date();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);
  const pipeline = [
    { $addFields: { created_at: { $ifNull: ['$created_at', { $toDate: '$_id' }] } } },
    { $match: { created_at: { $gte: start } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ];
  return col.aggregate(pipeline).toArray();
}
