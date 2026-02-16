import AsyncStorage from '@react-native-async-storage/async-storage';

export const FITNESS_LOG_STORAGE_KEY = 'fitness_workout_log_v1';

export async function loadFitnessLog() {
  try {
    const raw = await AsyncStorage.getItem(FITNESS_LOG_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Failed to load fitness log.', error?.message ?? error);
    return [];
  }
}

export async function saveFitnessLog(items) {
  try {
    await AsyncStorage.setItem(FITNESS_LOG_STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.warn('Failed to save fitness log.', error?.message ?? error);
  }
}
