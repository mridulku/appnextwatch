import AsyncStorage from '@react-native-async-storage/async-storage';

const GYM_STATS_STORAGE_KEY = 'appnextwatch:gym_stats_v1';
const FOOD_STATS_STORAGE_KEY = 'appnextwatch:food_stats_v1';

function safeClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function parsePositiveNumber(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function toIsoDate(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }
  return parsed.toISOString();
}

function createWeightEntry(raw, index = 0) {
  const valueKg = parsePositiveNumber(raw?.valueKg);
  if (!valueKg) return null;
  return {
    id: String(raw?.id || `weight_${Date.now()}_${index}`),
    valueKg,
    dateISO: toIsoDate(raw?.dateISO || new Date().toISOString()),
  };
}

function sortEntriesDesc(entries) {
  return entries
    .slice()
    .sort((a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime());
}

export function createDefaultGymStats() {
  return {
    version: 1,
    gymProfile: {
      heightCm: null,
      waistCm: null,
      bodyFatPct: null,
    },
    gymTargets: {
      goalType: null,
      trainingFrequencyPerWeek: null,
      timelineLabel: '',
      experienceLevel: null,
    },
    gymEntries: {
      weightEntries: [],
      waistEntries: [],
      bodyFatEntries: [],
    },
  };
}

export function createDefaultFoodStats() {
  return {
    version: 1,
    foodProfile: {
      dietPreference: '',
    },
    foodTargets: {
      proteinG: null,
      caloriesKcal: null,
      carbsG: null,
      fatG: null,
    },
  };
}

function normalizeGymStats(raw) {
  const defaults = createDefaultGymStats();
  if (!raw || typeof raw !== 'object') return defaults;

  const gymProfile = {
    ...defaults.gymProfile,
    ...(raw.gymProfile && typeof raw.gymProfile === 'object' ? raw.gymProfile : {}),
  };

  const gymTargets = {
    ...defaults.gymTargets,
    ...(raw.gymTargets && typeof raw.gymTargets === 'object' ? raw.gymTargets : {}),
  };

  const rawEntries = raw.gymEntries && typeof raw.gymEntries === 'object' ? raw.gymEntries : {};
  const weightEntries = Array.isArray(rawEntries.weightEntries)
    ? rawEntries.weightEntries
      .map((entry, index) => createWeightEntry(entry, index))
      .filter(Boolean)
    : [];

  const normalized = {
    version: 1,
    gymProfile: {
      heightCm: parsePositiveNumber(gymProfile.heightCm),
      waistCm: parsePositiveNumber(gymProfile.waistCm),
      bodyFatPct: parsePositiveNumber(gymProfile.bodyFatPct),
    },
    gymTargets: {
      goalType: gymTargets.goalType || null,
      trainingFrequencyPerWeek: parsePositiveNumber(gymTargets.trainingFrequencyPerWeek),
      timelineLabel: gymTargets.timelineLabel ? String(gymTargets.timelineLabel) : '',
      experienceLevel: gymTargets.experienceLevel || null,
    },
    gymEntries: {
      weightEntries: sortEntriesDesc(weightEntries),
      waistEntries: [],
      bodyFatEntries: [],
    },
  };

  return normalized;
}

function normalizeFoodStats(raw) {
  const defaults = createDefaultFoodStats();
  if (!raw || typeof raw !== 'object') return defaults;

  const foodProfile = {
    ...defaults.foodProfile,
    ...(raw.foodProfile && typeof raw.foodProfile === 'object' ? raw.foodProfile : {}),
  };

  const foodTargets = {
    ...defaults.foodTargets,
    ...(raw.foodTargets && typeof raw.foodTargets === 'object' ? raw.foodTargets : {}),
  };

  return {
    version: 1,
    foodProfile: {
      dietPreference: foodProfile.dietPreference ? String(foodProfile.dietPreference) : '',
    },
    foodTargets: {
      proteinG: parsePositiveNumber(foodTargets.proteinG),
      caloriesKcal: parsePositiveNumber(foodTargets.caloriesKcal),
      carbsG: parsePositiveNumber(foodTargets.carbsG),
      fatG: parsePositiveNumber(foodTargets.fatG),
    },
  };
}

export async function loadGymStats() {
  try {
    const raw = await AsyncStorage.getItem(GYM_STATS_STORAGE_KEY);
    if (!raw) return createDefaultGymStats();
    return normalizeGymStats(JSON.parse(raw));
  } catch (error) {
    console.warn('Failed to load gym stats.', error?.message ?? error);
    return createDefaultGymStats();
  }
}

export async function saveGymStats(next) {
  try {
    await AsyncStorage.setItem(GYM_STATS_STORAGE_KEY, JSON.stringify(normalizeGymStats(next)));
  } catch (error) {
    console.warn('Failed to save gym stats.', error?.message ?? error);
  }
}

export async function clearGymStats() {
  try {
    await AsyncStorage.removeItem(GYM_STATS_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear gym stats.', error?.message ?? error);
  }
}

export async function loadFoodStats() {
  try {
    const raw = await AsyncStorage.getItem(FOOD_STATS_STORAGE_KEY);
    if (!raw) return createDefaultFoodStats();
    return normalizeFoodStats(JSON.parse(raw));
  } catch (error) {
    console.warn('Failed to load food stats.', error?.message ?? error);
    return createDefaultFoodStats();
  }
}

export async function saveFoodStats(next) {
  try {
    await AsyncStorage.setItem(FOOD_STATS_STORAGE_KEY, JSON.stringify(normalizeFoodStats(next)));
  } catch (error) {
    console.warn('Failed to save food stats.', error?.message ?? error);
  }
}

export async function clearFoodStats() {
  try {
    await AsyncStorage.removeItem(FOOD_STATS_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear food stats.', error?.message ?? error);
  }
}

export function addWeightEntryToStats(stats, entryInput) {
  const current = normalizeGymStats(stats);
  const created = createWeightEntry({
    id: entryInput?.id || `weight_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    valueKg: entryInput?.valueKg,
    dateISO: entryInput?.dateISO || new Date().toISOString(),
  });
  if (!created) return current;

  const next = safeClone(current);
  next.gymEntries.weightEntries = sortEntriesDesc([
    created,
    ...next.gymEntries.weightEntries.filter((entry) => entry.id !== created.id),
  ]);
  return next;
}

export function removeWeightEntryFromStats(stats, entryId) {
  const current = normalizeGymStats(stats);
  if (!entryId) return current;

  const next = safeClone(current);
  next.gymEntries.weightEntries = next.gymEntries.weightEntries.filter((entry) => entry.id !== entryId);
  return next;
}
