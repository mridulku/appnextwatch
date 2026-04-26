import { DAY_CATEGORY_ORDER, classifyMachineForDay } from './dayCategory';

export const MACHINE_GROUP_BY_MODES = {
  DAY: 'day',
  DAY_TYPE: 'day_type',
  NONE: 'none',
};

export const MACHINE_GROUP_BY_OPTIONS = [
  { key: MACHINE_GROUP_BY_MODES.DAY, label: 'Day' },
  { key: MACHINE_GROUP_BY_MODES.DAY_TYPE, label: 'Day + Type' },
  { key: MACHINE_GROUP_BY_MODES.NONE, label: 'None' },
];

export const MACHINE_TYPE_ORDER = ['Targeted', 'Multi-purpose', 'Cardio'];

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function hasAny(text, tokens) {
  return tokens.some((token) => text.includes(token));
}

function matchesQuery(row, query) {
  if (!query) return true;
  const haystack = [row?.name, row?.name_key, row?.zone, ...(Array.isArray(row?.primary_muscles) ? row.primary_muscles : [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

function sortRows(rows) {
  return rows.slice().sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
}

export function classifyMachineType(machine) {
  const name = normalize(machine?.name);
  const zone = normalize(machine?.zone);
  const muscles = Array.isArray(machine?.primary_muscles) ? machine.primary_muscles.map(normalize).join(' ') : '';
  const text = [name, zone, muscles].join(' ');

  if (hasAny(text, ['treadmill', 'bike', 'rowing', 'stair', 'cardio'])) return 'Cardio';
  if (hasAny(text, ['cable', 'tower', 'smith', 'platform', 'bench', 'assisted'])) return 'Multi-purpose';
  return 'Targeted';
}

export function groupMachines(rows, mode, query = '') {
  const filtered = sortRows((rows || []).filter((row) => matchesQuery(row, query)));

  if (mode === MACHINE_GROUP_BY_MODES.NONE) {
    return [{ type: 'flat', items: filtered }];
  }

  if (mode === MACHINE_GROUP_BY_MODES.DAY) {
    return DAY_CATEGORY_ORDER.map((title) => ({
      type: 'section',
      title,
      items: filtered.filter((row) => classifyMachineForDay(row) === title),
    })).filter((section) => section.items.length);
  }

  if (mode === MACHINE_GROUP_BY_MODES.DAY_TYPE) {
    return DAY_CATEGORY_ORDER.map((title) => {
      const dayItems = filtered.filter((row) => classifyMachineForDay(row) === title);
      const groups = MACHINE_TYPE_ORDER.map((type) => ({
        title: type,
        items: dayItems.filter((row) => classifyMachineType(row) === type),
      })).filter((group) => group.items.length);
      return {
        type: 'nested',
        title,
        groups,
      };
    }).filter((section) => section.groups.length);
  }

  return [{ type: 'flat', items: filtered }];
}
