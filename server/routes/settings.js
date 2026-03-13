/**
 * User settings routes: meal reminder preferences. JWT required; user_id from token.
 */

import { Router } from 'express';
import { getUserSettings, upsertUserSettings } from '../repositories/userSettingsRepository.js';
import { requireUserAuth } from '../middleware/userAuth.js';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export const settingsRouter = Router();

settingsRouter.get('/', requireUserAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const settings = await getUserSettings(userId);
    return res.status(200).json({ success: true, data: settings });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err?.message ?? 'Failed to load settings.' },
    });
  }
});

settingsRouter.put('/', requireUserAuth, async (req, res) => {
  try {
    const body = req.body ?? {};
    const userId = req.userId;
    const breakfast = String(body.breakfast_time ?? '').trim() || '08:00';
    const lunch = String(body.lunch_time ?? '').trim() || '13:00';
    const dinner = String(body.dinner_time ?? '').trim() || '20:00';
    if (![breakfast, lunch, dinner].every((t) => TIME_REGEX.test(t))) {
      return res.status(422).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Times must be in HH:MM 24h format.' },
      });
    }
    const remindersEnabled = Boolean(body.reminders_enabled);
    const waterRemindersEnabled = Boolean(body.water_reminders_enabled);
    const waterIntervalHours = Math.max(1, Math.min(6, parseInt(body.water_reminder_interval_hours, 10) || 2));
    const waterStartTime = String(body.water_reminder_start_time ?? '').trim();
    const waterStart = TIME_REGEX.test(waterStartTime) ? waterStartTime : '08:00';
    const updated = await upsertUserSettings(userId, {
      breakfast_time: breakfast,
      lunch_time: lunch,
      dinner_time: dinner,
      reminders_enabled: remindersEnabled,
      water_reminders_enabled: waterRemindersEnabled,
      water_reminder_interval_hours: waterIntervalHours,
      water_reminder_start_time: waterStart,
    });
    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err?.message ?? 'Failed to update settings.' },
    });
  }
});

