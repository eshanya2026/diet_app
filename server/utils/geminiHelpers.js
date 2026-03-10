/**
 * Gemini API helpers for grocery list and meal swap. Uses same base as gemini.js.
 */

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1/models';

async function callGemini(prompt, responseSchema = 'application/json') {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false, error: 'Missing GEMINI_API_KEY' };
  const model = process.env.GEMINI_MODEL_NAME ?? 'gemini-2.5-flash';
  const url = `${GEMINI_BASE}/${encodeURIComponent(model)}:generateContent`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 1024,
    },
  };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const hint = errBody?.error?.message ?? errBody?.error?.status ?? '';
      return { ok: false, error: `Gemini API error (${res.status})${hint ? `: ${hint}` : ''}` };
    }
    const decoded = await res.json();
    const parts = decoded?.candidates?.[0]?.content?.parts;
    const text = parts?.[0]?.text;
    if (!text || typeof text !== 'string') return { ok: false, error: 'No text in response' };
    const cleaned = text.trim().replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '').trim();
    try {
      const data = JSON.parse(cleaned);
      return { ok: true, data };
    } catch {
      return { ok: false, error: 'Invalid JSON from Gemini' };
    }
  } catch (err) {
    return { ok: false, error: err?.message ?? 'Gemini request failed' };
  }
}

/**
 * Generate grocery list from diet chart.
 * @param {object} dietChart - breakfast, lunch, dinner, etc.
 * @returns {Promise<{ ok: boolean, data?: { items: Array<{ name, quantity, unit? }> }, error?: string }>}
 */
export async function generateGroceryList(dietChart) {
  const chart = dietChart && typeof dietChart === 'object' ? dietChart : {};
  const meals = [
    chart.breakfast,
    chart.mid_snack,
    chart.lunch,
    chart.evening_snack,
    chart.dinner,
  ].filter(Boolean).join('\n');
  const prompt = `You are helping create a grocery shopping list for an Indian diet plan.

Diet plan meals:
${meals || 'No meals provided.'}

Output ONLY a valid JSON object with this exact structure (no markdown, no extra text):
{"items":[{"name":"ingredient name","quantity":"amount","unit":"g or kg or pieces or cups etc"}]}

List common Indian grocery items needed to prepare these meals. Consolidate quantities (e.g. "2 cups rice" not "1 cup" twice). Use concise names. Include vegetables, grains, lentils, spices, and other staples. Maximum 40 items.`;
  const result = await callGemini(prompt);
  if (!result.ok) return result;
  const items = result.data?.items;
  if (!Array.isArray(items)) return { ok: false, error: 'Invalid grocery response shape' };
  return { ok: true, data: { items: items.slice(0, 50).map((i) => ({
    name: String(i?.name ?? '').trim() || 'Item',
    quantity: String(i?.quantity ?? '').trim() || '—',
    unit: String(i?.unit ?? '').trim() || '',
  })) } };
}

/**
 * Suggest one alternative meal for a slot.
 * @param {string} mealSlot - e.g. "lunch"
 * @param {string} currentMeal - current meal text
 * @param {string} [constraints] - e.g. "no rice, same calories"
 * @returns {Promise<{ ok: boolean, data?: { alternative_meal: string }, error?: string }>}
 */
export async function suggestMealSwap(mealSlot, currentMeal, constraints = '') {
  const prompt = `You are an Indian dietician. Suggest ONE alternative Indian meal.

Meal slot: ${mealSlot}
Current meal: ${currentMeal || 'Not specified'}
${constraints ? `Constraints: ${constraints}` : ''}

Output ONLY valid JSON, no markdown or extra text:
{"alternative_meal":"your suggested meal in one short paragraph, with portion if helpful"}`;
  const result = await callGemini(prompt);
  if (!result.ok) return result;
  const alt = result.data?.alternative_meal;
  if (typeof alt !== 'string') return { ok: false, error: 'Invalid swap response shape' };
  return { ok: true, data: { alternative_meal: alt.trim() || 'No suggestion.' } };
}
