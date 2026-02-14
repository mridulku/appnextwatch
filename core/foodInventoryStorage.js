import AsyncStorage from '@react-native-async-storage/async-storage';

export const FOOD_INVENTORY_STORAGE_KEY = 'food_inventory_v1';

const SEED_INVENTORY = [
  {
    id: 'veg_potato',
    name: 'Potato',
    category: 'Vegetables',
    unitType: 'pcs',
    quantity: 10,
    lowStockThreshold: 4,
    icon: '🥔',
  },
  {
    id: 'veg_tomato',
    name: 'Tomato',
    category: 'Vegetables',
    unitType: 'pcs',
    quantity: 8,
    lowStockThreshold: 3,
    icon: '🍅',
  },
  {
    id: 'veg_onion',
    name: 'Onion',
    category: 'Vegetables',
    unitType: 'kg',
    quantity: 1.2,
    lowStockThreshold: 0.5,
    icon: '🧅',
  },
  {
    id: 'veg_ginger',
    name: 'Ginger',
    category: 'Vegetables',
    unitType: 'g',
    quantity: 180,
    lowStockThreshold: 80,
    icon: '🫚',
  },
  {
    id: 'veg_garlic',
    name: 'Garlic',
    category: 'Vegetables',
    unitType: 'g',
    quantity: 160,
    lowStockThreshold: 80,
    icon: '🧄',
  },
  {
    id: 'veg_chili_green',
    name: 'Green Chili',
    category: 'Vegetables',
    unitType: 'g',
    quantity: 90,
    lowStockThreshold: 40,
    icon: '🌶️',
  },
  {
    id: 'veg_coriander',
    name: 'Coriander',
    category: 'Vegetables',
    unitType: 'g',
    quantity: 60,
    lowStockThreshold: 30,
    icon: '🌿',
  },
  {
    id: 'veg_capsicum',
    name: 'Capsicum',
    category: 'Vegetables',
    unitType: 'pcs',
    quantity: 3,
    lowStockThreshold: 2,
    icon: '🫑',
  },
  {
    id: 'veg_carrot',
    name: 'Carrot',
    category: 'Vegetables',
    unitType: 'pcs',
    quantity: 5,
    lowStockThreshold: 2,
    icon: '🥕',
  },

  {
    id: 'spice_salt',
    name: 'Salt',
    category: 'Spices & Masalas',
    unitType: 'kg',
    quantity: 1,
    lowStockThreshold: 0.3,
    icon: '🧂',
  },
  {
    id: 'spice_turmeric',
    name: 'Turmeric',
    category: 'Spices & Masalas',
    unitType: 'g',
    quantity: 200,
    lowStockThreshold: 60,
    icon: '🟡',
  },
  {
    id: 'spice_red_chili',
    name: 'Red Chili Powder',
    category: 'Spices & Masalas',
    unitType: 'g',
    quantity: 180,
    lowStockThreshold: 60,
    icon: '🔴',
  },
  {
    id: 'spice_garam',
    name: 'Garam Masala',
    category: 'Spices & Masalas',
    unitType: 'g',
    quantity: 120,
    lowStockThreshold: 40,
    icon: '🟤',
  },
  {
    id: 'spice_cumin',
    name: 'Cumin Seeds',
    category: 'Spices & Masalas',
    unitType: 'g',
    quantity: 180,
    lowStockThreshold: 60,
    icon: '🌰',
  },
  {
    id: 'spice_coriander_powder',
    name: 'Coriander Powder',
    category: 'Spices & Masalas',
    unitType: 'g',
    quantity: 210,
    lowStockThreshold: 70,
    icon: '🟫',
  },
  {
    id: 'spice_pepper',
    name: 'Black Pepper',
    category: 'Spices & Masalas',
    unitType: 'g',
    quantity: 90,
    lowStockThreshold: 30,
    icon: '⚫',
  },
  {
    id: 'spice_mustard',
    name: 'Mustard Seeds',
    category: 'Spices & Masalas',
    unitType: 'g',
    quantity: 120,
    lowStockThreshold: 40,
    icon: '🟨',
  },

  {
    id: 'staple_rice',
    name: 'Rice',
    category: 'Staples',
    unitType: 'kg',
    quantity: 5,
    lowStockThreshold: 1.2,
    icon: '🍚',
  },
  {
    id: 'staple_atta',
    name: 'Atta',
    category: 'Staples',
    unitType: 'kg',
    quantity: 4,
    lowStockThreshold: 1,
    icon: '🌾',
  },
  {
    id: 'staple_toor_dal',
    name: 'Toor Dal',
    category: 'Staples',
    unitType: 'kg',
    quantity: 1.5,
    lowStockThreshold: 0.5,
    icon: '🫘',
  },
  {
    id: 'staple_moong_dal',
    name: 'Moong Dal',
    category: 'Staples',
    unitType: 'kg',
    quantity: 1.2,
    lowStockThreshold: 0.5,
    icon: '🫘',
  },
  {
    id: 'staple_chana_dal',
    name: 'Chana Dal',
    category: 'Staples',
    unitType: 'kg',
    quantity: 1,
    lowStockThreshold: 0.4,
    icon: '🫘',
  },
  {
    id: 'staple_poha',
    name: 'Poha',
    category: 'Staples',
    unitType: 'kg',
    quantity: 0.8,
    lowStockThreshold: 0.3,
    icon: '🥣',
  },
  {
    id: 'staple_suji',
    name: 'Suji',
    category: 'Staples',
    unitType: 'kg',
    quantity: 0.7,
    lowStockThreshold: 0.25,
    icon: '🥄',
  },
  {
    id: 'staple_sugar',
    name: 'Sugar',
    category: 'Staples',
    unitType: 'kg',
    quantity: 1.5,
    lowStockThreshold: 0.5,
    icon: '🍬',
  },

  {
    id: 'oil_sunflower',
    name: 'Sunflower Oil',
    category: 'Oils & Sauces',
    unitType: 'litre',
    quantity: 1.2,
    lowStockThreshold: 0.5,
    icon: '🛢️',
  },
  {
    id: 'oil_olive',
    name: 'Olive Oil',
    category: 'Oils & Sauces',
    unitType: 'bottle',
    quantity: 1,
    lowStockThreshold: 1,
    icon: '🫒',
  },
  {
    id: 'oil_ghee',
    name: 'Ghee',
    category: 'Oils & Sauces',
    unitType: 'ml',
    quantity: 450,
    lowStockThreshold: 150,
    icon: '🧈',
  },
  {
    id: 'oil_soy',
    name: 'Soy Sauce',
    category: 'Oils & Sauces',
    unitType: 'ml',
    quantity: 300,
    lowStockThreshold: 120,
    icon: '🍶',
  },
  {
    id: 'oil_ketchup',
    name: 'Tomato Ketchup',
    category: 'Oils & Sauces',
    unitType: 'bottle',
    quantity: 1,
    lowStockThreshold: 1,
    icon: '🥫',
  },
  {
    id: 'oil_vinegar',
    name: 'Vinegar',
    category: 'Oils & Sauces',
    unitType: 'ml',
    quantity: 250,
    lowStockThreshold: 100,
    icon: '🧴',
  },
  {
    id: 'oil_chili_sauce',
    name: 'Chili Sauce',
    category: 'Oils & Sauces',
    unitType: 'ml',
    quantity: 220,
    lowStockThreshold: 80,
    icon: '🌶️',
  },
  {
    id: 'oil_mayo',
    name: 'Mayonnaise',
    category: 'Oils & Sauces',
    unitType: 'bottle',
    quantity: 1,
    lowStockThreshold: 1,
    icon: '🥪',
  },

  {
    id: 'dairy_milk',
    name: 'Milk',
    category: 'Dairy & Eggs',
    unitType: 'litre',
    quantity: 1.5,
    lowStockThreshold: 0.8,
    icon: '🥛',
  },
  {
    id: 'dairy_curd',
    name: 'Curd',
    category: 'Dairy & Eggs',
    unitType: 'g',
    quantity: 500,
    lowStockThreshold: 200,
    icon: '🥣',
  },
  {
    id: 'dairy_butter',
    name: 'Butter',
    category: 'Dairy & Eggs',
    unitType: 'g',
    quantity: 200,
    lowStockThreshold: 80,
    icon: '🧈',
  },
  {
    id: 'dairy_paneer',
    name: 'Paneer',
    category: 'Dairy & Eggs',
    unitType: 'g',
    quantity: 250,
    lowStockThreshold: 100,
    icon: '🧀',
  },
  {
    id: 'dairy_cheese_slices',
    name: 'Cheese Slices',
    category: 'Dairy & Eggs',
    unitType: 'pcs',
    quantity: 8,
    lowStockThreshold: 3,
    icon: '🧀',
  },
  {
    id: 'dairy_eggs',
    name: 'Eggs',
    category: 'Dairy & Eggs',
    unitType: 'pcs',
    quantity: 12,
    lowStockThreshold: 5,
    icon: '🥚',
  },
  {
    id: 'dairy_yogurt',
    name: 'Yogurt',
    category: 'Dairy & Eggs',
    unitType: 'g',
    quantity: 400,
    lowStockThreshold: 150,
    icon: '🍨',
  },

  {
    id: 'snack_biscuits',
    name: 'Biscuits',
    category: 'Snacks',
    unitType: 'pcs',
    quantity: 12,
    lowStockThreshold: 4,
    icon: '🍪',
  },
  {
    id: 'snack_namkeen',
    name: 'Namkeen',
    category: 'Snacks',
    unitType: 'g',
    quantity: 300,
    lowStockThreshold: 120,
    icon: '🥜',
  },
  {
    id: 'snack_chips',
    name: 'Chips',
    category: 'Snacks',
    unitType: 'pcs',
    quantity: 4,
    lowStockThreshold: 2,
    icon: '🍟',
  },
  {
    id: 'snack_peanuts',
    name: 'Roasted Peanuts',
    category: 'Snacks',
    unitType: 'g',
    quantity: 250,
    lowStockThreshold: 100,
    icon: '🥜',
  },
  {
    id: 'snack_noodles',
    name: 'Instant Noodles',
    category: 'Snacks',
    unitType: 'pcs',
    quantity: 6,
    lowStockThreshold: 2,
    icon: '🍜',
  },
  {
    id: 'snack_popcorn',
    name: 'Popcorn Kernels',
    category: 'Snacks',
    unitType: 'g',
    quantity: 220,
    lowStockThreshold: 80,
    icon: '🍿',
  },
  {
    id: 'snack_granola',
    name: 'Granola Bars',
    category: 'Snacks',
    unitType: 'pcs',
    quantity: 5,
    lowStockThreshold: 2,
    icon: '🍫',
  },
];

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeStoredInventory(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      const id = typeof item?.id === 'string' ? item.id : null;
      const name = typeof item?.name === 'string' ? item.name.trim() : '';
      const category = typeof item?.category === 'string' ? item.category.trim() : 'Snacks';
      const unitType = typeof item?.unitType === 'string' ? item.unitType.trim() : 'pcs';
      const icon = typeof item?.icon === 'string' && item.icon.trim() ? item.icon.trim() : '🧺';
      if (!id || !name) return null;

      return {
        id,
        name,
        category,
        unitType,
        quantity: Math.max(0, toNumber(item.quantity, 0)),
        lowStockThreshold: Math.max(0, toNumber(item.lowStockThreshold, 1)),
        icon,
      };
    })
    .filter(Boolean);
}

export function getSeedInventory() {
  return SEED_INVENTORY.map((item) => ({ ...item }));
}

export async function loadFoodInventory() {
  try {
    const raw = await AsyncStorage.getItem(FOOD_INVENTORY_STORAGE_KEY);
    if (!raw) return getSeedInventory();

    const parsed = JSON.parse(raw);
    const normalized = normalizeStoredInventory(parsed);
    if (normalized.length === 0) return getSeedInventory();
    return normalized;
  } catch (error) {
    console.warn('Failed to load food inventory.', error?.message ?? error);
    return getSeedInventory();
  }
}

export async function saveFoodInventory(items) {
  try {
    await AsyncStorage.setItem(FOOD_INVENTORY_STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.warn('Failed to save food inventory.', error?.message ?? error);
  }
}
