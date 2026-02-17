import { getSupabaseClient } from '../integrations/supabase';

function getClientOrThrow() {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client not configured');
  return client;
}

export async function getOrCreateAppUser({ username, name }) {
  const client = getClientOrThrow();
  const normalizedUsername = String(username || '').trim().toLowerCase();
  const normalizedName = String(name || '').trim() || 'User';

  if (!normalizedUsername) {
    throw new Error('Missing username for app user lookup');
  }

  const existing = await client
    .from('app_users')
    .select('id,username,name')
    .eq('username', normalizedUsername)
    .maybeSingle();

  if (existing.error) throw existing.error;
  if (existing.data?.id) return existing.data;

  const inserted = await client
    .from('app_users')
    .insert({ username: normalizedUsername, name: normalizedName })
    .select('id,username,name')
    .single();

  if (inserted.error) throw inserted.error;
  return inserted.data;
}

export async function listCatalogIngredients({ search = '', category = 'All' } = {}) {
  const client = getClientOrThrow();
  let query = client
    .from('catalog_ingredients')
    .select('id,name,category,unit_type')
    .order('name', { ascending: true });

  const normalizedSearch = String(search || '').trim();
  if (normalizedSearch) {
    query = query.ilike('name', `%${normalizedSearch}%`);
  }

  const normalizedCategory = String(category || 'All').trim();
  if (normalizedCategory && normalizedCategory !== 'All') {
    query = query.ilike('category', `%${normalizedCategory}%`);
  }

  const response = await query;
  if (response.error) throw response.error;
  return response.data ?? [];
}

// Backward-compatible alias for existing callsites.
export async function fetchCatalogIngredients() {
  return listCatalogIngredients({ search: '', category: 'All' });
}

export async function listUserIngredients(userId) {
  const client = getClientOrThrow();
  const response = await client
    .from('user_ingredients')
    .select('id,user_id,ingredient_id,custom_name,quantity,unit_type,low_stock_threshold,catalog_ingredient:catalog_ingredients(id,name,category,unit_type)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (response.error) throw response.error;
  return response.data ?? [];
}

export async function upsertUserIngredient({ userId, ingredientId, quantity }) {
  const client = getClientOrThrow();
  const numericQuantity = Number(quantity) || 0;
  if (numericQuantity <= 0) throw new Error('Quantity should be greater than 0');

  const catalogResponse = await client
    .from('catalog_ingredients')
    .select('id,unit_type')
    .eq('id', ingredientId)
    .single();
  if (catalogResponse.error) throw catalogResponse.error;

  const catalogUnit = catalogResponse.data?.unit_type || 'pcs';

  const existing = await client
    .from('user_ingredients')
    .select('id')
    .eq('user_id', userId)
    .eq('ingredient_id', ingredientId)
    .maybeSingle();
  if (existing.error) throw existing.error;

  if (existing.data?.id) {
    const updated = await client
      .from('user_ingredients')
      .update({ quantity: numericQuantity, unit_type: catalogUnit })
      .eq('id', existing.data.id)
      .select('id')
      .single();
    if (updated.error) throw updated.error;
    return { mode: 'update' };
  }

  const inserted = await client
    .from('user_ingredients')
    .insert({
      user_id: userId,
      ingredient_id: ingredientId,
      quantity: numericQuantity,
      unit_type: catalogUnit,
      low_stock_threshold: getDefaultThreshold(catalogUnit),
    })
    .select('id')
    .single();

  if (inserted.error) throw inserted.error;
  return { mode: 'insert' };
}

export async function updateUserIngredientQuantity({ rowId, quantity }) {
  const client = getClientOrThrow();
  const clamped = Math.max(0, Number(quantity) || 0);

  const response = await client
    .from('user_ingredients')
    .update({ quantity: clamped })
    .eq('id', rowId)
    .select('id,quantity')
    .single();

  if (response.error) throw response.error;
  return response.data;
}

export async function deleteUserIngredient({ userId, ingredientId }) {
  const client = getClientOrThrow();
  const response = await client
    .from('user_ingredients')
    .delete()
    .eq('user_id', userId)
    .eq('ingredient_id', ingredientId);

  if (response.error) throw response.error;
  return true;
}

function getDefaultThreshold(unitType) {
  if (unitType === 'kg' || unitType === 'litre') return 0.25;
  if (unitType === 'g' || unitType === 'ml') return 100;
  return 1;
}
