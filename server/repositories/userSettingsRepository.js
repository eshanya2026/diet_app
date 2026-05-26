/**
 * User settings collection: meal reminder preferences per user.
 */

import { ObjectId } from 'mongodb';
import { getDb } from '../config/db.js';

const DEFAULT_WATER_INTERVAL_HOURS = 2;
const DEFAULT_WATER_START_TIME = '08:00';
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

function clampWaterInterval(h) {
  const n = parseInt(h, 10);
  return Number.isFinite(n) && n >= 1 && n <= 6 ? n : DEFAULT_WATER_INTERVAL_HOURS;
}

function normalizeWaterStartTime(t) {
  return typeof t === 'string' && TIME_REGEX.test(t.trim()) ? t.trim() : DEFAULT_WATER_START_TIME;
}

const DEFAULT_SETTINGS = {
  breakfast_time: '08:00',
  lunch_time: '13:00',
  dinner_time: '20:00',
  reminders_enabled: false,
  water_reminder_interval_hours: DEFAULT_WATER_INTERVAL_HOURS,
  water_reminder_start_time: DEFAULT_WATER_START_TIME,
  water_reminder_end_time: '22:00',
  weekly_report_enabled: false,
};

function normalizeUserId(userId) {
  try {
    return new ObjectId(String(userId));
  } catch {
    return null;
  }
}

export async function getUserSettings(userId) {
  const oid = normalizeUserId(userId);
  if (!oid) return null;
  const db = await getDb();
  const col = db.collection('user_settings');
  const doc = await col.findOne({ user_id: oid });
  if (!doc) {
    return {
      user_id: oid,
      ...DEFAULT_SETTINGS,
    };
  }
  return {
    user_id: oid,
    breakfast_time: doc.breakfast_time || DEFAULT_SETTINGS.breakfast_time,
    lunch_time: doc.lunch_time || DEFAULT_SETTINGS.lunch_time,
    dinner_time: doc.dinner_time || DEFAULT_SETTINGS.dinner_time,
    reminders_enabled: typeof doc.reminders_enabled === 'boolean' ? doc.reminders_enabled : DEFAULT_SETTINGS.reminders_enabled,
    water_reminders_enabled: typeof doc.water_reminders_enabled === 'boolean' ? doc.water_reminders_enabled : DEFAULT_SETTINGS.water_reminders_enabled,
    water_reminder_interval_hours: clampWaterInterval(doc.water_reminder_interval_hours),
    water_reminder_start_time: normalizeWaterStartTime(doc.water_reminder_start_time),
    water_reminder_end_time: doc.water_reminder_end_time || DEFAULT_SETTINGS.water_reminder_end_time,
    weekly_report_enabled: typeof doc.weekly_report_enabled === 'boolean' ? doc.weekly_report_enabled : DEFAULT_SETTINGS.weekly_report_enabled,
  };
}

export async function upsertUserSettings(userId, settings) {
  const oid = normalizeUserId(userId);
  if (!oid) return null;
  const db = await getDb();
  const col = db.collection('user_settings');
  const next = {
    breakfast_time: settings.breakfast_time || DEFAULT_SETTINGS.breakfast_time,
    lunch_time: settings.lunch_time || DEFAULT_SETTINGS.lunch_time,
    dinner_time: settings.dinner_time || DEFAULT_SETTINGS.dinner_time,
    reminders_enabled: Boolean(settings.reminders_enabled),
    water_reminders_enabled: Boolean(settings.water_reminders_enabled),
    water_reminder_interval_hours: clampWaterInterval(settings.water_reminder_interval_hours),
    water_reminder_start_time: normalizeWaterStartTime(settings.water_reminder_start_time),
    water_reminder_end_time: settings.water_reminder_end_time || DEFAULT_SETTINGS.water_reminder_end_time,
    weekly_report_enabled: Boolean(settings.weekly_report_enabled),
    updated_at: new Date(),
  };
  await col.updateOne(
    { user_id: oid },
    { $set: next, $setOnInsert: { user_id: oid, created_at: new Date() } },
    { upsert: true },
  );
  return getUserSettings(userId);
}

