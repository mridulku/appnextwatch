export const GROUP_BY_MODES = {
  NONE: 'none',
  MUSCLE: 'muscle',
  DAY: 'day',
  DAY_MUSCLE: 'day_muscle',
};

export const GROUP_BY_OPTIONS = [
  { key: GROUP_BY_MODES.NONE, label: 'None' },
  { key: GROUP_BY_MODES.MUSCLE, label: 'Muscle' },
  { key: GROUP_BY_MODES.DAY, label: 'Day' },
  { key: GROUP_BY_MODES.DAY_MUSCLE, label: 'Day + Muscle' },
];

export const DAY_ORDER = ['Push', 'Pull', 'Legs', 'General'];
export const MUSCLE_GROUP_ORDER = ['Chest', 'Back', 'Shoulders', 'Legs', 'Arms', 'Core', 'General'];

const MOVEMENT_ORDER_BY_MUSCLE = {
  Chest: ['push-up', 'flat-press', 'incline-press', 'decline-press', 'chest-fly', 'incline-fly', 'chest-dip'],
  Shoulders: ['overhead-press', 'upright-row', 'lateral-raise', 'rear-delt-fly'],
  Back: [
    'chin-up',
    'pull-up',
    'lat-pulldown',
    'seated-row',
    'bent-over-row',
    'back-extension',
    'chest-supported-row',
    'face-pull',
    'single-arm-row',
    'shrug',
  ],
  Legs: [
    'squat',
    'leg-press',
    'leg-curl',
    'leg-extension',
    'romanian-deadlift',
    'hack-squat',
    'walking-lunge',
    'bulgarian-split-squat',
    'hip-thrust',
    'calf-raise',
  ],
  Arms: [
    'triceps-pushdown',
    'overhead-triceps-extension',
    'skull-crusher',
    'close-grip-press',
    'curl',
    'wrist-curl',
  ],
};

const MOVEMENT_ORDER_BY_DAY_AND_MUSCLE = {
  Push: {
    Chest: MOVEMENT_ORDER_BY_MUSCLE.Chest,
    Shoulders: MOVEMENT_ORDER_BY_MUSCLE.Shoulders,
    Arms: ['triceps-pushdown', 'overhead-triceps-extension', 'skull-crusher', 'close-grip-press'],
  },
  Pull: {
    Back: MOVEMENT_ORDER_BY_MUSCLE.Back,
    Arms: ['curl'],
  },
  Legs: {
    Legs: MOVEMENT_ORDER_BY_MUSCLE.Legs,
  },
};

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function exerciseMatchesQuery(exercise, query) {
  if (!query) return true;
  const haystack = [
    exercise?.name,
    exercise?.name_key,
    exercise?.type,
    exercise?.primary_muscle_group,
    exercise?.equipment,
    ...(Array.isArray(exercise?.aliases) ? exercise.aliases : []),
    ...((exercise?.variants || []).flatMap((variant) => [variant?.name, variant?.variantLabel, variant?.equipment])),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
}

export function getExerciseMuscleGroup(exercise) {
  const primary = normalize(exercise?.primary_muscle_group);
  if (primary === 'chest') return 'Chest';
  if (primary === 'back') return 'Back';
  if (primary === 'shoulders') return 'Shoulders';
  if (primary === 'legs') return 'Legs';
  if (primary === 'arms') return 'Arms';
  if (primary === 'core') return 'Core';
  if (primary === 'cardio' || primary === 'mobility') return 'General';

  const name = normalize(exercise?.name);
  if (name.includes('plank') || name.includes('dead bug') || name.includes('ab ') || name.includes('hanging leg raise')) {
    return 'Core';
  }

  return 'General';
}

export function classifyExerciseDay(exercise) {
  const explicitDay = normalize(exercise?.primary_day);
  if (explicitDay === 'push') return 'Push';
  if (explicitDay === 'pull') return 'Pull';
  if (explicitDay === 'legs') return 'Legs';
  if (explicitDay === 'general') return 'General';

  const primary = normalize(exercise?.primary_muscle_group);
  const name = normalize(exercise?.name);

  if (
    primary === 'legs' ||
    name.includes('squat') ||
    name.includes('lunge') ||
    name.includes('leg ') ||
    name.includes('hamstring') ||
    name.includes('glute') ||
    name.includes('calf') ||
    name.includes('hinge')
  ) {
    return 'Legs';
  }

  if (
    primary === 'core' ||
    primary === 'cardio' ||
    primary === 'mobility' ||
    name.includes('treadmill') ||
    name.includes('bike') ||
    name.includes('rowing') ||
    name.includes('jump rope') ||
    name.includes('mobility') ||
    name.includes('plank') ||
    name.includes('dead bug') ||
    name.includes('thoracic')
  ) {
    return 'General';
  }

  if (
    primary === 'chest' ||
    primary === 'shoulders' ||
    name.includes('press') ||
    name.includes('fly') ||
    name.includes('pushdown') ||
    name.includes('lateral raise') ||
    name.includes('front raise') ||
    name.includes('triceps')
  ) {
    return 'Push';
  }

  if (
    primary === 'back' ||
    primary === 'arms' ||
    name.includes('row') ||
    name.includes('pulldown') ||
    name.includes('pull up') ||
    name.includes('chin up') ||
    name.includes('curl') ||
    name.includes('shrug') ||
    name.includes('rear delt')
  ) {
    return 'Pull';
  }

  return 'General';
}

function sortExercises(rows) {
  return rows.slice().sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
}

function getMovementSlug(row) {
  return normalize(row?.slug || row?.movement_slug || row?.name_key || row?.name);
}

function sortGroupItems(rows, order = []) {
  if (!Array.isArray(order) || !order.length) return sortExercises(rows);
  return rows.slice().sort((a, b) => {
    const aSlug = getMovementSlug(a);
    const bSlug = getMovementSlug(b);
    const aIndex = order.indexOf(aSlug);
    const bIndex = order.indexOf(bSlug);
    const safeA = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
    const safeB = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
    if (safeA !== safeB) return safeA - safeB;
    return String(a?.name || '').localeCompare(String(b?.name || ''));
  });
}

function sortByDefinedOrder(rows, order, getKey) {
  return rows.slice().sort((a, b) => {
    const aKey = getKey(a);
    const bKey = getKey(b);
    const aIndex = order.indexOf(aKey);
    const bIndex = order.indexOf(bKey);
    const safeA = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
    const safeB = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
    if (safeA !== safeB) return safeA - safeB;
    return String(aKey || '').localeCompare(String(bKey || ''));
  });
}

export function groupExercises(rows, mode, query = '') {
  const filtered = (rows || []).filter((row) => exerciseMatchesQuery(row, query));

  if (mode === GROUP_BY_MODES.NONE) {
    return [{ type: 'flat', items: sortExercises(filtered) }];
  }

  if (mode === GROUP_BY_MODES.MUSCLE) {
    const sections = MUSCLE_GROUP_ORDER.map((title) => ({
      type: 'section',
      title,
      items: sortGroupItems(filtered.filter((row) => getExerciseMuscleGroup(row) === title), MOVEMENT_ORDER_BY_MUSCLE[title]),
    })).filter((section) => section.items.length);

    return sections;
  }

  if (mode === GROUP_BY_MODES.DAY) {
    const sections = DAY_ORDER.map((title) => ({
      type: 'section',
      title,
      items: sortGroupItems(
        filtered.filter((row) => classifyExerciseDay(row) === title),
        Object.values(MOVEMENT_ORDER_BY_DAY_AND_MUSCLE[title] || {}).flat(),
      ),
    })).filter((section) => section.items.length);

    return sections;
  }

  if (mode === GROUP_BY_MODES.DAY_MUSCLE) {
    const dayGroups = DAY_ORDER.map((day) => {
      const dayItems = filtered.filter((row) => classifyExerciseDay(row) === day);
      const groups = MUSCLE_GROUP_ORDER.map((muscle) => ({
        title: muscle,
        items: sortGroupItems(
          dayItems.filter((row) => getExerciseMuscleGroup(row) === muscle),
          MOVEMENT_ORDER_BY_DAY_AND_MUSCLE?.[day]?.[muscle] || MOVEMENT_ORDER_BY_MUSCLE[muscle],
        ),
      })).filter((group) => group.items.length);

      return {
        type: 'nested',
        title: day,
        groups,
      };
    }).filter((group) => group.groups.length);

    return dayGroups;
  }

  return [{ type: 'flat', items: filtered }];
}
