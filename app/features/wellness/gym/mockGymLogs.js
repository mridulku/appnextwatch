export const DAY_TYPES = ['Push Day', 'Pull Day', 'Leg Day'];
export const STATUSES = ['Planned', 'Completed'];

function buildSets(setCount, reps, weight) {
  return Array.from({ length: setCount }).map((_, index) => ({
    set: index + 1,
    reps,
    weight,
  }));
}

function getSetVolume(setRow) {
  const reps = Number(setRow?.reps || 0);
  const weight = Number(setRow?.weight || 0);
  return reps * weight;
}

function sumVolume(sets = []) {
  return sets.reduce((sum, setRow) => sum + getSetVolume(setRow), 0);
}

function sumSetCount(sets = []) {
  return sets.length;
}

export function getRoutineLabel(dayType) {
  if (dayType === 'Push Day' || dayType === 'Pull Day' || dayType === 'Leg Day') {
    return dayType;
  }
  return 'Push Day';
}

function normalizeExercise(exercise) {
  const plannedSets = Array.isArray(exercise?.planned_sets) ? exercise.planned_sets : [];
  const actualSets = Array.isArray(exercise?.actual_sets) && exercise.actual_sets.length > 0
    ? exercise.actual_sets
    : null;

  return {
    ...exercise,
    planned_sets: plannedSets,
    actual_sets: actualSets,
    status: actualSets ? 'logged' : 'planned',
  };
}

function deriveSummary(exercises = [], fallbackCalories = null) {
  let totalSets = 0;
  let estVolumeKg = 0;

  exercises.forEach((exercise) => {
    const sourceSets = exercise.actual_sets || exercise.planned_sets || [];
    totalSets += sumSetCount(sourceSets);
    estVolumeKg += sumVolume(sourceSets);
  });

  return {
    totalSets,
    estVolumeKg: Math.round(estVolumeKg),
    estCalories: fallbackCalories,
  };
}

function deriveLogStatus(exercises = []) {
  const allLogged = exercises.length > 0 && exercises.every((exercise) => exercise.actual_sets !== null);
  return allLogged ? 'Completed' : 'Planned';
}

const RAW_MOCK_LOGS = [
  {
    id: 'log_2026_02_20',
    dateISO: '2026-02-20',
    dayType: 'Push Day',
    durationMin: 48,
    summary: {
      estCalories: 338,
    },
    exercises: [
      {
        id: 'ex_push_1',
        catalogExerciseId: '22da0254-d5d7-48f9-839b-9235a8135926',
        name: 'Bench Press',
        primaryGroup: 'Chest',
        equipment: 'Barbell',
        image: null,
        planned_sets: buildSets(4, 8, 40),
        actual_sets: buildSets(4, 8, 37.5),
      },
      {
        id: 'ex_push_2',
        catalogExerciseId: 'f90a1f8b-c3d6-4c74-8dbc-be06acbc4804',
        name: 'Incline Dumbbell Press',
        primaryGroup: 'Chest',
        equipment: 'Dumbbell',
        image: null,
        planned_sets: buildSets(3, 10, 22),
        actual_sets: buildSets(3, 10, 20),
      },
      {
        id: 'ex_push_3',
        catalogExerciseId: '8a737165-7b00-4deb-a2b4-4aabd3ddd9c5',
        name: 'Lateral Raise',
        primaryGroup: 'Shoulders',
        equipment: 'Dumbbell',
        image: null,
        planned_sets: buildSets(3, 12, 10),
        actual_sets: buildSets(3, 12, 10),
      },
    ],
    notes: 'Good pace. Keep rest periods shorter on final isolation set.',
  },
  {
    id: 'log_2026_02_18',
    dateISO: '2026-02-18',
    dayType: 'Pull Day',
    durationMin: 53,
    summary: {
      estCalories: 349,
    },
    exercises: [
      {
        id: 'ex_pull_1',
        catalogExerciseId: '09e94363-2def-4b2d-b35c-2a2a280dfba4',
        name: 'Lat Pulldown',
        primaryGroup: 'Back',
        equipment: 'Cable',
        image: null,
        planned_sets: buildSets(4, 10, 55),
        actual_sets: buildSets(4, 10, 52.5),
      },
      {
        id: 'ex_pull_2',
        catalogExerciseId: '1ee66934-90a6-4825-9b76-2965d0d95720',
        name: 'Seated Cable Row',
        primaryGroup: 'Back',
        equipment: 'Cable',
        image: null,
        planned_sets: buildSets(3, 10, 52),
        actual_sets: buildSets(3, 10, 50),
      },
      {
        id: 'ex_pull_3',
        catalogExerciseId: '68a08b31-7829-42a8-aae7-bd0bdc499fdc',
        name: 'Biceps Curl',
        primaryGroup: 'Arms',
        equipment: 'Dumbbell',
        image: null,
        planned_sets: buildSets(3, 12, 12),
        actual_sets: buildSets(3, 12, 12),
      },
    ],
    notes: '',
  },
  {
    id: 'log_2026_02_16',
    dateISO: '2026-02-16',
    dayType: 'Leg Day',
    durationMin: 62,
    summary: {
      estCalories: 402,
    },
    exercises: [
      {
        id: 'ex_leg_1',
        catalogExerciseId: 'd6c3cb23-3638-4e46-a746-463ab76fb8b2',
        name: 'Back Squat',
        primaryGroup: 'Legs',
        equipment: 'Barbell',
        image: null,
        planned_sets: buildSets(5, 5, 90),
        actual_sets: buildSets(5, 5, 87.5),
      },
      {
        id: 'ex_leg_2',
        catalogExerciseId: 'f6e14b77-111b-4c4a-8c45-9d5cac861a7c',
        name: 'Leg Press',
        primaryGroup: 'Legs',
        equipment: 'Machine',
        image: null,
        planned_sets: buildSets(4, 12, 160),
        actual_sets: buildSets(4, 12, 155),
      },
      {
        id: 'ex_leg_3',
        catalogExerciseId: null,
        name: 'Calf Raise',
        primaryGroup: 'Legs',
        equipment: 'Machine',
        image: null,
        planned_sets: buildSets(4, 15, 60),
        actual_sets: buildSets(4, 15, 55),
      },
    ],
    notes: 'Great depth consistency.',
  },
  {
    id: 'log_2026_02_14',
    dateISO: '2026-02-14',
    dayType: 'Push Day',
    durationMin: 46,
    summary: {
      estCalories: null,
    },
    exercises: [
      {
        id: 'ex_plan_1',
        catalogExerciseId: '2ee1c63a-5e2f-44f3-a572-4aaaeebfdc44',
        name: 'Shoulder Press',
        primaryGroup: 'Shoulders',
        equipment: 'Dumbbell',
        image: null,
        planned_sets: buildSets(4, 8, 24),
        actual_sets: null,
      },
      {
        id: 'ex_plan_2',
        catalogExerciseId: null,
        name: 'Chest Fly',
        primaryGroup: 'Chest',
        equipment: 'Cable',
        image: null,
        planned_sets: buildSets(3, 12, 32),
        actual_sets: null,
      },
      {
        id: 'ex_plan_3',
        catalogExerciseId: '251920ae-4b93-4da4-b873-5adf0657d489',
        name: 'Triceps Pushdown',
        primaryGroup: 'Arms',
        equipment: 'Cable',
        image: null,
        planned_sets: buildSets(4, 10, 30),
        actual_sets: null,
      },
    ],
    notes: 'Planned session. Keep transitions quick.',
  },
];

export const MOCK_LOGS = RAW_MOCK_LOGS
  .map((log) => {
    const exercises = (log.exercises || []).map(normalizeExercise);
    const summary = deriveSummary(exercises, log.summary?.estCalories ?? null);
    const status = deriveLogStatus(exercises);

    return {
      ...log,
      dayType: getRoutineLabel(log.dayType),
      status,
      summary,
      exercises,
    };
  })
  .sort((a, b) => b.dateISO.localeCompare(a.dateISO));

export function findLogById(logId) {
  return MOCK_LOGS.find((log) => log.id === logId) || null;
}

export function cloneLog(log) {
  return JSON.parse(JSON.stringify(log));
}

export function updateExerciseActualSets(log, exerciseId, actualSetsInput) {
  if (!log || !exerciseId) return log;

  const sanitizedActualSets = (actualSetsInput || [])
    .map((setRow, index) => ({
      set: Number(setRow?.set || index + 1),
      reps: Math.max(1, Number(setRow?.reps || 0)),
      weight: Math.max(0, Number(setRow?.weight || 0)),
    }))
    .filter((setRow) => Number.isFinite(setRow.reps) && Number.isFinite(setRow.weight));

  const exercises = (log.exercises || []).map((exercise) => {
    if (exercise.id !== exerciseId) return exercise;

    const normalized = normalizeExercise(exercise);
    return {
      ...normalized,
      actual_sets: sanitizedActualSets.length ? sanitizedActualSets : null,
      status: sanitizedActualSets.length ? 'logged' : 'planned',
    };
  });

  const summary = deriveSummary(exercises, log.summary?.estCalories ?? null);
  const status = deriveLogStatus(exercises);

  return {
    ...log,
    exercises,
    summary,
    status,
  };
}

export default MOCK_LOGS;
