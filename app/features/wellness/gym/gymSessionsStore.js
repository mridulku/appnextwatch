const sessions = [];

function cloneSet(setRow, index) {
  return {
    id: setRow.id || `set_${Date.now()}_${index + 1}`,
    setNumber: index + 1,
    reps: String(setRow.reps ?? ''),
    weight: String(setRow.weight ?? ''),
  };
}

function cloneExercise(exercise, index) {
  return {
    instanceId: exercise.instanceId || `${exercise.libraryId || exercise.id}_${Date.now()}_${index + 1}`,
    libraryId: exercise.libraryId || exercise.id,
    name: exercise.name,
    muscle: exercise.muscle || 'Muscle',
    equipment: exercise.equipment || 'Equipment',
    sets: Array.isArray(exercise.sets) ? exercise.sets.map(cloneSet) : [],
  };
}

function formatDateISO(value) {
  if (!value) return new Date().toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

export function listGymSessions() {
  return [...sessions];
}

export function getGymSessionById(sessionId) {
  return sessions.find((entry) => entry.id === sessionId) || null;
}

export function createGymSession(payload) {
  const now = new Date().toISOString();
  const nextSession = {
    id: `session_${Date.now()}`,
    title: String(payload?.title || '').trim() || `Session ${sessions.length + 1}`,
    createdAt: now,
    status: 'not_started',
    startedAt: null,
    completedAt: null,
    dateISO: formatDateISO(payload?.dateISO),
    durationMin: Number(payload?.durationMin) || 45,
    estCalories: payload?.estCalories ? Number(payload.estCalories) : null,
    whyNote: String(payload?.whyNote || '').trim(),
    exercises: Array.isArray(payload?.exercises) ? payload.exercises.map(cloneExercise) : [],
  };

  sessions.unshift(nextSession);
  return nextSession;
}

export function startGymSession(sessionId) {
  const target = sessions.find((entry) => entry.id === sessionId);
  if (!target) return null;
  if (target.status === 'complete') return target;
  target.status = 'in_progress';
  target.startedAt = target.startedAt || new Date().toISOString();
  return target;
}

export function completeGymSession(sessionId) {
  const target = sessions.find((entry) => entry.id === sessionId);
  if (!target) return null;
  target.status = 'complete';
  target.startedAt = target.startedAt || new Date().toISOString();
  target.completedAt = new Date().toISOString();
  return target;
}

export function setGymSessionStatus(sessionId, status) {
  const target = sessions.find((entry) => entry.id === sessionId);
  if (!target) return null;
  if (status === 'in_progress') {
    target.status = 'in_progress';
    target.startedAt = target.startedAt || new Date().toISOString();
    return target;
  }
  if (status === 'complete') {
    target.status = 'complete';
    target.startedAt = target.startedAt || new Date().toISOString();
    target.completedAt = new Date().toISOString();
    return target;
  }
  target.status = 'not_started';
  target.completedAt = null;
  return target;
}

export function duplicateGymSession(sessionId, nextTitle) {
  const source = sessions.find((entry) => entry.id === sessionId);
  if (!source) return null;

  const duplicate = {
    ...source,
    id: `session_${Date.now()}`,
    title: String(nextTitle || '').trim() || `${source.title} Copy`,
    createdAt: new Date().toISOString(),
    status: 'not_started',
    startedAt: null,
    completedAt: null,
    exercises: Array.isArray(source.exercises)
      ? source.exercises.map((exercise, index) => ({
          ...cloneExercise(exercise, index),
          sets: Array.isArray(exercise.sets)
            ? exercise.sets.map((setRow, setIndex) => cloneSet(setRow, setIndex))
            : [],
        }))
      : [],
  };

  sessions.unshift(duplicate);
  return duplicate;
}
