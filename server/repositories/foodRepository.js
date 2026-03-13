/**
 * Food/dish collection: Indian dishes with metadata for diet generation.
 * Filter by cuisine, meal_type, health condition, diet preference.
 */

import { getDb } from '../config/db.js';

const COLLECTION = 'foods';

export async function getFoodsCollection() {
  const db = await getDb();
  return db.collection(COLLECTION);
}

/**
 * Find dishes matching filters. All filters optional.
 * @param {object} opts - { cuisine, meal_type, condition, diet_preference }
 * @returns {Promise<Array>} - Array of food documents
 */
export async function findFiltered(opts = {}) {
  const col = await getFoodsCollection();
  const filter = {};

  const cuisine = String(opts.cuisine ?? '').trim();
  if (cuisine && cuisine.toLowerCase() !== 'mixed' && cuisine.toLowerCase() !== 'any') {
    filter.cuisine = { $in: [cuisine, 'Mixed'] };
  }

  const mealType = String(opts.meal_type ?? '').trim();
  if (mealType) {
    filter.meal_type = mealType;
  }

  const condition = String(opts.condition ?? '').trim().toLowerCase();
  if (condition && condition !== 'none') {
    filter.conditions_allowed = condition;
    filter.conditions_avoid = { $nin: [condition] };
  }

  const diet = String(opts.diet_preference ?? 'veg').trim().toLowerCase();
  if (diet === 'veg') {
    filter.diet_type = 'veg';
  } else if (diet === 'non-veg') {
    // For non-veg users, Breakfast and Snack can include veg (e.g., Poha, Oats)
    // Lunch and Dinner remain strictly non-veg
    if (mealType === 'Breakfast' || mealType === 'Snack') {
      filter.diet_type = { $in: ['non-veg', 'veg'] };
    } else {
      filter.diet_type = 'non-veg';
    }
  } else if (diet === 'vegan') {
    filter.diet_type = 'vegan';
  }

  const cursor = col.find(filter);
  return cursor.toArray();
}

/**
 * Find one random dish matching filters. Uses aggregation $sample.
 */
export async function findOneRandom(opts = {}) {
  const col = await getFoodsCollection();
  const filter = {};

  const cuisine = String(opts.cuisine ?? '').trim();
  if (cuisine && cuisine.toLowerCase() !== 'mixed' && cuisine.toLowerCase() !== 'any') {
    filter.cuisine = { $in: [cuisine, 'Mixed'] };
  }
  const mealType = String(opts.meal_type ?? '').trim();
  if (mealType) filter.meal_type = mealType;
  const condition = String(opts.condition ?? '').trim().toLowerCase();
  if (condition && condition !== 'none') {
    filter.conditions_allowed = condition;
    filter.conditions_avoid = { $nin: [condition] };
  }
  const diet = String(opts.diet_preference ?? 'veg').trim().toLowerCase();
  if (diet === 'veg') {
    filter.diet_type = 'veg';
  } else if (diet === 'non-veg') {
    if (mealType === 'Breakfast' || mealType === 'Snack') {
      filter.diet_type = { $in: ['non-veg', 'veg'] };
    } else {
      filter.diet_type = 'non-veg';
    }
  } else if (diet === 'vegan') {
    filter.diet_type = 'vegan';
  }

  const pipeline = [{ $match: filter }, { $sample: { size: 1 } }];
  const result = await col.aggregate(pipeline).toArray();
  return result[0] ?? null;
}

/**
 * Insert many foods (for seeding). Idempotent: use name+meal_type+cuisine as unique key.
 */
export async function upsertManyFoods(foods) {
  const col = await getFoodsCollection();
  let inserted = 0;
  for (const doc of foods) {
    const key = {
      name: doc.name,
      meal_type: doc.meal_type,
      cuisine: doc.cuisine,
    };
    const update = {
      $set: {
        ...doc,
        updated_at: new Date(),
      },
    };
    const result = await col.updateOne(key, update, { upsert: true });
    if (result.upsertedCount) inserted += 1;
  }
  return inserted;
}

export async function countFoods() {
  const col = await getFoodsCollection();
  return col.countDocuments();
}
