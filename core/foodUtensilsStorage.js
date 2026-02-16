import AsyncStorage from '@react-native-async-storage/async-storage';

const FOOD_UTENSILS_STORAGE_KEY = 'appnextwatch:food_utensils_inventory';

const DEFAULT_FOOD_UTENSILS = [
  { id: 'pan_nonstick', name: 'Non-stick Pan', category: 'Pans', count: 2, note: 'Daily breakfast use', icon: '🍳' },
  { id: 'kadai_steel', name: 'Steel Kadai', category: 'Pans', count: 1, note: 'Deep saute and curries', icon: '🥘' },
  { id: 'sauce_pan', name: 'Sauce Pan', category: 'Pans', count: 2, note: 'Tea and sauces', icon: '🍲' },
  { id: 'chef_knife', name: 'Chef Knife', category: 'Knives', count: 1, note: 'Main prep knife', icon: '🔪' },
  { id: 'paring_knife', name: 'Paring Knife', category: 'Knives', count: 2, note: 'Fine prep and peeling', icon: '🗡️' },
  { id: 'bread_knife', name: 'Bread Knife', category: 'Knives', count: 1, note: 'Serrated edge', icon: '🔪' },
  { id: 'mixer_grinder', name: 'Mixer Grinder', category: 'Appliances', count: 1, note: 'Spice pastes and chutney', icon: '⚙️' },
  { id: 'air_fryer', name: 'Air Fryer', category: 'Appliances', count: 1, note: 'Quick snacks and roast', icon: '🍟' },
  { id: 'rice_cooker', name: 'Rice Cooker', category: 'Appliances', count: 1, note: 'Staple prep', icon: '🍚' },
  { id: 'glass_box', name: 'Glass Meal Box', category: 'Containers', count: 6, note: 'Lunch prep', icon: '🫙' },
  { id: 'spice_jar', name: 'Spice Jar Set', category: 'Containers', count: 12, note: 'Masala rack', icon: '🧂' },
  { id: 'steel_tiffin', name: 'Steel Tiffin', category: 'Containers', count: 3, note: 'Commute meals', icon: '🥡' },
  { id: 'silicone_spatula', name: 'Silicone Spatula', category: 'Tools', count: 3, note: 'Heat-safe', icon: '🥄' },
  { id: 'measuring_cups', name: 'Measuring Cups', category: 'Tools', count: 1, note: 'Dry and wet set', icon: '🧪' },
  { id: 'whisk_set', name: 'Whisk Set', category: 'Tools', count: 2, note: 'Sauce and batter', icon: '🍥' },
];

function normalizeUtensils(items) {
  if (!Array.isArray(items)) return DEFAULT_FOOD_UTENSILS;

  return items
    .filter((item) => item && typeof item === 'object')
    .map((item, index) => ({
      id: String(item.id ?? `utensil_${index}`),
      name: String(item.name ?? 'Untitled Utensil'),
      category: String(item.category ?? 'Tools'),
      count: Math.max(0, Number(item.count) || 0),
      note: String(item.note ?? ''),
      icon: String(item.icon ?? '🍽️'),
    }));
}

export async function loadFoodUtensils() {
  try {
    const raw = await AsyncStorage.getItem(FOOD_UTENSILS_STORAGE_KEY);
    if (!raw) return DEFAULT_FOOD_UTENSILS;

    const parsed = JSON.parse(raw);
    return normalizeUtensils(parsed);
  } catch (error) {
    console.warn('Failed to load food utensils.', error?.message ?? error);
    return DEFAULT_FOOD_UTENSILS;
  }
}

export async function saveFoodUtensils(items) {
  try {
    await AsyncStorage.setItem(
      FOOD_UTENSILS_STORAGE_KEY,
      JSON.stringify(normalizeUtensils(items)),
    );
  } catch (error) {
    console.warn('Failed to save food utensils.', error?.message ?? error);
  }
}
