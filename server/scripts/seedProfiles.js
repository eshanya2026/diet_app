/**
 * Seed 8 detailed demo user profiles with history.
 * Run from server/: npm run seed-profiles
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { getDb } from '../config/db.js';
import { SAMPLE_PROFILES } from '../data/sampleProfiles.js';
import { generateRuleBasedDiet, getTargetCalories } from '../utils/dietGenerator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../.env') });
config({ path: resolve(__dirname, '../.env') });

const SALT_ROUNDS = 10;

async function createUserWithHistory(db, profile) {
  const users = db.collection('users');
  const plans = db.collection('diet_plans');
  const complianceCol = db.collection('diet_compliance');

  const email = String(profile.email ?? '').trim().toLowerCase();
  if (!email) return null;

  let user = await users.findOne({ email });
  if (!user) {
    const password_hash = await bcrypt.hash(profile.password, SALT_ROUNDS);
    const doc = {
      name: profile.name,
      email,
      password_hash,
      age: profile.age ?? 0,
      gender: profile.gender ?? '',
      height: profile.height ?? 0,
      weight: profile.weight ?? 0,
      diet_preference: profile.diet_preference ?? '',
      goal: profile.goal ?? '',
      created_at: new Date(),
    };
    const res = await users.insertOne(doc);
    user = await users.findOne({ _id: res.insertedId });
  }
  if (!user?._id) return null;

  const userId = user._id;

  // create 3 plans over last 3 weeks with simple rule-based chart
  const today = new Date();
  for (let i = 0; i < 3; i += 1) {
    const createdAt = new Date(today);
    createdAt.setDate(today.getDate() - (7 * i));
    const data = {
      name: profile.name,
      age: profile.age,
      gender: profile.gender,
      height: profile.height,
      weight: profile.weight,
      activity_level: 'medium',
      diet_preference: profile.diet_preference,
      health_conditions: profile.health_conditions,
      goal: profile.goal,
    };
    const targetCal = getTargetCalories(data);
    const dietChart = generateRuleBasedDiet(data, targetCal, i);
    const planDoc = {
      user_id: userId,
      bmi: 0,
      diet_chart: dietChart,
      suggestions: dietChart.suggestions ?? [],
      calories: dietChart.calories ?? null,
      diet_score: null,
      goal: profile.goal ?? null,
      created_at: createdAt,
    };
    const planRes = await plans.insertOne(planDoc);

    // add a few compliance logs for each plan
    const planId = planRes.insertedId;
    for (let d = 0; d < 3; d += 1) {
      const logDate = new Date(createdAt);
      logDate.setDate(createdAt.getDate() + d);
      const yyyy = logDate.getFullYear();
      const mm = String(logDate.getMonth() + 1).padStart(2, '0');
      const dd = String(logDate.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      await complianceCol.insertOne({
        user_id: userId,
        plan_id: planId,
        log_date: dateStr,
        meals: {
          breakfast: true,
          mid_snack: d % 2 === 0,
          lunch: true,
          evening_snack: d % 2 === 1,
          dinner: true,
        },
        created_at: new Date(),
      });
    }
  }

  return user;
}

async function run() {
  try {
    const db = await getDb();
    for (const profile of SAMPLE_PROFILES) {
      // eslint-disable-next-line no-await-in-loop
      await createUserWithHistory(db, profile);
    }
    const count = await db.collection('users').countDocuments({ email: { $exists: true, $ne: '' } });
    console.log(`Profile seed complete. Total auth users: ${count}`);
    process.exit(0);
  } catch (err) {
    console.error('Seed profiles failed:', err?.message ?? err);
    process.exit(1);
  }
}

run();

