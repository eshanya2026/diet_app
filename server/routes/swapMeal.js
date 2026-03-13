/**
 * POST /api/swap-meal: suggest alternative meal for a slot.
 * Uses food DB when populated (filtered by health/cuisine/diet); else rule-based.
 */

import { Router } from 'express';
import { suggestMealSwapRuleBased } from '../utils/dietGenerator.js';
import { SLOT_TO_MEAL_TYPE } from '../utils/foodDietGenerator.js';
import { findFiltered } from '../repositories/foodRepository.js';
import { logger } from '../utils/logger.js';

export const swapMealRouter = Router();

swapMealRouter.get('/', (_req, res) => {
  res.status(405).json({
    success: false,
    error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST with body { meal_slot, current_meal, health_condition?, cuisine_preference?, diet_preference? }.' },
  });
});

swapMealRouter.post('/', async (req, res) => {
  try {
    const body = req.body ?? {};
    const mealSlot = String(body.meal_slot ?? '').trim().toLowerCase();
    const currentMeal = String(body.current_meal ?? '').trim();
    const healthCondition = body.health_condition ?? (Array.isArray(body.health_conditions) ? body.health_conditions[0] : undefined);
    const cuisinePreference = String(body.cuisine_preference ?? 'Mixed').trim();
    const dietPreference = String(body.diet_preference ?? 'veg').trim().toLowerCase();

    if (!mealSlot || !currentMeal) {
      return res.status(422).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', messages: ['meal_slot and current_meal are required.'] },
      });
    }

    const mealType = SLOT_TO_MEAL_TYPE[mealSlot] ?? null;
    if (mealType) {
      try {
        const list = await findFiltered({
          cuisine: cuisinePreference || undefined,
          meal_type: mealType,
          condition: healthCondition ?? 'none',
          diet_preference: dietPreference || 'veg',
        });
        const currentNorm = currentMeal.toLowerCase();
        const others = (list ?? []).filter(
          (f) => String(f?.name ?? '').trim().toLowerCase() !== currentNorm
        );
        let pool = others.length > 0 ? others : list;

        // Fallback 1: If pool empty, try Mixed cuisine
        if (pool.length === 0 && cuisinePreference !== 'Mixed') {
           const fallbackList = await findFiltered({
              cuisine: 'Mixed',
              meal_type: mealType,
              condition: healthCondition ?? 'none',
              diet_preference: dietPreference || 'veg',
           });
           const fallbackOthers = (fallbackList ?? []).filter(
              (f) => String(f?.name ?? '').trim().toLowerCase() !== currentNorm
           );
           pool = fallbackOthers.length > 0 ? fallbackOthers : fallbackList;
        }

        if (pool.length > 0) {
          const pick = pool[Math.floor(Math.random() * pool.length)];
          const name = pick?.name ?? '—';
          const portion = pick?.portion ?? '';
          return res.status(200).json({
            success: true,
            data: { alternative_meal: name, alternative_portion: portion },
          });
        }
        
        // Final fallback: no alternates found anywhere in the DB
        return res.status(422).json({
          success: false,
          error: { code: 'SWAP_FAILED', message: `No alternative ${dietPreference} ${mealSlot} found in the database. Please try generating a new plan.` },
        });
      } catch (dbErr) {
        logger.warn('Swap meal: food DB fallback', { message: dbErr?.message ?? dbErr });
      }
    }

    const result = suggestMealSwapRuleBased(mealSlot, currentMeal);
    if (!result.ok) {
      return res.status(422).json({
        success: false,
        error: { code: 'SWAP_FAILED', message: result.error ?? 'Failed to suggest alternative meal.' },
      });
    }
    res.status(200).json({ success: true, data: result.data });
  } catch (err) {
    logger.error('Swap meal error', { message: err?.message ?? err });
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Failed to suggest alternative meal.' },
      });
    }
  }
});
