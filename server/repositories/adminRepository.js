/**
 * Admins collection: find by email, create admin. Used for admin JWT auth.
 */

import { getDb } from '../config/db.js';

export async function findAdminByEmail(email) {
  const db = await getDb();
  const col = db.collection('admins');
  const normalized = String(email ?? '').trim().toLowerCase();
  if (!normalized) return null;
  return col.findOne({ email: normalized });
}

export async function createAdmin(email, passwordHash) {
  const db = await getDb();
  const col = db.collection('admins');
  const normalized = String(email ?? '').trim().toLowerCase();
  if (!normalized || !passwordHash) return null;
  const existing = await col.findOne({ email: normalized });
  if (existing) return existing;
  const doc = {
    email: normalized,
    password_hash: passwordHash,
    created_at: new Date(),
  };
  const result = await col.insertOne(doc);
  return col.findOne({ _id: result.insertedId });
}

export async function countAdmins() {
  const db = await getDb();
  const col = db.collection('admins');
  return col.countDocuments();
}
