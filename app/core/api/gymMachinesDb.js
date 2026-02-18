import { getSupabaseClient } from '../integrations/supabase';

function getClientOrThrow() {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client not configured');
  return client;
}

export async function fetchCatalogMachines() {
  const client = getClientOrThrow();
  const response = await client
    .from('catalog_machines')
    .select('id,name,zone,primary_muscles')
    .order('name', { ascending: true });

  if (response.error) throw response.error;
  return response.data ?? [];
}

export async function fetchUserMachines(userId) {
  const client = getClientOrThrow();
  const response = await client
    .from('user_machines')
    .select('id,user_id,machine_id,is_active,notes,catalog_machine:catalog_machines(id,name,zone,primary_muscles)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (response.error) throw response.error;
  return response.data ?? [];
}

export async function addUserMachine(userId, machineId) {
  const client = getClientOrThrow();

  const existing = await client
    .from('user_machines')
    .select('id')
    .eq('user_id', userId)
    .eq('machine_id', machineId)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data?.id) return { mode: 'already' };

  const response = await client
    .from('user_machines')
    .insert({ user_id: userId, machine_id: machineId, is_active: true })
    .select('id')
    .single();

  if (response.error) throw response.error;
  return { mode: 'inserted' };
}

export async function removeUserMachine(userId, machineId) {
  const client = getClientOrThrow();
  const response = await client
    .from('user_machines')
    .delete()
    .eq('user_id', userId)
    .eq('machine_id', machineId);

  if (response.error) throw response.error;
  return true;
}
