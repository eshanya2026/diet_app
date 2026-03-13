/**
 * Seed the foods collection with Indian dishes. Run: node server/scripts/seedFoods.js
 * Requires MONGODB_URI (and MONGODB_DB_NAME) in server/.env.
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { upsertManyFoods, countFoods } from '../repositories/foodRepository.js';
import { INDIAN_DISHES } from '../data/indianDishesSeed.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../.env') });
config({ path: resolve(__dirname, '../.env') });

async function run() {
  try {
    const inserted = await upsertManyFoods(INDIAN_DISHES);
    const total = await countFoods();
    console.log(`Foods seed done. Upserted ${inserted} new, total documents: ${total}`);
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err?.message ?? err);
    process.exit(1);
  }
}

run();
