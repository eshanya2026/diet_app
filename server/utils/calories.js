/**
 * BMR, TDEE and calorie target calculations for diet planning.
 * Uses Mifflin–St Jeor and activity multipliers.
 */

const ACTIVITY_MULTIPLIERS = {
  low: 1.2,
  medium: 1.55,
  high: 1.725,
};

const CALORIE_ADJUSTMENT = {
  'weight loss': -500,
  'weight gain': 300,
  'muscle gain': 300,
};

/**
 * BMR (Basal Metabolic Rate) via Mifflin–St Jeor.
 * @param {number} weightKg - Weight in kg
 * @param {number} heightCm - Height in cm
 * @param {number} age - Age in years
 * @param {string} gender - 'male' | 'female' | 'other'
 * @returns {number} BMR in kcal/day
 */
export function calculateBmr(weightKg, heightCm, age, gender) {
  const w = Number(weightKg) ?? 0;
  const h = Number(heightCm) ?? 0;
  const a = Number(age) ?? 0;
  if (w <= 0 || h <= 0) return 0;
  const base = 10 * w + 6.25 * h - 5 * a;
  const g = String(gender ?? '').toLowerCase();
  if (g === 'female') return Math.round(base - 161);
  if (g === 'male') return Math.round(base + 5);
  return Math.round(base - 78);
}

/**
 * TDEE (Total Daily Energy Expenditure) from BMR and activity level.
 * @param {number} bmr - BMR in kcal/day
 * @param {string} activityLevel - 'low' | 'medium' | 'high'
 * @returns {number} TDEE in kcal/day
 */
export function calculateTdee(bmr, activityLevel) {
  const b = Number(bmr) ?? 0;
  if (b <= 0) return 0;
  const key = String(activityLevel ?? 'low').toLowerCase().trim();
  const mult = ACTIVITY_MULTIPLIERS[key] ?? ACTIVITY_MULTIPLIERS.low;
  return Math.round(b * mult);
}

/**
 * Daily calorie target from TDEE and goal.
 * @param {number} tdee - TDEE in kcal/day
 * @param {string} goal - 'weight loss' | 'weight gain' | 'muscle gain'
 * @returns {number} Target calories per day
 */
export function getCalorieTarget(tdee, goal) {
  const t = Number(tdee) ?? 0;
  if (t <= 0) return 0;
  const g = String(goal ?? '').toLowerCase().trim();
  const adj = CALORIE_ADJUSTMENT[g] ?? 0;
  const target = t + adj;
  return Math.max(1200, Math.round(target));
}
