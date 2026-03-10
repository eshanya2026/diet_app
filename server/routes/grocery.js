/**
 * POST /api/grocery-list: generate grocery list from diet chart.
 * Uses Gemini if GEMINI_API_KEY is set; otherwise rule-based (no AI).
 */

import { Router } from 'express';
import { generateGroceryList } from '../utils/geminiHelpers.js';
import { generateGroceryListRuleBased } from '../utils/groceryRuleBased.js';
import { logger } from '../utils/logger.js';

export const groceryRouter = Router();

groceryRouter.get('/', (_req, res) => {
  res.status(405).json({
    success: false,
    error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST with body { diet_chart }.' },
  });
});

groceryRouter.post('/', async (req, res) => {
  const sendError = (status, code, message, details = undefined) => {
    if (res.headersSent) return;
    res.status(status).json({
      success: false,
      error: { code, message, ...(details != null && { details }) },
    });
  };

  try {
    const body = req.body ?? {};
    const dietChart = body.diet_chart ?? body;
    if (!dietChart || typeof dietChart !== 'object') {
      return sendError(422, 'VALIDATION_ERROR', 'diet_chart object is required.');
    }

    const useGemini = Boolean(process.env.GEMINI_API_KEY);
    let result;

    if (useGemini) {
      try {
        result = await generateGroceryList(dietChart);
      } catch (innerErr) {
        const msg = innerErr?.message ?? String(innerErr);
        logger.warn('Grocery list: Gemini failed, using rule-based', { message: msg });
        result = generateGroceryListRuleBased(dietChart);
      }
      if (result && !result.ok) {
        logger.warn('Grocery list: Gemini failed, using rule-based', { error: result.error ?? '' });
        result = generateGroceryListRuleBased(dietChart);
      }
    }

    if (!result?.ok) {
      result = generateGroceryListRuleBased(dietChart);
    }

    if (!res.headersSent) {
      logger.info('Grocery list: success', { itemsCount: result?.data?.items?.length ?? 0 });
      res.status(200).json({ success: true, data: result.data });
    }
  } catch (err) {
    logger.error('Grocery list error', { message: err?.message ?? err });
    sendError(500, 'SERVER_ERROR', 'Something went wrong. Please try again later.');
  }
});
