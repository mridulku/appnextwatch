import { getSupabaseClient } from '../integrations/supabase';

function getClientOrThrow() {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client not configured');
  return client;
}

function sortVariants(rows) {
  return [...(rows || [])].sort((a, b) => {
    const sortDiff = Number(a?.sort_order || 0) - Number(b?.sort_order || 0);
    if (sortDiff !== 0) return sortDiff;
    return String(a?.name || '').localeCompare(String(b?.name || ''));
  });
}

function sortMovements(rows) {
  return [...(rows || [])].sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
}

function withSortedVariants(row) {
  return {
    ...row,
    variants: sortVariants(row?.variants || []),
  };
}

function withFallbackImage(row) {
  const variants = sortVariants(row?.variants || []);
  const primaryVariant = variants.find((variant) => variant?.is_primary_variant) || variants[0] || null;
  return {
    ...row,
    variants,
    image_url: row?.image_url || primaryVariant?.image_url || null,
    image_source: row?.image_source || primaryVariant?.image_source || null,
    image_status: row?.image_status || primaryVariant?.image_status || null,
  };
}

export async function listExerciseMovements() {
  const client = getClientOrThrow();
  const response = await client
    .from('catalog_exercise_movements')
    .select(
      'id,slug,name,category,primary_muscle_group,primary_day,movement_family,aliases,image_url,image_source,image_status,video_youtube_id,variants:catalog_exercises(id,name,name_key,type,primary_muscle_group,equipment,image_url,image_source,image_status,movement_id,variant_label,variant_kind,sort_order,is_primary_variant,weight_step_kg,weight_measure_mode,weight_fixed_values)',
    )
    .order('name', { ascending: true });

  if (response.error) throw response.error;
  return sortMovements((response.data || []).map(withFallbackImage));
}

export async function listExerciseMovementVariants({ movementId }) {
  const client = getClientOrThrow();
  const response = await client
    .from('catalog_exercises')
    .select('id,name,name_key,type,primary_muscle_group,equipment,image_url,image_source,image_status,movement_id,variant_label,variant_kind,sort_order,is_primary_variant,weight_step_kg,weight_measure_mode,weight_fixed_values')
    .eq('movement_id', movementId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (response.error) throw response.error;
  return response.data || [];
}

export async function getExerciseVariantById(exerciseId) {
  const client = getClientOrThrow();
  const response = await client
    .from('catalog_exercises')
    .select(
      'id,name,name_key,type,primary_muscle_group,equipment,image_url,image_source,image_status,movement_id,variant_label,variant_kind,sort_order,is_primary_variant,weight_step_kg,weight_measure_mode,weight_fixed_values,movement:catalog_exercise_movements(id,slug,name,category,primary_muscle_group,primary_day,movement_family,aliases,image_url,image_source,image_status,video_youtube_id)',
    )
    .eq('id', exerciseId)
    .single();

  if (response.error) throw response.error;
  return response.data;
}

export async function getExerciseMovementById(movementId) {
  const client = getClientOrThrow();
  const response = await client
    .from('catalog_exercise_movements')
    .select(
      'id,slug,name,category,primary_muscle_group,primary_day,movement_family,aliases,image_url,image_source,image_status,video_youtube_id,variants:catalog_exercises(id,name,name_key,type,primary_muscle_group,equipment,image_url,image_source,image_status,movement_id,variant_label,variant_kind,sort_order,is_primary_variant,weight_step_kg,weight_measure_mode,weight_fixed_values)',
    )
    .eq('id', movementId)
    .single();

  if (response.error) throw response.error;
  return withFallbackImage(response.data);
}

export async function getExerciseMovementDetail({ movementId, exerciseId }) {
  let resolvedMovementId = movementId || null;
  let selectedVariant = null;

  if (!resolvedMovementId && exerciseId) {
    selectedVariant = await getExerciseVariantById(exerciseId);
    resolvedMovementId = selectedVariant?.movement_id || selectedVariant?.movement?.id || null;
  }

  if (!resolvedMovementId) {
    throw new Error('Movement detail requires movementId or exerciseId');
  }

  const movement = await getExerciseMovementById(resolvedMovementId);
  if (!selectedVariant && exerciseId) {
    selectedVariant = (movement?.variants || []).find((variant) => variant.id === exerciseId) || null;
  }

  return {
    movement,
    variants: movement?.variants || [],
    selectedVariant: selectedVariant || (movement?.variants || []).find((variant) => variant?.is_primary_variant) || movement?.variants?.[0] || null,
  };
}

export async function listMovementMuscleScores({ movementId }) {
  const client = getClientOrThrow();
  const response = await client
    .from('muscle_exercise_movement_map')
    .select(
      'id,target_score,aggregation_method,variant_count,muscle_subgroup:muscle_subgroups(id,name,name_key,image_url,image_source,image_status,muscle:muscles(id,name,name_key,image_url,image_source,image_status))',
    )
    .eq('movement_id', movementId)
    .order('target_score', { ascending: false });

  if (response.error) throw response.error;
  return response.data || [];
}

export async function listMovementMachineMappings({ movementId }) {
  const client = getClientOrThrow();
  const response = await client
    .from('machine_exercise_movement_map')
    .select(
      'id,relevance_score,aggregation_method,variant_count,machine_id,catalog_machine:catalog_machines(id,name,name_key,zone,primary_muscles,image_url,image_source,image_status)',
    )
    .eq('movement_id', movementId)
    .order('relevance_score', { ascending: false });

  if (response.error) throw response.error;
  return response.data || [];
}

export async function listMachineMovementMappings({ machineId }) {
  const client = getClientOrThrow();
  const response = await client
    .from('machine_exercise_movement_map')
    .select(
      'id,relevance_score,aggregation_method,variant_count,movement_id,movement:catalog_exercise_movements(id,slug,name,category,primary_muscle_group,primary_day,movement_family,aliases,image_url,image_source,image_status,video_youtube_id,variants:catalog_exercises(id,name,name_key,type,primary_muscle_group,equipment,image_url,image_source,image_status,movement_id,variant_label,variant_kind,sort_order,is_primary_variant,weight_step_kg,weight_measure_mode,weight_fixed_values))',
    )
    .eq('machine_id', machineId)
    .order('relevance_score', { ascending: false });

  if (response.error) throw response.error;
  return (response.data || []).map((row) => ({
    ...row,
    movement: withFallbackImage(row?.movement || {}),
  }));
}

export async function listSubgroupMovementMappings({ subgroupId }) {
  const client = getClientOrThrow();
  const response = await client
    .from('muscle_exercise_movement_map')
    .select(
      'id,target_score,aggregation_method,variant_count,movement_id,movement:catalog_exercise_movements(id,slug,name,category,primary_muscle_group,primary_day,movement_family,aliases,image_url,image_source,image_status,video_youtube_id,variants:catalog_exercises(id,name,name_key,type,primary_muscle_group,equipment,image_url,image_source,image_status,movement_id,variant_label,variant_kind,sort_order,is_primary_variant,weight_step_kg,weight_measure_mode,weight_fixed_values))',
    )
    .eq('muscle_subgroup_id', subgroupId)
    .order('target_score', { ascending: false });

  if (response.error) throw response.error;
  return (response.data || []).map((row) => ({
    ...row,
    movement: withFallbackImage(row?.movement || {}),
  }));
}

export async function updateExerciseMeasurementSettings({
  exerciseId,
  weightStepKg,
  weightMeasureMode,
  weightFixedValues,
}) {
  const client = getClientOrThrow();
  const response = await client.rpc('update_catalog_exercise_measurement_settings', {
    p_exercise_id: exerciseId,
    p_weight_step_kg: weightStepKg,
    p_weight_measure_mode: weightMeasureMode ?? null,
    p_weight_fixed_values: weightFixedValues ?? null,
  });

  if (response.error) throw response.error;
  return (response.data || [])[0] || {
    id: exerciseId,
    weight_step_kg: weightStepKg,
    weight_measure_mode: weightMeasureMode ?? 'steps',
    weight_fixed_values: weightFixedValues ?? [],
  };
}
