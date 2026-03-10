/**
 * Rule-based Indian diet chart generator. No AI. Uses BMR/TDEE and meal templates.
 */

import { calculateBmr, calculateTdee, getCalorieTarget } from './calories.js';

const DEFAULT_TIMES = {
  breakfast: '7:30 AM',
  mid_snack: '11:00 AM',
  lunch: '1:00 PM',
  evening_snack: '5:00 PM',
  dinner: '8:00 PM',
};

const BREAKFAST = {
  veg: [
    { text: 'Oats porridge, banana, almonds (5–6).', portion: '1 bowl oats, 1 small banana' },
    { text: 'Idli (3) with sambar, coconut chutney.', portion: '3 idlis, 1 small bowl sambar' },
    { text: 'Poha with peanuts, lemon, cucumber.', portion: '1.5 cup poha' },
    { text: 'Dosa (2) with chutney, sambar.', portion: '2 dosas' },
  ],
  'non-veg': [
    { text: 'Egg whites (2) with toast, fruit.', portion: '2 egg whites, 1 slice bread' },
    { text: 'Oats with boiled egg (1), banana.', portion: '1 bowl oats, 1 egg' },
    { text: 'Idli (2) with egg curry (1 egg).', portion: '2 idlis, 1 egg' },
    { text: 'Poha with boiled egg, cucumber.', portion: '1 cup poha, 1 egg' },
  ],
  vegan: [
    { text: 'Oats porridge with nuts, apple.', portion: '1 bowl oats' },
    { text: 'Idli (3) with tomato chutney, sambar.', portion: '3 idlis' },
    { text: 'Poha with peanuts, lemon.', portion: '1.5 cup poha' },
    { text: 'Upma with vegetables, coconut.', portion: '1 bowl upma' },
  ],
};

const MID_SNACK = {
  veg: [
    { text: 'Fruit (apple/pear), handful of nuts.', portion: '1 fruit, 8–10 almonds' },
    { text: 'Buttermilk, roasted chana.', portion: '1 glass, 1 small bowl chana' },
    { text: 'Cucumber salad, green tea.', portion: '1 bowl salad' },
  ],
  'non-veg': [
    { text: 'Fruit, handful of nuts.', portion: '1 fruit, 8–10 almonds' },
    { text: 'Buttermilk, boiled egg (1).', portion: '1 glass, 1 egg' },
    { text: 'Roasted chana, cucumber.', portion: '1 small bowl' },
  ],
  vegan: [
    { text: 'Fruit, almonds.', portion: '1 fruit, 8–10 almonds' },
    { text: 'Roasted chana, lemon water.', portion: '1 small bowl' },
    { text: 'Cucumber and carrot sticks.', portion: '1 small bowl' },
  ],
};

const LUNCH = {
  veg: [
    { text: '2–3 chapatis, dal, sabzi, salad, curd.', portion: '2–3 rotis, 1 bowl each' },
    { text: 'Rice, sambar, poriyal, rasam, curd.', portion: '1 cup rice, 1 bowl each' },
    { text: 'Phulka (2), paneer curry, dal, salad.', portion: '2 phulkas, 1 bowl curry' },
    { text: 'Jeera rice, rajma, cucumber raita.', portion: '1 cup rice, 1 bowl rajma' },
  ],
  'non-veg': [
    { text: '2 chapatis, chicken curry, dal, salad.', portion: '2 rotis, 1 bowl curry, 1 bowl dal' },
    { text: 'Rice, fish curry, sabzi, curd.', portion: '1 cup rice, 1 piece fish' },
    { text: 'Phulka (2), egg curry, dal, salad.', portion: '2 phulkas, 1 egg' },
    { text: 'Rice, chicken curry, rasam, curd.', portion: '1 cup rice, 1 bowl curry' },
  ],
  vegan: [
    { text: '2–3 chapatis, dal, sabzi, salad.', portion: '2–3 rotis, 1 bowl each' },
    { text: 'Rice, sambar, poriyal, rasam.', portion: '1 cup rice, 1 bowl each' },
    { text: 'Phulka (2), chole, salad.', portion: '2 phulkas, 1 bowl chole' },
    { text: 'Rice, dal, stir-fry vegetables.', portion: '1 cup rice, 1 bowl each' },
  ],
};

const EVENING_SNACK = {
  veg: [
    { text: 'Green tea, biscuits (2), or fruit.', portion: '1 cup tea, 2 marie biscuits' },
    { text: 'Sprouts chaat or fruit.', portion: '1 small bowl' },
    { text: 'Murmura chivda, tea.', portion: '1 small cup' },
  ],
  'non-veg': [
    { text: 'Green tea, biscuits or fruit.', portion: '1 cup, 2 biscuits' },
    { text: 'Sprouts or fruit.', portion: '1 small bowl' },
    { text: 'Tea, roasted chana.', portion: '1 cup, 1 small bowl' },
  ],
  vegan: [
    { text: 'Green tea, fruit or roasted chana.', portion: '1 cup, 1 fruit' },
    { text: 'Sprouts chaat.', portion: '1 small bowl' },
    { text: 'Lemon water, murmura.', portion: '1 glass, 1 small cup' },
  ],
};

const DINNER = {
  veg: [
    { text: '2 chapatis, dal, sabzi, salad. Light and early.', portion: '2 rotis, 1 bowl each' },
    { text: 'Khichdi, curd, salad.', portion: '1.5 bowl khichdi' },
    { text: 'Phulka (2), paneer/vegetable curry.', portion: '2 phulkas, 1 bowl curry' },
    { text: 'Soup, chapati (1), vegetable.', portion: '1 bowl soup, 1 roti' },
  ],
  'non-veg': [
    { text: '2 chapatis, chicken/fish curry, salad.', portion: '2 rotis, 1 bowl curry' },
    { text: 'Grilled fish or chicken, salad, 1 chapati.', portion: '1 piece, 1 roti' },
    { text: 'Egg curry, 1 chapati, salad.', portion: '1 egg, 1 roti' },
    { text: 'Dal, roti (2), light sabzi.', portion: '2 rotis, 1 bowl dal' },
  ],
  vegan: [
    { text: '2 chapatis, dal, sabzi, salad.', portion: '2 rotis, 1 bowl each' },
    { text: 'Khichdi, salad.', portion: '1.5 bowl khichdi' },
    { text: 'Phulka (2), vegetable curry.', portion: '2 phulkas, 1 bowl' },
    { text: 'Dal, chapati (1), stir-fry.', portion: '1 roti, 1 bowl each' },
  ],
};

function pick(options, index) {
  if (!Array.isArray(options) || options.length === 0) return { text: '—', portion: '' };
  const i = Math.abs(Math.floor(index)) % options.length;
  return options[i] ?? { text: '—', portion: '' };
}

/** Pick an option different from previousText when possible; otherwise any. Uses index for deterministic choice. */
function pickDifferent(options, previousText, index) {
  if (!Array.isArray(options) || options.length === 0) return { text: '—', portion: '' };
  const prev = (previousText ?? '').trim().toLowerCase();
  const others = prev
    ? options.filter((o) => (o?.text ?? '').trim().toLowerCase() !== prev)
    : options;
  const pool = others.length > 0 ? others : options;
  const i = Math.abs(Math.floor(index)) % pool.length;
  return pool[i] ?? { text: '—', portion: '' };
}

function conditionFilter(dietKey, conditions) {
  const c = Array.isArray(conditions) ? conditions : [];
  const hasDiabetes = c.includes('diabetes');
  const hasBp = c.includes('hypertension');
  const hasCholesterol = c.includes('high_cholesterol');
  if (hasDiabetes && (dietKey === 'mid_snack' || dietKey === 'evening_snack')) {
    return { veg: MID_SNACK.veg.filter((_, i) => i < 2), 'non-veg': MID_SNACK['non-veg'].filter((_, i) => i < 2), vegan: MID_SNACK.vegan.filter((_, i) => i < 2) };
  }
  if (hasBp || hasCholesterol) return null;
  return null;
}

function getMealOptions(mealKey, dietPreference, conditions) {
  const diet = dietPreference === 'non-veg' ? 'non-veg' : dietPreference === 'vegan' ? 'vegan' : 'veg';
  const maps = { breakfast: BREAKFAST, mid_snack: MID_SNACK, lunch: LUNCH, evening_snack: EVENING_SNACK, dinner: DINNER };
  const map = maps[mealKey];
  if (!map) return [];
  const filtered = conditionFilter(mealKey, conditions);
  const source = filtered ? filtered[diet] : map[diet];
  return Array.isArray(source) ? source : map[diet] ?? [];
}

function stableIndex(str, seed) {
  let h = seed;
  const s = String(str ?? '');
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i) | 0;
  return h;
}

function buildSuggestions(goal, conditions, bmiCategory) {
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

/** Prime multiplier so (seed + dayOffset * MULT) % N varies with day for small N (2,3,4,5). */
const DAY_OFFSET_MULTIPLIER = 1009;

const MEAL_KEYS = ['breakfast', 'mid_snack', 'lunch', 'evening_snack', 'dinner'];

/**
 * Generate diet chart from user data. No AI. Returns same shape as Gemini response.
 * @param {object} data - Validated payload: name, age, gender, height, weight, activity_level, diet_preference, health_conditions, goal
 * @param {number} targetCalories - Daily calorie target
 * @param {number} [dayOffset] - Optional 0–6 for weekly variation; same day = same chart
 * @returns {object} - { breakfast, breakfast_time, breakfast_portion, ..., calories, suggestions }
 */
export function generateRuleBasedDiet(data, targetCalories, dayOffset = 0) {
  const dietPreference = String(data?.diet_preference ?? 'veg').toLowerCase();
  const conditions = Array.isArray(data?.health_conditions) ? data.health_conditions : [];
  const goal = String(data?.goal ?? '').toLowerCase();
  const name = String(data?.name ?? '');
  const baseSeed = stableIndex(name + dietPreference + goal, 42);
  const seed = baseSeed + (Number(dayOffset) || 0) * DAY_OFFSET_MULTIPLIER;

  const out = {
    calories: String(targetCalories) + ' kcal/day',
    suggestions: buildSuggestions(goal, conditions, null),
  };

  MEAL_KEYS.forEach((key, idx) => {
    const options = getMealOptions(key, dietPreference, conditions);
    const choice = pick(options, seed + idx * 7);
    out[key] = choice.text ?? '—';
    out[`${key}_time`] = DEFAULT_TIMES[key] ?? '';
    out[`${key}_portion`] = choice.portion ?? '';
  });

  const calNum = parseInt(String(targetCalories), 10);
  if (Number.isInteger(calNum) && calNum > 0) {
    out.protein_g = Math.round((calNum * 0.3) / 4);
    out.carbs_g = Math.round((calNum * 0.4) / 4);
    out.fat_g = Math.round((calNum * 0.3) / 9);
  }

  return out;
}

const DAYS_IN_WEEK = 7;

/**
 * Generate a 7-day weekly diet plan. Each day gets different meals from the rule-based lists.
 * Avoids repeating the same meal on consecutive days when another option exists.
 * @param {object} data - Validated payload (same as generateRuleBasedDiet)
 * @param {number} targetCalories - Daily calorie target
 * @returns {{ days: object[], calories: string, suggestions: string[] }}
 */
export function generateWeeklyRuleBasedDiet(data, targetCalories) {
  const dietPreference = String(data?.diet_preference ?? 'veg').toLowerCase();
  const conditions = Array.isArray(data?.health_conditions) ? data.health_conditions : [];
  const goal = String(data?.goal ?? '').toLowerCase();
  const name = String(data?.name ?? '');
  const baseSeed = stableIndex(name + dietPreference + goal, 42);

  const days = [];
  let previousDay = null;

  for (let d = 0; d < DAYS_IN_WEEK; d++) {
    const daySeed = baseSeed + d * DAY_OFFSET_MULTIPLIER;
    const out = {
      calories: String(targetCalories) + ' kcal/day',
      suggestions: buildSuggestions(goal, conditions, null),
    };

    MEAL_KEYS.forEach((key, idx) => {
      const options = getMealOptions(key, dietPreference, conditions);
      const prevMealText = previousDay?.[key] ?? null;
      const choice = pickDifferent(options, prevMealText, daySeed + idx * 11);
      out[key] = choice.text ?? '—';
      out[`${key}_time`] = DEFAULT_TIMES[key] ?? '';
      out[`${key}_portion`] = choice.portion ?? '';
    });

    const calNum = parseInt(String(targetCalories), 10);
    if (Number.isInteger(calNum) && calNum > 0) {
      out.protein_g = Math.round((calNum * 0.3) / 4);
      out.carbs_g = Math.round((calNum * 0.4) / 4);
      out.fat_g = Math.round((calNum * 0.3) / 9);
    }

    days.push(out);
    previousDay = out;
  }

  const first = days[0] ?? {};
  return {
    days,
    calories: first.calories ?? String(targetCalories) + ' kcal/day',
    suggestions: Array.isArray(first.suggestions) ? first.suggestions : [],
  };
}

/**
 * Get calorie target for user. Uses BMR/TDEE and goal.
 */
export function getTargetCalories(data) {
  const bmr = calculateBmr(data.weight, data.height, data.age, data.gender);
  const tdee = calculateTdee(bmr, data.activity_level);
  return getCalorieTarget(tdee, data.goal);
}

const SLOT_TEMPLATES = {
  breakfast: BREAKFAST,
  mid_snack: MID_SNACK,
  lunch: LUNCH,
  evening_snack: EVENING_SNACK,
  dinner: DINNER,
};

/**
 * Get alternative meal options for a slot (rule-based, no AI).
 * @param {string} mealSlot - breakfast, mid_snack, lunch, evening_snack, dinner
 * @returns {Array<{ text: string, portion: string }>} - Array of options with text + portion
 */
export function getMealAlternativesForSlot(mealSlot) {
  const key = String(mealSlot ?? '').trim().toLowerCase();
  const map = SLOT_TEMPLATES[key];
  if (!map) return [];
  const byText = new Map();
  for (const diet of ['veg', 'non-veg', 'vegan']) {
    const arr = map[diet];
    if (Array.isArray(arr)) {
      for (const item of arr) {
        const t = item?.text?.trim();
        if (!t) continue;
        const norm = t.toLowerCase();
        if (!byText.has(norm)) {
          byText.set(norm, { text: t, portion: item?.portion?.trim() || '' });
        }
      }
    }
  }
  return Array.from(byText.values());
}

/**
 * Suggest one alternative meal for a slot (rule-based). Picks another option from templates.
 * @param {string} mealSlot - e.g. "lunch"
 * @param {string} currentMeal - current meal text
 * @returns {{ ok: boolean, data?: { alternative_meal: string, alternative_portion: string }, error?: string }}
 */
export function suggestMealSwapRuleBased(mealSlot, currentMeal) {
  const options = getMealAlternativesForSlot(mealSlot);
  if (options.length === 0) {
    return { ok: false, error: 'No alternatives for this slot.' };
  }
  const current = String(currentMeal ?? '').trim().toLowerCase();
  const others = options.filter((opt) => opt.text.trim().toLowerCase() !== current);
  const pool = others.length > 0 ? others : options;
  const idx = Math.floor(Math.random() * pool.length);
  const choice = pool[idx] ?? options[0];
  const alternative_meal = choice?.text ?? '—';
  const alternative_portion = choice?.portion ?? '';
  return { ok: true, data: { alternative_meal, alternative_portion } };
}
