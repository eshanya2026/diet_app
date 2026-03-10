/**
 * Rule-based grocery list from diet chart. No AI.
 * Extracts ingredients from meal text and merges with common Indian staples.
 */

/** Keywords in meal text → grocery item name and default quantity/unit */
const INGREDIENT_MAP = [
  { keywords: ['rice', 'jeera rice'], name: 'Rice', quantity: '1', unit: 'kg' },
  { keywords: ['chapati', 'chapatis', 'phulka', 'phulkas', 'roti', 'rotis'], name: 'Wheat flour (atta)', quantity: '1', unit: 'kg' },
  { keywords: ['dal', 'sambar', 'rasam', 'rajma', 'chole', 'khichdi'], name: 'Lentils / dal', quantity: '500', unit: 'g' },
  { keywords: ['paneer'], name: 'Paneer', quantity: '200', unit: 'g' },
  { keywords: ['chicken'], name: 'Chicken', quantity: '500', unit: 'g' },
  { keywords: ['fish'], name: 'Fish', quantity: '300', unit: 'g' },
  { keywords: ['egg', 'eggs'], name: 'Eggs', quantity: '6', unit: 'pieces' },
  { keywords: ['curd', 'raita', 'dahi'], name: 'Curd / yogurt', quantity: '500', unit: 'g' },
  { keywords: ['idli', 'idlis'], name: 'Idli rice / batter', quantity: '500', unit: 'g' },
  { keywords: ['dosa', 'dosas'], name: 'Dosa batter / rice', quantity: '500', unit: 'g' },
  { keywords: ['poha'], name: 'Poha (flattened rice)', quantity: '250', unit: 'g' },
  { keywords: ['oats'], name: 'Oats', quantity: '500', unit: 'g' },
  { keywords: ['upma'], name: 'Semolina (rava)', quantity: '250', unit: 'g' },
  { keywords: ['bread', 'toast'], name: 'Whole wheat bread', quantity: '1', unit: 'loaf' },
  { keywords: ['banana', 'bananas'], name: 'Banana', quantity: '6', unit: 'pieces' },
  { keywords: ['apple', 'pear', 'fruit', 'fruits'], name: 'Seasonal fruits', quantity: '1', unit: 'kg' },
  { keywords: ['almond', 'almonds', 'nuts'], name: 'Almonds', quantity: '100', unit: 'g' },
  { keywords: ['chana', 'chickpea'], name: 'Chana (chickpeas)', quantity: '250', unit: 'g' },
  { keywords: ['sprouts'], name: 'Sprouts / moong', quantity: '200', unit: 'g' },
  { keywords: ['cucumber', 'salad', 'vegetables', 'sabzi', 'poriyal', 'stir-fry', 'vegetable'], name: 'Mixed vegetables', quantity: '1', unit: 'kg' },
  { keywords: ['coconut', 'chutney'], name: 'Coconut', quantity: '1', unit: 'piece' },
  { keywords: ['tomato'], name: 'Tomatoes', quantity: '500', unit: 'g' },
  { keywords: ['onion'], name: 'Onions', quantity: '500', unit: 'g' },
  { keywords: ['potato', 'potatoes'], name: 'Potatoes', quantity: '500', unit: 'g' },
  { keywords: ['green tea', 'tea'], name: 'Tea leaves', quantity: '100', unit: 'g' },
  { keywords: ['buttermilk'], name: 'Buttermilk / curd', quantity: '1', unit: 'ltr' },
  { keywords: ['biscuit', 'biscuits'], name: 'Marie biscuits', quantity: '1', unit: 'pack' },
  { keywords: ['murmura', 'chivda'], name: 'Murmura / puffed rice', quantity: '250', unit: 'g' },
  { keywords: ['soup'], name: 'Soup vegetables / stock', quantity: '—', unit: '' },
  { keywords: ['peanut', 'peanuts'], name: 'Peanuts', quantity: '100', unit: 'g' },
  { keywords: ['oil'], name: 'Cooking oil', quantity: '500', unit: 'ml' },
  { keywords: ['salt', 'spice', 'spices'], name: 'Salt & basic spices', quantity: '—', unit: '' },
];

/** Staples always included (small quantities) */
const STAPLES = [
  { name: 'Turmeric powder', quantity: '50', unit: 'g' },
  { name: 'Cumin seeds', quantity: '50', unit: 'g' },
  { name: 'Coriander powder', quantity: '50', unit: 'g' },
  { name: 'Ginger', quantity: '100', unit: 'g' },
  { name: 'Garlic', quantity: '2', unit: 'bulbs' },
  { name: 'Green chilli', quantity: '100', unit: 'g' },
  { name: 'Lemon', quantity: '4', unit: 'pieces' },
];

function normalize(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Build grocery list from diet chart (no AI).
 * @param {object} dietChart - breakfast, lunch, dinner, etc.
 * @returns {{ ok: true, data: { items: Array<{ name, quantity, unit }> } }}
 */
export function generateGroceryListRuleBased(dietChart) {
  const chart = dietChart && typeof dietChart === 'object' ? dietChart : {};
  const mealText = [
    chart.breakfast,
    chart.mid_snack,
    chart.lunch,
    chart.evening_snack,
    chart.dinner,
  ]
    .filter(Boolean)
    .map((m) => normalize(m))
    .join(' ');

  const seen = new Set();
  const items = [];

  for (const { keywords, name, quantity, unit } of INGREDIENT_MAP) {
    const matched = keywords.some((kw) => mealText.includes(kw));
    if (matched && !seen.has(name)) {
      seen.add(name);
      items.push({
        name,
        quantity: quantity ?? '—',
        unit: unit ?? '',
      });
    }
  }

  for (const s of STAPLES) {
    const name = s.name ?? 'Item';
    if (!seen.has(name)) {
      seen.add(name);
      items.push({
        name,
        quantity: s.quantity ?? '—',
        unit: s.unit ?? '',
      });
    }
  }

  const out = items.slice(0, 50).map((i) => ({
    name: String(i.name ?? '').trim() || 'Item',
    quantity: String(i.quantity ?? '').trim() || '—',
    unit: String(i.unit ?? '').trim() || '',
  }));

  return { ok: true, data: { items: out } };
}
