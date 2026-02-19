function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function toDateOrNull(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function getWeekStart(now) {
  const next = new Date(now);
  const day = next.getDay();
  const offset = day === 0 ? 6 : day - 1;
  next.setDate(next.getDate() - offset);
  next.setHours(0, 0, 0, 0);
  return next;
}

function formatShortDate(value) {
  const parsed = toDateOrNull(value);
  if (!parsed) return 'Not yet trained';
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function buildMuscleStats({
  mappedExercises,
  sessionHistory,
  now = new Date(),
}) {
  const normalizedExerciseNames = new Set(
    (mappedExercises || [])
      .map((exercise) => normalizeText(exercise?.name))
      .filter(Boolean),
  );

  const workouts = (sessionHistory || []).filter((record) => record?.type === 'workout');

  const matchedSessions = workouts.filter((record) => {
    const timeline = Array.isArray(record?.summary?.timeline) ? record.summary.timeline : [];
    return timeline.some((entry) => normalizedExerciseNames.has(normalizeText(entry?.title)));
  });

  const latestSession = matchedSessions
    .slice()
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0];

  const weekStart = getWeekStart(now);
  const weeklySessions = matchedSessions.filter((record) => {
    const startedAt = toDateOrNull(record?.startedAt);
    return startedAt && startedAt >= weekStart;
  });

  const setsThisWeek = weeklySessions.reduce(
    (sum, record) => sum + Math.max(0, Number(record?.summary?.setsCount) || 0),
    0,
  );
  const weeklyVolumeProxy = weeklySessions.reduce(
    (sum, record) => sum + Math.max(0, Number(record?.summary?.volumeKg) || 0),
    0,
  );

  const lastTrainedAt = latestSession?.startedAt || null;
  const lastTrainedDate = toDateOrNull(lastTrainedAt);

  let suggestedFocus = 'Not trained yet';
  if (lastTrainedDate) {
    const elapsedDays = (now.getTime() - lastTrainedDate.getTime()) / (1000 * 60 * 60 * 24);
    suggestedFocus = elapsedDays > 7 ? 'Due' : 'On track';
  }

  return {
    lastTrainedAt,
    lastTrainedLabel: formatShortDate(lastTrainedAt),
    setsThisWeek,
    weeklyVolumeProxy,
    suggestedFocus,
    matchedSessionCount: matchedSessions.length,
  };
}

export function sortMappingsByPriorityAndName(rows, keyName) {
  return rows
    .slice()
    .sort((a, b) => {
      const primaryDelta = Number(Boolean(b.is_primary)) - Number(Boolean(a.is_primary));
      if (primaryDelta !== 0) return primaryDelta;
      return String(a?.[keyName]?.name || '').localeCompare(String(b?.[keyName]?.name || ''));
    });
}
