import AsyncStorage from '@react-native-async-storage/async-storage';

const WELLNESS_PROFILE_STORAGE_KEY = 'appnextwatch:wellness_profile';

const DEFAULT_BODY = {
  heightCm: 178,
  weightKg: 76.4,
  bodyFatPct: 18.2,
  waistCm: 84,
  lastUpdatedAt: '2026-02-14T09:30:00.000Z',
  startWeightKg: 81.2,
  targetWeightKg: 72,
  targetBodyFatPct: 14,
  timelineMonths: 6,
  weight7dDeltaKg: -0.3,
  weight30dDeltaKg: -1.2,
  workoutsCompletedThisWeek: 4,
  trend: [77.2, 77.0, 76.9, 76.8, 76.7, 76.5, 76.4],
};

const DEFAULT_FOOD = {
  caloriesTarget: 2400,
  proteinTarget: 145,
  carbsTarget: 265,
  fatTarget: 75,
  goalType: 'Maintenance',
  sixMonthGoal: 'Improve body recomposition while maintaining strength.',
  planStartDate: '2026-01-15',
  planEndDate: '2026-07-15',
  targetWeightKg: 74,
  weeklyHistory: [
    { day: 'Mon', calories: 2320, protein: 138 },
    { day: 'Tue', calories: 2460, protein: 149 },
    { day: 'Wed', calories: 2250, protein: 141 },
    { day: 'Thu', calories: 2380, protein: 152 },
    { day: 'Fri', calories: 2510, protein: 146 },
    { day: 'Sat', calories: 2425, protein: 150 },
    { day: 'Sun', calories: 2285, protein: 143 },
  ],
};

const DEFAULT_SETTINGS = {
  weightUnit: 'kg',
  heightUnit: 'cm',
  dietaryPreference: 'eggetarian',
  mealReminders: true,
  workoutReminders: true,
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createDefaultWellnessProfileData() {
  return {
    body: clone(DEFAULT_BODY),
    food: clone(DEFAULT_FOOD),
    settings: clone(DEFAULT_SETTINGS),
  };
}

function normalizeProfileData(raw) {
  const defaults = createDefaultWellnessProfileData();
  if (!raw || typeof raw !== 'object') return defaults;

  const body = {
    ...defaults.body,
    ...(raw.body && typeof raw.body === 'object' ? raw.body : {}),
  };
  const food = {
    ...defaults.food,
    ...(raw.food && typeof raw.food === 'object' ? raw.food : {}),
  };
  const settings = {
    ...defaults.settings,
    ...(raw.settings && typeof raw.settings === 'object' ? raw.settings : {}),
  };

  if (!Array.isArray(body.trend) || body.trend.length === 0) {
    body.trend = defaults.body.trend;
  }

  if (!Array.isArray(food.weeklyHistory) || food.weeklyHistory.length === 0) {
    food.weeklyHistory = defaults.food.weeklyHistory;
  }

  return { body, food, settings };
}

export async function loadWellnessProfileData() {
  try {
    const raw = await AsyncStorage.getItem(WELLNESS_PROFILE_STORAGE_KEY);
    if (!raw) return createDefaultWellnessProfileData();

    const parsed = JSON.parse(raw);
    return normalizeProfileData(parsed);
  } catch (error) {
    console.warn('Failed to load wellness profile data.', error?.message ?? error);
    return createDefaultWellnessProfileData();
  }
}

export async function saveWellnessProfileData(data) {
  try {
    await AsyncStorage.setItem(
      WELLNESS_PROFILE_STORAGE_KEY,
      JSON.stringify(normalizeProfileData(data)),
    );
  } catch (error) {
    console.warn('Failed to save wellness profile data.', error?.message ?? error);
  }
}
