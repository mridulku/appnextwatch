import { getMuscleGroupByKey } from './muscleTaxonomy';

function norm(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const GROUP_ALIASES = {
  chest: 'chest',
  back: 'back',
  legs: 'legs',
  shoulders: 'shoulders',
  arms: 'arms',
  core: 'core',
  cardio: 'core',
};

const MACHINE_MUSCLE_ALIASES = {
  lats: 'lats',
  upper_back: 'upper_back',
  mid_back: 'mid_back',
  lower_back: 'lower_back',
  traps: 'traps',
  quads: 'quads',
  hamstrings: 'hamstrings',
  glutes: 'glutes',
  calves: 'calves',
  biceps: 'biceps',
  triceps: 'triceps',
  shoulders: 'front_delts',
  chest: 'mid_chest',
  abs: 'abs',
  obliques: 'obliques',
  cardio: 'abs',
};

function inferSubgroupFromExerciseName(groupKey, nameKey = '') {
  const key = norm(nameKey);

  if (groupKey === 'arms') {
    if (key.includes('tricep') || key.includes('pushdown')) return 'triceps';
    if (key.includes('curl')) return 'biceps';
    return 'forearms';
  }

  if (groupKey === 'back') {
    if (key.includes('pulldown') || key.includes('pull_up') || key.includes('lat')) return 'lats';
    if (key.includes('row')) return 'mid_back';
    if (key.includes('shrug') || key.includes('trap')) return 'traps';
    if (key.includes('deadlift') || key.includes('hyperextension')) return 'lower_back';
    return 'upper_back';
  }

  if (groupKey === 'legs') {
    if (key.includes('curl') || key.includes('hamstring')) return 'hamstrings';
    if (key.includes('glute') || key.includes('hip_thrust')) return 'glutes';
    if (key.includes('calf')) return 'calves';
    return 'quads';
  }

  if (groupKey === 'shoulders') {
    if (key.includes('rear') || key.includes('reverse_fly')) return 'rear_delts';
    if (key.includes('lateral') || key.includes('side')) return 'side_delts';
    return 'front_delts';
  }

  if (groupKey === 'chest') {
    if (key.includes('incline') || key.includes('upper')) return 'upper_chest';
    return 'mid_chest';
  }

  if (groupKey === 'core') {
    if (key.includes('oblique')) return 'obliques';
    if (key.includes('lower')) return 'lower_abs';
    return 'abs';
  }

  return null;
}

export function mapExerciseToGroupKey(exercise) {
  const primary = norm(exercise?.primary_muscle_group);
  return GROUP_ALIASES[primary] || null;
}

export function mapExerciseToSubgroupKey(exercise) {
  const groupKey = mapExerciseToGroupKey(exercise);
  if (!groupKey) return null;
  return inferSubgroupFromExerciseName(groupKey, exercise?.name_key || exercise?.name || '');
}

export function mapMachineToSubgroupKeys(machine) {
  const raw = Array.isArray(machine?.primary_muscles) ? machine.primary_muscles : [];
  const keys = raw
    .map((value) => MACHINE_MUSCLE_ALIASES[norm(value)] || null)
    .filter(Boolean);
  return Array.from(new Set(keys));
}

export function getGroupExerciseCount(groupKey, exercises) {
  return exercises.filter((exercise) => mapExerciseToGroupKey(exercise) === groupKey).length;
}

export function getSubgroupExerciseCount(groupKey, subKey, exercises) {
  return exercises.filter(
    (exercise) =>
      mapExerciseToGroupKey(exercise) === groupKey &&
      mapExerciseToSubgroupKey(exercise) === subKey,
  ).length;
}

export function getSubgroupMachineCount(subKey, machines) {
  return machines.filter((machine) => mapMachineToSubgroupKeys(machine).includes(subKey)).length;
}

export function filterExercisesForMuscle(groupKey, subKey, exercises) {
  return exercises.filter((exercise) => {
    if (mapExerciseToGroupKey(exercise) !== groupKey) return false;
    if (!subKey) return true;
    return mapExerciseToSubgroupKey(exercise) === subKey;
  });
}

export function filterMachinesForMuscle(groupKey, subKey, machines) {
  const group = getMuscleGroupByKey(groupKey);
  const validSubgroups = new Set(group?.subgroups.map((s) => s.key) || []);
  return machines.filter((machine) => {
    const mapped = mapMachineToSubgroupKeys(machine);
    if (!mapped.length) return false;
    if (!subKey) return mapped.some((key) => validSubgroups.has(key));
    return mapped.includes(subKey);
  });
}
