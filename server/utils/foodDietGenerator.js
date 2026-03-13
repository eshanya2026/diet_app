/**
 * Diet plan generation from food DB: filter by cuisine, meal_type, health condition, diet preference.
 * Builds daily/weekly charts with variety (no same dish on consecutive days for weekly).
 */

const DEFAULT_TIMES = {
  breakfast: '7:30 AM',
  mid_snack: '11:00 AM',
  lunch: '1:00 PM',
  evening_snack: '5:00 PM',
  dinner: '8:00 PM',
};

/** Map internal slot keys to food DB meal_type. */
export const SLOT_TO_MEAL_TYPE = {
  breakfast: 'Breakfast',
  mid_snack: 'Snack',
  lunch: 'Lunch',
  evening_snack: 'Snack',
  dinner: 'Dinner',
};

export const MEAL_SLOTS = ['breakfast', 'mid_snack', 'lunch', 'evening_snack', 'dinner'];

function stableSeed(str, seed = 0) {
  let h = seed;
  const s = String(str ?? '');
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i) | 0;
  return h >>> 0;
}

function pickFromList(list, seed, excludeNames = []) {
  if (!Array.isArray(list) || list.length === 0) return null;
  const excludeSet = new Set((excludeNames ?? []).map((n) => String(n ?? '').trim().toLowerCase()));
  const allowed = excludeSet.size > 0
    ? list.filter((f) => !excludeSet.has(String(f?.name ?? '').trim().toLowerCase()))
    : list;
  const pool = allowed.length > 0 ? allowed : list;
  const idx = seed % pool.length;
  return pool[Math.abs(idx)] ?? pool[0];
}

function buildSuggestions(goal, conditions) {
  const list = [];
  const g = String(goal ?? '').toLowerCase();
  if (g === 'weight loss') list.push('Eat at regular times and avoid heavy dinners.');
  if (g === 'weight gain' || g === 'muscle gain') list.push('Include adequate protein and healthy fats in each meal.');
  if (Array.isArray(conditions) && conditions.length > 0 && !conditions.includes('none')) {
    if (conditions.includes('diabetes')) list.push('Keep mid-meal snacks light and low in simple sugars.');
    if (conditions.includes('hypertension')) list.push('Limit added salt and processed foods; watch packaged snacks.');
    if (conditions.includes('high_cholesterol')) list.push('Prefer grilled and steamed over fried; include fibre-rich foods.');
    if (conditions.includes('pcos')) list.push('Prioritize balanced meals with protein and fibre; limit sugary drinks and refined carbs.');
    if (conditions.includes('thyroid')) list.push('Keep meal timing regular and avoid extreme calorie restriction unless supervised.');
    if (conditions.includes('anemia')) list.push('Include iron-rich foods (leafy greens, lentils) with vitamin C sources.');
    if (conditions.includes('obesity')) list.push('Focus on portion control and whole foods; avoid frequent high-calorie snacks.');
    if (conditions.includes('underweight')) list.push('Add calorie-dense, nutrient-rich snacks like nuts, seeds, and dairy if tolerated.');
  }
  list.push('Stay hydrated; drink water through the day.');
  list.push('This is general guidance only; consult a doctor for medical advice.');
  return list;
}

/**
 * Build one day chart from pre-fetched foods per slot.
 * @param {Record<string, Array>} foodsBySlot - { breakfast: [food], mid_snack: [food], ... }
 * @param {number} targetCalories
 * @param {object} data - validated user data (goal, health_conditions)
 * @param {number} daySeed - for deterministic pick
 * @param {object} previousDayChart - optional; dish names to avoid (for variety)
 */
export function buildDayChartFromFoods(foodsBySlot, targetCalories, data, daySeed = 0, previousDayChart = null) {
  const conditions = Array.isArray(data?.health_conditions) ? data.health_conditions : [];
  const goal = String(data?.goal ?? '').toLowerCase();
  const out = {
    calories: String(targetCalories) + ' kcal/day',
    suggestions: buildSuggestions(goal, conditions),
  };

  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  const prevNames = previousDayChart
    ? MEAL_SLOTS.map((s) => (previousDayChart[s] ?? '').trim()).filter(Boolean)
    : [];

  MEAL_SLOTS.forEach((slot, idx) => {
    const list = foodsBySlot[slot] ?? [];
    const exclude = prevNames;
    const seed = stableSeed(slot + daySeed, daySeed + idx * 11);
    const food = pickFromList(list, seed, exclude);
    const mealName = food?.name ?? '—';
    const portion = food?.portion ?? '';
    out[slot] = mealName;
    out[`${slot}_time`] = DEFAULT_TIMES[slot] ?? '';
    out[`${slot}_portion`] = portion;

    const cals = Number.isFinite(food?.calories) ? Number(food.calories) : NaN;
    const prot = Number.isFinite(food?.protein) ? Number(food.protein) : NaN;
    const carb = Number.isFinite(food?.carbs) ? Number(food.carbs) : NaN;
    const fat = Number.isFinite(food?.fat) ? Number(food.fat) : NaN;
    if (!Number.isNaN(cals)) totalCalories += cals;
    if (!Number.isNaN(prot)) totalProtein += prot;
    if (!Number.isNaN(carb)) totalCarbs += carb;
    if (!Number.isNaN(fat)) totalFat += fat;
  });

  if (totalCalories > 0 && (totalProtein > 0 || totalCarbs > 0 || totalFat > 0)) {
    out.calories = `${Math.round(totalCalories)} kcal/day`;
    out.protein_g = Math.round(totalProtein);
    out.carbs_g = Math.round(totalCarbs);
    out.fat_g = Math.round(totalFat);
  } else {
    const calNum = parseInt(String(targetCalories), 10);
    if (Number.isInteger(calNum) && calNum > 0) {
      out.protein_g = Math.round((calNum * 0.3) / 4);
      out.carbs_g = Math.round((calNum * 0.4) / 4);
      out.fat_g = Math.round((calNum * 0.3) / 9);
    }
  }

  return out;
}

/**
 * Build weekly plan using getFoods(mealType) returning Promise<food[]>.
 * Avoids repeating the same dish on consecutive days.
 */
export async function buildWeeklyChartsFromFoods(getFoods, data, targetCalories) {
  const baseSeed = stableSeed(
    String(data?.name ?? '') + String(data?.diet_preference ?? '') + String(data?.goal ?? ''),
    42
  );
  const DAY_MULT = 1009;
  const days = [];
  let previousDay = null;

  for (let d = 0; d < 7; d++) {
    const foodsBySlot = {};
    for (const slot of MEAL_SLOTS) {
      const mealType = SLOT_TO_MEAL_TYPE[slot];
      const list = await getFoods(mealType);
      foodsBySlot[slot] = Array.isArray(list) ? list : [];
    }
    const daySeed = baseSeed + d * DAY_MULT;
    const dayChart = buildDayChartFromFoods(
      foodsBySlot,
      targetCalories,
      data,
      daySeed,
      previousDay
    );
    days.push(dayChart);
    previousDay = dayChart;
  }

  const first = days[0] ?? {};
  return {
    days,
    calories: first.calories ?? String(targetCalories) + ' kcal/day',
    suggestions: Array.isArray(first.suggestions) ? first.suggestions : [],
  };
}
