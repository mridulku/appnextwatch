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

export async function fetchCatalogIngredients() {
  const client = getClientOrThrow();
  const response = await client
    .from('catalog_ingredients')
    .select('id,name,category,unit_type')
    .order('name', { ascending: true });

  if (response.error) throw response.error;
  return response.data ?? [];
}

export async function fetchUserInventoryRows(appUserId) {
  const client = getClientOrThrow();

  const response = await client
    .from('user_ingredients')
    .select('id,user_id,ingredient_id,custom_name,quantity,unit_type,low_stock_threshold,catalog_ingredient:catalog_ingredients(id,name,category,unit_type)')
    .eq('user_id', appUserId)
    .order('created_at', { ascending: true });

  if (response.error) throw response.error;
  return response.data ?? [];
}

export async function upsertUserIngredient({
  appUserId,
  ingredient,
  amount,
  unitType,
}) {
  const client = getClientOrThrow();

  const existing = await client
    .from('user_ingredients')
    .select('id,quantity,unit_type')
    .eq('user_id', appUserId)
    .eq('ingredient_id', ingredient.id)
    .maybeSingle();

  if (existing.error) throw existing.error;

  const numericAmount = Number(amount) || 0;
  if (numericAmount <= 0) throw new Error('Amount must be greater than 0');

  if (existing.data?.id) {
    const currentQty = Number(existing.data.quantity) || 0;
    const nextQty = currentQty + numericAmount;

    const updated = await client
      .from('user_ingredients')
      .update({
        quantity: nextQty,
        unit_type: unitType || existing.data.unit_type || ingredient.unit_type || 'pcs',
      })
      .eq('id', existing.data.id)
      .select('id')
      .single();

    if (updated.error) throw updated.error;
    return { mode: 'increment' };
  }

  const inserted = await client
    .from('user_ingredients')
    .insert({
      user_id: appUserId,
      ingredient_id: ingredient.id,
      quantity: numericAmount,
      unit_type: unitType || ingredient.unit_type || 'pcs',
      low_stock_threshold: getDefaultThreshold(unitType || ingredient.unit_type || 'pcs'),
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

function getDefaultThreshold(unitType) {
  if (unitType === 'kg' || unitType === 'litre') return 0.25;
  if (unitType === 'g' || unitType === 'ml') return 100;
  return 1;
}
