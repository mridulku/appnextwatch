import { useCallback, useMemo, useState } from 'react';

import { getOrCreateAppUser, listUserIngredients } from '../core/api/foodInventoryDb';
import { loadSessionHistory } from '../core/storage/sessionHistoryStorage';
import {
  clearFoodStats as clearFoodStatsStorage,
  createDefaultFoodStats,
  loadFoodStats,
  saveFoodStats,
} from '../core/storage/statsStorage';

function startOfWeek(date = new Date()) {
  const value = new Date(date);
  const day = value.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  value.setHours(0, 0, 0, 0);
  value.setDate(value.getDate() + diff);
  return value;
}

function hasFoodStatContent(stats) {
  if (!stats) return false;
  const profile = stats.foodProfile || {};
  const targets = stats.foodTargets || {};
  return Boolean(
    profile.dietPreference
      || targets.proteinG
      || targets.caloriesKcal
      || targets.carbsG
      || targets.fatG,
  );
}

function countRecipesCookedThisWeek(sessionHistory) {
  const weekStart = startOfWeek().getTime();
  return sessionHistory.filter((item) => {
    if (item?.type !== 'cooking' || item?.status !== 'completed') return false;
    const started = new Date(item.startedAt).getTime();
    return Number.isFinite(started) && started >= weekStart;
  }).length;
}

export default function useFoodStats(user) {
  const [stats, setStats] = useState(createDefaultFoodStats());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [signals, setSignals] = useState({
    pantryCount: null,
    recipesCookedThisWeek: null,
    hasNutritionTracking: false,
    nutritionAdherence: null,
  });

  const hydrate = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [storedStats, sessionHistory] = await Promise.all([
        loadFoodStats(),
        loadSessionHistory(),
      ]);
      setStats(storedStats);

      let pantryCount = null;
      try {
        const appUser = await getOrCreateAppUser({
          username: user?.username || 'demo user',
          name: user?.name || 'Demo User',
        });
        const pantryRows = await listUserIngredients(appUser.id);
        pantryCount = Array.isArray(pantryRows) ? pantryRows.length : 0;
      } catch (_inventoryError) {
        pantryCount = null;
      }

      setSignals({
        pantryCount,
        recipesCookedThisWeek: countRecipesCookedThisWeek(sessionHistory),
        hasNutritionTracking: false,
        nutritionAdherence: null,
      });
    } catch (nextError) {
      setError(nextError?.message || 'Could not load food stats.');
    } finally {
      setLoading(false);
    }
  }, [user?.name, user?.username]);

  const saveProfile = useCallback(async (profilePatch) => {
    const patch = profilePatch && typeof profilePatch === 'object' ? profilePatch : {};
    let snapshot = null;
    setStats((prev) => {
      const next = {
        ...prev,
        foodProfile: {
          ...prev.foodProfile,
          ...patch,
        },
      };
      snapshot = next;
      return next;
    });
    if (snapshot) await saveFoodStats(snapshot);
  }, []);

  const saveTargets = useCallback(async (targetsPatch) => {
    const patch = targetsPatch && typeof targetsPatch === 'object' ? targetsPatch : {};
    let snapshot = null;
    setStats((prev) => {
      const next = {
        ...prev,
        foodTargets: {
          ...prev.foodTargets,
          ...patch,
        },
      };
      snapshot = next;
      return next;
    });
    if (snapshot) await saveFoodStats(snapshot);
  }, []);

  const clearFoodStats = useCallback(async () => {
    const empty = createDefaultFoodStats();
    setStats(empty);
    await clearFoodStatsStorage();
    setError('');
  }, []);

  const hasAnyData = useMemo(() => hasFoodStatContent(stats), [stats]);
  const hasBehaviorSignals = useMemo(
    () => signals.pantryCount !== null || (signals.recipesCookedThisWeek || 0) > 0,
    [signals.pantryCount, signals.recipesCookedThisWeek],
  );

  return {
    loading,
    error,
    stats,
    signals,
    hasAnyData,
    hasBehaviorSignals,
    hydrate,
    saveFoodProfile: saveProfile,
    saveFoodTargets: saveTargets,
    clearFoodStats,
  };
}

