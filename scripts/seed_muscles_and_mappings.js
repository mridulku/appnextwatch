#!/usr/bin/env node
/* eslint-disable no-console */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const MUSCLE_TAXONOMY = [
  {
    key: 'chest',
    name: 'Chest',
    sort_order: 1,
    subgroups: [
      { key: 'upper_chest', name: 'Upper Chest', sort_order: 1 },
      { key: 'mid_chest', name: 'Mid Chest', sort_order: 2 },
      { key: 'lower_chest', name: 'Lower Chest', sort_order: 3 },
    ],
  },
  {
    key: 'back',
    name: 'Back',
    sort_order: 2,
    subgroups: [
      { key: 'lats', name: 'Lats', sort_order: 1 },
      { key: 'upper_back', name: 'Upper Back', sort_order: 2 },
      { key: 'mid_back', name: 'Mid Back', sort_order: 3 },
      { key: 'lower_back', name: 'Lower Back', sort_order: 4 },
      { key: 'traps', name: 'Traps', sort_order: 5 },
    ],
  },
  {
    key: 'legs',
    name: 'Legs',
    sort_order: 3,
    subgroups: [
      { key: 'quads', name: 'Quads', sort_order: 1 },
      { key: 'hamstrings', name: 'Hamstrings', sort_order: 2 },
      { key: 'glutes', name: 'Glutes', sort_order: 3 },
      { key: 'calves', name: 'Calves', sort_order: 4 },
    ],
  },
  {
    key: 'shoulders',
    name: 'Shoulders',
    sort_order: 4,
    subgroups: [
      { key: 'front_delts', name: 'Front Delts', sort_order: 1 },
      { key: 'side_delts', name: 'Side Delts', sort_order: 2 },
      { key: 'rear_delts', name: 'Rear Delts', sort_order: 3 },
    ],
  },
  {
    key: 'arms',
    name: 'Arms',
    sort_order: 5,
    subgroups: [
      { key: 'biceps', name: 'Biceps', sort_order: 1 },
      { key: 'triceps', name: 'Triceps', sort_order: 2 },
      { key: 'forearms', name: 'Forearms', sort_order: 3 },
    ],
  },
  {
    key: 'core',
    name: 'Core',
    sort_order: 6,
    subgroups: [
      { key: 'abs', name: 'Abs', sort_order: 1 },
      { key: 'obliques', name: 'Obliques', sort_order: 2 },
      { key: 'lower_abs', name: 'Lower Abs', sort_order: 3 },
    ],
  },
];

const BASELINE_EXERCISES = [
  { name: 'Bench Press', type: 'compound', primary_muscle_group: 'Chest', equipment: 'Barbell' },
  { name: 'Incline Dumbbell Press', type: 'compound', primary_muscle_group: 'Chest', equipment: 'Dumbbell' },
  { name: 'Decline Press', type: 'compound', primary_muscle_group: 'Chest', equipment: 'Barbell' },
  { name: 'Chest Fly', type: 'isolation', primary_muscle_group: 'Chest', equipment: 'Cable' },

  { name: 'Lat Pulldown', type: 'compound', primary_muscle_group: 'Back', equipment: 'Cable' },
  { name: 'Seated Cable Row', type: 'compound', primary_muscle_group: 'Back', equipment: 'Cable' },
  { name: 'Pull-up', type: 'compound', primary_muscle_group: 'Back', equipment: 'Bodyweight' },
  { name: 'Face Pull', type: 'isolation', primary_muscle_group: 'Back', equipment: 'Cable' },
  { name: 'Shrugs', type: 'isolation', primary_muscle_group: 'Back', equipment: 'Dumbbell' },

  { name: 'Back Squat', type: 'compound', primary_muscle_group: 'Legs', equipment: 'Barbell' },
  { name: 'Leg Press', type: 'compound', primary_muscle_group: 'Legs', equipment: 'Machine' },
  { name: 'Romanian Deadlift', type: 'compound', primary_muscle_group: 'Legs', equipment: 'Barbell' },
  { name: 'Leg Extension', type: 'isolation', primary_muscle_group: 'Legs', equipment: 'Machine' },
  { name: 'Leg Curl', type: 'isolation', primary_muscle_group: 'Legs', equipment: 'Machine' },
  { name: 'Calf Raise', type: 'isolation', primary_muscle_group: 'Legs', equipment: 'Machine' },

  { name: 'Shoulder Press', type: 'compound', primary_muscle_group: 'Shoulders', equipment: 'Dumbbell' },
  { name: 'Lateral Raise', type: 'isolation', primary_muscle_group: 'Shoulders', equipment: 'Dumbbell' },
  { name: 'Rear Delt Fly', type: 'isolation', primary_muscle_group: 'Shoulders', equipment: 'Dumbbell' },

  { name: 'Biceps Curl', type: 'isolation', primary_muscle_group: 'Arms', equipment: 'Dumbbell' },
  { name: 'Triceps Pushdown', type: 'isolation', primary_muscle_group: 'Arms', equipment: 'Cable' },
  { name: 'Hammer Curl', type: 'isolation', primary_muscle_group: 'Arms', equipment: 'Dumbbell' },

  { name: 'Plank', type: 'compound', primary_muscle_group: 'Core', equipment: 'Bodyweight' },
  { name: 'Hanging Leg Raise', type: 'compound', primary_muscle_group: 'Core', equipment: 'Bodyweight' },
  { name: 'Russian Twist', type: 'isolation', primary_muscle_group: 'Core', equipment: 'Bodyweight' },
];

const BASELINE_MACHINES = [
  { name: 'Pec Deck', zone: 'Machines', primary_muscles: ['Chest'] },
  { name: 'Lat Pulldown Machine', zone: 'Cable', primary_muscles: ['Lats', 'Upper Back'] },
  { name: 'Seated Row Machine', zone: 'Cable', primary_muscles: ['Mid Back', 'Lats'] },
  { name: 'Leg Extension Machine', zone: 'Machines', primary_muscles: ['Quads'] },
  { name: 'Leg Curl Machine', zone: 'Machines', primary_muscles: ['Hamstrings'] },
  { name: 'Leg Press Machine', zone: 'Machines', primary_muscles: ['Quads', 'Glutes'] },
  { name: 'Assisted Pull-up Machine', zone: 'Machines', primary_muscles: ['Lats', 'Upper Back'] },
  { name: 'Smith Machine', zone: 'Machines', primary_muscles: ['Chest', 'Shoulders', 'Quads'] },
  { name: 'Functional Trainer', zone: 'Cable', primary_muscles: ['Chest', 'Back', 'Shoulders', 'Arms'] },
  { name: 'Calf Raise Machine', zone: 'Machines', primary_muscles: ['Calves'] },
];

const MUSCLE_MAPPING_BLUEPRINT = {
  upper_chest: {
    exercises: [
      { name: 'Incline Dumbbell Press', is_primary: true },
      { name: 'Bench Press', is_primary: false },
      { name: 'Chest Fly', is_primary: false },
    ],
    machines: [
      { name: 'Smith Machine', is_primary: true },
      { name: 'Functional Trainer', is_primary: false },
    ],
  },
  mid_chest: {
    exercises: [
      { name: 'Bench Press', is_primary: true },
      { name: 'Chest Fly', is_primary: true },
      { name: 'Incline Dumbbell Press', is_primary: false },
      { name: 'Decline Press', is_primary: false },
    ],
    machines: [{ name: 'Pec Deck', is_primary: true }],
  },
  lower_chest: {
    exercises: [
      { name: 'Decline Press', is_primary: true },
      { name: 'Bench Press', is_primary: false },
      { name: 'Chest Fly', is_primary: false },
    ],
    machines: [{ name: 'Functional Trainer', is_primary: false }],
  },
  lats: {
    exercises: [
      { name: 'Lat Pulldown', is_primary: true },
      { name: 'Pull-up', is_primary: true },
      { name: 'Seated Cable Row', is_primary: false },
    ],
    machines: [
      { name: 'Lat Pulldown Machine', is_primary: true },
      { name: 'Assisted Pull-up Machine', is_primary: true },
      { name: 'Seated Row Machine', is_primary: false },
    ],
  },
  upper_back: {
    exercises: [
      { name: 'Face Pull', is_primary: true },
      { name: 'Pull-up', is_primary: false },
      { name: 'Seated Cable Row', is_primary: false },
    ],
    machines: [
      { name: 'Assisted Pull-up Machine', is_primary: true },
      { name: 'Seated Row Machine', is_primary: false },
    ],
  },
  mid_back: {
    exercises: [
      { name: 'Seated Cable Row', is_primary: true },
      { name: 'Lat Pulldown', is_primary: false },
    ],
    machines: [{ name: 'Seated Row Machine', is_primary: true }],
  },
  lower_back: {
    exercises: [{ name: 'Romanian Deadlift', is_primary: true }],
    machines: [{ name: 'Smith Machine', is_primary: false }],
  },
  traps: {
    exercises: [
      { name: 'Shrugs', is_primary: true },
      { name: 'Face Pull', is_primary: false },
    ],
    machines: [{ name: 'Functional Trainer', is_primary: false }],
  },
  quads: {
    exercises: [
      { name: 'Back Squat', is_primary: true },
      { name: 'Leg Press', is_primary: true },
      { name: 'Leg Extension', is_primary: true },
    ],
    machines: [
      { name: 'Leg Press Machine', is_primary: true },
      { name: 'Leg Extension Machine', is_primary: true },
      { name: 'Smith Machine', is_primary: false },
    ],
  },
  hamstrings: {
    exercises: [
      { name: 'Romanian Deadlift', is_primary: true },
      { name: 'Leg Curl', is_primary: true },
    ],
    machines: [{ name: 'Leg Curl Machine', is_primary: true }],
  },
  glutes: {
    exercises: [
      { name: 'Back Squat', is_primary: true },
      { name: 'Leg Press', is_primary: false },
      { name: 'Romanian Deadlift', is_primary: false },
    ],
    machines: [{ name: 'Leg Press Machine', is_primary: true }],
  },
  calves: {
    exercises: [{ name: 'Calf Raise', is_primary: true }],
    machines: [{ name: 'Calf Raise Machine', is_primary: true }],
  },
  front_delts: {
    exercises: [
      { name: 'Shoulder Press', is_primary: true },
      { name: 'Bench Press', is_primary: false },
    ],
    machines: [{ name: 'Smith Machine', is_primary: false }],
  },
  side_delts: {
    exercises: [{ name: 'Lateral Raise', is_primary: true }],
    machines: [{ name: 'Functional Trainer', is_primary: false }],
  },
  rear_delts: {
    exercises: [
      { name: 'Rear Delt Fly', is_primary: true },
      { name: 'Face Pull', is_primary: true },
    ],
    machines: [{ name: 'Functional Trainer', is_primary: false }],
  },
  biceps: {
    exercises: [
      { name: 'Biceps Curl', is_primary: true },
      { name: 'Hammer Curl', is_primary: false },
    ],
    machines: [{ name: 'Functional Trainer', is_primary: false }],
  },
  triceps: {
    exercises: [{ name: 'Triceps Pushdown', is_primary: true }],
    machines: [{ name: 'Functional Trainer', is_primary: false }],
  },
  forearms: {
    exercises: [{ name: 'Hammer Curl', is_primary: true }],
    machines: [],
  },
  abs: {
    exercises: [
      { name: 'Plank', is_primary: true },
      { name: 'Hanging Leg Raise', is_primary: true },
      { name: 'Russian Twist', is_primary: false },
    ],
    machines: [],
  },
  obliques: {
    exercises: [
      { name: 'Russian Twist', is_primary: true },
      { name: 'Plank', is_primary: false },
    ],
    machines: [],
  },
  lower_abs: {
    exercises: [
      { name: 'Hanging Leg Raise', is_primary: true },
      { name: 'Plank', is_primary: false },
    ],
    machines: [],
  },
};

function getEnv(key, fallback = '') {
  const value = process.env[key];
  return value && String(value).trim() ? String(value).trim() : fallback;
}

function nameKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function mustClient() {
  const url = getEnv('EXPO_PUBLIC_SUPABASE_URL', getEnv('SUPABASE_URL'));
  const key =
    getEnv('SUPABASE_SERVICE_ROLE_KEY') ||
    getEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY') ||
    getEnv('SUPABASE_ANON_KEY');

  if (!url || !key) {
    throw new Error(
      'Missing Supabase env for seeding. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (or service role).',
    );
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

async function ensureCatalogExercise(client, payload) {
  const key = nameKey(payload.name);
  const existing = await client
    .from('catalog_exercises')
    .select('id,name,name_key')
    .eq('name_key', key)
    .is('created_by', null)
    .maybeSingle();

  if (existing.error) throw existing.error;
  if (existing.data?.id) return existing.data;

  const inserted = await client
    .from('catalog_exercises')
    .insert({
      name: payload.name,
      type: payload.type,
      primary_muscle_group: payload.primary_muscle_group,
      equipment: payload.equipment,
      created_by: null,
    })
    .select('id,name,name_key')
    .single();

  if (inserted.error) throw inserted.error;
  return inserted.data;
}

async function ensureCatalogMachine(client, payload) {
  const key = nameKey(payload.name);
  const existing = await client
    .from('catalog_machines')
    .select('id,name,name_key')
    .eq('name_key', key)
    .is('created_by', null)
    .maybeSingle();

  if (existing.error) throw existing.error;
  if (existing.data?.id) return existing.data;

  const inserted = await client
    .from('catalog_machines')
    .insert({
      name: payload.name,
      zone: payload.zone,
      primary_muscles: payload.primary_muscles,
      created_by: null,
    })
    .select('id,name,name_key')
    .single();

  if (inserted.error) throw inserted.error;
  return inserted.data;
}

async function seedMuscleTaxonomy(client) {
  const muscleIdByKey = new Map();
  const subgroupIdByKey = new Map();

  for (const group of MUSCLE_TAXONOMY) {
    const upserted = await client
      .from('muscles')
      .upsert(
        {
          name: group.name,
          name_key: group.key,
          sort_order: group.sort_order,
        },
        { onConflict: 'name_key' },
      )
      .select('id,name_key')
      .single();
    if (upserted.error) throw upserted.error;
    muscleIdByKey.set(group.key, upserted.data.id);

    for (const subgroup of group.subgroups) {
      const subgroupUpsert = await client
        .from('muscle_subgroups')
        .upsert(
          {
            muscle_id: upserted.data.id,
            name: subgroup.name,
            name_key: subgroup.key,
            sort_order: subgroup.sort_order,
          },
          { onConflict: 'muscle_id,name_key' },
        )
        .select('id,name_key')
        .single();
      if (subgroupUpsert.error) throw subgroupUpsert.error;
      subgroupIdByKey.set(subgroup.key, subgroupUpsert.data.id);
    }
  }

  return { muscleIdByKey, subgroupIdByKey };
}

async function main() {
  const client = mustClient();
  const ensuredExerciseByNameKey = new Map();
  const ensuredMachineByNameKey = new Map();

  for (const exercise of BASELINE_EXERCISES) {
    const ensured = await ensureCatalogExercise(client, exercise);
    ensuredExerciseByNameKey.set(nameKey(ensured.name), ensured.id);
  }

  for (const machine of BASELINE_MACHINES) {
    const ensured = await ensureCatalogMachine(client, machine);
    ensuredMachineByNameKey.set(nameKey(ensured.name), ensured.id);
  }

  const { subgroupIdByKey } = await seedMuscleTaxonomy(client);

  let exerciseLinks = 0;
  let machineLinks = 0;

  for (const [subgroupKey, mappings] of Object.entries(MUSCLE_MAPPING_BLUEPRINT)) {
    const subgroupId = subgroupIdByKey.get(subgroupKey);
    if (!subgroupId) continue;

    for (const exercise of mappings.exercises || []) {
      const exerciseId = ensuredExerciseByNameKey.get(nameKey(exercise.name));
      if (!exerciseId) continue;

      const link = await client
        .from('muscle_exercise_map')
        .upsert(
          {
            muscle_subgroup_id: subgroupId,
            exercise_id: exerciseId,
            is_primary: Boolean(exercise.is_primary),
          },
          { onConflict: 'muscle_subgroup_id,exercise_id' },
        );
      if (link.error) throw link.error;
      exerciseLinks += 1;
    }

    for (const machine of mappings.machines || []) {
      const machineId = ensuredMachineByNameKey.get(nameKey(machine.name));
      if (!machineId) continue;

      const link = await client
        .from('muscle_machine_map')
        .upsert(
          {
            muscle_subgroup_id: subgroupId,
            machine_id: machineId,
            is_primary: Boolean(machine.is_primary),
          },
          { onConflict: 'muscle_subgroup_id,machine_id' },
        );
      if (link.error) throw link.error;
      machineLinks += 1;
    }
  }

  const [muscleCountRes, subgroupCountRes, exerciseMapCountRes, machineMapCountRes] = await Promise.all([
    client.from('muscles').select('id', { head: true, count: 'exact' }),
    client.from('muscle_subgroups').select('id', { head: true, count: 'exact' }),
    client.from('muscle_exercise_map').select('id', { head: true, count: 'exact' }),
    client.from('muscle_machine_map').select('id', { head: true, count: 'exact' }),
  ]);

  if (muscleCountRes.error) throw muscleCountRes.error;
  if (subgroupCountRes.error) throw subgroupCountRes.error;
  if (exerciseMapCountRes.error) throw exerciseMapCountRes.error;
  if (machineMapCountRes.error) throw machineMapCountRes.error;

  console.log('[seed-muscles] done');
  console.log(`[seed-muscles] muscles: ${muscleCountRes.count || 0}`);
  console.log(`[seed-muscles] muscle_subgroups: ${subgroupCountRes.count || 0}`);
  console.log(`[seed-muscles] muscle_exercise_map: ${exerciseMapCountRes.count || 0}`);
  console.log(`[seed-muscles] muscle_machine_map: ${machineMapCountRes.count || 0}`);
  console.log(`[seed-muscles] processed exercise links: ${exerciseLinks}`);
  console.log(`[seed-muscles] processed machine links: ${machineLinks}`);
}

main().catch((error) => {
  console.error('[seed-muscles] failed');
  console.error(error?.message || error);
  process.exit(1);
});
