/**
 * Validate and normalize user health payload for diet generation.
 */

const GENDERS = ['male', 'female', 'other'];
const ACTIVITY = ['low', 'medium', 'high'];
const DIET = ['veg', 'non-veg', 'vegan'];
const CONDITIONS = [
  'diabetes',
  'hypertension',
  'pcos',
  'thyroid',
  'high_cholesterol',
  'anemia',
  'obesity',
  'underweight',
  'none',
];
const GOALS = ['weight loss', 'weight gain', 'muscle gain'];

export function validateUserHealthPayload(payload) {
  const errors = [];
  const p = payload ?? {};

  const name = String(p.name ?? '').trim();
  if (!name) errors.push('Name is required.');

  const age = parseInt(p.age, 10);
  if (Number.isNaN(age) || age < 5 || age > 120) {
    errors.push('Age must be between 5 and 120.');
  }

  const gender = String(p.gender ?? '').toLowerCase().trim();
  if (!GENDERS.includes(gender)) errors.push('Gender must be male, female, or other.');

  const height = parseFloat(p.height);
  if (Number.isNaN(height) || height < 100 || height > 250) {
    errors.push('Height must be between 100 and 250 cm.');
  }

  const weight = parseFloat(p.weight);
  if (Number.isNaN(weight) || weight < 20 || weight > 300) {
    errors.push('Weight must be between 20 and 300 kg.');
  }

  const activityLevel = String(p.activity_level ?? '').toLowerCase().trim();
  if (!ACTIVITY.includes(activityLevel)) {
    errors.push('Activity level must be low, medium, or high.');
  }

  const dietPreference = String(p.diet_preference ?? '').toLowerCase().trim();
  if (!DIET.includes(dietPreference)) {
    errors.push('Diet preference must be veg, non-veg, or vegan.');
  }

  let healthConditions = p.health_conditions;
  if (typeof healthConditions === 'string') {
    healthConditions = [healthConditions.toLowerCase().trim()];
  }
  if (!Array.isArray(healthConditions)) healthConditions = ['none'];
  const normalizedConditions = healthConditions
    .map((c) => String(c).toLowerCase().trim())
    .filter((c) => CONDITIONS.includes(c) && c !== 'none');
  if (normalizedConditions.length === 0) normalizedConditions.push('none');

  const goal = String(p.goal ?? '').toLowerCase().trim();
  if (!GOALS.includes(goal)) {
    errors.push('Goal must be weight loss, weight gain, or muscle gain.');
  }

  if (errors.length > 0) {
    return { valid: false, errors, data: null };
  }

  return {
    valid: true,
    errors: [],
    data: {
      name,
      age: Number(age),
      gender,
      height: Number(height),
      weight: Number(weight),
      activity_level: activityLevel,
      diet_preference: dietPreference,
      health_conditions: normalizedConditions,
      goal,
    },
  };
}
