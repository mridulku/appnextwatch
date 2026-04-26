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
  const key =
    getEnv('SUPABASE_SERVICE_ROLE_KEY')
    || getEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY')
    || getEnv('SUPABASE_ANON_KEY');
  if (!url || !key) {
    throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL and service role/anon key.');
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

async function ensureDeadliftCatalog(supabase) {
  const existing = await supabase
    .from('catalog_exercise_movements')
    .select('id')
    .eq('slug', 'deadlift')
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data?.id) return existing.data.id;

  const insertedMovement = await supabase
    .from('catalog_exercise_movements')
    .insert({
      slug: 'deadlift',
      name: 'Deadlift',
      category: 'strength',
      primary_muscle_group: 'Legs',
      primary_day: 'legs',
      movement_family: 'hinge',
      aliases: ['Conventional Deadlift'],
      image_status: 'pending',
    })
    .select('id')
    .single();
  if (insertedMovement.error) throw insertedMovement.error;

  const insertedExercise = await supabase
    .from('catalog_exercises')
    .insert({
      name: 'Deadlift',
      type: 'compound',
      primary_muscle_group: 'Legs',
      equipment: 'Barbell',
      created_by: null,
      movement_id: insertedMovement.data.id,
      variant_label: 'Barbell',
      variant_kind: 'equipment',
      sort_order: 1,
      is_primary_variant: true,
      image_status: 'pending',
    })
    .select('id')
    .single();
  if (insertedExercise.error) throw insertedExercise.error;

  return insertedMovement.data.id;
}

async function buildVariantMap(supabase) {
  const response = await supabase
    .from('catalog_exercise_movements')
    .select('id,name,catalog_exercises(id,name,movement_id,variant_label)')
    .order('name', { ascending: true });
  if (response.error) throw response.error;

  const byMovementAndVariant = new Map();
  for (const row of response.data || []) {
    for (const exercise of row.catalog_exercises || []) {
      byMovementAndVariant.set(`${row.name}::${exercise.variant_label || ''}`, {
        id: exercise.id,
        movementId: exercise.movement_id || row.id,
        name: exercise.name,
        movementName: row.name,
        variantLabel: exercise.variant_label || '',
      });
    }
  }
  return byMovementAndVariant;
}

function getVariant(lookup, movementName, variantLabel) {
  const found = lookup.get(`${movementName}::${variantLabel}`);
  if (!found) throw new Error(`Missing variant: ${movementName} :: ${variantLabel}`);
  return found;
}

function at(lookup, movementName, variantLabel, sets) {
  return {
    variant: getVariant(lookup, movementName, variantLabel),
    sets,
  };
}

function buildSeeds(lookup) {
  return [
    {
      title: 'Push day',
      dateISO: '2026-03-26',
      startedAt: '2026-03-26T12:30:00.000Z',
      completedAt: '2026-03-26T13:20:00.000Z',
      exercises: [
        at(lookup, 'Treadmill Run', 'Machine', [{ reps: 5, weight: null, speed: 9 }]),
        at(lookup, 'Incline Press', 'Dumbbell', [{ reps: 8, weight: 10 }, { reps: 8, weight: 10 }, { reps: 6, weight: 10 }]),
        at(lookup, 'Flat Press', 'Barbell', [{ reps: 8, weight: 15 }, { reps: 6, weight: 15 }]),
        at(lookup, 'Overhead Press', 'Dumbbell', [{ reps: 8, weight: 13.5 }, { reps: 8, weight: 13.5 }]),
        at(lookup, 'Chest Fly', 'Machine', [{ reps: 8, weight: 22.5 }, { reps: 8, weight: 22.5 }]),
        at(lookup, 'Lateral Raise', 'Dumbbell', [{ reps: 8, weight: 15 }, { reps: 8, weight: 15 }]),
        at(lookup, 'Triceps Pushdown', 'Cable', [{ reps: 8, weight: 15 }, { reps: 8, weight: 15 }]),
        at(lookup, 'Overhead Triceps Extension', 'Dumbbell', [{ reps: 8, weight: 7.5 }, { reps: 8, weight: 7.5 }]),
      ],
    },
    {
      title: 'Pull day',
      dateISO: '2026-03-27',
      startedAt: '2026-03-27T12:30:00.000Z',
      completedAt: '2026-03-27T13:20:00.000Z',
      exercises: [
        at(lookup, 'Treadmill Run', 'Machine', [{ reps: 5, weight: null, speed: 9 }]),
        at(lookup, 'Seated Row', 'Cable', [{ reps: 8, weight: 31.5 }, { reps: 8, weight: 49.5 }, { reps: 8, weight: 40.5 }]),
        at(lookup, 'Lat Pulldown', 'Standard Cable', [{ reps: 8, weight: 37.5 }, { reps: 8, weight: 37.5 }, { reps: 6, weight: 45 }]),
        at(lookup, 'Bent-Over Row', 'Barbell', [{ reps: 8, weight: 10 }, { reps: 8, weight: 10 }]),
        at(lookup, 'Curl', 'Dumbbell', [{ reps: 8, weight: 10 }, { reps: 8, weight: 10 }, { reps: 8, weight: 10 }]),
        at(lookup, 'Curl', 'Hammer Dumbbell', [{ reps: 8, weight: 10 }, { reps: 8, weight: 10 }, { reps: 8, weight: 10 }]),
      ],
    },
    {
      title: 'Leg day',
      dateISO: '2026-03-28',
      startedAt: '2026-03-28T12:30:00.000Z',
      completedAt: '2026-03-28T13:20:00.000Z',
      exercises: [
        at(lookup, 'Bike Sprint', 'Machine', [{ reps: 5, weight: null }]),
        at(lookup, 'Squat', 'Back Barbell', [{ reps: 8, weight: 20 }, { reps: 8, weight: 30 }, { reps: 8, weight: 30 }]),
        at(lookup, 'Leg Curl', 'Lying Machine', [{ reps: 8, weight: 31.5 }, { reps: 8, weight: 31.5 }, { reps: 6, weight: 31.5 }]),
        at(lookup, 'Leg Extension', 'Machine', [{ reps: 8, weight: 40.5 }, { reps: 8, weight: 40.5 }, { reps: 8, weight: 40.5 }]),
        at(lookup, 'Calf Raise', 'Seated Machine', [{ reps: 8, weight: 10 }, { reps: 8, weight: 10 }, { reps: 8, weight: 10 }]),
        at(lookup, 'Hip Adduction', 'Machine', [{ reps: 8, weight: 15.5 }, { reps: 8, weight: 15.5 }, { reps: 8, weight: 15.5 }]),
        at(lookup, 'Hip Abduction', 'Machine', [{ reps: 8, weight: 15 }, { reps: 8, weight: 20 }, { reps: 8, weight: 20 }]),
      ],
    },
    {
      title: 'Push day',
      dateISO: '2026-03-31',
      startedAt: '2026-03-31T12:30:00.000Z',
      completedAt: '2026-03-31T13:20:00.000Z',
      exercises: [
        at(lookup, 'Treadmill Run', 'Machine', [{ reps: 5, weight: null, speed: 9 }]),
        at(lookup, 'Incline Press', 'Dumbbell', [{ reps: 8, weight: 5 }, { reps: 8, weight: 10 }, { reps: 8, weight: 10 }]),
        at(lookup, 'Flat Press', 'Barbell', [{ reps: 7, weight: 20 }, { reps: 8, weight: 20 }, { reps: 8, weight: 20 }]),
        at(lookup, 'Chest Fly', 'Machine', [{ reps: 8, weight: 22.5 }, { reps: 8, weight: 22.5 }]),
        at(lookup, 'Rear Delt Fly', 'Machine', [{ reps: 8, weight: 13.5 }, { reps: 8, weight: 13.5 }]),
        at(lookup, 'Triceps Pushdown', 'Cable', [{ reps: 8, weight: 7.5 }, { reps: 8, weight: 7.5 }, { reps: 8, weight: 7.5 }]),
        at(lookup, 'Overhead Triceps Extension', 'Dumbbell', [{ reps: 8, weight: 10 }, { reps: 8, weight: 10 }]),
        at(lookup, 'Lateral Raise', 'Dumbbell', [{ reps: 8, weight: 15 }, { reps: 8, weight: 15 }]),
      ],
    },
    {
      title: 'Pull day',
      dateISO: '2026-04-01',
      startedAt: '2026-04-01T12:30:00.000Z',
      completedAt: '2026-04-01T13:20:00.000Z',
      exercises: [
        at(lookup, 'Treadmill Run', 'Machine', [{ reps: 5, weight: null, speed: 9 }]),
        at(lookup, 'Curl', 'Cable', [{ reps: 8, weight: 12.5 }, { reps: 8, weight: 15.5 }, { reps: 8, weight: 17.5 }]),
        at(lookup, 'Curl', 'Hammer Dumbbell', [{ reps: 8, weight: 15 }, { reps: 8, weight: 15 }, { reps: 8, weight: 15 }]),
        at(lookup, 'Seated Row', 'Cable', [{ reps: 8, weight: 31.5 }, { reps: 8, weight: 40.5 }, { reps: 8, weight: 40.5 }]),
        at(lookup, 'T-Bar Row', 'T-Bar', [{ reps: 8, weight: 15 }, { reps: 4, weight: 20 }, { reps: 4, weight: 20 }]),
        at(lookup, 'Lat Pulldown', 'Standard Cable', [{ reps: 8, weight: 37.5 }, { reps: 8, weight: 37.5 }, { reps: 12, weight: 37.5 }]),
      ],
    },
    {
      title: 'Leg day',
      dateISO: '2026-04-02',
      startedAt: '2026-04-02T12:30:00.000Z',
      completedAt: '2026-04-02T13:20:00.000Z',
      exercises: [
        at(lookup, 'Treadmill Run', 'Machine', [{ reps: 5, weight: null, speed: 9 }]),
        at(lookup, 'Squat', 'Back Barbell', [{ reps: 8, weight: 30 }, { reps: 8, weight: 40 }, { reps: 8, weight: 40 }]),
        at(lookup, 'Deadlift', 'Barbell', [{ reps: 4, weight: 30 }, { reps: 4, weight: 30 }, { reps: 4, weight: 30 }]),
        at(lookup, 'Leg Extension', 'Machine', [{ reps: 8, weight: 31.5 }, { reps: 8, weight: 40.5 }, { reps: 8, weight: 40.5 }]),
        at(lookup, 'Leg Curl', 'Lying Machine', [{ reps: 8, weight: 22.5 }, { reps: 8, weight: 22.5 }, { reps: 8, weight: 22.5 }]),
        at(lookup, 'Hip Adduction', 'Machine', [{ reps: 8, weight: 20 }, { reps: 8, weight: 20 }, { reps: 8, weight: 25 }]),
        at(lookup, 'Hip Abduction', 'Machine', [{ reps: 8, weight: 25 }, { reps: 8, weight: 25 }, { reps: 8, weight: 30 }]),
      ],
    },
  ];
}

async function assertDatesUnused(supabase, userId, dates) {
  const response = await supabase
    .from('user_gym_sessions')
    .select('id,session_date,title')
    .eq('user_id', userId)
    .in('session_date', dates);
  if (response.error) throw response.error;
  if ((response.data || []).length) {
    const collisions = response.data.map((row) => `${row.session_date} (${row.title || row.id})`).join(', ');
    throw new Error(`Refusing import because sessions already exist on: ${collisions}`);
  }
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
  await ensureDeadliftCatalog(supabase);
  const lookup = await buildVariantMap(supabase);
  const seeds = buildSeeds(lookup);

  await assertDatesUnused(
    supabase,
    userId,
    seeds.map((seed) => seed.dateISO),
  );

  const createdIds = [];
  for (const seed of seeds) {
    const sessionId = await insertSession(supabase, userId, seed);
    createdIds.push(sessionId);
  }

  console.log(`[import-march-april-2026-notes] user=${userId} created=${createdIds.length}`);
  seeds.forEach((seed, index) => {
    console.log(`- ${seed.dateISO} ${seed.title} (${seed.exercises.length} movements) -> ${createdIds[index]}`);
  });
}

main().catch((error) => {
  console.error('[import-march-april-2026-notes] failed');
  console.error(error);
  process.exit(1);
});
