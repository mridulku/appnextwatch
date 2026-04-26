#!/usr/bin/env node
/* eslint-disable no-console */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

function getEnv(key) {
  const value = process.env[key];
  return value && String(value).trim() ? String(value).trim() : '';
}

function createSupabase() {
  const url = getEnv('EXPO_PUBLIC_SUPABASE_URL') || getEnv('SUPABASE_URL');
  const key = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY') || getEnv('SUPABASE_ANON_KEY');
  if (!url || !key) {
    throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL and anon/service role key.');
  }
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

async function ensureAppUser(supabase) {
  const username = 'demo user';
  const existing = await supabase.from('app_users').select('id').eq('username', username).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data?.id) return existing.data.id;

  const inserted = await supabase
    .from('app_users')
    .insert({ username, name: 'Demo User' })
    .select('id')
    .single();
  if (inserted.error) throw inserted.error;
  return inserted.data.id;
}

async function buildVariantMap(supabase) {
  const response = await supabase
    .from('catalog_exercises')
    .select('id,name,movement_id,variant_label,catalog_exercise_movement:catalog_exercise_movements(name)')
    .order('name', { ascending: true });
  if (response.error) throw response.error;

  const byMovementAndVariant = new Map();
  for (const row of response.data || []) {
    const movementName = row?.catalog_exercise_movement?.name;
    const variantLabel = row?.variant_label || '';
    byMovementAndVariant.set(`${movementName}::${variantLabel}`, {
      id: row.id,
      movementId: row.movement_id,
      name: row.name,
      movementName,
      variantLabel,
    });
  }
  return byMovementAndVariant;
}

function getVariant(lookup, movementName, variantLabel) {
  const found = lookup.get(`${movementName}::${variantLabel}`);
  if (!found) {
    throw new Error(`Missing variant: ${movementName} :: ${variantLabel}`);
  }
  return found;
}

async function deleteExistingSessions(supabase, userId) {
  const sessionsRes = await supabase.from('user_gym_sessions').select('id').eq('user_id', userId);
  if (sessionsRes.error) throw sessionsRes.error;
  const sessionIds = (sessionsRes.data || []).map((row) => row.id);
  if (!sessionIds.length) return 0;

  const sessionExercisesRes = await supabase
    .from('user_gym_session_exercises')
    .select('id')
    .in('session_id', sessionIds);
  if (sessionExercisesRes.error) throw sessionExercisesRes.error;
  const sessionExerciseIds = (sessionExercisesRes.data || []).map((row) => row.id);

  if (sessionExerciseIds.length) {
    const deleteSets = await supabase.from('user_gym_session_sets').delete().in('session_exercise_id', sessionExerciseIds);
    if (deleteSets.error) throw deleteSets.error;
  }

  const deleteExercises = await supabase.from('user_gym_session_exercises').delete().in('session_id', sessionIds);
  if (deleteExercises.error) throw deleteExercises.error;

  const deleteSessions = await supabase.from('user_gym_sessions').delete().in('id', sessionIds).eq('user_id', userId);
  if (deleteSessions.error) throw deleteSessions.error;

  return sessionIds.length;
}

function buildSessionSeeds(lookup) {
  const at = (movementName, variantLabel, sets) => ({
    variant: getVariant(lookup, movementName, variantLabel),
    sets,
  });

  return [
    {
      title: 'Push day',
      dateISO: '2026-03-07',
      startedAt: '2026-03-07T18:00:00.000Z',
      completedAt: '2026-03-07T18:45:00.000Z',
      exercises: [
        at('Treadmill Run', 'Machine', [{ reps: 5, weight: null, speed: 9 }]),
        at('Push-up', 'Bodyweight', [{ reps: 10, weight: null }, { reps: 10, weight: null }]),
        at('Flat Press', 'Barbell', [{ reps: 6, weight: 20 }, { reps: 6, weight: 20 }]),
        at('Lateral Raise', 'Dumbbell', [{ reps: 8, weight: 7.5 }, { reps: 8, weight: 7.5 }]),
        at('Incline Press', 'Dumbbell', [{ reps: 6, weight: 20 }, { reps: 6, weight: 20 }]),
        at('Triceps Pushdown', 'Cable', [{ reps: 8, weight: 10 }, { reps: 8, weight: 10 }]),
        at('Thoracic Rotation Mobility', 'Bodyweight', [{ reps: 10, weight: null }]),
      ],
    },
    {
      title: 'Leg day',
      dateISO: '2026-03-08',
      startedAt: '2026-03-08T18:00:00.000Z',
      completedAt: '2026-03-08T18:40:00.000Z',
      exercises: [
        at('Treadmill Run', 'Machine', [{ reps: 5, weight: null, speed: 9 }]),
        at('Dynamic Hip Mobility', 'Bodyweight', [{ reps: 10, weight: null }]),
        at('Squat', 'Back Barbell', [{ reps: 10, weight: 0 }, { reps: 10, weight: 0 }]),
        at('Leg Extension', 'Machine', [{ reps: 8, weight: 30 }, { reps: 8, weight: 30 }]),
        at('Leg Curl', 'Lying Machine', [{ reps: 8, weight: 30 }, { reps: 8, weight: 30 }]),
        at('Dynamic Hip Mobility', 'Bodyweight', [{ reps: 10, weight: null }]),
      ],
    },
    {
      title: 'Pull day',
      dateISO: '2026-03-09',
      startedAt: '2026-03-09T18:00:00.000Z',
      completedAt: '2026-03-09T18:45:00.000Z',
      exercises: [
        at('Treadmill Run', 'Machine', [{ reps: 5, weight: null, speed: 9 }]),
        at('Lat Pulldown', 'Standard Cable', [{ reps: 8, weight: 30 }, { reps: 8, weight: 30 }]),
        at('Curl', 'Dumbbell', [{ reps: 8, weight: 5 }, { reps: 8, weight: 5 }]),
        at('Bent-Over Row', 'Barbell', [{ reps: 8, weight: 20 }, { reps: 8, weight: 20 }]),
        at('Seated Row', 'Cable', [{ reps: 8, weight: 30 }, { reps: 8, weight: 30 }]),
        at('Thoracic Rotation Mobility', 'Bodyweight', [{ reps: 10, weight: null }]),
      ],
    },
    {
      title: 'Push day',
      dateISO: '2026-03-10',
      startedAt: '2026-03-10T18:00:00.000Z',
      completedAt: '2026-03-10T18:45:00.000Z',
      exercises: [
        at('Treadmill Run', 'Machine', [{ reps: 5, weight: null, speed: 9 }]),
        at('Push-up', 'Bodyweight', [{ reps: 10, weight: null }, { reps: 10, weight: null }]),
        at('Flat Press', 'Barbell', [{ reps: 6, weight: 20 }, { reps: 6, weight: 20 }]),
        at('Lateral Raise', 'Dumbbell', [{ reps: 8, weight: 7.5 }, { reps: 8, weight: 7.5 }]),
        at('Incline Press', 'Dumbbell', [{ reps: 6, weight: 20 }, { reps: 6, weight: 20 }]),
        at('Triceps Pushdown', 'Cable', [{ reps: 8, weight: 10 }, { reps: 8, weight: 10 }]),
        at('Thoracic Rotation Mobility', 'Bodyweight', [{ reps: 10, weight: null }]),
      ],
    },
  ];
}

async function insertSession(supabase, userId, seed) {
  const sessionInsert = await supabase
    .from('user_gym_sessions')
    .insert({
      user_id: userId,
      title: seed.title,
      status: 'complete',
      session_date: seed.dateISO,
      started_at: seed.startedAt,
      completed_at: seed.completedAt,
    })
    .select('id')
    .single();
  if (sessionInsert.error) throw sessionInsert.error;

  const sessionId = sessionInsert.data.id;
  const exerciseRows = seed.exercises.map((entry, index) => ({
    user_id: userId,
    session_id: sessionId,
    exercise_id: entry.variant.id,
    movement_id: entry.variant.movementId,
    sort_order: index + 1,
  }));

  const insertedExercises = await supabase
    .from('user_gym_session_exercises')
    .insert(exerciseRows)
    .select('id,sort_order');
  if (insertedExercises.error) throw insertedExercises.error;

  const setRows = [];
  const sortedExercises = [...(insertedExercises.data || [])].sort((a, b) => a.sort_order - b.sort_order);
  sortedExercises.forEach((sessionExercise, exerciseIndex) => {
    const source = seed.exercises[exerciseIndex];
    source.sets.forEach((setRow, setIndex) => {
      setRows.push({
        user_id: userId,
        session_exercise_id: sessionExercise.id,
        set_index: setIndex + 1,
        planned_reps: setRow.reps == null ? null : Math.round(Number(setRow.reps)),
        planned_weight_kg: setRow.weight == null ? null : Math.round(Number(setRow.weight) * 100) / 100,
        planned_speed_kph: setRow.speed == null ? null : Math.round(Number(setRow.speed) * 100) / 100,
        actual_reps: setRow.reps == null ? null : Math.round(Number(setRow.reps)),
        actual_weight_kg: setRow.weight == null ? null : Math.round(Number(setRow.weight) * 100) / 100,
        actual_speed_kph: setRow.speed == null ? null : Math.round(Number(setRow.speed) * 100) / 100,
        logged_at: seed.completedAt,
      });
    });
  });

  if (setRows.length) {
    const insertedSets = await supabase.from('user_gym_session_sets').insert(setRows);
    if (insertedSets.error) throw insertedSets.error;
  }

  return sessionId;
}

async function main() {
  const supabase = createSupabase();
  const userId = await ensureAppUser(supabase);
  const lookup = await buildVariantMap(supabase);
  const seeds = buildSessionSeeds(lookup);
  const deletedCount = await deleteExistingSessions(supabase, userId);
  const createdIds = [];
  for (const seed of seeds) {
    const sessionId = await insertSession(supabase, userId, seed);
    createdIds.push(sessionId);
  }
  console.log(`[seed-demo-sessions] user=${userId} deleted=${deletedCount} created=${createdIds.length}`);
  seeds.forEach((seed, index) => {
    console.log(`- ${seed.dateISO} ${seed.title} (${seed.exercises.length} movements) -> ${createdIds[index]}`);
  });
}

main().catch((error) => {
  console.error('[seed-demo-sessions] failed');
  console.error(error);
  process.exit(1);
});
