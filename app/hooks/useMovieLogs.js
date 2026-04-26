import { useCallback, useEffect, useMemo, useState } from 'react';

import { getOrCreateAppUser } from '../core/api/foodInventoryDb';
import {
  createCatalogMediaTitle,
  getUserMovieLogByDate,
  listCatalogMediaTitles,
  listUserMovieLogs,
  saveMovieLog,
  updateCatalogMediaTitle,
} from '../core/api/movieLogsDb';

export default function useMovieLogs(user) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [appUserId, setAppUserId] = useState(null);
  const [logs, setLogs] = useState([]);
  const [titles, setTitles] = useState([]);

  const hydrate = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const appUser = await getOrCreateAppUser({
        username: user?.username || 'demo_user',
        name: user?.name || 'Demo User',
      });
      setAppUserId(appUser.id);
      const [nextLogs, nextTitles] = await Promise.all([
        listUserMovieLogs(appUser.id),
        listCatalogMediaTitles(),
      ]);
      setLogs(nextLogs);
      setTitles(nextTitles);
    } catch (nextError) {
      setError(nextError?.message || 'Unable to load movies right now.');
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
    return getUserMovieLogByDate(appUserId, dateISO);
  }, [appUserId]);

  const saveLogForDate = useCallback(async (dateISO, items) => {
    if (!appUserId) throw new Error('Movies are not ready yet.');
    try {
      setSaving(true);
      setError('');
      const saved = await saveMovieLog({ userId: appUserId, dateISO, items });
      const nextLogs = await listUserMovieLogs(appUserId);
      setLogs(nextLogs);
      return saved;
    } catch (nextError) {
      setError(nextError?.message || 'Unable to save movie log right now.');
      throw nextError;
    } finally {
      setSaving(false);
    }
  }, [appUserId]);

  const createTitle = useCallback(async (payload) => {
    try {
      setSaving(true);
      setError('');
      const created = await createCatalogMediaTitle(payload);
      const nextTitles = await listCatalogMediaTitles();
      setTitles(nextTitles);
      return created;
    } catch (nextError) {
      setError(nextError?.message || 'Unable to create title right now.');
      throw nextError;
    } finally {
      setSaving(false);
    }
  }, []);

  const updateTitle = useCallback(async (id, payload) => {
    try {
      setSaving(true);
      setError('');
      const updated = await updateCatalogMediaTitle(id, payload);
      const nextTitles = await listCatalogMediaTitles();
      setTitles(nextTitles);
      return updated;
    } catch (nextError) {
      setError(nextError?.message || 'Unable to update title right now.');
      throw nextError;
    } finally {
      setSaving(false);
    }
  }, []);

  return {
    loading,
    saving,
    error,
    appUserId,
    logs,
    logsByDate,
    titles,
    hydrate,
    getLogForDate,
    saveLogForDate,
    createTitle,
    updateTitle,
  };
}
