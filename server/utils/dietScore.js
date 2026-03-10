/**
 * Diet score (0–100) and macro estimation from diet chart and optional user goal.
 */

/**
 * Parse calories string to number (e.g. "1800 kcal/day" -> 1800).
 * @param {string} calStr
 * @returns {number|null}
 */
function parseCalories(calStr) {
  if (calStr == null || typeof calStr !== 'string') return null;
  const match = calStr.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

/**
 * Estimate macros (g) from calorie string. Uses 30% protein, 40% carbs, 30% fat if no data.
 * @param {string} caloriesStr - e.g. "1800 kcal/day"
 * @returns {{ protein_g: number, carbs_g: number, fat_g: number }|null}
 */
export function estimateMacrosFromCalories(caloriesStr) {
  const cal = parseCalories(caloriesStr);
  if (cal == null || cal <= 0) return null;
  const protein_g = Math.round((cal * 0.3) / 4);
  const carbs_g = Math.round((cal * 0.4) / 4);
  const fat_g = Math.round((cal * 0.3) / 9);
  return { protein_g, carbs_g, fat_g };
}

/**
 * Ensure chart has macro numbers (from existing or estimated).
 * @param {object} chart - diet_chart with optional protein_g, carbs_g, fat_g, calories
 * @returns {{ protein_g: number, carbs_g: number, fat_g: number }}
 */
export function ensureMacros(chart) {
  const c = chart && typeof chart === 'object' ? chart : {};
  const existing = {
    protein_g: typeof c.protein_g === 'number' && c.protein_g >= 0 ? c.protein_g : null,
    carbs_g: typeof c.carbs_g === 'number' && c.carbs_g >= 0 ? c.carbs_g : null,
    fat_g: typeof c.fat_g === 'number' && c.fat_g >= 0 ? c.fat_g : null,
  };
  if (existing.protein_g != null && existing.carbs_g != null && existing.fat_g != null) {
    return { protein_g: existing.protein_g, carbs_g: existing.carbs_g, fat_g: existing.fat_g };
  }
  const estimated = estimateMacrosFromCalories(c.calories ?? '');
  if (estimated) return estimated;
  return { protein_g: 0, carbs_g: 0, fat_g: 0 };
}

/**
 * Compute diet score 0–100 from plan and optional goal.
 * @param {object} dietChart - diet_chart (meals, calories, suggestions)
 * @param {string} [goal] - user goal (weight loss, etc.)
 * @returns {{ score: number, breakdown: object }}
 */
export function computeDietScore(dietChart, goal = '') {
  const chart = dietChart && typeof dietChart === 'object' ? dietChart : {};
  const breakdown = { calories: 0, meals: 0, suggestions: 0, variety: 0 };

  const calStr = chart.calories ?? '';
  const cal = parseCalories(calStr);
  if (cal != null && cal >= 1200 && cal <= 3500) breakdown.calories = 25;
  else if (cal != null) breakdown.calories = 15;

  const mealKeys = ['breakfast', 'mid_snack', 'lunch', 'evening_snack', 'dinner'];
  const filled = mealKeys.filter((k) => {
    const v = chart[k];
    return typeof v === 'string' && v.trim().length > 2;
  });
  breakdown.meals = Math.min(25, filled.length * 5);

  const suggestions = Array.isArray(chart.suggestions) ? chart.suggestions : [];
  breakdown.suggestions = suggestions.length > 0 ? 25 : 10;

  const uniqueWords = new Set();
  filled.forEach((k) => {
    const text = (chart[k] ?? '').toLowerCase();
    text.split(/\s+/).forEach((w) => {
      if (w.length > 2) uniqueWords.add(w);
    });
  });
  breakdown.variety = Math.min(25, Math.floor(uniqueWords.size / 3));

  const score = Math.min(100, Math.round(
    breakdown.calories + breakdown.meals + breakdown.suggestions + breakdown.variety
  ));

  return { score, breakdown };
}
