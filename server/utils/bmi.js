/**
 * BMI calculation and category.
 */

export function calculateBmi(weightKg, heightCm) {
  const w = Number(weightKg) > 0 ? Number(weightKg) : 0;
  const h = Number(heightCm) > 0 ? Number(heightCm) : 0;
  if (h === 0 || w === 0) return 0;
  const heightM = h / 100;
  return w / (heightM * heightM);
}

export function bmiCategory(bmi) {
  const v = Number(bmi);
  if (v <= 0) return 'unknown';
  if (v < 18.5) return 'Underweight';
  if (v < 25) return 'Normal';
  if (v < 30) return 'Overweight';
  return 'Obese';
}
