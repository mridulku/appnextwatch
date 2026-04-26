import { getSupabaseClient } from '../integrations/supabase';

function getClientOrThrow() {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client not configured');
  return client;
}

function toDecimal(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Number(parsed.toFixed(1));
}

function sortByName(list) {
  return [...(list || [])].sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
}

function convertToBasisAmount(amount, unit, basisUnit) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount)) return null;

  const normalizedUnit = String(unit || '').trim().toLowerCase();
  const normalizedBasis = String(basisUnit || '').trim().toLowerCase();
  if (!normalizedUnit || !normalizedBasis) return null;
  if (normalizedUnit === normalizedBasis) return numericAmount;

  if (normalizedUnit === 'kg' && normalizedBasis === 'g') return numericAmount * 1000;
  if (normalizedUnit === 'g' && normalizedBasis === 'kg') return numericAmount / 1000;
  if (normalizedUnit === 'litre' && normalizedBasis === 'ml') return numericAmount * 1000;
  if (normalizedUnit === 'ml' && normalizedBasis === 'litre') return numericAmount / 1000;

  return null;
}

function getStepSize(unit) {
  switch (String(unit || '').toLowerCase()) {
    case 'kg':
    case 'litre':
      return 0.1;
    case 'g':
    case 'ml':
      return 10;
    case 'pcs':
      return 1;
    case 'bunch':
      return 0.5;
    default:
      return 1;
  }
}

export function getUnitOptions(unitType) {
  const normalized = String(unitType || '').trim().toLowerCase();
  if (normalized === 'kg' || normalized === 'g') return ['g', 'kg'];
  if (normalized === 'ml' || normalized === 'litre') return ['ml', 'litre'];
  if (normalized === 'pcs') return ['pcs'];
  if (normalized === 'bunch') return ['bunch'];
  return [normalized || 'pcs'];
}

export function getDefaultAmountForIngredient(ingredient) {
  const basisAmount = Number(ingredient?.nutritionBasisAmount);
  if (Number.isFinite(basisAmount) && basisAmount > 0) return basisAmount;
  const basisUnit = String(ingredient?.nutritionBasisUnit || ingredient?.unitType || '').toLowerCase();
  if (basisUnit === 'pcs') return 1;
  if (basisUnit === 'bunch') return 0.5;
  return 100;
}

export function computeIngredientContribution(ingredientRow) {
  const basisAmount = Number(ingredientRow?.nutritionBasisAmount || 0);
  const convertedAmount = convertToBasisAmount(
    ingredientRow?.amount,
    ingredientRow?.unit,
    ingredientRow?.nutritionBasisUnit,
  );

  if (!basisAmount || convertedAmount === null) {
    return {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      computable: false,
    };
  }

  const scale = convertedAmount / basisAmount;
  return {
    calories: Math.round(Number(ingredientRow?.caloriesPerBasis || 0) * scale),
    protein: toDecimal(Number(ingredientRow?.proteinPerBasis || 0) * scale),
    carbs: toDecimal(Number(ingredientRow?.carbsPerBasis || 0) * scale),
    fat: toDecimal(Number(ingredientRow?.fatPerBasis || 0) * scale),
    computable: true,
  };
}

export function computeDishNutrition(ingredientRows, servings = 1) {
  const totals = (ingredientRows || []).reduce(
    (acc, ingredient) => {
      const contribution = computeIngredientContribution(ingredient);
      return {
        calories: acc.calories + contribution.calories,
        protein: toDecimal(acc.protein + contribution.protein),
        carbs: toDecimal(acc.carbs + contribution.carbs),
        fat: toDecimal(acc.fat + contribution.fat),
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const safeServings = Math.max(1, Number(servings) || 1);
  return {
    totalCalories: totals.calories,
    totalProtein: totals.protein,
    totalCarbs: totals.carbs,
    totalFat: totals.fat,
    caloriesPerServing: Math.round(totals.calories / safeServings),
    proteinPerServing: toDecimal(totals.protein / safeServings),
    carbsPerServing: toDecimal(totals.carbs / safeServings),
    fatPerServing: toDecimal(totals.fat / safeServings),
  };
}

function mapIngredientRow(row) {
  const ingredient = row?.catalog_ingredient || {};
  const mapped = {
    id: row.id,
    ingredientId: row.ingredient_id,
    name: ingredient.name || 'Ingredient',
    category: ingredient.category || 'Other',
    amount: Number(row.amount || 0),
    unit: row.unit || ingredient.unit_type || 'g',
    unitType: ingredient.unit_type || 'g',
    nutritionBasisAmount: Number(ingredient.nutrition_basis_amount || 0),
    nutritionBasisUnit: ingredient.nutrition_basis_unit || ingredient.unit_type || 'g',
    caloriesPerBasis: Number(ingredient.calories_kcal || 0),
    proteinPerBasis: Number(ingredient.protein_g || 0),
    carbsPerBasis: Number(ingredient.carbs_g || 0),
    fatPerBasis: Number(ingredient.fat_g || 0),
  };

  return {
    ...mapped,
    contribution: computeIngredientContribution(mapped),
    unitOptions: getUnitOptions(mapped.unitType),
    stepSize: getStepSize(mapped.unit),
  };
}

function mapDishRow(row) {
  const ingredients = sortByName((row?.catalog_recipe_ingredients || []).map(mapIngredientRow));
  const servings = Math.max(1, Number(row?.servings || 1));
  const totals = computeDishNutrition(ingredients, servings);

  return {
    id: row.id,
    name: row.name || 'Dish',
    mealType: row.meal_type || 'Other',
    servings,
    totalMinutes: row.total_minutes || null,
    difficulty: row.difficulty || null,
    ingredients,
    ...totals,
  };
}

export async function listCatalogDishes() {
  const client = getClientOrThrow();
  const response = await client
    .from('catalog_recipes')
    .select(`
      id,
      name,
      meal_type,
      servings,
      total_minutes,
      difficulty,
      catalog_recipe_ingredients(
        id,
        ingredient_id,
        amount,
        unit,
        catalog_ingredient:catalog_ingredients(
          id,
          name,
          category,
          unit_type,
          calories_kcal,
          protein_g,
          carbs_g,
          fat_g,
          nutrition_basis_amount,
          nutrition_basis_unit
        )
      )
    `)
    .order('meal_type', { ascending: true })
    .order('name', { ascending: true });

  if (response.error) throw response.error;
  return (response.data || []).map(mapDishRow);
}

export async function getCatalogDishById(dishId) {
  const client = getClientOrThrow();
  const response = await client
    .from('catalog_recipes')
    .select(`
      id,
      name,
      meal_type,
      servings,
      total_minutes,
      difficulty,
      catalog_recipe_ingredients(
        id,
        ingredient_id,
        amount,
        unit,
        catalog_ingredient:catalog_ingredients(
          id,
          name,
          category,
          unit_type,
          calories_kcal,
          protein_g,
          carbs_g,
          fat_g,
          nutrition_basis_amount,
          nutrition_basis_unit
        )
      )
    `)
    .eq('id', dishId);

  if (response.error) throw response.error;
  if (!response.data?.length) throw new Error('Dish not found.');
  return mapDishRow(response.data[0]);
}

export async function listDishIngredientsCatalog({ search = '' } = {}) {
  const client = getClientOrThrow();
  let query = client
    .from('catalog_ingredients')
    .select('id,name,category,unit_type,calories_kcal,protein_g,carbs_g,fat_g,nutrition_basis_amount,nutrition_basis_unit')
    .order('name', { ascending: true });

  const normalizedSearch = String(search || '').trim();
  if (normalizedSearch) {
    query = query.ilike('name', `%${normalizedSearch}%`);
  }

  const response = await query;
  if (response.error) throw response.error;
  return (response.data || []).map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category || 'Other',
    unitType: row.unit_type || 'g',
    nutritionBasisAmount: Number(row.nutrition_basis_amount || 0),
    nutritionBasisUnit: row.nutrition_basis_unit || row.unit_type || 'g',
    caloriesPerBasis: Number(row.calories_kcal || 0),
    proteinPerBasis: Number(row.protein_g || 0),
    carbsPerBasis: Number(row.carbs_g || 0),
    fatPerBasis: Number(row.fat_g || 0),
    unitOptions: getUnitOptions(row.unit_type),
  }));
}

export async function updateDishDefinition({ dishId, name, mealType, servings, ingredients }) {
  const client = getClientOrThrow();
  const safeServings = Math.max(1, Number(servings) || 1);
  const normalizedIngredients = (ingredients || [])
    .filter((item) => item?.ingredientId)
    .map((item) => ({
      ingredientId: item.ingredientId,
      amount: Number(item.amount || 0),
      unit: item.unit,
      caloriesPerBasis: item.caloriesPerBasis,
      proteinPerBasis: item.proteinPerBasis,
      carbsPerBasis: item.carbsPerBasis,
      fatPerBasis: item.fatPerBasis,
      nutritionBasisAmount: item.nutritionBasisAmount,
      nutritionBasisUnit: item.nutritionBasisUnit,
    }))
    .filter((item) => item.amount > 0);

  const totals = computeDishNutrition(normalizedIngredients, safeServings);

  const recipeUpdate = await client
    .from('catalog_recipes')
    .update({
      name,
      meal_type: mealType,
      servings: safeServings,
      calories_kcal: totals.caloriesPerServing,
      protein_g: totals.proteinPerServing,
      carbs_g: totals.carbsPerServing,
      fat_g: totals.fatPerServing,
    })
    .eq('id', dishId)
    .select('id');

  if (recipeUpdate.error) throw recipeUpdate.error;
  if (!recipeUpdate.data?.length) throw new Error('Dish could not be updated.');

  const deleted = await client.from('catalog_recipe_ingredients').delete().eq('recipe_id', dishId);
  if (deleted.error) throw deleted.error;

  if (normalizedIngredients.length) {
    const inserted = await client.from('catalog_recipe_ingredients').insert(
      normalizedIngredients.map((item) => ({
        recipe_id: dishId,
        ingredient_id: item.ingredientId,
        amount: item.amount,
        unit: item.unit,
      })),
    );
    if (inserted.error) throw inserted.error;
  }

  return getCatalogDishById(dishId);
}
