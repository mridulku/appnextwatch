import { useCallback, useMemo, useState } from 'react';

import { loadSessionHistory } from '../core/storage/sessionHistoryStorage';
import {
  addWeightEntryToStats,
  clearGymStats as clearGymStatsStorage,
  createDefaultGymStats,
  loadGymStats,
  removeWeightEntryFromStats,
  saveGymStats,
} from '../core/storage/statsStorage';

function startOfWeek(date = new Date()) {
  const value = new Date(date);
  const day = value.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  value.setHours(0, 0, 0, 0);
  value.setDate(value.getDate() + diff);
  return value;
}

function isWithinDays(iso, days) {
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return false;
  const boundary = Date.now() - days * 24 * 60 * 60 * 1000;
  return value.getTime() >= boundary;
}

function hasGymStatContent(stats) {
  if (!stats) return false;
  const profile = stats.gymProfile || {};
  const targets = stats.gymTargets || {};
  const weightEntries = stats.gymEntries?.weightEntries || [];

  return Boolean(
    profile.heightCm
      || profile.waistCm
      || profile.bodyFatPct
      || targets.goalType
      || targets.trainingFrequencyPerWeek
      || targets.timelineLabel
      || targets.experienceLevel
      || weightEntries.length > 0,
  );
}

function formatWorkoutAdherence(sessionHistory) {
  const workouts = sessionHistory
    .filter((item) => item?.type === 'workout' && item?.status === 'completed')
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  if (workouts.length === 0) {
    return {
      hasData: false,
      workoutsThisWeek: 0,
      lastWorkoutAt: null,
      workoutsLast30Days: 0,
    };
  }

  const weekStart = startOfWeek().getTime();
  const workoutsThisWeek = workouts.filter((item) => new Date(item.startedAt).getTime() >= weekStart).length;
  const workoutsLast30Days = workouts.filter((item) => isWithinDays(item.startedAt, 30)).length;

  return {
    hasData: true,
    workoutsThisWeek,
    lastWorkoutAt: workouts[0]?.startedAt || null,
    workoutsLast30Days,
  };
}

function getLatestWeightEntry(entries) {
  if (!Array.isArray(entries) || entries.length === 0) return null;
  return entries
    .slice()
    .sort((a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime())[0];
}

function getWeightTrend30Days(entries) {
  if (!Array.isArray(entries) || entries.length === 0) return [];
  return entries
    .filter((entry) => isWithinDays(entry.dateISO, 30))
    .slice()
    .sort((a, b) => new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime());
}

export default function useGymStats() {
  const [stats, setStats] = useState(createDefaultGymStats());
  const [adherence, setAdherence] = useState({
    hasData: false,
    workoutsThisWeek: 0,
    lastWorkoutAt: null,
    workoutsLast30Days: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const hydrate = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [storedStats, sessionHistory] = await Promise.all([
        loadGymStats(),
        loadSessionHistory(),
      ]);
      setStats(storedStats);
      setAdherence(formatWorkoutAdherence(sessionHistory));
    } catch (nextError) {
      setError(nextError?.message || 'Could not load gym stats.');
    } finally {
      setLoading(false);
    }
  }, []);

  const saveProfile = useCallback(async (profilePatch) => {
    const profile = profilePatch && typeof profilePatch === 'object' ? profilePatch : {};
    let snapshot = null;
    setStats((prev) => {
      const next = {
        ...prev,
        gymProfile: {
          ...prev.gymProfile,
          ...profile,
        },
      };
      snapshot = next;
      return next;
    });
    if (snapshot) await saveGymStats(snapshot);
  }, []);

  const saveTargets = useCallback(async (targetsPatch) => {
    const patch = targetsPatch && typeof targetsPatch === 'object' ? targetsPatch : {};
    let snapshot = null;
    setStats((prev) => {
      const next = {
        ...prev,
        gymTargets: {
          ...prev.gymTargets,
          ...patch,
        },
      };
      snapshot = next;
      return next;
    });
    if (snapshot) await saveGymStats(snapshot);
  }, []);

  const addWeightEntry = useCallback(async ({ valueKg, dateISO }) => {
    let snapshot = null;
    setStats((prev) => {
      const next = addWeightEntryToStats(prev, { valueKg, dateISO });
      snapshot = next;
      return next;
    });
    if (snapshot) await saveGymStats(snapshot);
  }, []);

  const deleteWeightEntry = useCallback(async (entryId) => {
    let snapshot = null;
    setStats((prev) => {
      const next = removeWeightEntryFromStats(prev, entryId);
      snapshot = next;
      return next;
    });
    if (snapshot) await saveGymStats(snapshot);
  }, []);

  const clearGymStats = useCallback(async () => {
    const empty = createDefaultGymStats();
    setStats(empty);
    await clearGymStatsStorage();
    setError('');
  }, []);

  const latestWeightEntry = useMemo(
    () => getLatestWeightEntry(stats.gymEntries?.weightEntries || []),
    [stats.gymEntries?.weightEntries],
  );

  const weightTrend30Days = useMemo(
    () => getWeightTrend30Days(stats.gymEntries?.weightEntries || []),
    [stats.gymEntries?.weightEntries],
  );

  const hasAnyData = useMemo(() => hasGymStatContent(stats), [stats]);

  return {
    loading,
    error,
    stats,
    adherence,
    hasAnyData,
    latestWeightEntry,
    weightTrend30Days,
    hydrate,
    saveGymProfile: saveProfile,
    saveGymTargets: saveTargets,
    addWeightEntry,
    deleteWeightEntry,
    clearGymStats,
  };
}
