/**
 * POST /api/swap-meal: suggest alternative meal for a slot.
 * Uses rule-based generator only (no AI).
 */

import { Router } from 'express';
import { suggestMealSwapRuleBased } from '../utils/dietGenerator.js';
import { logger } from '../utils/logger.js';

export const swapMealRouter = Router();

swapMealRouter.get('/', (_req, res) => {
  res.status(405).json({
    success: false,
    error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST with body { meal_slot, current_meal, constraints? }.' },
  });
});

swapMealRouter.post('/', async (req, res) => {
  try {
    const body = req.body ?? {};
    const mealSlot = String(body.meal_slot ?? '').trim();
    const currentMeal = String(body.current_meal ?? '').trim();
    const constraints = String(body.constraints ?? '').trim(); // currently unused but accepted for compatibility
    if (!mealSlot || !currentMeal) {
      return res.status(422).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', messages: ['meal_slot and current_meal are required.'] },
      });
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
