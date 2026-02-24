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

const EXERCISE_CATALOG = [
  // Chest
  { name: 'Bench Press', type: 'compound', primary_muscle_group: 'Chest', equipment: 'Barbell' },
  { name: 'Incline Dumbbell Press', type: 'compound', primary_muscle_group: 'Chest', equipment: 'Dumbbell' },
  { name: 'Decline Bench Press', type: 'compound', primary_muscle_group: 'Chest', equipment: 'Barbell' },
  { name: 'Chest Fly', type: 'isolation', primary_muscle_group: 'Chest', equipment: 'Cable' },
  { name: 'Pec Deck Fly', type: 'isolation', primary_muscle_group: 'Chest', equipment: 'Machine' },
  { name: 'Incline Cable Fly', type: 'isolation', primary_muscle_group: 'Chest', equipment: 'Cable' },
  { name: 'Push-up', type: 'compound', primary_muscle_group: 'Chest', equipment: 'Bodyweight' },
  { name: 'Dips (Chest Bias)', type: 'compound', primary_muscle_group: 'Chest', equipment: 'Bodyweight' },

  // Back
  { name: 'Lat Pulldown', type: 'compound', primary_muscle_group: 'Back', equipment: 'Cable' },
  { name: 'Wide Grip Lat Pulldown', type: 'compound', primary_muscle_group: 'Back', equipment: 'Cable' },
  { name: 'Close Grip Lat Pulldown', type: 'compound', primary_muscle_group: 'Back', equipment: 'Cable' },
  { name: 'Seated Cable Row', type: 'compound', primary_muscle_group: 'Back', equipment: 'Cable' },
  { name: 'Single Arm Dumbbell Row', type: 'compound', primary_muscle_group: 'Back', equipment: 'Dumbbell' },
  { name: 'Chest Supported Row', type: 'compound', primary_muscle_group: 'Back', equipment: 'Machine' },
  { name: 'Bent Over Barbell Row', type: 'compound', primary_muscle_group: 'Back', equipment: 'Barbell' },
  { name: 'Pull-up', type: 'compound', primary_muscle_group: 'Back', equipment: 'Bodyweight' },
  { name: 'Chin-up', type: 'compound', primary_muscle_group: 'Back', equipment: 'Bodyweight' },
  { name: 'Face Pull', type: 'isolation', primary_muscle_group: 'Back', equipment: 'Cable' },
  { name: 'Shrug', type: 'isolation', primary_muscle_group: 'Back', equipment: 'Dumbbell' },
  { name: 'Back Extension', type: 'isolation', primary_muscle_group: 'Back', equipment: 'Machine' },

  // Legs
  { name: 'Back Squat', type: 'compound', primary_muscle_group: 'Legs', equipment: 'Barbell' },
  { name: 'Front Squat', type: 'compound', primary_muscle_group: 'Legs', equipment: 'Barbell' },
  { name: 'Goblet Squat', type: 'compound', primary_muscle_group: 'Legs', equipment: 'Dumbbell' },
  { name: 'Leg Press', type: 'compound', primary_muscle_group: 'Legs', equipment: 'Machine' },
  { name: 'Hack Squat', type: 'compound', primary_muscle_group: 'Legs', equipment: 'Machine' },
  { name: 'Romanian Deadlift', type: 'compound', primary_muscle_group: 'Legs', equipment: 'Barbell' },
  { name: 'Hip Thrust', type: 'compound', primary_muscle_group: 'Legs', equipment: 'Barbell' },
  { name: 'Walking Lunge', type: 'compound', primary_muscle_group: 'Legs', equipment: 'Dumbbell' },
  { name: 'Bulgarian Split Squat', type: 'compound', primary_muscle_group: 'Legs', equipment: 'Dumbbell' },
  { name: 'Leg Extension', type: 'isolation', primary_muscle_group: 'Legs', equipment: 'Machine' },
  { name: 'Lying Leg Curl', type: 'isolation', primary_muscle_group: 'Legs', equipment: 'Machine' },
  { name: 'Seated Leg Curl', type: 'isolation', primary_muscle_group: 'Legs', equipment: 'Machine' },
  { name: 'Standing Calf Raise', type: 'isolation', primary_muscle_group: 'Legs', equipment: 'Machine' },
  { name: 'Seated Calf Raise', type: 'isolation', primary_muscle_group: 'Legs', equipment: 'Machine' },

  // Shoulders
  { name: 'Shoulder Press', type: 'compound', primary_muscle_group: 'Shoulders', equipment: 'Dumbbell' },
  { name: 'Overhead Press', type: 'compound', primary_muscle_group: 'Shoulders', equipment: 'Barbell' },
  { name: 'Arnold Press', type: 'compound', primary_muscle_group: 'Shoulders', equipment: 'Dumbbell' },
  { name: 'Lateral Raise', type: 'isolation', primary_muscle_group: 'Shoulders', equipment: 'Dumbbell' },
  { name: 'Cable Lateral Raise', type: 'isolation', primary_muscle_group: 'Shoulders', equipment: 'Cable' },
  { name: 'Rear Delt Fly', type: 'isolation', primary_muscle_group: 'Shoulders', equipment: 'Dumbbell' },
  { name: 'Reverse Pec Deck', type: 'isolation', primary_muscle_group: 'Shoulders', equipment: 'Machine' },
  { name: 'Upright Row', type: 'compound', primary_muscle_group: 'Shoulders', equipment: 'Barbell' },

  // Arms
  { name: 'Biceps Curl', type: 'isolation', primary_muscle_group: 'Arms', equipment: 'Dumbbell' },
  { name: 'Barbell Curl', type: 'isolation', primary_muscle_group: 'Arms', equipment: 'Barbell' },
  { name: 'Hammer Curl', type: 'isolation', primary_muscle_group: 'Arms', equipment: 'Dumbbell' },
  { name: 'Preacher Curl', type: 'isolation', primary_muscle_group: 'Arms', equipment: 'Machine' },
  { name: 'Cable Curl', type: 'isolation', primary_muscle_group: 'Arms', equipment: 'Cable' },
  { name: 'Triceps Pushdown', type: 'isolation', primary_muscle_group: 'Arms', equipment: 'Cable' },
  { name: 'Overhead Triceps Extension', type: 'isolation', primary_muscle_group: 'Arms', equipment: 'Dumbbell' },
  { name: 'Skull Crusher', type: 'isolation', primary_muscle_group: 'Arms', equipment: 'Barbell' },
  { name: 'Close Grip Bench Press', type: 'compound', primary_muscle_group: 'Arms', equipment: 'Barbell' },
  { name: 'Cable Rope Overhead Extension', type: 'isolation', primary_muscle_group: 'Arms', equipment: 'Cable' },
  { name: 'Wrist Curl', type: 'isolation', primary_muscle_group: 'Arms', equipment: 'Dumbbell' },
  { name: 'Reverse Wrist Curl', type: 'isolation', primary_muscle_group: 'Arms', equipment: 'Dumbbell' },

  // Core
  { name: 'Plank', type: 'compound', primary_muscle_group: 'Core', equipment: 'Bodyweight' },
  { name: 'Hanging Leg Raise', type: 'compound', primary_muscle_group: 'Core', equipment: 'Bodyweight' },
  { name: 'Cable Crunch', type: 'isolation', primary_muscle_group: 'Core', equipment: 'Cable' },
  { name: 'Russian Twist', type: 'isolation', primary_muscle_group: 'Core', equipment: 'Bodyweight' },
  { name: 'Dead Bug', type: 'isolation', primary_muscle_group: 'Core', equipment: 'Bodyweight' },
  { name: 'Ab Wheel Rollout', type: 'compound', primary_muscle_group: 'Core', equipment: 'Bodyweight' },
  { name: 'Pallof Press', type: 'isolation', primary_muscle_group: 'Core', equipment: 'Cable' },
  { name: 'Side Plank', type: 'isolation', primary_muscle_group: 'Core', equipment: 'Bodyweight' },

  // Conditioning / mobility
  { name: 'Rowing Sprint', type: 'cardio', primary_muscle_group: 'Cardio', equipment: 'Machine' },
  { name: 'Treadmill Run', type: 'cardio', primary_muscle_group: 'Cardio', equipment: 'Machine' },
  { name: 'Bike Sprint', type: 'cardio', primary_muscle_group: 'Cardio', equipment: 'Machine' },
  { name: 'Jump Rope', type: 'cardio', primary_muscle_group: 'Cardio', equipment: 'Bodyweight' },
  { name: 'Dynamic Hip Mobility', type: 'mobility', primary_muscle_group: 'Mobility', equipment: 'Bodyweight' },
  { name: 'Thoracic Rotation Mobility', type: 'mobility', primary_muscle_group: 'Mobility', equipment: 'Bodyweight' },
];

const MACHINE_CATALOG = [
  { name: 'Pec Deck', zone: 'Machines', primary_muscles: ['Chest'] },
  { name: 'Incline Chest Press Machine', zone: 'Machines', primary_muscles: ['Upper Chest', 'Front Delts', 'Triceps'] },
  { name: 'Flat Chest Press Machine', zone: 'Machines', primary_muscles: ['Mid Chest', 'Triceps'] },
  { name: 'Decline Chest Press Machine', zone: 'Machines', primary_muscles: ['Lower Chest', 'Triceps'] },
  { name: 'Cable Crossover', zone: 'Cable', primary_muscles: ['Chest', 'Front Delts'] },

  { name: 'Lat Pulldown Machine', zone: 'Cable', primary_muscles: ['Lats', 'Upper Back', 'Biceps'] },
  { name: 'High Row Machine', zone: 'Machines', primary_muscles: ['Upper Back', 'Lats'] },
  { name: 'Seated Row Machine', zone: 'Cable', primary_muscles: ['Mid Back', 'Lats', 'Rear Delts'] },
  { name: 'T-Bar Row Machine', zone: 'Machines', primary_muscles: ['Mid Back', 'Lats'] },
  { name: 'Assisted Pull-up Machine', zone: 'Machines', primary_muscles: ['Lats', 'Upper Back', 'Biceps'] },
  { name: 'Back Extension Bench', zone: 'Functional', primary_muscles: ['Lower Back', 'Glutes'] },

  { name: 'Leg Press Machine', zone: 'Machines', primary_muscles: ['Quads', 'Glutes'] },
  { name: 'Hack Squat Machine', zone: 'Machines', primary_muscles: ['Quads', 'Glutes'] },
  { name: 'Leg Extension Machine', zone: 'Machines', primary_muscles: ['Quads'] },
  { name: 'Lying Leg Curl Machine', zone: 'Machines', primary_muscles: ['Hamstrings'] },
  { name: 'Seated Leg Curl Machine', zone: 'Machines', primary_muscles: ['Hamstrings'] },
  { name: 'Glute Drive Machine', zone: 'Machines', primary_muscles: ['Glutes', 'Hamstrings'] },
  { name: 'Calf Raise Machine', zone: 'Machines', primary_muscles: ['Calves'] },
  { name: 'Smith Machine', zone: 'Machines', primary_muscles: ['Chest', 'Shoulders', 'Quads', 'Glutes'] },

  { name: 'Shoulder Press Machine', zone: 'Machines', primary_muscles: ['Front Delts', 'Side Delts', 'Triceps'] },
  { name: 'Lateral Raise Machine', zone: 'Machines', primary_muscles: ['Side Delts'] },
  { name: 'Rear Delt Machine', zone: 'Machines', primary_muscles: ['Rear Delts', 'Upper Back'] },

  { name: 'Cable Tower', zone: 'Cable', primary_muscles: ['Chest', 'Back', 'Shoulders', 'Arms', 'Core'] },
  { name: 'Dual Adjustable Pulley', zone: 'Cable', primary_muscles: ['Chest', 'Back', 'Shoulders', 'Arms', 'Core'] },
  { name: 'Preacher Curl Machine', zone: 'Machines', primary_muscles: ['Biceps', 'Forearms'] },
  { name: 'Dip Assist Machine', zone: 'Machines', primary_muscles: ['Triceps', 'Lower Chest'] },

  { name: 'Ab Crunch Machine', zone: 'Machines', primary_muscles: ['Abs'] },
  { name: 'Roman Chair', zone: 'Functional', primary_muscles: ['Abs', 'Lower Back'] },
  { name: 'Captain Chair', zone: 'Functional', primary_muscles: ['Lower Abs', 'Hip Flexors'] },

  { name: 'Treadmill', zone: 'Cardio', primary_muscles: ['Cardio', 'Legs'] },
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
  MACHINE_CATALOG,
  MUSCLE_TAXONOMY,
  makeSupabaseClient,
  normalizeName,
};
