import { getSupabaseClient } from '../integrations/supabase';

function getClientOrThrow() {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client not configured');
  return client;
}

export async function listCatalogItems({
  table,
  select,
  orderBy = 'name',
  ascending = true,
}) {
  const client = getClientOrThrow();
  const response = await client
    .from(table)
    .select(select)
    .order(orderBy, { ascending });

  if (response.error) throw response.error;
  return response.data ?? [];
}

export async function listUserSelections({
  table,
  userId,
  select,
  orderBy = 'created_at',
  ascending = true,
}) {
  const client = getClientOrThrow();
  const response = await client
    .from(table)
    .select(select)
    .eq('user_id', userId)
    .order(orderBy, { ascending });

  if (response.error) throw response.error;
  return response.data ?? [];
}

export async function addUserSelection({
  table,
  userId,
  fkColumn,
  fkValue,
  payload = {},
}) {
  const client = getClientOrThrow();

  const existing = await client
    .from(table)
    .select('id')
    .eq('user_id', userId)
    .eq(fkColumn, fkValue)
    .maybeSingle();

  if (existing.error) throw existing.error;
  if (existing.data?.id) return { mode: 'already', id: existing.data.id };

  const response = await client
    .from(table)
    .insert({ user_id: userId, [fkColumn]: fkValue, ...payload })
    .select('id')
    .single();

  if (response.error) throw response.error;
  return { mode: 'inserted', id: response.data?.id };
}

export async function getNextUserSelectionSortOrder({
  table,
  userId,
}) {
  const client = getClientOrThrow();
  const response = await client
    .from(table)
    .select('sort_order')
    .eq('user_id', userId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (response.error) throw response.error;
  return Number(response.data?.sort_order || 0) + 1;
}

export async function removeUserSelection({
  table,
  userId,
  fkColumn,
  fkValue,
}) {
  const client = getClientOrThrow();
  const response = await client
    .from(table)
    .delete()
    .eq('user_id', userId)
    .eq(fkColumn, fkValue);

  if (response.error) throw response.error;
  return true;
}

export async function hasUserSelection({
  table,
  userId,
  fkColumn,
  fkValue,
}) {
  const client = getClientOrThrow();
  const response = await client
    .from(table)
    .select('id')
    .eq('user_id', userId)
    .eq(fkColumn, fkValue)
    .maybeSingle();

  if (response.error) throw response.error;
  return Boolean(response.data?.id);
}

export async function updateUserSelectionSortOrder({
  table,
  rowId,
  sortOrder,
}) {
  const client = getClientOrThrow();
  const response = await client
    .from(table)
    .update({ sort_order: sortOrder })
    .eq('id', rowId)
    .select('id')
    .single();

  if (response.error) throw response.error;
  return response.data;
}
