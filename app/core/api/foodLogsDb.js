import { getSupabaseClient } from '../integrations/supabase';
import { computeDishNutrition, listCatalogDishes } from './foodDishesDb';

function getClientOrThrow() {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client not configured');
  return client;
}

function toInt(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.round(parsed);
}

function toServings(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 1;
  return Math.max(0.5, Math.round(parsed * 2) / 2);
}

function normalizeMealSlot(value) {
  const normalized = String(value || '').trim();
  if (normalized === 'Lunch / Dinner' || normalized === 'Lunch' || normalized === 'Dinner') {
    return normalized === 'Dinner' ? 'Dinner' : 'Lunch';
  }
  if (normalized === 'Breakfast' || normalized === 'Snacks' || normalized === 'Other') {
    return normalized;
  }
  return 'Other';
}

function toDecimal(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Number(parsed.toFixed(1));
}

function sortByNumberKey(list, key) {
  return [...(list || [])].sort((a, b) => Number(a?.[key] || 0) - Number(b?.[key] || 0));
}

function mapSnapshotIngredientRow(row) {
  return {
    id: row.id,
    ingredientId: row.ingredient_id,
    name: row?.catalog_ingredient?.name || 'Ingredient',
    category: row?.catalog_ingredient?.category || 'Other',
    amount: Number(row?.amount || 0),
    unit: row?.unit || row?.nutrition_basis_unit || row?.catalog_ingredient?.unit_type || 'g',
    nutritionBasisAmount: Number(row?.nutrition_basis_amount || 0),
    nutritionBasisUnit: row?.nutrition_basis_unit || row?.catalog_ingredient?.unit_type || 'g',
    caloriesPerBasis: Number(row?.calories_kcal || 0),
    proteinPerBasis: Number(row?.protein_g || 0),
    carbsPerBasis: Number(row?.carbs_g || 0),
    fatPerBasis: Number(row?.fat_g || 0),
  };
}

function mapRecipeIngredientRow(row) {
  return {
    amount: row?.amount,
    unit: row?.unit,
    ingredientId: row?.ingredient_id,
    name: row?.catalog_ingredient?.name || 'Ingredient',
    category: row?.catalog_ingredient?.category || 'Other',
    caloriesPerBasis: row?.catalog_ingredient?.calories_kcal,
    proteinPerBasis: row?.catalog_ingredient?.protein_g,
    carbsPerBasis: row?.catalog_ingredient?.carbs_g,
    fatPerBasis: row?.catalog_ingredient?.fat_g,
    nutritionBasisAmount: row?.catalog_ingredient?.nutrition_basis_amount,
    nutritionBasisUnit: row?.catalog_ingredient?.nutrition_basis_unit,
  };
}

function computeSnapshotTotals(ingredients, servings) {
  const computed = computeDishNutrition(ingredients, servings || 1);
  const caloriesPerServing = toInt(computed.caloriesPerServing, 0);
  const proteinPerServing = toDecimal(computed.proteinPerServing, 0);
  const carbsPerServing = toDecimal(computed.carbsPerServing, 0);
  const fatPerServing = toDecimal(computed.fatPerServing, 0);
  const safeServings = Number(servings || 1);
  return {
    caloriesPerServing,
    proteinPerServing,
    carbsPerServing,
    fatPerServing,
    totalCalories: Math.round(caloriesPerServing * safeServings),
    totalProtein: Number((proteinPerServing * safeServings).toFixed(1)),
    totalCarbs: Number((carbsPerServing * safeServings).toFixed(1)),
    totalFat: Number((fatPerServing * safeServings).toFixed(1)),
  };
}

function sanitizeIngredientSnapshot(item, index) {
  return {
    ingredientId: item.ingredientId,
    amount: Number(item.amount || 0),
    unit: item.unit,
    caloriesPerBasis: Number(item.caloriesPerBasis || 0),
    proteinPerBasis: Number(item.proteinPerBasis || 0),
    carbsPerBasis: Number(item.carbsPerBasis || 0),
    fatPerBasis: Number(item.fatPerBasis || 0),
    nutritionBasisAmount: Number(item.nutritionBasisAmount || 0),
    nutritionBasisUnit: item.nutritionBasisUnit || item.unit,
    sortOrder: index + 1,
  };
}

function mapLogRow(row) {
  const items = sortByNumberKey(row?.user_food_log_items || [], 'sort_order').map((item) => {
    const recipe = item?.catalog_recipe || null;
    const servings = Number(item?.servings || 1);
    const snapshotIngredients = sortByNumberKey(item?.user_food_log_item_ingredients || [], 'sort_order').map(mapSnapshotIngredientRow);
    const recipeIngredients = (recipe?.catalog_recipe_ingredients || []).map(mapRecipeIngredientRow);
    const ingredients = snapshotIngredients.length ? snapshotIngredients : recipeIngredients;
    const totals = computeSnapshotTotals(ingredients, servings);
    return {
      id: item.id,
      recipeId: item.recipe_id,
      name: recipe?.name || 'Dish',
      mealType: normalizeMealSlot(item?.meal_slot || recipe?.meal_type || 'Other'),
      difficulty: recipe?.difficulty || null,
      totalMinutes: recipe?.total_minutes || null,
      servings,
      ingredients,
      ...totals,
      sortOrder: Number(item?.sort_order || 0),
    };
  });

  return {
    id: row.id,
    dateISO: row.log_date,
    totalCalories: items.reduce((sum, item) => sum + Number(item.totalCalories || 0), 0),
    itemCount: items.length,
    items,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listUserFoodLogs(userId) {
  const client = getClientOrThrow();
  const response = await client
    .from('user_food_logs')
    .select(`
      id,
      user_id,
      log_date,
      total_calories,
      created_at,
      updated_at,
      user_food_log_items(
        id,
        recipe_id,
        meal_slot,
        servings,
        sort_order,
        user_food_log_item_ingredients(
          id,
          ingredient_id,
          amount,
          unit,
          calories_kcal,
          protein_g,
          carbs_g,
          fat_g,
          nutrition_basis_amount,
          nutrition_basis_unit,
          sort_order,
          catalog_ingredient:catalog_ingredients!user_food_log_item_ingredients_ingredient_id_fkey(
            id,
            name,
            category,
            unit_type
          )
        ),
        catalog_recipe:catalog_recipes(
          id,
          name,
          meal_type,
          servings,
          total_minutes,
          difficulty,
          catalog_recipe_ingredients(
            id,
            amount,
            unit,
            catalog_ingredient:catalog_ingredients(
              id,
              calories_kcal,
              protein_g,
              carbs_g,
              fat_g,
              nutrition_basis_amount,
              nutrition_basis_unit
            )
          )
        )
      )
    `)
    .eq('user_id', userId)
    .order('log_date', { ascending: false });

  if (response.error) throw response.error;
  return (response.data || []).map(mapLogRow);
}

export async function getUserFoodLogByDate(userId, dateISO) {
  const client = getClientOrThrow();
  const response = await client
    .from('user_food_logs')
    .select(`
      id,
      user_id,
      log_date,
      total_calories,
      created_at,
      updated_at,
      user_food_log_items(
        id,
        recipe_id,
        meal_slot,
        servings,
        sort_order,
        user_food_log_item_ingredients(
          id,
          ingredient_id,
          amount,
          unit,
          calories_kcal,
          protein_g,
          carbs_g,
          fat_g,
          nutrition_basis_amount,
          nutrition_basis_unit,
          sort_order,
          catalog_ingredient:catalog_ingredients!user_food_log_item_ingredients_ingredient_id_fkey(
            id,
            name,
            category,
            unit_type
          )
        ),
        catalog_recipe:catalog_recipes(
          id,
          name,
          meal_type,
          servings,
          total_minutes,
          difficulty,
          catalog_recipe_ingredients(
            id,
            amount,
            unit,
            catalog_ingredient:catalog_ingredients(
              id,
              calories_kcal,
              protein_g,
              carbs_g,
              fat_g,
              nutrition_basis_amount,
              nutrition_basis_unit
            )
          )
        )
      )
    `)
    .eq('user_id', userId)
    .eq('log_date', dateISO)
    .maybeSingle();

  if (response.error) throw response.error;
  return response.data ? mapLogRow(response.data) : null;
}

export async function listLoggableDishes() {
  const dishes = await listCatalogDishes();
  return dishes.map((dish) => ({
    recipeId: dish.id,
    name: dish.name,
    mealType: normalizeMealSlot(dish.mealType),
    totalMinutes: dish.totalMinutes,
    difficulty: dish.difficulty,
    caloriesPerServing: toInt(dish.caloriesPerServing, 0),
    proteinPerServing: toDecimal(dish.proteinPerServing, 0),
    carbsPerServing: toDecimal(dish.carbsPerServing, 0),
    fatPerServing: toDecimal(dish.fatPerServing, 0),
    ingredients: dish.ingredients || [],
  }));
}

export async function saveFoodLog({ userId, dateISO, items }) {
  const client = getClientOrThrow();
  const sanitizedItems = (items || []).map((item, index) => ({
    recipeId: item.recipeId,
    mealSlot: normalizeMealSlot(item.mealType),
    servings: toServings(item.servings),
    sortOrder: index + 1,
    caloriesPerServing: toInt(item.caloriesPerServing, 0),
    proteinPerServing: toDecimal(item.proteinPerServing, 0),
    carbsPerServing: toDecimal(item.carbsPerServing, 0),
    fatPerServing: toDecimal(item.fatPerServing, 0),
    ingredients: (item.ingredients || []).map(sanitizeIngredientSnapshot).filter((ingredient) => ingredient.ingredientId && ingredient.amount > 0),
  })).filter((item) => item.recipeId);

  const totalCalories = sanitizedItems.reduce(
    (sum, item) => {
      const totals = computeSnapshotTotals(item.ingredients, item.servings);
      return sum + totals.totalCalories;
    },
    0,
  );

  const existing = await client
    .from('user_food_logs')
    .select('id')
    .eq('user_id', userId)
    .eq('log_date', dateISO)
    .maybeSingle();

  if (existing.error) throw existing.error;

  if (!sanitizedItems.length) {
    if (existing.data?.id) {
      const deleted = await client.from('user_food_logs').delete().eq('id', existing.data.id);
      if (deleted.error) throw deleted.error;
    }
    return null;
  }

  let logId = existing.data?.id || null;
  if (logId) {
    const updated = await client
      .from('user_food_logs')
      .update({ total_calories: totalCalories })
      .eq('id', logId)
      .select('id')
      .single();
    if (updated.error) throw updated.error;
  } else {
    const inserted = await client
      .from('user_food_logs')
      .insert({ user_id: userId, log_date: dateISO, total_calories: totalCalories })
      .select('id')
      .single();
    if (inserted.error) throw inserted.error;
    logId = inserted.data.id;
  }

  const deletedItems = await client.from('user_food_log_items').delete().eq('food_log_id', logId);
  if (deletedItems.error) throw deletedItems.error;

  const insertRows = sanitizedItems.map((item) => ({
    user_id: userId,
    food_log_id: logId,
    recipe_id: item.recipeId,
    meal_slot: item.mealSlot,
    servings: item.servings,
    sort_order: item.sortOrder,
  }));

  const insertedItems = await client
    .from('user_food_log_items')
    .insert(insertRows)
    .select('id, recipe_id, sort_order');
  if (insertedItems.error) throw insertedItems.error;

  const ingredientRows = [];
  (insertedItems.data || []).forEach((insertedItem) => {
    const matching = sanitizedItems.find((item) => item.recipeId === insertedItem.recipe_id && item.sortOrder === insertedItem.sort_order);
    (matching?.ingredients || []).forEach((ingredient) => {
      ingredientRows.push({
        user_id: userId,
        food_log_item_id: insertedItem.id,
        ingredient_id: ingredient.ingredientId,
        amount: ingredient.amount,
        unit: ingredient.unit,
        calories_kcal: ingredient.caloriesPerBasis,
        protein_g: ingredient.proteinPerBasis,
        carbs_g: ingredient.carbsPerBasis,
        fat_g: ingredient.fatPerBasis,
        nutrition_basis_amount: ingredient.nutritionBasisAmount,
        nutrition_basis_unit: ingredient.nutritionBasisUnit,
        sort_order: ingredient.sortOrder,
      });
    });
  });

  if (ingredientRows.length) {
    const insertedSnapshots = await client.from('user_food_log_item_ingredients').insert(ingredientRows);
    if (insertedSnapshots.error) throw insertedSnapshots.error;
  }

  return getUserFoodLogByDate(userId, dateISO);
}
