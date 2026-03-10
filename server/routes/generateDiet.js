/**
 * POST /api/generate-diet: validate, BMI, optional cache, then rule-based or Gemini diet, save plan.
 * Use DIET_MODE=gemini and GEMINI_API_KEY for AI; otherwise rule-based (no AI).
 */

import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { validateUserHealthPayload } from '../utils/validation.js';
import { calculateBmi, bmiCategory } from '../utils/bmi.js';
import { buildDietPrompt, callGeminiForDiet } from '../utils/gemini.js';
import { generateRuleBasedDiet, generateWeeklyRuleBasedDiet, getTargetCalories } from '../utils/dietGenerator.js';
import { ensureMacros, computeDietScore } from '../utils/dietScore.js';
import { getRequestHash, getCached, setCached } from '../utils/cache.js';
import { logger } from '../utils/logger.js';
import { findOrCreateUser } from '../repositories/userRepository.js';
import { createDietPlan } from '../repositories/dietPlanRepository.js';

const USE_GEMINI = process.env.DIET_MODE === 'gemini' && process.env.GEMINI_API_KEY;

const MEAL_KEYS = ['breakfast', 'mid_snack', 'lunch', 'evening_snack', 'dinner'];

function normalizeDietChart(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const chart = {
    breakfast: String(r.breakfast ?? ''),
    mid_snack: String(r.mid_snack ?? ''),
    lunch: String(r.lunch ?? ''),
    evening_snack: String(r.evening_snack ?? ''),
    dinner: String(r.dinner ?? ''),
    calories: String(r.calories ?? ''),
    suggestions: Array.isArray(r.suggestions)
      ? r.suggestions.map((s) => String(s ?? ''))
      : [],
  };
  for (const key of MEAL_KEYS) {
    const timeKey = `${key}_time`;
    const portionKey = `${key}_portion`;
    if (r[timeKey] != null) chart[timeKey] = String(r[timeKey]);
    if (r[portionKey] != null) chart[portionKey] = String(r[portionKey]);
  }
  const macros = ensureMacros(r);
  chart.protein_g = macros.protein_g;
  chart.carbs_g = macros.carbs_g;
  chart.fat_g = macros.fat_g;
  return chart;
}

export const generateDietRouter = Router();

generateDietRouter.get('/', (_req, res) => {
  res.status(405).json({
    success: false,
    error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST to generate a diet plan.' },
  });
});

generateDietRouter.post('/', async (req, res) => {
  try {
    const payload = req.body ?? {};
    if (typeof payload !== 'object') {
      return res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Request body must be JSON object.' },
      });
    }
    let valid = false;
    let errors = [];
    let data = null;
    try {
      const result = validateUserHealthPayload(payload);
      valid = result.valid;
      errors = result.errors ?? [];
      data = result.data;
    } catch (validationErr) {
      logger.warn('Generate diet: validation error', { message: validationErr?.message ?? validationErr });
      return res.status(422).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', messages: ['Invalid request.'] },
      });
    }

    if (!valid) {
      return res.status(422).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', messages: errors },
      });
    }
    if (!data || typeof data !== 'object') {
      return res.status(422).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', messages: ['Invalid request data.'] },
      });
    }

    const bmi = calculateBmi(data.weight, data.height);
    const bmiCat = bmiCategory(bmi);
    const isWeekly = String(payload.plan_type ?? '').toLowerCase() === 'weekly';
    let cacheKey = '';
    if (!isWeekly) {
      try {
        cacheKey = getRequestHash(data) ?? '';
      } catch (_) {
        cacheKey = '';
      }
    }
    const cachedRaw = !isWeekly && cacheKey ? getCached(cacheKey) : null;
    const raw = cachedRaw ?? null;

    let userDoc = null;
    let saved = true;
    try {
      userDoc = await findOrCreateUser({
        name: data.name,
        age: data.age,
        gender: data.gender,
        height: data.height,
        weight: data.weight,
        diet_preference: data.diet_preference,
        goal: data.goal,
      });
    } catch (err) {
      logger.warn('Generate diet: save user failed (continuing without DB)', { message: err?.message ?? err });
      saved = false;
    }
    if (!userDoc?._id) {
      userDoc = { _id: new ObjectId() };
    }

    let dietChart;
    let dietRaw = raw;

    if (isWeekly) {
      try {
        const targetCal = getTargetCalories(data);
        const weekly = generateWeeklyRuleBasedDiet(data, targetCal);
        const normalizedDays = (weekly.days ?? []).map((day) => normalizeDietChart(day));
        dietChart = {
          days: normalizedDays,
          calories: weekly.calories ?? '',
          suggestions: Array.isArray(weekly.suggestions) ? weekly.suggestions : [],
        };
        dietRaw = null;
      } catch (dietErr) {
        const dietMsg = dietErr?.message ?? String(dietErr);
        logger.error('Generate diet: weekly rule-based error', { message: dietMsg, stack: dietErr?.stack });
        return res.status(500).json({
          success: false,
          error: { code: 'SERVER_ERROR', message: 'Failed to generate weekly diet plan. Check server logs.' },
        });
      }
    } else if (!dietRaw || typeof dietRaw !== 'object') {
      if (USE_GEMINI) {
        const prompt = buildDietPrompt(data, bmi, bmiCat);
        const geminiResult = await callGeminiForDiet(prompt);
        if (!geminiResult.ok) {
          return res.status(500).json({
            success: false,
            error: {
              code: 'SERVER_ERROR',
              message: geminiResult.error ?? 'Unable to generate diet plan.',
            },
          });
        }
        dietRaw = geminiResult.data ?? {};
      } else {
        try {
          const targetCal = getTargetCalories(data);
          dietRaw = generateRuleBasedDiet(data, targetCal);
        } catch (dietErr) {
          const dietMsg = dietErr?.message ?? String(dietErr);
          logger.error('Generate diet: rule-based error', { message: dietMsg, stack: dietErr?.stack });
          return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: 'Failed to generate diet. Check server logs.' },
          });
        }
      }
      if (cacheKey) setCached(cacheKey, dietRaw);
      dietChart = normalizeDietChart(dietRaw);
    } else {
      dietChart = normalizeDietChart(dietRaw);
    }

    const chartForScore = isWeekly && Array.isArray(dietChart.days) && dietChart.days.length > 0
      ? dietChart.days[0]
      : dietChart;
    const { score: dietScore, breakdown: scoreBreakdown } = computeDietScore(chartForScore, data.goal);
    const fromCache = Boolean(cachedRaw);

    const firstDayChart = isWeekly && Array.isArray(dietChart.days) && dietChart.days[0] ? dietChart.days[0] : dietChart;
    if (isWeekly && dietChart && typeof dietChart === 'object' && !dietChart.protein_g && firstDayChart) {
      dietChart.protein_g = firstDayChart.protein_g;
      dietChart.carbs_g = firstDayChart.carbs_g;
      dietChart.fat_g = firstDayChart.fat_g;
    }

    let savedPlan = null;
    if (saved && !fromCache) {
      try {
        savedPlan = await createDietPlan({
          user_id: userDoc._id,
          bmi,
          diet_chart: dietChart,
          suggestions: dietChart.suggestions ?? [],
          calories: dietChart.calories ?? null,
          diet_score: dietScore,
          goal: data.goal ?? null,
          created_at: new Date(),
        });
      } catch (err) {
        logger.warn('Generate diet: save plan failed', { message: err?.message ?? err });
        saved = false;
      }
    }

    const userId = userDoc._id?.toString?.() ?? String(userDoc._id);
    const createdAt = savedPlan?.created_at ?? new Date();
    let createdAtIso = null;
    try {
      createdAtIso = createdAt instanceof Date && !Number.isNaN(createdAt.getTime())
        ? createdAt.toISOString()
        : null;
    } catch (_) {
      createdAtIso = null;
    }
    const planId = savedPlan?._id != null ? String(savedPlan._id) : null;

    const responseBody = {
      success: true,
      data: {
        saved: Boolean(saved),
        user: {
          id: userId,
          name: String(data.name ?? ''),
          age: Number(data.age),
          gender: String(data.gender ?? ''),
          height: Number(data.height),
          weight: Number(data.weight),
          activity_level: String(data.activity_level ?? ''),
          diet_preference: String(data.diet_preference ?? ''),
          health_conditions: Array.isArray(data.health_conditions) ? [...data.health_conditions] : [],
          goal: String(data.goal ?? ''),
          bmi: Math.round(bmi * 10) / 10,
          bmi_category: String(bmiCat),
        },
        diet_plan: {
          id: planId,
          bmi: Math.round(bmi * 10) / 10,
          bmi_category: String(bmiCat),
          plan_type: isWeekly ? 'weekly' : 'daily',
          diet_chart: { ...dietChart },
          calories: String(dietChart.calories ?? ''),
          protein_g: dietChart.protein_g ?? firstDayChart?.protein_g ?? 0,
          carbs_g: dietChart.carbs_g ?? firstDayChart?.carbs_g ?? 0,
          fat_g: dietChart.fat_g ?? firstDayChart?.fat_g ?? 0,
          diet_score: dietScore,
          score_breakdown: scoreBreakdown,
          suggestions: Array.isArray(dietChart.suggestions) ? dietChart.suggestions.map((s) => String(s ?? '')) : [],
          created_at: createdAtIso,
        },
      },
    };
    try {
      logger.info('Generate diet: success', {
        userId,
        fromCache: Boolean(fromCache),
        saved: Boolean(saved),
        planType: isWeekly ? 'weekly' : 'daily',
        mode: USE_GEMINI ? 'gemini' : 'rule-based',
      });
      res.status(200).json(responseBody);
    } catch (sendErr) {
      logger.error('Generate diet: send response failed', { message: sendErr?.message ?? sendErr });
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: { code: 'SERVER_ERROR', message: 'Unable to send response.' },
        });
      }
    }
  } catch (err) {
    const msg = err?.message ?? String(err);
    logger.error('Generate diet: unhandled error', { name: err?.name, message: msg, stack: err?.stack });
    if (res.headersSent) return;
    const isDbOrSave = /database|mongodb|save user|connection|MONGODB|atlas/i.test(msg);
    const safeMsg = isDbOrSave
      ? 'Server could not reach the database. Check MongoDB connection and try again.'
      : (msg && msg.length < 200 ? msg : 'Unable to generate diet plan. Please try again.');
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: safeMsg },
    });
  }
});
