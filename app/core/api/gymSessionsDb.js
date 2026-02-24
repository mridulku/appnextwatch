import { getSupabaseClient } from '../integrations/supabase';
import { getOrCreateAppUser } from './foodInventoryDb';

function getClientOrThrow() {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client not configured');
  return client;
}

function toNullableInt(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed);
}

function toNullableWeight(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed * 100) / 100;
}

function sortByNumberKey(rows, key) {
  return [...(rows || [])].sort((a, b) => Number(a?.[key] || 0) - Number(b?.[key] || 0));
}

function mapListSessionRow(row) {
  const exercises = row?.user_gym_session_exercises || [];
  const exerciseCount = exercises.length;
  const totalSets = exercises.reduce((sum, exerciseRow) => sum + (exerciseRow?.user_gym_session_sets?.length || 0), 0);

  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    status: row.status,
    dateISO: row.session_date,
    durationMin: row.duration_min,
    estCalories: row.est_calories,
    whyNote: row.why_note,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    exerciseCount,
    totalSets,
  };
}

function mapSessionDetailRow(row) {
  const exerciseRows = sortByNumberKey(row?.user_gym_session_exercises || [], 'sort_order');

  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    status: row.status,
    dateISO: row.session_date,
    durationMin: row.duration_min,
    estCalories: row.est_calories,
    whyNote: row.why_note,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    exercises: exerciseRows.map((exerciseRow) => {
      const sets = sortByNumberKey(exerciseRow?.user_gym_session_sets || [], 'set_index');
      return {
        id: exerciseRow.id,
        sessionId: exerciseRow.session_id,
        exerciseId: exerciseRow.exercise_id,
        sortOrder: exerciseRow.sort_order,
        name: exerciseRow?.catalog_exercise?.name || 'Exercise',
        muscle: exerciseRow?.catalog_exercise?.primary_muscle_group || 'Muscle',
        equipment: exerciseRow?.catalog_exercise?.equipment || 'Equipment',
        sets: sets.map((setRow) => ({
          id: setRow.id,
          setIndex: setRow.set_index,
          plannedReps: setRow.planned_reps,
          plannedWeightKg: setRow.planned_weight_kg,
          actualReps: setRow.actual_reps,
          actualWeightKg: setRow.actual_weight_kg,
          loggedAt: setRow.logged_at,
          createdAt: setRow.created_at,
          updatedAt: setRow.updated_at,
        })),
      };
    }),
  };
}

export async function getOrCreateCurrentAppUserId(user) {
  const appUser = await getOrCreateAppUser({
    username: user?.username || 'demo user',
    name: user?.name || 'Demo User',
  });
  return appUser.id;
}

export async function listUserSessionExerciseLibrary({ userId: _userId }) {
  const client = getClientOrThrow();
  const response = await client
    .from('catalog_exercises')
    .select('id,name,primary_muscle_group,equipment')
    .order('name', { ascending: true });

  if (response.error) throw response.error;

  return (response.data || [])
    .map((row) => ({
      id: row.id,
      name: row?.name || 'Exercise',
      muscle: row?.primary_muscle_group || 'Muscle',
      equipment: row?.equipment || 'Equipment',
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function listUserGymSessions({ userId }) {
  const client = getClientOrThrow();
  const response = await client
    .from('user_gym_sessions')
    .select(
      'id,user_id,title,status,session_date,duration_min,est_calories,why_note,started_at,completed_at,created_at,updated_at,user_gym_session_exercises(id,user_gym_session_sets(id))',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (response.error) throw response.error;
  return (response.data || []).map(mapListSessionRow);
}

export async function getGymSessionDetail({ userId, sessionId }) {
  const client = getClientOrThrow();
  const response = await client
    .from('user_gym_sessions')
    .select(
      'id,user_id,title,status,session_date,duration_min,est_calories,why_note,started_at,completed_at,created_at,updated_at,user_gym_session_exercises(id,user_id,session_id,exercise_id,sort_order,created_at,catalog_exercise:catalog_exercises(id,name,primary_muscle_group,equipment),user_gym_session_sets(id,user_id,session_exercise_id,set_index,planned_reps,planned_weight_kg,actual_reps,actual_weight_kg,logged_at,created_at,updated_at))',
    )
    .eq('user_id', userId)
    .eq('id', sessionId)
    .single();

  if (response.error) throw response.error;
  return mapSessionDetailRow(response.data);
}

export async function createGymSession({ userId, payload }) {
  const client = getClientOrThrow();

  const sessionInsert = await client
    .from('user_gym_sessions')
    .insert({
      user_id: userId,
      title: String(payload?.title || '').trim() || 'Session',
      status: 'not_started',
      session_date: payload?.dateISO || null,
      duration_min: toNullableInt(payload?.durationMin),
      est_calories: toNullableInt(payload?.estCalories),
      why_note: String(payload?.whyNote || '').trim() || null,
    })
    .select('id')
    .single();

  if (sessionInsert.error) throw sessionInsert.error;

  const sessionId = sessionInsert.data.id;
  const exercises = Array.isArray(payload?.exercises) ? payload.exercises : [];

  if (exercises.length > 0) {
    const exerciseRows = exercises.map((exercise, index) => ({
      user_id: userId,
      session_id: sessionId,
      exercise_id: exercise.libraryId,
      sort_order: index + 1,
    }));

    const insertedExercises = await client
      .from('user_gym_session_exercises')
      .insert(exerciseRows)
      .select('id,exercise_id,sort_order')
      .order('sort_order', { ascending: true });

    if (insertedExercises.error) throw insertedExercises.error;

    const setRows = [];
    (insertedExercises.data || []).forEach((sessionExercise, exerciseIndex) => {
      const sourceExercise = exercises[exerciseIndex];
      const sets = Array.isArray(sourceExercise?.sets) ? sourceExercise.sets : [];

      sets.forEach((setRow, setIndex) => {
        setRows.push({
          user_id: userId,
          session_exercise_id: sessionExercise.id,
          set_index: setIndex + 1,
          planned_reps: toNullableInt(setRow?.reps),
          planned_weight_kg: toNullableWeight(setRow?.weight),
        });
      });
    });

    if (setRows.length > 0) {
      const setInsert = await client.from('user_gym_session_sets').insert(setRows);
      if (setInsert.error) throw setInsert.error;
    }
  }

  return getGymSessionDetail({ userId, sessionId });
}

export async function duplicateGymSession({ userId, sessionId, newTitle }) {
  const source = await getGymSessionDetail({ userId, sessionId });

  const payload = {
    title: String(newTitle || '').trim() || `${source.title} Copy`,
    dateISO: source.dateISO,
    durationMin: source.durationMin,
    estCalories: source.estCalories,
    whyNote: source.whyNote,
    exercises: (source.exercises || []).map((exercise) => ({
      libraryId: exercise.exerciseId,
      sets: (exercise.sets || []).map((setRow) => ({
        reps: setRow.plannedReps ?? '',
        weight: setRow.plannedWeightKg ?? '',
      })),
    })),
  };

  return createGymSession({ userId, payload });
}

export async function deleteGymSession({ userId, sessionId }) {
  const client = getClientOrThrow();
  const response = await client
    .from('user_gym_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', userId);

  if (response.error) throw response.error;
  return true;
}

export async function updateGymSessionStatus({ userId, sessionId, status }) {
  const client = getClientOrThrow();
  const normalized = status === 'complete' ? 'complete' : status === 'in_progress' ? 'in_progress' : 'not_started';
  const now = new Date().toISOString();

  const patch = {
    status: normalized,
  };

  if (normalized === 'not_started') {
    patch.started_at = null;
    patch.completed_at = null;
  }

  if (normalized === 'in_progress') {
    patch.completed_at = null;
  }

  if (normalized === 'complete') {
    patch.completed_at = now;
  }

  const response = await client
    .from('user_gym_sessions')
    .update(patch)
    .eq('id', sessionId)
    .eq('user_id', userId)
    .select('id,status,started_at,completed_at')
    .single();

  if (response.error) throw response.error;

  if (normalized !== 'not_started' && !response.data.started_at) {
    const startedUpdate = await client
      .from('user_gym_sessions')
      .update({ started_at: now })
      .eq('id', sessionId)
      .eq('user_id', userId)
      .select('id,status,started_at,completed_at')
      .single();

    if (startedUpdate.error) throw startedUpdate.error;
    return startedUpdate.data;
  }

  return response.data;
}

export async function upsertActualSetLog({
  userId,
  sessionExerciseId,
  setIndex,
  actualReps,
  actualWeightKg,
}) {
  const client = getClientOrThrow();

  const patch = {
    actual_reps: toNullableInt(actualReps),
    actual_weight_kg: toNullableWeight(actualWeightKg),
    logged_at: new Date().toISOString(),
  };

  const updateResponse = await client
    .from('user_gym_session_sets')
    .update(patch)
    .eq('user_id', userId)
    .eq('session_exercise_id', sessionExerciseId)
    .eq('set_index', setIndex)
    .select('id,set_index,actual_reps,actual_weight_kg,logged_at')
    .maybeSingle();

  if (updateResponse.error) throw updateResponse.error;
  if (updateResponse.data?.id) return updateResponse.data;

  const insertResponse = await client
    .from('user_gym_session_sets')
    .insert({
      user_id: userId,
      session_exercise_id: sessionExerciseId,
      set_index: setIndex,
      ...patch,
    })
    .select('id,set_index,actual_reps,actual_weight_kg,logged_at')
    .single();

  if (insertResponse.error) throw insertResponse.error;
  return insertResponse.data;
}

export async function reorderSessionExercises({ userId, sessionId, orderedSessionExerciseIds }) {
  const client = getClientOrThrow();
  const ids = Array.isArray(orderedSessionExerciseIds) ? orderedSessionExerciseIds : [];

  for (let index = 0; index < ids.length; index += 1) {
    const id = ids[index];
    if (!id) continue;

    const response = await client
      .from('user_gym_session_exercises')
      .update({ sort_order: index + 1 })
      .eq('id', id)
      .eq('session_id', sessionId)
      .eq('user_id', userId);

    if (response.error) throw response.error;
  }

  return true;
}
