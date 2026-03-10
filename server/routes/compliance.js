/**
 * Diet compliance tracker: log and list daily meal adherence.
 * POST /api/compliance — log or update compliance for a day
 * GET /api/compliance?user_id=...&plan_id=...&from=...&to=...
 */

import { Router } from 'express';
import { findDietPlanById } from '../repositories/dietPlanRepository.js';
import { upsertComplianceLog, findComplianceByUser } from '../repositories/complianceRepository.js';
import { logger } from '../utils/logger.js';

const OBJECT_ID_REGEX = /^[a-f0-9]{24}$/i;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MEAL_KEYS = ['breakfast', 'mid_snack', 'lunch', 'evening_snack', 'dinner'];

export const complianceRouter = Router();

function parseMeals(body) {
  const meals = body?.meals && typeof body.meals === 'object' ? body.meals : {};
  const out = {};
  for (const key of MEAL_KEYS) {
    out[key] = Boolean(meals[key]);
  }
  return out;
}

complianceRouter.post('/', async (req, res) => {
  try {
    const body = req.body ?? {};
    const userId = String(body.user_id ?? '').trim();
    const planId = String(body.plan_id ?? '').trim();
    let logDate = String(body.log_date ?? '').trim();

    if (!userId || !OBJECT_ID_REGEX.test(userId)) {
      return res.status(422).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', messages: ['user_id is required and must be a valid ObjectId.'] },
      });
    }
    if (!planId || !OBJECT_ID_REGEX.test(planId)) {
      return res.status(422).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', messages: ['plan_id is required and must be a valid ObjectId.'] },
      });
    }
    if (!logDate) {
      const today = new Date();
      logDate = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    }
    if (!DATE_REGEX.test(logDate)) {
      return res.status(422).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', messages: ['log_date must be YYYY-MM-DD.'] },
      });
    }

    const plan = await findDietPlanById(planId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Diet plan not found.' },
      });
    }
    const planUserId = plan.user_id?.toString?.() ?? String(plan.user_id);
    if (planUserId !== userId) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Plan does not belong to this user.' },
      });
    }

    const meals = parseMeals(body);
    const created = await upsertComplianceLog({
      user_id: userId,
      plan_id: planId,
      log_date: logDate,
      meals,
    });

    if (!created) {
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Failed to save compliance log.' },
      });
    }

    const followed = MEAL_KEYS.filter((k) => created.meals?.[k]).length;
    const total = MEAL_KEYS.length;

    res.status(200).json({
      success: true,
      data: {
        id: created._id?.toString?.() ?? null,
        user_id: userId,
        plan_id: planId,
        log_date: created.log_date,
        meals: created.meals ?? {},
        created_at: created.created_at instanceof Date ? created.created_at.toISOString() : created.updated_at?.toISOString?.() ?? null,
        summary: { followed, total, percent: total > 0 ? Math.round((followed / total) * 100) : 0 },
      },
    });
  } catch (err) {
    logger.error('Compliance POST error', { message: err?.message ?? err, stack: err?.stack });
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Unable to save compliance.' },
      });
    }
  }
});

complianceRouter.get('/', async (req, res) => {
  try {
    const userId = String(req.query.user_id ?? '').trim();
    if (!userId || !OBJECT_ID_REGEX.test(userId)) {
      return res.status(422).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', messages: ['user_id query is required and must be a valid ObjectId.'] },
      });
    }

    const planId = String(req.query.plan_id ?? '').trim() || undefined;
    const from = String(req.query.from ?? '').trim() || undefined;
    const to = String(req.query.to ?? '').trim() || undefined;
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));

    let logs;
    try {
      logs = await findComplianceByUser({ user_id: userId, plan_id: planId, from, to, limit });
    } catch (err) {
      logger.warn('Compliance GET: DB error', { message: err?.message ?? err });
      return res.status(200).json({ success: true, data: [], summary: null });
    }

    const MEAL_KEYS_LIST = ['breakfast', 'mid_snack', 'lunch', 'evening_snack', 'dinner'];
    const formatted = logs.map((row) => {
      const followed = MEAL_KEYS_LIST.filter((k) => row.meals?.[k]).length;
      const total = MEAL_KEYS_LIST.length;
      return {
        id: row._id?.toString?.() ?? null,
        plan_id: row.plan_id?.toString?.() ?? null,
        log_date: row.log_date ?? null,
        meals: row.meals ?? {},
        created_at: row.created_at instanceof Date ? row.created_at.toISOString() : null,
        summary: { followed, total, percent: total > 0 ? Math.round((followed / total) * 100) : 0 },
      };
    });

    let summary = null;
    if (formatted.length > 0) {
      const totalMeals = formatted.length * MEAL_KEYS_LIST.length;
      const totalFollowed = formatted.reduce((acc, r) => acc + (r.summary?.followed ?? 0), 0);
      summary = {
        days_logged: formatted.length,
        total_meals_followed: totalFollowed,
        total_meals_possible: totalMeals,
        overall_percent: totalMeals > 0 ? Math.round((totalFollowed / totalMeals) * 100) : 0,
      };
    }

    res.status(200).json({ success: true, data: formatted, summary });
  } catch (err) {
    logger.error('Compliance GET error', { message: err?.message ?? err, stack: err?.stack });
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Unable to load compliance.' },
      });
    }
  }
});
