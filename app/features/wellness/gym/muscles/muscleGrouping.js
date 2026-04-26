import { classifyMuscleForDay, DAY_CATEGORY_ORDER } from '../dayCategory';

export const MUSCLE_GROUP_BY_MODES = {
  DAY: 'day',
  NONE: 'none',
};

export const MUSCLE_GROUP_BY_OPTIONS = [
  { key: MUSCLE_GROUP_BY_MODES.DAY, label: 'Day' },
  { key: MUSCLE_GROUP_BY_MODES.NONE, label: 'None' },
];

const MUSCLE_DAY_ORDER = {
  Push: [
    'upper_chest',
    'mid_chest',
    'lower_chest',
    'rear_delts',
    'front_delts',
    'side_delts',
    'triceps',
  ],
  Pull: [
    'lats',
    'mid_back',
    'traps',
    'upper_back',
    'lower_back',
    'biceps',
  ],
  Legs: [
    'quads',
    'glutes',
    'hamstrings',
    'adductors',
    'abductors',
    'calves',
  ],
  General: [
    'forearms',
    'abs',
    'lower_abs',
    'obliques',
  ],
};

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function matchesQuery(row, query) {
  if (!query) return true;
  const haystack = [row?.subgroupLabel, row?.groupLabel, row?.subgroupKey, row?.groupKey]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

function sortRows(rows) {
  return rows.slice().sort((a, b) => {
    const groupCompare = String(a?.groupLabel || '').localeCompare(String(b?.groupLabel || ''));
    if (groupCompare !== 0) return groupCompare;
    return String(a?.subgroupLabel || '').localeCompare(String(b?.subgroupLabel || ''));
  });
}

function sortRowsForDay(rows, day) {
  const order = MUSCLE_DAY_ORDER[day] || [];
  return rows.slice().sort((a, b) => {
    const aKey = String(a?.subgroupKey || '');
    const bKey = String(b?.subgroupKey || '');
    const aIndex = order.indexOf(aKey);
    const bIndex = order.indexOf(bKey);
    const safeA = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
    const safeB = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
    if (safeA !== safeB) return safeA - safeB;
    return String(a?.subgroupLabel || '').localeCompare(String(b?.subgroupLabel || ''));
  });
}

export function groupMuscles(rows, mode, query = '') {
  const filtered = sortRows((rows || []).filter((row) => matchesQuery(row, query)));
  if (mode === MUSCLE_GROUP_BY_MODES.NONE) {
    return [{ type: 'flat', items: filtered }];
  }

  return DAY_CATEGORY_ORDER.map((title) => ({
    type: 'section',
    title,
    items: sortRowsForDay(
      filtered.filter((row) =>
        classifyMuscleForDay({
          name: row?.subgroupLabel,
          name_key: row?.subgroupKey,
          subgroupKey: row?.subgroupKey,
          group: row?.groupLabel,
        }) === title,
      ),
      title,
    ),
  })).filter((section) => section.items.length);
}
