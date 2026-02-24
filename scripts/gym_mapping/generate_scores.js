#!/usr/bin/env node
/* eslint-disable no-console */

const { makeSupabaseClient } = require('./common');

const PRIMARY_GROUP_TO_KEY = {
  chest: 'chest',
  back: 'back',
  legs: 'legs',
  shoulders: 'shoulders',
  arms: 'arms',
  core: 'core',
};

const GROUP_DEFAULT_SUBGROUP = {
  chest: 'mid_chest',
  back: 'lats',
  legs: 'quads',
  shoulders: 'front_delts',
  arms: 'biceps',
  core: 'abs',
};

const EXERCISE_RULES = [
  { keywords: ['incline'], scores: { upper_chest: 35, front_delts: 14, triceps: 10 } },
  { keywords: ['decline'], scores: { lower_chest: 35, triceps: 10 } },
  { keywords: ['bench press', 'bench'], scores: { mid_chest: 28, triceps: 12, front_delts: 10 } },
  { keywords: ['chest fly', 'pec deck fly', 'crossover', 'cable fly'], scores: { mid_chest: 30, upper_chest: 14, lower_chest: 14 } },
  { keywords: ['dip'], scores: { lower_chest: 28, triceps: 18 } },

  { keywords: ['pulldown', 'pull-up', 'pullup', 'chin-up', 'chinup'], scores: { lats: 34, upper_back: 14, biceps: 14 } },
  { keywords: ['row'], scores: { mid_back: 30, lats: 16, rear_delts: 12, biceps: 8 } },
  { keywords: ['face pull'], scores: { rear_delts: 30, upper_back: 20, traps: 12 } },
  { keywords: ['shrug'], scores: { traps: 34, upper_back: 14 } },
  { keywords: ['back extension'], scores: { lower_back: 34, glutes: 14, hamstrings: 8 } },

  { keywords: ['squat'], scores: { quads: 28, glutes: 24, hamstrings: 10, lower_back: 10, abs: 8 } },
  { keywords: ['leg press', 'hack squat'], scores: { quads: 34, glutes: 16 } },
  { keywords: ['lunge', 'split squat'], scores: { quads: 28, glutes: 22, hamstrings: 10 } },
  { keywords: ['romanian deadlift', 'rdl', 'deadlift', 'hinge'], scores: { hamstrings: 30, glutes: 24, lower_back: 18, traps: 8 } },
  { keywords: ['hip thrust'], scores: { glutes: 36, hamstrings: 10, lower_back: 8 } },
  { keywords: ['leg extension'], scores: { quads: 40 } },
  { keywords: ['leg curl'], scores: { hamstrings: 40 } },
  { keywords: ['calf raise'], scores: { calves: 40 } },

  { keywords: ['overhead press', 'shoulder press', 'arnold press'], scores: { front_delts: 30, side_delts: 14, triceps: 14 } },
  { keywords: ['lateral raise'], scores: { side_delts: 40 } },
  { keywords: ['rear delt', 'reverse pec deck'], scores: { rear_delts: 40, upper_back: 10 } },
  { keywords: ['upright row'], scores: { side_delts: 24, traps: 20, rear_delts: 10 } },

  { keywords: ['biceps curl', 'barbell curl', 'preacher curl', 'cable curl'], scores: { biceps: 36, forearms: 12 } },
  { keywords: ['hammer curl'], scores: { biceps: 24, forearms: 24 } },
  { keywords: ['wrist curl', 'reverse wrist curl'], scores: { forearms: 40 } },
  { keywords: ['triceps pushdown', 'skull crusher', 'overhead triceps', 'rope overhead extension'], scores: { triceps: 36 } },
  { keywords: ['close grip bench'], scores: { triceps: 30, mid_chest: 8, front_delts: 8 } },

  { keywords: ['plank', 'dead bug'], scores: { abs: 24, obliques: 16, lower_abs: 10 } },
  { keywords: ['hanging leg raise'], scores: { lower_abs: 34, abs: 16 } },
  { keywords: ['cable crunch', 'ab crunch'], scores: { abs: 38, lower_abs: 10 } },
  { keywords: ['russian twist', 'rotation', 'pallof press', 'side plank'], scores: { obliques: 34, abs: 12 } },
  { keywords: ['ab wheel rollout'], scores: { abs: 30, obliques: 16, lower_abs: 10 } },
];

const MACHINE_RULES = [
  { keywords: ['incline'], scores: { upper_chest: 30, front_delts: 12, triceps: 10 } },
  { keywords: ['decline'], scores: { lower_chest: 30, triceps: 10 } },
  { keywords: ['pec deck', 'crossover', 'chest press'], scores: { mid_chest: 30, upper_chest: 12, lower_chest: 12 } },
  { keywords: ['lat pulldown', 'pull-up'], scores: { lats: 34, upper_back: 12, biceps: 10 } },
  { keywords: ['row'], scores: { mid_back: 30, lats: 14, rear_delts: 8, traps: 40 } },
  { keywords: ['back extension', 'roman chair'], scores: { lower_back: 34, glutes: 10 } },
  { keywords: ['leg press', 'hack squat'], scores: { quads: 34, glutes: 16 } },
  { keywords: ['leg extension'], scores: { quads: 40 } },
  { keywords: ['leg curl'], scores: { hamstrings: 40 } },
  { keywords: ['glute drive'], scores: { glutes: 36, hamstrings: 10 } },
  { keywords: ['calf raise'], scores: { calves: 40 } },
  { keywords: ['shoulder press'], scores: { front_delts: 30, side_delts: 12, triceps: 12 } },
  { keywords: ['lateral raise'], scores: { side_delts: 40 } },
  { keywords: ['rear delt'], scores: { rear_delts: 38, upper_back: 10 } },
  { keywords: ['preacher'], scores: { biceps: 34, forearms: 12 } },
  { keywords: ['dip'], scores: { triceps: 30, lower_chest: 12 } },
  { keywords: ['ab crunch', 'captain chair'], scores: { abs: 30, lower_abs: 20 } },
  { keywords: ['cable tower', 'adjustable pulley'], scores: { mid_chest: 12, lats: 12, side_delts: 12, biceps: 10, triceps: 10, abs: 8, obliques: 40 } },
];

function norm(value) {
  return String(value || '').toLowerCase();
}

function addScore(map, subgroupKey, delta) {
  map[subgroupKey] = Math.max(0, Math.min(100, (map[subgroupKey] || 0) + delta));
}

function buildSubgroupLookup(rows) {
  const byKey = {};
  const byId = {};
  rows.forEach((row) => {
    byKey[row.name_key] = row;
    byId[row.id] = row;
  });
  return { byKey, byId };
}

function computeExerciseScores(exercise, subgroupRows, parentGroupByMuscleId) {
  const scores = {};
  subgroupRows.forEach((subgroup) => {
    scores[subgroup.name_key] = 0;
  });

  const primaryGroupKey = PRIMARY_GROUP_TO_KEY[norm(exercise.primary_muscle_group)];

  subgroupRows.forEach((subgroup) => {
    const parentGroup = parentGroupByMuscleId[subgroup.muscle_id];
    if (parentGroup === primaryGroupKey) addScore(scores, subgroup.name_key, 45);
  });

  const text = `${exercise.name} ${exercise.type || ''} ${exercise.equipment || ''}`.toLowerCase();
  EXERCISE_RULES.forEach((rule) => {
    if (rule.keywords.some((keyword) => text.includes(keyword))) {
      Object.entries(rule.scores).forEach(([subgroupKey, delta]) => addScore(scores, subgroupKey, delta));
    }
  });

  if (primaryGroupKey && !Object.values(scores).some((value) => value >= 40)) {
    addScore(scores, GROUP_DEFAULT_SUBGROUP[primaryGroupKey], 55);
  }

  return scores;
}

function tokenToSubgroupScore(token) {
  const text = norm(token);
  const next = {};

  if (text.includes('upper chest')) next.upper_chest = 35;
  if (text.includes('mid chest') || text === 'chest') next.mid_chest = Math.max(next.mid_chest || 0, 34);
  if (text.includes('lower chest')) next.lower_chest = 35;

  if (text.includes('lat')) next.lats = 35;
  if (text.includes('upper back')) next.upper_back = 30;
  if (text.includes('mid back')) next.mid_back = 30;
  if (text.includes('lower back')) next.lower_back = 30;
  if (text.includes('trap')) next.traps = 30;

  if (text.includes('quad')) next.quads = 35;
  if (text.includes('hamstring')) next.hamstrings = 35;
  if (text.includes('glute')) next.glutes = 35;
  if (text.includes('calf')) next.calves = 35;

  if (text.includes('front delt')) next.front_delts = 35;
  if (text.includes('side delt')) next.side_delts = 35;
  if (text.includes('rear delt')) next.rear_delts = 35;

  if (text.includes('bicep')) next.biceps = 35;
  if (text.includes('tricep')) next.triceps = 35;
  if (text.includes('forearm')) next.forearms = 35;

  if (text.includes('abs')) next.abs = 35;
  if (text.includes('oblique')) next.obliques = 35;
  if (text.includes('lower abs')) next.lower_abs = 35;

  if (text.includes('leg') && !next.quads && !next.hamstrings) {
    next.quads = 20;
    next.glutes = 14;
  }

  return next;
}

function computeMachineScores(machine, subgroupRows) {
  const scores = {};
  subgroupRows.forEach((subgroup) => {
    scores[subgroup.name_key] = 0;
  });

  const muscles = Array.isArray(machine.primary_muscles) ? machine.primary_muscles : [];
  muscles.forEach((token) => {
    const byToken = tokenToSubgroupScore(token);
    Object.entries(byToken).forEach(([key, delta]) => addScore(scores, key, delta));
  });

  const text = `${machine.name} ${machine.zone || ''}`.toLowerCase();
  MACHINE_RULES.forEach((rule) => {
    if (rule.keywords.some((keyword) => text.includes(keyword))) {
      Object.entries(rule.scores).forEach(([subgroupKey, delta]) => addScore(scores, subgroupKey, delta));
    }
  });

  return scores;
}

async function upsertInBatches(client, table, rows) {
  const chunkSize = 400;
  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    const response = await client.from(table).upsert(chunk, {
      onConflict: table === 'muscle_exercise_map' ? 'muscle_subgroup_id,exercise_id' : 'muscle_subgroup_id,machine_id',
    });
    if (response.error) throw response.error;
  }
}

async function main() {
  const client = makeSupabaseClient({ requireServiceRole: true });

  const [musclesRes, subgroupsRes, exercisesRes, machinesRes] = await Promise.all([
    client.from('muscles').select('id,name_key'),
    client.from('muscle_subgroups').select('id,muscle_id,name,name_key'),
    client.from('catalog_exercises').select('id,name,type,primary_muscle_group,equipment').is('created_by', null),
    client.from('catalog_machines').select('id,name,zone,primary_muscles').is('created_by', null),
  ]);

  if (musclesRes.error) throw musclesRes.error;
  if (subgroupsRes.error) throw subgroupsRes.error;
  if (exercisesRes.error) throw exercisesRes.error;
  if (machinesRes.error) throw machinesRes.error;

  const muscles = musclesRes.data || [];
  const subgroups = subgroupsRes.data || [];
  const exercises = exercisesRes.data || [];
  const machines = machinesRes.data || [];

  const parentGroupByMuscleId = {};
  muscles.forEach((muscle) => {
    parentGroupByMuscleId[muscle.id] = muscle.name_key;
  });

  const subgroupLookup = buildSubgroupLookup(subgroups);

  const exerciseRows = [];
  exercises.forEach((exercise) => {
    const scores = computeExerciseScores(exercise, subgroups, parentGroupByMuscleId);
    Object.entries(scores).forEach(([subgroupKey, score]) => {
      if (score < 40) return;
      const subgroup = subgroupLookup.byKey[subgroupKey];
      if (!subgroup) return;
      exerciseRows.push({
        muscle_subgroup_id: subgroup.id,
        exercise_id: exercise.id,
        is_primary: score >= 80,
        target_score: score,
        mapping_source: 'rule_v1',
      });
    });
  });

  const machineRows = [];
  machines.forEach((machine) => {
    const scores = computeMachineScores(machine, subgroups);
    Object.entries(scores).forEach(([subgroupKey, score]) => {
      if (score < 20) return;
      const subgroup = subgroupLookup.byKey[subgroupKey];
      if (!subgroup) return;
      machineRows.push({
        muscle_subgroup_id: subgroup.id,
        machine_id: machine.id,
        is_primary: score >= 80,
        target_score: score,
        mapping_source: 'rule_v1',
      });
    });
  });

  const wipeExercise = await client.from('muscle_exercise_map').delete().eq('mapping_source', 'rule_v1');
  if (wipeExercise.error) throw wipeExercise.error;

  const wipeMachine = await client.from('muscle_machine_map').delete().eq('mapping_source', 'rule_v1');
  if (wipeMachine.error) throw wipeMachine.error;

  await upsertInBatches(client, 'muscle_exercise_map', exerciseRows);
  await upsertInBatches(client, 'muscle_machine_map', machineRows);

  console.log('[gym-mapping] score generation done');
  console.log(`[gym-mapping] exercise mappings upserted: ${exerciseRows.length}`);
  console.log(`[gym-mapping] machine mappings upserted: ${machineRows.length}`);
}

main().catch((error) => {
  console.error('[gym-mapping] generate_scores failed');
  console.error(error?.message || error);
  process.exit(1);
});
