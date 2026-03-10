/**
 * Call Google Gemini API for diet chart generation with retries.
 * Uses JSON mode when supported; fallback: strip markdown and parse.
 */

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1/models';
const MAX_ATTEMPTS = 3;
const INITIAL_BACKOFF_MS = 500;

const CONDITION_RULES = {
  diabetes: 'Prefer low GI foods, small frequent meals, limit simple sugars and refined carbs.',
  bp: 'Keep sodium low; avoid excess salt, papad, pickles; include potassium-rich foods.',
  cholesterol: 'Limit ghee, fried foods, full-fat dairy; include oats, nuts, fibre.',
};

function getConditionRules(conditions) {
  const list = Array.isArray(conditions) ? conditions : [];
  return list
    .filter((c) => typeof c === 'string' && CONDITION_RULES[c.toLowerCase()])
    .map((c) => CONDITION_RULES[c.toLowerCase()])
    .join(' ');
}

export function buildDietPrompt(userData, bmi, bmiCategory) {
  const conditions = (userData.health_conditions ?? []).join(', ');
  const conditionRules = getConditionRules(userData.health_conditions);
  const disclaimer =
    'This is general dietary guidance only, not medical advice. User should consult a doctor for medical conditions.';

  return `You are a certified Indian dietician. Generate a personalized Indian diet chart.

${disclaimer}

User details:
- Name: ${userData.name ?? ''}
- Age: ${userData.age ?? 0}
- Gender: ${userData.gender ?? ''}
- Height (cm): ${userData.height ?? 0}
- Weight (kg): ${userData.weight ?? 0}
- Activity level: ${userData.activity_level ?? ''}
- Diet preference: ${userData.diet_preference ?? ''}
- Health conditions: ${conditions}
- Goal: ${userData.goal ?? ''}
- BMI: ${bmi} (${bmiCategory})
${conditionRules ? `\nCondition-specific rules to follow: ${conditionRules}` : ''}

Output ONLY valid JSON, no markdown or extra text. Use this exact schema (optional fields may be omitted):
{"breakfast":"","breakfast_time":"","breakfast_portion":"","mid_snack":"","mid_snack_time":"","lunch":"","lunch_time":"","lunch_portion":"","evening_snack":"","evening_snack_time":"","dinner":"","dinner_time":"","dinner_portion":"","calories":"","protein_g":0,"carbs_g":0,"fat_g":0,"suggestions":[""]}

Rules: Indian foods only; match diet preference and health conditions; concise text; suggest realistic meal times (e.g. 8:00 AM) and portion notes where helpful. Include protein_g, carbs_g, fat_g as integers (grams per day) that match the calories and meals.`;
}

function extractTextFromResponse(body) {
  const candidates = body?.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return '';
  const first = candidates[0];
  const parts = first?.content?.parts;
  if (!Array.isArray(parts) || parts.length === 0) return '';
  const text = parts[0]?.text;
  return typeof text === 'string' ? text : '';
}

async function sendGeminiRequest(url, apiKey, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) {
    return { ok: false, error: `Gemini API HTTP ${res.status}`, status: res.status };
  }

  let decoded;
  try {
    decoded = await res.json();
  } catch {
    return { ok: false, error: 'Invalid JSON response from Gemini.' };
  }

  const text = extractTextFromResponse(decoded);
  if (!text) return { ok: false, error: 'Gemini response missing text.' };

  let jsonStr = text.trim().replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '').trim();
  try {
    const diet = JSON.parse(jsonStr);
    return { ok: true, data: diet };
  } catch {
    return { ok: false, error: 'Gemini did not return valid diet JSON.' };
  }
}

export async function callGeminiForDiet(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL_NAME ?? 'gemini-2.5-flash';
  if (!apiKey) return { ok: false, error: 'Missing GEMINI_API_KEY' };

  const url = `${GEMINI_BASE}/${encodeURIComponent(model)}:generateContent`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 1024,
    },
  };

  let backoff = INITIAL_BACKOFF_MS;
  let lastResult;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let result;
    try {
      result = await sendGeminiRequest(url, apiKey, body);
    } catch (err) {
      result = { ok: false, error: err?.message ?? 'Network error calling Gemini.' };
    }
    lastResult = result;
    if (result.ok) return result;
    if (attempt === MAX_ATTEMPTS) return result;
    await new Promise((r) => setTimeout(r, backoff));
    backoff *= 2;
  }

  return lastResult ?? { ok: false, error: 'Unknown error calling Gemini.' };
}
