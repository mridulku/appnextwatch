/* eslint-disable no-console */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const {
  EXERCISE_MOVEMENT_CATALOG,
  flattenMovementCatalog,
  buildVariantLookup,
} = require('./exerciseMovementCatalog');

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
      { key: 'mid_back', name: 'Mid Back', sort_order: 2 },
      { key: 'traps', name: 'Traps', sort_order: 3 },
      { key: 'upper_back', name: 'Upper Back', sort_order: 4 },
      { key: 'lower_back', name: 'Lower Back', sort_order: 5 },
    ],
  },
  {
    key: 'legs',
    name: 'Legs',
    sort_order: 3,
    subgroups: [
      { key: 'quads', name: 'Quads', sort_order: 1 },
      { key: 'glutes', name: 'Glutes', sort_order: 2 },
      { key: 'hamstrings', name: 'Hamstrings', sort_order: 3 },
      { key: 'adductors', name: 'Adductors', sort_order: 4 },
      { key: 'abductors', name: 'Abductors', sort_order: 5 },
      { key: 'calves', name: 'Calves', sort_order: 6 },
    ],
  },
  {
    key: 'shoulders',
    name: 'Shoulders',
    sort_order: 4,
    subgroups: [
      { key: 'rear_delts', name: 'Rear Delts', sort_order: 1 },
      { key: 'front_delts', name: 'Front Delts', sort_order: 2 },
      { key: 'side_delts', name: 'Side Delts', sort_order: 3 },
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
      { key: 'abs', name: 'Upper Abs', sort_order: 1 },
      { key: 'obliques', name: 'Obliques', sort_order: 2 },
      { key: 'lower_abs', name: 'Lower Abs', sort_order: 3 },
    ],
  },
];

const EXERCISE_CATALOG = flattenMovementCatalog(EXERCISE_MOVEMENT_CATALOG);
const EXERCISE_VARIANT_LOOKUP = buildVariantLookup(EXERCISE_MOVEMENT_CATALOG);

const MACHINE_CATALOG = [
  { name: 'Pec Deck', zone: 'Machines', primary_muscles: ['Chest'] },
  { name: 'Incline Chest Press Machine', zone: 'Machines', primary_muscles: ['Upper Chest', 'Front Delts', 'Triceps'] },
  { name: 'Bench Press Station', zone: 'Free Weights', primary_muscles: ['Chest', 'Triceps'] },
  { name: 'Incline Bench', zone: 'Free Weights', primary_muscles: ['Chest', 'Shoulders'] },
  { name: 'Lat Pulldown Machine', zone: 'Cable', primary_muscles: ['Lats', 'Upper Back', 'Biceps'] },
  { name: 'Cable Tower', zone: 'Cable', primary_muscles: ['Chest', 'Back', 'Shoulders', 'Arms', 'Core'] },
  { name: 'Assisted Pull-up Machine', zone: 'Machines', primary_muscles: ['Lats', 'Upper Back', 'Biceps'] },
  { name: 'Back Extension Bench', zone: 'Functional', primary_muscles: ['Lower Back', 'Glutes'] },
  { name: 'Leg Press Machine', zone: 'Machines', primary_muscles: ['Quads', 'Glutes'] },
  { name: 'Leg Extension Machine', zone: 'Machines', primary_muscles: ['Quads'] },
  { name: 'Abduction/Adduction Machine', zone: 'Machines', primary_muscles: ['Glutes', 'Hip Adductors', 'Hip Abductors'] },
  { name: 'Glute Drive Machine', zone: 'Machines', primary_muscles: ['Glutes', 'Hamstrings'] },
  { name: 'Smith Machine', zone: 'Machines', primary_muscles: ['Chest', 'Shoulders', 'Quads', 'Glutes'] },
  { name: 'Shoulder Press Machine', zone: 'Machines', primary_muscles: ['Front Delts', 'Side Delts', 'Triceps'] },
  { name: 'Preacher Curl Machine', zone: 'Machines', primary_muscles: ['Biceps', 'Forearms'] },
  { name: 'Decline Bench', zone: 'Functional', primary_muscles: ['Abs', 'Lower Abs'] },
  { name: 'Free Weights Platform', zone: 'Free Weights', primary_muscles: ['Full Body'] },
  { name: 'Treadmill', zone: 'Cardio', primary_muscles: ['Cardio', 'Legs'] },
  { name: 'Stair Climber', zone: 'Cardio', primary_muscles: ['Cardio', 'Legs'] },
  { name: 'Rowing Machine', zone: 'Cardio', primary_muscles: ['Back', 'Legs', 'Cardio'] },
  { name: 'Air Bike', zone: 'Cardio', primary_muscles: ['Legs', 'Shoulders', 'Cardio'] },
];

function getEnv(key, fallback = '') {
  const value = process.env[key];
  return value && String(value).trim() ? String(value).trim() : fallback;
}

function normalizeName(value) {
  return String(value || '').trim().toLowerCase();
}

function makeSupabaseClient({ requireServiceRole = false } = {}) {
  const url = getEnv('EXPO_PUBLIC_SUPABASE_URL', getEnv('SUPABASE_URL'));
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = getEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY') || getEnv('SUPABASE_ANON_KEY');
  const key = serviceRoleKey || anonKey;

  if (!url || !key) {
    throw new Error('Missing Supabase env. Set EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or anon key).');
  }
  if (requireServiceRole && !serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for write scripts (catalog + mapping seed).');
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

module.exports = {
  EXERCISE_CATALOG,
  EXERCISE_MOVEMENT_CATALOG,
  EXERCISE_VARIANT_LOOKUP,
  MACHINE_CATALOG,
  MUSCLE_TAXONOMY,
  makeSupabaseClient,
  normalizeName,
};
