/**
 * GET /api/history?user_id=... : list diet plans for user.
 */

import { Router } from 'express';
import { findDietPlansByUserId } from '../repositories/dietPlanRepository.js';
import { computeDietScore } from '../utils/dietScore.js';
import { logger } from '../utils/logger.js';

const OBJECT_ID_REGEX = /^[a-f0-9]{24}$/i;

export const historyRouter = Router();

historyRouter.get('/', async (req, res) => {
  try {
    const userId = String(req.query.user_id ?? '').trim();
    if (!userId) {
      return res.status(422).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', messages: ['user_id query parameter is required.'] },
      });
    }
    if (!OBJECT_ID_REGEX.test(userId)) {
      return res.status(422).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', messages: ['user_id must be a valid MongoDB ObjectId.'] },
      });
    }

    let plans;
    try {
      plans = await findDietPlansByUserId(userId);
    } catch (err) {
      logger.warn('History: DB error, returning empty list', { message: err?.message ?? err });
      return res.status(200).json({ success: true, data: [], db_unavailable: true });
    }

    const formatted = plans.map((plan) => {
      const chart = plan.diet_chart ?? {};
      const isWeekly = Array.isArray(chart.days) && chart.days.length > 0;
      const firstDay = isWeekly ? chart.days[0] ?? {} : chart;
      const suggestions = Array.isArray(chart.suggestions) ? chart.suggestions : Array.isArray(plan.suggestions) ? plan.suggestions : [];
      const createdAt = plan.created_at;
      const createdAtIso = createdAt instanceof Date ? createdAt.toISOString() : null;
      const dietScoreStored = plan.diet_score != null ? Number(plan.diet_score) : null;
      const chartForScore = isWeekly ? firstDay : chart;
      const { score: dietScoreComputed } = dietScoreStored != null
        ? { score: dietScoreStored }
        : computeDietScore(chartForScore);

      const dietChartOut = {
        breakfast: String(firstDay.breakfast ?? ''),
        mid_snack: String(firstDay.mid_snack ?? ''),
        lunch: String(firstDay.lunch ?? ''),
        evening_snack: String(firstDay.evening_snack ?? ''),
        dinner: String(firstDay.dinner ?? ''),
        calories: String(chart.calories ?? firstDay.calories ?? ''),
        protein_g: firstDay.protein_g != null ? Number(firstDay.protein_g) : (chart.protein_g != null ? Number(chart.protein_g) : null),
        carbs_g: firstDay.carbs_g != null ? Number(firstDay.carbs_g) : (chart.carbs_g != null ? Number(chart.carbs_g) : null),
        fat_g: firstDay.fat_g != null ? Number(firstDay.fat_g) : (chart.fat_g != null ? Number(chart.fat_g) : null),
        suggestions: suggestions.map((s) => String(s ?? '')),
      };
      if (isWeekly && Array.isArray(chart.days)) {
        dietChartOut.days = chart.days;
      }
      for (const key of ['breakfast_time', 'mid_snack_time', 'lunch_time', 'evening_snack_time', 'dinner_time', 'breakfast_portion', 'mid_snack_portion', 'lunch_portion', 'evening_snack_portion', 'dinner_portion']) {
        if (firstDay[key] != null) dietChartOut[key] = String(firstDay[key]);
      }

      return {
        id: plan._id?.toString() ?? null,
        bmi: plan.bmi != null ? Number(plan.bmi) : null,
        goal: plan.goal != null ? String(plan.goal) : null,
        diet_chart: dietChartOut,
        calories: String(plan.calories ?? chart.calories ?? ''),
        diet_score: dietScoreStored ?? dietScoreComputed,
        created_at: createdAtIso,
      };
    });

    logger.info('History: success', { userId, count: formatted.length });
    res.status(200).json({ success: true, data: formatted });
  } catch (err) {
    logger.error('History error', { message: err?.message ?? err, stack: err?.stack });
    res.status(200).json({ success: true, data: [] });
  }
});
