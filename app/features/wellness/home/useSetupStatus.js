import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { getOrCreateAppUser } from '../../../core/api/foodInventoryDb';
import { listUserSelections } from '../../../core/api/catalogSelectionDb';
import { MODULE_KEYS, getModuleReadyState } from '../../../core/api/userModuleStateDb';
import { useAuth } from '../../../context/AuthContext';

const SETUP_SECTION_CONFIG = [
  {
    key: MODULE_KEYS.GYM_MACHINES,
    title: 'Machines',
    subtitle: 'Gym setup',
    icon: 'barbell-outline',
    table: 'user_machines',
    targetTab: 'Gym',
    initialSegment: 'Machines',
  },
  {
    key: MODULE_KEYS.GYM_EXERCISES,
    title: 'Exercises',
    subtitle: 'Gym setup',
    icon: 'fitness-outline',
    table: 'user_exercises',
    targetTab: 'Gym',
    initialSegment: 'Exercises',
  },
  {
    key: MODULE_KEYS.FOOD_INVENTORY,
    title: 'Inventory',
    subtitle: 'Food setup',
    icon: 'basket-outline',
    table: 'user_ingredients',
    targetTab: 'Food',
    initialSegment: 'Inventory',
  },
  {
    key: MODULE_KEYS.FOOD_RECIPES,
    title: 'Recipes',
    subtitle: 'Food setup',
    icon: 'book-outline',
    table: 'user_recipes',
    targetTab: 'Food',
    initialSegment: 'Recipes',
  },
  {
    key: MODULE_KEYS.FOOD_UTENSILS,
    title: 'Utensils',
    subtitle: 'Food setup',
    icon: 'restaurant-outline',
    table: 'user_utensils',
    targetTab: 'Food',
    initialSegment: 'Utensils',
  },
];

async function safeSelectionCount(userId, table) {
  try {
    const rows = await listUserSelections({
      table,
      userId,
      select: 'id',
      orderBy: 'created_at',
      ascending: true,
    });
    return rows.length;
  } catch (_error) {
    return null;
  }
}

async function safeModuleReadyState(userId, moduleKey) {
  try {
    return await getModuleReadyState(userId, moduleKey);
  } catch (_error) {
    return false;
  }
}

export default function useSetupStatus() {
  const { user } = useAuth();
  const [sections, setSections] = useState(
    SETUP_SECTION_CONFIG.map((section) => ({
      ...section,
      count: null,
      isComplete: false,
    })),
  );
  const [loading, setLoading] = useState(true);

  const hydrate = useCallback(async () => {
    setLoading(true);
    try {
      const appUser = await getOrCreateAppUser({
        username: user?.username || 'demo user',
        name: user?.name || 'Demo User',
      });

      const [counts, readyStates] = await Promise.all([
        Promise.all(SETUP_SECTION_CONFIG.map((section) => safeSelectionCount(appUser.id, section.table))),
        Promise.all(
          SETUP_SECTION_CONFIG.map((section) => safeModuleReadyState(appUser.id, section.key)),
        ),
      ]);

      setSections(
        SETUP_SECTION_CONFIG.map((section, index) => ({
          ...section,
          count: counts[index],
          isComplete: Boolean(readyStates[index]),
        })),
      );
    } catch (_error) {
      setSections(
        SETUP_SECTION_CONFIG.map((section) => ({
          ...section,
          count: null,
          isComplete: false,
        })),
      );
    } finally {
      setLoading(false);
    }
  }, [user?.name, user?.username]);

  useFocusEffect(
    useCallback(() => {
      hydrate();
    }, [hydrate]),
  );

  const completedCount = useMemo(
    () => sections.filter((section) => section.isComplete).length,
    [sections],
  );

  return {
    loading,
    sections,
    completedCount,
    totalCount: SETUP_SECTION_CONFIG.length,
    refreshSetupStatus: hydrate,
  };
}
