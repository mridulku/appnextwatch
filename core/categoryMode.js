import AsyncStorage from '@react-native-async-storage/async-storage';

export const APP_CATEGORY = {
  MOVIES: 'movies',
  FITNESS: 'fitness',
};

const CATEGORY_KEY = 'appnextwatch:selected_category';

export async function getSavedCategory() {
  try {
    const value = await AsyncStorage.getItem(CATEGORY_KEY);
    if (!value) return null;
    if (value === APP_CATEGORY.MOVIES || value === APP_CATEGORY.FITNESS) return value;
    return null;
  } catch (error) {
    console.warn('Failed to load selected category.', error?.message ?? error);
    return null;
  }
}

export async function saveCategory(category) {
  if (category !== APP_CATEGORY.MOVIES && category !== APP_CATEGORY.FITNESS) return;
  try {
    await AsyncStorage.setItem(CATEGORY_KEY, category);
  } catch (error) {
    console.warn('Failed to save selected category.', error?.message ?? error);
  }
}
