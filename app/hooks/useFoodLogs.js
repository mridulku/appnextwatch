import { useCallback, useEffect, useMemo, useState } from 'react';

import { getOrCreateAppUser } from '../core/api/foodInventoryDb';
import { getUserFoodLogByDate, listLoggableDishes, listUserFoodLogs, saveFoodLog } from '../core/api/foodLogsDb';

function toDayKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function useFoodLogs(user) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [appUserId, setAppUserId] = useState(null);
  const [logs, setLogs] = useState([]);
  const [availableDishes, setAvailableDishes] = useState([]);

  const hydrate = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const appUser = await getOrCreateAppUser({
        username: user?.username || 'demo_user',
        name: user?.name || 'Demo User',
      });
      setAppUserId(appUser.id);
      const [nextLogs, nextRecipes] = await Promise.all([
        listUserFoodLogs(appUser.id),
        listLoggableDishes(),
      ]);
      setLogs(nextLogs);
      setAvailableDishes(nextRecipes);
    } catch (nextError) {
      setError(nextError?.message || 'Unable to load food logs right now.');
    } finally {
      setLoading(false);
    }
  }, [user?.name, user?.username]);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const logsByDate = useMemo(() => {
    const map = new Map();
    logs.forEach((log) => {
      if (log?.dateISO) map.set(log.dateISO, log);
    });
    return map;
  }, [logs]);

  const getLogForDate = useCallback(async (dateISO) => {
    if (!appUserId) return null;
    return getUserFoodLogByDate(appUserId, dateISO);
  }, [appUserId]);

  const saveLogForDate = useCallback(async (dateISO, items) => {
    if (!appUserId) throw new Error('Food logs are not ready yet.');
    try {
      setSaving(true);
      setError('');
      const saved = await saveFoodLog({ userId: appUserId, dateISO, items });
      const nextLogs = await listUserFoodLogs(appUserId);
      setLogs(nextLogs);
      return saved;
    } catch (nextError) {
      setError(nextError?.message || 'Unable to save food log right now.');
      throw nextError;
    } finally {
      setSaving(false);
    }
  }, [appUserId]);

  return {
    loading,
    saving,
    error,
    appUserId,
    logs,
    logsByDate,
    availableDishes,
    hydrate,
    getLogForDate,
    saveLogForDate,
    toDayKey,
  };
}
