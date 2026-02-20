function toDateOnly(value) {
  const date = value instanceof Date ? new Date(value) : new Date(`${String(value).slice(0, 10)}T00:00:00`);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(baseDate, days) {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + days);
  return date;
}

function startOfISOWeek(value) {
  const date = toDateOnly(value);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(date, diff);
}

function getWeekDiff(startDate, endDate) {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.floor((toDateOnly(endDate).getTime() - toDateOnly(startDate).getTime()) / msPerWeek);
}

const TRAINING_BLOCK = {
  id: 'block_2026_q1',
  name: '12-week Block',
  startDateISO: '2026-01-12',
  totalWeeks: 12,
  goal: 'Strength base + hypertrophy',
  phases: [
    {
      key: 'base',
      name: 'Base',
      weekStart: 1,
      weekEnd: 3,
      summary: 'Build movement quality and consistent training rhythm.',
      details: ['Moderate loads', 'Technique-first sets', 'Steady weekly adherence'],
    },
    {
      key: 'build',
      name: 'Build',
      weekStart: 4,
      weekEnd: 8,
      summary: 'Progress load and volume while preserving form.',
      details: ['Progressive overload', 'Extra top-set focus', 'Weekly volume balancing'],
    },
    {
      key: 'deload',
      name: 'Deload',
      weekStart: 9,
      weekEnd: 10,
      summary: 'Reduce fatigue while maintaining movement pattern quality.',
      details: ['Lower intensity', 'Reduced set count', 'Recovery emphasis'],
    },
    {
      key: 'review',
      name: 'Review',
      weekStart: 11,
      weekEnd: 12,
      summary: 'Consolidate outcomes and prepare the next block.',
      details: ['Performance review', 'Lagging-area adjustments', 'Next-block planning'],
    },
  ],
  weeklyCheckIn: {
    cadence: 'weekly',
    dayOfWeek: 0,
    label: 'Weekly (Sun)',
  },
  algorithmModel: {
    inputs: [
      'Session adherence (completed vs planned)',
      'Last performance (target reps vs achieved reps)',
      'Fatigue proxy from recent sessions',
      'Weekly check-in metrics',
    ],
    decisions: [
      'Increase load or reps',
      'Keep plan steady',
      'Apply deload when fatigue accumulates',
      'Shift volume toward lagging muscle groups',
    ],
  },
};

function getCurrentWeekInBlock(today = new Date()) {
  const blockStartWeek = startOfISOWeek(TRAINING_BLOCK.startDateISO);
  const currentWeekStart = startOfISOWeek(today);
  const weekOffset = getWeekDiff(blockStartWeek, currentWeekStart);
  return Math.min(TRAINING_BLOCK.totalWeeks, Math.max(1, weekOffset + 1));
}

function getCurrentPhase(weekNumber = getCurrentWeekInBlock()) {
  return (
    TRAINING_BLOCK.phases.find((phase) => weekNumber >= phase.weekStart && weekNumber <= phase.weekEnd)
    || TRAINING_BLOCK.phases[TRAINING_BLOCK.phases.length - 1]
  );
}

function getDaysUntilNextCheckIn(today = new Date()) {
  const currentDay = today.getDay();
  const target = TRAINING_BLOCK.weeklyCheckIn.dayOfWeek;
  const diff = (target - currentDay + 7) % 7;
  return diff === 0 ? 7 : diff;
}

export {
  TRAINING_BLOCK,
  getCurrentPhase,
  getCurrentWeekInBlock,
  getDaysUntilNextCheckIn,
};

