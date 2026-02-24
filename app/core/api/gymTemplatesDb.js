import { getSupabaseClient } from '../integrations/supabase';

function getClientOrThrow() {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client not configured');
  return client;
}

function sortByNumberKey(rows, key) {
  return [...(rows || [])].sort((a, b) => Number(a?.[key] || 0) - Number(b?.[key] || 0));
}

export async function listGymTemplates() {
  const client = getClientOrThrow();
  const response = await client
    .from('catalog_gym_templates')
    .select('id,name,description,focus,created_at,template_exercises:catalog_gym_template_exercises(id)')
    .order('name', { ascending: true });

  if (response.error) throw response.error;

  return (response.data || []).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    focus: row.focus,
    exerciseCount: Array.isArray(row.template_exercises) ? row.template_exercises.length : 0,
    createdAt: row.created_at,
  }));
}

export async function getGymTemplateDetail(templateId) {
  const client = getClientOrThrow();
  const response = await client
    .from('catalog_gym_templates')
    .select(
      'id,name,description,focus,created_at,updated_at,catalog_gym_template_exercises(id,template_id,exercise_id,sort_order,block_label,catalog_exercise:catalog_exercises(id,name,type,primary_muscle_group,equipment),catalog_gym_template_sets(id,set_index,planned_reps,planned_weight_kg))',
    )
    .eq('id', templateId)
    .single();

  if (response.error) throw response.error;

  const exercises = sortByNumberKey(response.data?.catalog_gym_template_exercises || [], 'sort_order').map((exercise) => ({
    id: exercise.id,
    exerciseId: exercise.exercise_id,
    sortOrder: exercise.sort_order,
    blockLabel: exercise.block_label,
    name: exercise?.catalog_exercise?.name || 'Exercise',
    type: exercise?.catalog_exercise?.type || null,
    primaryMuscleGroup: exercise?.catalog_exercise?.primary_muscle_group || null,
    equipment: exercise?.catalog_exercise?.equipment || null,
    sets: sortByNumberKey(exercise?.catalog_gym_template_sets || [], 'set_index').map((setRow) => ({
      id: setRow.id,
      setIndex: setRow.set_index,
      plannedReps: setRow.planned_reps,
      plannedWeightKg: setRow.planned_weight_kg,
    })),
  }));

  const totalSets = exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);

  return {
    id: response.data.id,
    name: response.data.name,
    description: response.data.description,
    focus: response.data.focus,
    createdAt: response.data.created_at,
    updatedAt: response.data.updated_at,
    exercises,
    exerciseCount: exercises.length,
    totalSets,
  };
}
