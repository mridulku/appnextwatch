import MOCK_LOGS from './mockGymLogs';

const DAY_MS = 24 * 60 * 60 * 1000;

export const PROGRAM_START_DATE = '2026-01-05';
export const PAST_WEEKS_COUNT = 4;
export const FUTURE_WEEKS_COUNT = 2;

// Monday..Sunday
export const WEEKLY_PLAN = ['push', 'pull', 'rest', 'legs', 'rest', 'push', 'rest'];

const DAY_TYPE_LABELS = {
  push: 'Push Day',
  pull: 'Pull Day',
  legs: 'Leg Day',
  rest: 'Rest Day',
};

const STATUS_LABELS = {
  planned: 'Planned',
  completed: 'Completed',
  missed: 'Skipped',
  rest: 'Rest',
};

function toDateOnly(value) {
  const date = value instanceof Date ? new Date(value) : new Date(`${String(value).slice(0, 10)}T00:00:00`);
  date.setHours(0, 0, 0, 0);
  return date;
}

function toISODate(value) {
  return toDateOnly(value).toISOString().slice(0, 10);
}

function addDays(dateValue, days) {
  const date = toDateOnly(dateValue);
  date.setDate(date.getDate() + days);
  return date;
}

export function startOfISOWeek(dateValue) {
  const date = toDateOnly(dateValue);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(date, diff);
}

export function endOfISOWeek(dateValue) {
  return addDays(startOfISOWeek(dateValue), 6);
}

function formatMonthDay(dateValue) {
  return toDateOnly(dateValue).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatWeekRange(startValue, endValue) {
  const startDate = toDateOnly(startValue);
  const endDate = toDateOnly(endValue);
  const sameMonth = startDate.getMonth() === endDate.getMonth();

  if (sameMonth) {
    return `${startDate.toLocaleDateString('en-US', { month: 'short' })} ${startDate.getDate()}-${endDate.getDate()}`;
  }

  return `${formatMonthDay(startDate)}-${formatMonthDay(endDate)}`;
}

export function getProgramWeekIndex(dateValue, programStartDate = PROGRAM_START_DATE) {
  const targetStart = startOfISOWeek(dateValue);
  const programStart = startOfISOWeek(programStartDate);
  const diffMs = targetStart.getTime() - programStart.getTime();
  return Math.floor(diffMs / (DAY_MS * 7)) + 1;
}

export function getPlannedTypeForDayOfWeek(dayIndex) {
  return WEEKLY_PLAN[dayIndex] || 'rest';
}

function getFallbackWorkoutType(dayIndex) {
  for (let offset = 0; offset < 7; offset += 1) {
    const candidate = WEEKLY_PLAN[(dayIndex + offset) % 7];
    if (candidate && candidate !== 'rest') {
      return candidate;
    }
  }
  return 'push';
}

export function getDayTypeLabel(dayType) {
  return DAY_TYPE_LABELS[dayType] || 'Rest Day';
}

export function getStatusLabel(status) {
  return STATUS_LABELS[status] || 'Planned';
}

function normalizeDetailFromLog(log) {
  if (!log) return null;
  return {
    ...log,
    dayType: log.dayType || getDayTypeLabel('push'),
  };
}

function createPlannedExercises(dayType) {
  if (dayType === 'push') {
    return [
      {
        id: 'planned_push_1',
        name: 'Bench Press',
        primaryGroup: 'Chest',
        equipment: 'Barbell',
        planned_sets: [
          { set: 1, reps: 8, weight: 40 },
          { set: 2, reps: 8, weight: 40 },
          { set: 3, reps: 8, weight: 40 },
          { set: 4, reps: 8, weight: 40 },
        ],
        actual_sets: null,
        status: 'planned',
      },
      {
        id: 'planned_push_2',
        name: 'Incline Dumbbell Press',
        primaryGroup: 'Chest',
        equipment: 'Dumbbell',
        planned_sets: [
          { set: 1, reps: 10, weight: 22 },
          { set: 2, reps: 10, weight: 22 },
          { set: 3, reps: 10, weight: 22 },
        ],
        actual_sets: null,
        status: 'planned',
      },
    ];
  }

  if (dayType === 'pull') {
    return [
      {
        id: 'planned_pull_1',
        name: 'Lat Pulldown',
        primaryGroup: 'Back',
        equipment: 'Cable',
        planned_sets: [
          { set: 1, reps: 10, weight: 55 },
          { set: 2, reps: 10, weight: 55 },
          { set: 3, reps: 10, weight: 55 },
          { set: 4, reps: 10, weight: 55 },
        ],
        actual_sets: null,
        status: 'planned',
      },
      {
        id: 'planned_pull_2',
        name: 'Seated Cable Row',
        primaryGroup: 'Back',
        equipment: 'Cable',
        planned_sets: [
          { set: 1, reps: 10, weight: 50 },
          { set: 2, reps: 10, weight: 50 },
          { set: 3, reps: 10, weight: 50 },
        ],
        actual_sets: null,
        status: 'planned',
      },
    ];
  }

  return [
    {
      id: 'planned_legs_1',
      name: 'Back Squat',
      primaryGroup: 'Legs',
      equipment: 'Barbell',
      planned_sets: [
        { set: 1, reps: 5, weight: 90 },
        { set: 2, reps: 5, weight: 90 },
        { set: 3, reps: 5, weight: 90 },
        { set: 4, reps: 5, weight: 90 },
      ],
      actual_sets: null,
      status: 'planned',
    },
    {
      id: 'planned_legs_2',
      name: 'Leg Press',
      primaryGroup: 'Legs',
      equipment: 'Machine',
      planned_sets: [
        { set: 1, reps: 12, weight: 160 },
        { set: 2, reps: 12, weight: 160 },
        { set: 3, reps: 12, weight: 160 },
      ],
      actual_sets: null,
      status: 'planned',
    },
  ];
}

function createPlannedDetail(dateISO, dayType, dayStatus) {
  const exercises = createPlannedExercises(dayType);
  const totalSets = exercises.reduce((sum, exercise) => sum + (exercise.planned_sets?.length || 0), 0);
  const estVolumeKg = exercises
    .flatMap((exercise) => exercise.planned_sets || [])
    .reduce((sum, setRow) => sum + Number(setRow.reps || 0) * Number(setRow.weight || 0), 0);

  return {
    id: `planned_${dateISO}_${dayType}`,
    dateISO,
    dayType: getDayTypeLabel(dayType),
    status: dayStatus === 'completed' ? 'Completed' : 'Planned',
    durationMin: dayType === 'legs' ? 55 : 45,
    summary: {
      totalSets,
      estVolumeKg: Math.round(estVolumeKg),
      estCalories: null,
    },
    exercises,
    notes: '',
  };
}

function mapStatusFromRealLog(log) {
  if (!log) return null;
  const normalized = String(log.status || '').toLowerCase();
  if (normalized === 'completed') return 'completed';
  if (normalized === 'skipped' || normalized === 'missed') return 'missed';
  return 'planned';
}

function buildWeekDays({ weekStart, todayDate, realLogMap }) {
  const days = [];
  const todayTs = toDateOnly(todayDate).getTime();

  for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
    const date = addDays(weekStart, dayIndex);
    const dateISO = toISODate(date);
    const dayTs = toDateOnly(dateISO).getTime();
    const isPast = dayTs < todayTs;
    const isToday = dayTs === todayTs;
    const isFuture = dayTs > todayTs;
    let plannedType = getPlannedTypeForDayOfWeek(dayIndex);
    const realLog = realLogMap.get(dateISO);
    const hasExplicitSkip = Boolean(realLog?.user_marked_skipped) || String(realLog?.status || '').toLowerCase() === 'skipped';

    // Keep Today actionable: never show Today as a rest day in the logs hub.
    if (isToday && plannedType === 'rest') {
      plannedType = getFallbackWorkoutType(dayIndex);
    }

    let status = 'planned';
    if (plannedType === 'rest') {
      status = 'rest';
    } else if (isToday) {
      // Product decision: Today is always an actionable planned session in Logs.
      status = 'planned';
    } else if (realLog && mapStatusFromRealLog(realLog) === 'completed') {
      status = 'completed';
    } else if (hasExplicitSkip) {
      status = 'missed';
    } else if (isPast) {
      status = 'missed';
    } else if (isToday) {
      status = 'planned';
    } else if (isFuture) {
      status = 'planned';
    } else if (realLog) {
      status = mapStatusFromRealLog(realLog);
    }

    let detail = null;
    if (plannedType !== 'rest') {
      if (isToday) {
        detail = createPlannedDetail(dateISO, plannedType, status);
      } else {
        detail = realLog ? normalizeDetailFromLog(realLog) : createPlannedDetail(dateISO, plannedType, status);
      }
    }

    const summary = realLog?.summary
      ? {
          durationMin: realLog.durationMin,
          sets: realLog.summary.totalSets,
          volumeKg: realLog.summary.estVolumeKg,
          calories: realLog.summary.estCalories,
        }
      : undefined;

    days.push({
      dateISO,
      plannedType,
      status,
      summary,
      detail,
    });
  }

  return days;
}

function buildCompletionSummary(days, isDraft = false) {
  const workoutDays = days.filter((day) => day.plannedType !== 'rest');
  const completedCount = workoutDays.filter((day) => day.status === 'completed').length;

  return {
    completedCount,
    totalCount: workoutDays.length,
    label: isDraft ? 'Draft' : `${completedCount}/${workoutDays.length} done`,
  };
}

function createWeekModel({ weekStart, todayISO, currentWeekStartISO, programStartDate, realLogMap }) {
  const weekEnd = endOfISOWeek(weekStart);
  const startISO = toISODate(weekStart);
  const endISO = toISODate(weekEnd);
  const startTs = toDateOnly(startISO).getTime();
  const currentTs = toDateOnly(currentWeekStartISO).getTime();

  let weekKind = 'current';
  if (startTs < currentTs) weekKind = 'past';
  if (startTs > currentTs) weekKind = 'upcoming';

  const days = buildWeekDays({ weekStart, todayDate: todayISO, realLogMap });

  return {
    weekIndex: getProgramWeekIndex(startISO, programStartDate),
    startDate: startISO,
    endDate: endISO,
    rangeLabel: formatWeekRange(startISO, endISO),
    weekKind,
    days,
    completionSummary: buildCompletionSummary(days, weekKind === 'upcoming'),
  };
}

export function buildWorkoutWeekSections({
  today = new Date(),
  programStartDate = PROGRAM_START_DATE,
  pastWeeks = PAST_WEEKS_COUNT,
  futureWeeks = FUTURE_WEEKS_COUNT,
  sourceLogs = MOCK_LOGS,
} = {}) {
  const todayISO = toISODate(today);
  const currentWeekStart = startOfISOWeek(today);
  const currentWeekStartISO = toISODate(currentWeekStart);

  const realLogMap = new Map((sourceLogs || []).map((log) => [toISODate(log.dateISO), log]));

  const currentWeek = createWeekModel({
    weekStart: currentWeekStart,
    todayISO,
    currentWeekStartISO,
    programStartDate,
    realLogMap,
  });

  const past = Array.from({ length: pastWeeks }).map((_, idx) =>
    createWeekModel({
      weekStart: addDays(currentWeekStart, -7 * (idx + 1)),
      todayISO,
      currentWeekStartISO,
      programStartDate,
      realLogMap,
    }),
  );

  const upcoming = Array.from({ length: futureWeeks }).map((_, idx) =>
    createWeekModel({
      weekStart: addDays(currentWeekStart, 7 * (idx + 1)),
      todayISO,
      currentWeekStartISO,
      programStartDate,
      realLogMap,
    }),
  );

  past.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  upcoming.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  const todayTs = toDateOnly(todayISO).getTime();
  const todayDay = currentWeek.days.find((day) => toDateOnly(day.dateISO).getTime() === todayTs) || null;
  const earlierThisWeek = currentWeek.days.filter((day) => toDateOnly(day.dateISO).getTime() < todayTs);
  const laterThisWeek = currentWeek.days.filter((day) => toDateOnly(day.dateISO).getTime() > todayTs);

  return {
    todayISO,
    todayDay,
    currentWeek,
    earlierThisWeek,
    laterThisWeek,
    pastWeeks: past,
    upcomingWeeks: upcoming,
  };
}

export function formatDayTitle(dateISO) {
  const date = toDateOnly(dateISO);
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

export function formatDaySubtitle(dateISO) {
  return formatMonthDay(dateISO);
}
