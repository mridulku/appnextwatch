import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../env';
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

function toNullableDecimal(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed * 100) / 100;
}

function sortByNumberKey(rows, key) {
  return [...(rows || [])].sort((a, b) => Number(a?.[key] || 0) - Number(b?.[key] || 0));
}

function buildFunctionsUrl(pathname) {
  if (!SUPABASE_URL) return '';
  try {
    const parsed = new URL(SUPABASE_URL);
    const host = parsed.host;
    if (!host.endsWith('.supabase.co')) return '';
    const projectRef = host.replace('.supabase.co', '');
    return `https://${projectRef}.functions.supabase.co/${pathname}`;
  } catch {
    return '';
  }
}

function toAdviceNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getDominantDayLabel({ title, dayKeys }) {
  const normalizedTitle = String(title || '').trim().toLowerCase();
  if (normalizedTitle.includes('push')) return 'Push day';
  if (normalizedTitle.includes('pull')) return 'Pull day';
  if (normalizedTitle.includes('leg')) return 'Leg day';
  if (normalizedTitle.includes('full')) return 'Full day';

  const distinctDays = Array.from(new Set((dayKeys || []).filter(Boolean)));
  if (distinctDays.length === 1) {
    const onlyDay = distinctDays[0];
    if (onlyDay === 'push') return 'Push day';
    if (onlyDay === 'pull') return 'Pull day';
    if (onlyDay === 'legs') return 'Leg day';
    return 'Full day';
  }
  if (distinctDays.length > 1) return 'Full day';
  return '';
}

function mapListSessionRow(row) {
  const exercises = sortByNumberKey(row?.user_gym_session_exercises || [], 'sort_order');
  const exerciseCount = exercises.length;
  const totalSets = exercises.reduce((sum, exerciseRow) => sum + (exerciseRow?.user_gym_session_sets?.length || 0), 0);
  const anchorExercise = exercises[0] || null;
  const anchorMovementName =
    anchorExercise?.catalog_exercise_movement?.name ||
    anchorExercise?.catalog_exercise?.name ||
    '';
  const dominantDayLabel = getDominantDayLabel({
    title: row?.title,
    dayKeys: exercises.map((exerciseRow) => String(exerciseRow?.catalog_exercise_movement?.primary_day || '').trim().toLowerCase()),
  });

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
    anchorMovementName,
    dominantDayLabel,
  };
}

function mapSessionDetailRow(row) {
  const exerciseRows = sortByNumberKey(row?.user_gym_session_exercises || [], 'sort_order');
  const dominantDayLabel = getDominantDayLabel({
    title: row?.title,
    dayKeys: exerciseRows.map((exerciseRow) => String(exerciseRow?.catalog_exercise_movement?.primary_day || '').trim().toLowerCase()),
  });

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
    exerciseCount: exerciseRows.length,
    dominantDayLabel,
    exercises: exerciseRows.map((exerciseRow) => {
      const sets = sortByNumberKey(exerciseRow?.user_gym_session_sets || [], 'set_index');
      return {
        id: exerciseRow.id,
        sessionId: exerciseRow.session_id,
        exerciseId: exerciseRow.exercise_id,
        movementId: exerciseRow.movement_id || exerciseRow?.catalog_exercise?.movement_id || null,
        sortOrder: exerciseRow.sort_order,
        name: exerciseRow?.catalog_exercise_movement?.name || exerciseRow?.catalog_exercise?.name || 'Exercise',
        movementSlug: exerciseRow?.catalog_exercise_movement?.slug || null,
        movementVideoYoutubeId: exerciseRow?.catalog_exercise_movement?.video_youtube_id || null,
        variantName: exerciseRow?.catalog_exercise?.name || 'Variant',
        variantLabel: exerciseRow?.catalog_exercise?.variant_label || null,
        muscle: exerciseRow?.catalog_exercise?.primary_muscle_group || 'Muscle',
        equipment: exerciseRow?.catalog_exercise?.equipment || 'Equipment',
        weightStepKg: exerciseRow?.catalog_exercise?.weight_step_kg ?? null,
        weightMeasureMode: exerciseRow?.catalog_exercise?.weight_measure_mode ?? null,
        weightFixedValues: exerciseRow?.catalog_exercise?.weight_fixed_values ?? [],
        imageUrl:
          exerciseRow?.catalog_exercise?.image_url
          || exerciseRow?.catalog_exercise_movement?.image_url
          || null,
        sets: sets.map((setRow) => ({
          id: setRow.id,
          setIndex: setRow.set_index,
          plannedReps: setRow.planned_reps,
          plannedWeightKg: setRow.planned_weight_kg,
          plannedSpeedKph: setRow.planned_speed_kph,
          actualReps: setRow.actual_reps,
          actualWeightKg: setRow.actual_weight_kg,
          actualSpeedKph: setRow.actual_speed_kph,
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
    .select('id,name,primary_muscle_group,equipment,weight_step_kg,weight_measure_mode,weight_fixed_values')
    .order('name', { ascending: true });

  if (response.error) throw response.error;

  return (response.data || [])
    .map((row) => ({
      id: row.id,
      name: row?.name || 'Exercise',
      muscle: row?.primary_muscle_group || 'Muscle',
      equipment: row?.equipment || 'Equipment',
      weightStepKg: row?.weight_step_kg ?? null,
      weightMeasureMode: row?.weight_measure_mode ?? null,
      weightFixedValues: row?.weight_fixed_values ?? [],
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function listUserSessionMovementLibrary({ userId: _userId }) {
  const client = getClientOrThrow();
  const [movementResponse, favoritesResponse] = await Promise.all([
    client
      .from('catalog_exercise_movements')
      .select(
        'id,slug,name,primary_muscle_group,primary_day,image_url,image_source,image_status,aliases,variants:catalog_exercises(id,name,primary_muscle_group,equipment,image_url,image_source,image_status,movement_id,variant_label,variant_kind,sort_order,is_primary_variant,weight_step_kg,weight_measure_mode,weight_fixed_values)',
      )
      .order('name', { ascending: true }),
    client
      .from('user_exercises')
      .select('exercise_id,sort_order')
      .eq('user_id', _userId),
  ]);

  if (movementResponse.error) throw movementResponse.error;
  if (favoritesResponse.error) throw favoritesResponse.error;

  const favoriteExerciseIdSet = new Set((favoritesResponse.data || []).map((row) => row?.exercise_id).filter(Boolean));
  const favoriteSortOrderByExerciseId = Object.fromEntries(
    (favoritesResponse.data || [])
      .filter((row) => row?.exercise_id)
      .map((row) => [row.exercise_id, Number(row?.sort_order || 0)]),
  );

  return (movementResponse.data || [])
    .map((row) => {
      const variants = sortByNumberKey(row?.variants || [], 'sort_order').map((variant) => ({
        id: variant.id,
        movementId: row.id,
        name: variant?.name || 'Variant',
        movementName: row?.name || 'Movement',
        variantLabel: variant?.variant_label || variant?.equipment || 'Variant',
        muscle: variant?.primary_muscle_group || row?.primary_muscle_group || 'Muscle',
        equipment: variant?.equipment || 'Equipment',
        weightStepKg: variant?.weight_step_kg ?? null,
        weightMeasureMode: variant?.weight_measure_mode ?? null,
        weightFixedValues: variant?.weight_fixed_values ?? [],
        image_url: variant?.image_url || null,
        isPrimaryVariant: Boolean(variant?.is_primary_variant),
        isFavorite: favoriteExerciseIdSet.has(variant.id),
        favoriteSortOrder: favoriteSortOrderByExerciseId[variant.id] || null,
      }));
      const primaryVariant = variants.find((variant) => variant.isPrimaryVariant) || variants[0] || null;
      const favoriteCount = variants.reduce((sum, variant) => sum + (variant.isFavorite ? 1 : 0), 0);
      return {
        id: row.id,
        name: row?.name || 'Movement',
        muscle: row?.primary_muscle_group || 'Muscle',
        day: row?.primary_day || 'general',
        image_url: row?.image_url || primaryVariant?.image_url || null,
        variantCount: variants.length,
        favoriteCount,
        aliases: row?.aliases || [],
        variants,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function listUserGymSessions({ userId }) {
  const client = getClientOrThrow();
  const response = await client
    .from('user_gym_sessions')
    .select(
      'id,user_id,title,status,session_date,duration_min,est_calories,why_note,started_at,completed_at,created_at,updated_at,user_gym_session_exercises(id,sort_order,catalog_exercise:catalog_exercises(id,name),catalog_exercise_movement:catalog_exercise_movements(id,name,primary_day),user_gym_session_sets(id))',
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
      'id,user_id,title,status,session_date,duration_min,est_calories,why_note,started_at,completed_at,created_at,updated_at,user_gym_session_exercises(id,user_id,session_id,exercise_id,movement_id,sort_order,created_at,catalog_exercise:catalog_exercises(id,name,movement_id,variant_label,primary_muscle_group,equipment,image_url,weight_step_kg,weight_measure_mode,weight_fixed_values),catalog_exercise_movement:catalog_exercise_movements(id,slug,name,primary_day,image_url,video_youtube_id),user_gym_session_sets(id,user_id,session_exercise_id,set_index,planned_reps,planned_weight_kg,planned_speed_kph,actual_reps,actual_weight_kg,actual_speed_kph,logged_at,created_at,updated_at))',
    )
    .eq('user_id', userId)
    .eq('id', sessionId)
    .single();

  if (response.error) throw response.error;
  return mapSessionDetailRow(response.data);
}

export async function listRecentCompletedGymSessions({ userId, excludeSessionId = '', limit = 12 }) {
  const client = getClientOrThrow();
  let query = client
    .from('user_gym_sessions')
    .select(
      'id,user_id,title,status,session_date,duration_min,est_calories,why_note,started_at,completed_at,created_at,updated_at,user_gym_session_exercises(id,user_id,session_id,exercise_id,movement_id,sort_order,created_at,catalog_exercise:catalog_exercises(id,name,movement_id,variant_label,primary_muscle_group,equipment,image_url,weight_step_kg,weight_measure_mode,weight_fixed_values),catalog_exercise_movement:catalog_exercise_movements(id,slug,name,primary_day,image_url,video_youtube_id),user_gym_session_sets(id,user_id,session_exercise_id,set_index,planned_reps,planned_weight_kg,planned_speed_kph,actual_reps,actual_weight_kg,actual_speed_kph,logged_at,created_at,updated_at))',
    )
    .eq('user_id', userId)
    .eq('status', 'complete')
    .order('completed_at', { ascending: false })
    .limit(limit);

  if (excludeSessionId) {
    query = query.neq('id', excludeSessionId);
  }

  const response = await query;
  if (response.error) throw response.error;
  return (response.data || []).map(mapSessionDetailRow);
}

export async function listExerciseHistory({ userId, exerciseId, movementId, limit = 8 }) {
  const client = getClientOrThrow();
  let query = client
    .from('user_gym_session_exercises')
    .select(
      'id,user_id,session_id,exercise_id,movement_id,sort_order,created_at,catalog_exercise:catalog_exercises(id,name,movement_id,variant_label,primary_muscle_group,equipment,image_url,weight_step_kg,weight_measure_mode,weight_fixed_values),catalog_exercise_movement:catalog_exercise_movements(id,slug,name,primary_day,image_url,video_youtube_id),user_gym_sessions!inner(id,title,status,session_date,created_at),user_gym_session_sets(id,user_id,session_exercise_id,set_index,planned_reps,planned_weight_kg,planned_speed_kph,actual_reps,actual_weight_kg,actual_speed_kph,logged_at,created_at,updated_at)',
    )
    .eq('user_id', userId);

  if (exerciseId) {
    query = query.eq('exercise_id', exerciseId);
  } else if (movementId) {
    query = query.eq('movement_id', movementId);
  } else {
    return [];
  }

  const response = await query.order('session_date', { foreignTable: 'user_gym_sessions', ascending: false });
  if (response.error) throw response.error;

  const todayISO = new Date().toISOString().slice(0, 10);

  return (response.data || [])
    .filter((row) => String(row?.user_gym_sessions?.session_date || '') <= todayISO)
    .sort((a, b) => String(b?.user_gym_sessions?.session_date || '').localeCompare(String(a?.user_gym_sessions?.session_date || '')))
    .slice(0, limit)
    .map((row) => ({
      id: row.id,
      sessionId: row.session_id,
      exerciseId: row.exercise_id,
      movementId: row.movement_id || row?.catalog_exercise?.movement_id || null,
      sessionDateISO: row?.user_gym_sessions?.session_date || null,
      sessionTitle: row?.user_gym_sessions?.title || 'Session',
      movementName: row?.catalog_exercise_movement?.name || row?.catalog_exercise?.name || 'Exercise',
      movementSlug: row?.catalog_exercise_movement?.slug || null,
      variantName: row?.catalog_exercise?.name || 'Variant',
      variantLabel: row?.catalog_exercise?.variant_label || null,
      imageUrl: row?.catalog_exercise?.image_url || row?.catalog_exercise_movement?.image_url || null,
      muscle: row?.catalog_exercise?.primary_muscle_group || 'Muscle',
      equipment: row?.catalog_exercise?.equipment || 'Equipment',
      weightStepKg: row?.catalog_exercise?.weight_step_kg ?? null,
      weightMeasureMode: row?.catalog_exercise?.weight_measure_mode ?? null,
      weightFixedValues: row?.catalog_exercise?.weight_fixed_values ?? [],
      sets: sortByNumberKey(row?.user_gym_session_sets || [], 'set_index').map((setRow) => ({
        id: setRow.id,
        setIndex: setRow.set_index,
        reps: setRow.actual_reps ?? setRow.planned_reps,
        weight: setRow.actual_weight_kg ?? setRow.planned_weight_kg,
        speed: setRow.actual_speed_kph ?? setRow.planned_speed_kph,
        actualReps: setRow.actual_reps,
        actualWeightKg: setRow.actual_weight_kg,
        actualSpeedKph: setRow.actual_speed_kph,
        plannedReps: setRow.planned_reps,
        plannedWeightKg: setRow.planned_weight_kg,
        plannedSpeedKph: setRow.planned_speed_kph,
        loggedAt: setRow.logged_at,
      })),
    }));
}

const GYM_EXERCISE_ADVICE_URL = buildFunctionsUrl('gym_exercise_advice');

export async function getExerciseAiAdvice({
  userId,
  exercise,
  currentDraftSets,
  history,
}) {
  if (!GYM_EXERCISE_ADVICE_URL) throw new Error('Supabase function URL not configured');
  if (!SUPABASE_ANON_KEY) throw new Error('Supabase anon key not configured');

  const payload = {
    user_id: userId,
    exercise: {
      libraryId: exercise?.libraryId || null,
      movementId: exercise?.movementId || null,
      movementName: exercise?.name || exercise?.movementName || '',
      movementSlug: exercise?.movementSlug || '',
      variantName: exercise?.variantName || '',
      variantLabel: exercise?.variantLabel || '',
      muscle: exercise?.muscle || '',
      equipment: exercise?.equipment || '',
      measurement: exercise?.measurement || null,
    },
    currentDraftSets: (currentDraftSets || []).map((setRow, index) => ({
      setIndex: index + 1,
      reps: toAdviceNumber(setRow?.reps),
      weight: toAdviceNumber(setRow?.weight),
      speed: toAdviceNumber(setRow?.speed),
    })),
    history: (history || []).slice(0, 5).map((row) => ({
      sessionDateISO: row?.sessionDateISO || null,
      sessionTitle: row?.sessionTitle || 'Session',
      sets: (row?.sets || []).map((setRow, index) => ({
        setIndex: setRow?.setIndex || index + 1,
        reps: toAdviceNumber(setRow?.reps),
        weight: toAdviceNumber(setRow?.weight),
        speed: toAdviceNumber(setRow?.speed),
      })),
    })),
  };

  const response = await fetch(GYM_EXERCISE_ADVICE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = {};
  }

  if (!response.ok || parsed?.ok === false) {
    throw new Error(parsed?.error || 'Failed to generate AI advice');
  }

  return {
    advice: String(parsed?.advice || '').trim(),
  };
}

export async function createGymSession({ userId, payload }) {
  const client = getClientOrThrow();
  const normalizedStatus = String(payload?.status || 'not_started').trim().toLowerCase();
  const status = normalizedStatus === 'in_progress' ? 'in_progress' : 'not_started';
  const startedAt = status === 'in_progress' ? new Date().toISOString() : null;

  const sessionInsert = await client
    .from('user_gym_sessions')
    .insert({
      user_id: userId,
      title: String(payload?.title || '').trim() || 'Session',
      status,
      session_date: payload?.dateISO || null,
      duration_min: toNullableInt(payload?.durationMin),
      est_calories: toNullableInt(payload?.estCalories),
      why_note: String(payload?.whyNote || '').trim() || null,
      started_at: startedAt,
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
      movement_id: exercise.movementId || null,
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
          planned_speed_kph: toNullableDecimal(setRow?.speed),
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
      movementId: exercise.movementId || null,
      sets: (exercise.sets || []).map((setRow) => ({
        reps: setRow.plannedReps ?? '',
        weight: setRow.plannedWeightKg ?? '',
        speed: setRow.plannedSpeedKph ?? '',
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

export async function updateGymSession({
  userId,
  sessionId,
  payload,
}) {
  const client = getClientOrThrow();
  const normalizedStatus = payload?.status === 'complete' ? 'complete' : 'not_started';
  const now = new Date().toISOString();
  const sessionPatch = {
    title: String(payload?.title || '').trim() || 'Session',
    session_date: payload?.dateISO || null,
    duration_min: toNullableInt(payload?.durationMin),
    est_calories: toNullableInt(payload?.estCalories),
    why_note: String(payload?.whyNote || '').trim() || null,
    status: normalizedStatus,
    started_at: normalizedStatus === 'complete' ? now : null,
    completed_at: normalizedStatus === 'complete' ? now : null,
  };

  const sessionUpdate = await client
    .from('user_gym_sessions')
    .update(sessionPatch)
    .eq('id', sessionId)
    .eq('user_id', userId);

  if (sessionUpdate.error) throw sessionUpdate.error;

  const exercises = Array.isArray(payload?.exercises) ? payload.exercises : [];
  for (const exercise of exercises) {
    const sessionExerciseId = exercise?.id;
    if (!sessionExerciseId) continue;

    const sets = Array.isArray(exercise?.sets) ? exercise.sets : [];
    for (let index = 0; index < sets.length; index += 1) {
      const setRow = sets[index];
      const setIndex = Number(setRow?.setIndex || setRow?.setNumber || index + 1);
      const patch = {
        planned_reps: toNullableInt(setRow?.plannedReps ?? setRow?.reps),
        planned_weight_kg: toNullableWeight(setRow?.plannedWeightKg ?? setRow?.weight),
        planned_speed_kph: toNullableDecimal(setRow?.plannedSpeedKph ?? setRow?.speed),
      };

      const updateResponse = await client
        .from('user_gym_session_sets')
        .update(patch)
        .eq('user_id', userId)
        .eq('session_exercise_id', sessionExerciseId)
        .eq('set_index', setIndex)
        .select('id')
        .maybeSingle();

      if (updateResponse.error) throw updateResponse.error;
      if (updateResponse.data?.id) continue;

      const insertResponse = await client
        .from('user_gym_session_sets')
        .insert({
          user_id: userId,
          session_exercise_id: sessionExerciseId,
          set_index: setIndex,
          ...patch,
        });

      if (insertResponse.error) throw insertResponse.error;
    }
  }

  return getGymSessionDetail({ userId, sessionId });
}

export async function upsertActualSetLog({
  userId,
  sessionExerciseId,
  setIndex,
  actualReps,
  actualWeightKg,
  actualSpeedKph,
}) {
  const client = getClientOrThrow();

  const patch = {
    actual_reps: toNullableInt(actualReps),
    actual_weight_kg: toNullableWeight(actualWeightKg),
    actual_speed_kph: toNullableDecimal(actualSpeedKph),
    logged_at: new Date().toISOString(),
  };

  const updateResponse = await client
    .from('user_gym_session_sets')
    .update(patch)
    .eq('user_id', userId)
    .eq('session_exercise_id', sessionExerciseId)
    .eq('set_index', setIndex)
    .select('id,set_index,actual_reps,actual_weight_kg,actual_speed_kph,logged_at')
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
    .select('id,set_index,actual_reps,actual_weight_kg,actual_speed_kph,logged_at')
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
