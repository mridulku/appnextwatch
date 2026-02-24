function toNumeric(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isCardioExercise(name = '') {
  const key = String(name || '').toLowerCase();
  return ['treadmill', 'row', 'bike', 'cycling', 'run', 'jog', 'elliptical', 'stair'].some((token) =>
    key.includes(token),
  );
}

function estimateSetWorkMinutes(reps) {
  const resolvedReps = Math.max(4, Math.min(25, toNumeric(reps, 10)));
  return Math.max(0.45, Math.min(1.5, resolvedReps * 0.055));
}

export function estimateExerciseDurationMin({ name, sets }) {
  const rows = Array.isArray(sets) ? sets : [];
  const setCount = Math.max(1, rows.length || 0);
  const cardio = isCardioExercise(name);

  if (cardio) {
    return Math.max(6, Math.round(8 + setCount * 1.5));
  }

  const avgWork = rows.length
    ? rows.reduce((sum, row) => sum + estimateSetWorkMinutes(row?.reps), 0) / rows.length
    : estimateSetWorkMinutes(10);
  const restPerGap = 1.5;
  const setup = 1;
  const time = setup + avgWork * setCount + restPerGap * Math.max(0, setCount - 1);
  return Math.max(4, Math.round(time));
}

export function estimateSessionDurationMin(exercises) {
  const rows = Array.isArray(exercises) ? exercises : [];
  if (!rows.length) return 0;
  const exerciseMins = rows.reduce(
    (sum, entry) => sum + estimateExerciseDurationMin({ name: entry?.name, sets: entry?.sets }),
    0,
  );
  const transitions = Math.max(0, rows.length - 1) * 1;
  return Math.round(exerciseMins + transitions);
}

export function estimateSessionCalories(durationMin) {
  return Math.max(0, Math.round(toNumeric(durationMin, 0) * 6));
}
