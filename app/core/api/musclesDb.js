import { getSupabaseClient } from '../integrations/supabase';

function getClientOrThrow() {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client not configured');
  return client;
}

export async function listMuscles() {
  const client = getClientOrThrow();
  const response = await client
    .from('muscles')
    .select('id,name,name_key,sort_order')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (response.error) throw response.error;
  return response.data ?? [];
}

export async function listMuscleSubgroups() {
  const client = getClientOrThrow();
  const response = await client
    .from('muscle_subgroups')
    .select('id,muscle_id,name,name_key,sort_order')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (response.error) throw response.error;
  return response.data ?? [];
}

export async function listMuscleExerciseMappings() {
  const client = getClientOrThrow();
  const response = await client
    .from('muscle_exercise_map')
    .select(
      'id,muscle_subgroup_id,exercise_id,is_primary,catalog_exercise:catalog_exercises(id,name,name_key,type,primary_muscle_group,equipment)',
    );

  if (response.error) throw response.error;
  return response.data ?? [];
}

export async function listMuscleMachineMappings() {
  const client = getClientOrThrow();
  const response = await client
    .from('muscle_machine_map')
    .select(
      'id,muscle_subgroup_id,machine_id,is_primary,catalog_machine:catalog_machines(id,name,name_key,zone,primary_muscles)',
    );

  if (response.error) throw response.error;
  return response.data ?? [];
}
