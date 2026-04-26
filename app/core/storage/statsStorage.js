import AsyncStorage from '@react-native-async-storage/async-storage';

const GYM_STATS_STORAGE_KEY = 'appnextwatch:gym_stats_v1';
const FOOD_STATS_STORAGE_KEY = 'appnextwatch:food_stats_v1';

const DEFAULT_BODY_COMPOSITION_TESTS = [
  {
    id: 'test_1',
    label: 'Test 1',
    source: 'InBody',
    capturedAt: '2026-03-02T11:19:00+05:30',
    heightCm: 181,
    ageYears: 30,
    gender: 'Male',
    inBodyScore: 68,
    bodyCompositionAnalysis: {
      totalBodyWaterL: 44.6,
      proteinKg: 12.0,
      mineralKg: 4.03,
      bodyFatMassKg: 22.0,
      weightKg: 82.6,
    },
    muscleFatAnalysis: {
      weightKg: 82.6,
      smmKg: 34.0,
      bodyFatMassKg: 22.0,
    },
    obesityAnalysis: {
      bmi: 25.2,
      pbfPct: 26.6,
    },
    weightControl: {
      targetWeightKg: 72.0,
      weightControlKg: -10.6,
      fatControlKg: -11.2,
      muscleControlKg: 0.6,
    },
    obesityEvaluation: {
      bmi: 'Slightly over',
      pbf: 'Over',
    },
    waistHipRatio: 1.04,
    visceralFatLevel: 10,
    researchParameters: {
      fatFreeMassKg: 60.6,
      bmrKcal: 1680,
      obesityDegreePct: 115,
      smiKgM2: 8.0,
      recommendedCaloriesKcal: 2419,
    },
    calorieExpenditure: [
      { label: 'Golf', kcal: 145 },
      { label: 'Gateball', kcal: 157 },
      { label: 'Walking', kcal: 160 },
      { label: 'Yoga', kcal: 165 },
      { label: 'Badminton', kcal: 187 },
      { label: 'Table Tennis', kcal: 187 },
      { label: 'Tennis', kcal: 248 },
      { label: 'Bicycling', kcal: 248 },
      { label: 'Boxing', kcal: 248 },
      { label: 'Basketball', kcal: 248 },
      { label: 'Mountain Climbing', kcal: 269 },
      { label: 'Jumping Rope', kcal: 289 },
      { label: 'Aerobics', kcal: 289 },
      { label: 'Jogging', kcal: 289 },
      { label: 'Soccer', kcal: 289 },
      { label: 'Racquetball', kcal: 413 },
      { label: 'Japanese Fencing', kcal: 413 },
      { label: 'Squash', kcal: 413 },
      { label: 'Taekwondo', kcal: 413 },
    ],
    segmentalLeanAnalysis: {
      leftArm: { kg: 3.74, status: 'Normal' },
      rightArm: { kg: 3.77, status: 'Normal' },
      trunk: { kg: 28.8, status: 'Normal' },
      leftLeg: { kg: 9.33, status: 'Normal' },
      rightLeg: { kg: 9.42, status: 'Normal' },
    },
    segmentalFatAnalysis: {
      leftArm: { kg: 1.4, status: 'Over' },
      rightArm: { kg: 1.3, status: 'Over' },
      trunk: { kg: 12.4, status: 'Over' },
      leftLeg: { kg: 2.8, status: 'Normal' },
      rightLeg: { kg: 2.8, status: 'Normal' },
    },
    bodyCompositionHistory: [
      {
        label: 'Record 1',
        weightKg: 82.6,
        smmKg: 34.0,
        pbfPct: 26.6,
      },
    ],
    impedance: {
      khz20: { ra: 283.2, la: 285.4, tr: 25.5, rl: 272.3, ll: 277.4 },
      khz100: { ra: 257.4, la: 260.6, tr: 23.5, rl: 244.4, ll: 247.6 },
    },
  },
  {
    id: 'test_2',
    label: 'Test 2',
    source: 'InBody',
    capturedAt: '2026-04-04T09:18:00+05:30',
    heightCm: 181,
    ageYears: 30,
    gender: 'Male',
    inBodyScore: 71,
    bodyCompositionAnalysis: {
      totalBodyWaterL: 45.7,
      proteinKg: 12.2,
      mineralKg: 4.25,
      bodyFatMassKg: 20.8,
      weightKg: 83.0,
    },
    muscleFatAnalysis: {
      weightKg: 83.0,
      smmKg: 34.9,
      bodyFatMassKg: 20.8,
    },
    obesityAnalysis: {
      bmi: 25.3,
      pbfPct: 25.1,
    },
    weightControl: {
      targetWeightKg: 73.2,
      weightControlKg: -9.8,
      fatControlKg: -9.8,
      muscleControlKg: 0.0,
    },
    obesityEvaluation: {
      bmi: 'Slightly over',
      pbf: 'Over',
    },
    waistHipRatio: 0.99,
    visceralFatLevel: 9,
    researchParameters: {
      fatFreeMassKg: 62.2,
      bmrKcal: 1713,
      obesityDegreePct: 115,
      smiKgM2: 8.2,
      recommendedCaloriesKcal: 2426,
    },
    calorieExpenditure: [
      { label: 'Golf', kcal: 146 },
      { label: 'Gateball', kcal: 158 },
      { label: 'Walking', kcal: 160 },
      { label: 'Yoga', kcal: 166 },
      { label: 'Badminton', kcal: 188 },
      { label: 'Table Tennis', kcal: 188 },
      { label: 'Tennis', kcal: 249 },
      { label: 'Bicycling', kcal: 249 },
      { label: 'Boxing', kcal: 249 },
      { label: 'Basketball', kcal: 249 },
      { label: 'Mountain Climbing', kcal: 271 },
      { label: 'Jumping Rope', kcal: 291 },
      { label: 'Aerobics', kcal: 291 },
      { label: 'Jogging', kcal: 291 },
      { label: 'Soccer', kcal: 291 },
      { label: 'Racquetball', kcal: 415 },
      { label: 'Japanese Fencing', kcal: 415 },
      { label: 'Squash', kcal: 415 },
      { label: 'Taekwondo', kcal: 415 },
    ],
    segmentalLeanAnalysis: {
      leftArm: { kg: 3.71, status: 'Normal' },
      rightArm: { kg: 3.71, status: 'Normal' },
      trunk: { kg: 28.6, status: 'Normal' },
      leftLeg: { kg: 9.6, status: 'Normal' },
      rightLeg: { kg: 9.72, status: 'Normal' },
    },
    segmentalFatAnalysis: {
      leftArm: { kg: 1.2, status: 'Over' },
      rightArm: { kg: 1.2, status: 'Over' },
      trunk: { kg: 11.6, status: 'Over' },
      leftLeg: { kg: 2.7, status: 'Normal' },
      rightLeg: { kg: 2.8, status: 'Normal' },
    },
    bodyCompositionHistory: [
      {
        label: 'Record 1',
        weightKg: 83.0,
        smmKg: 34.9,
        pbfPct: 25.1,
      },
    ],
    impedance: {
      khz20: { ra: 290.4, la: 290.1, tr: 24.2, rl: 257.8, ll: 264.0 },
      khz100: { ra: 262.7, la: 263.2, tr: 21.7, rl: 231.6, ll: 236.0 },
    },
  },
];

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
    version: 2,
    gymProfile: {
      heightCm: 181,
      waistCm: null,
      bodyFatPct: 25.1,
      ageYears: 30,
      gender: 'male',
    },
    gymTargets: {
      goalType: null,
      trainingFrequencyPerWeek: null,
      timelineLabel: '',
      experienceLevel: null,
    },
    gymBodyCompositionTests: DEFAULT_BODY_COMPOSITION_TESTS,
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

  const fallbackTests = Array.isArray(raw.gymBodyCompositionTests)
    ? raw.gymBodyCompositionTests
    : raw.gymBodyComposition
      ? [{
        ...DEFAULT_BODY_COMPOSITION_TESTS[1],
        ...(raw.gymBodyComposition && typeof raw.gymBodyComposition === 'object' ? raw.gymBodyComposition : {}),
        id: 'test_2',
        label: 'Test 2',
      }]
      : DEFAULT_BODY_COMPOSITION_TESTS;

  const normalizedTests = DEFAULT_BODY_COMPOSITION_TESTS.map((defaultTest) => {
    const matched = fallbackTests.find((item) => item?.id === defaultTest.id || item?.label === defaultTest.label);
    return matched ? { ...defaultTest, ...matched } : defaultTest;
  });

  const normalized = {
    version: 2,
    gymProfile: {
      heightCm: parsePositiveNumber(gymProfile.heightCm) ?? defaults.gymProfile.heightCm,
      waistCm: parsePositiveNumber(gymProfile.waistCm),
      bodyFatPct: parsePositiveNumber(gymProfile.bodyFatPct) ?? defaults.gymProfile.bodyFatPct,
      ageYears: parsePositiveNumber(gymProfile.ageYears) ?? defaults.gymProfile.ageYears,
      gender: gymProfile.gender || defaults.gymProfile.gender,
    },
    gymTargets: {
      goalType: gymTargets.goalType || null,
      trainingFrequencyPerWeek: parsePositiveNumber(gymTargets.trainingFrequencyPerWeek),
      timelineLabel: gymTargets.timelineLabel ? String(gymTargets.timelineLabel) : '',
      experienceLevel: gymTargets.experienceLevel || null,
    },
    gymBodyCompositionTests: normalizedTests,
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
