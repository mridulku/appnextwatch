import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '../context/AuthContext';
import {
  createGymSession,
  deleteGymSession,
  duplicateGymSession,
  getGymSessionDetail,
  getOrCreateCurrentAppUserId,
  listUserGymSessions,
  listRecentCompletedGymSessions,
  listUserSessionMovementLibrary,
  listUserSessionExerciseLibrary,
  reorderSessionExercises,
  updateGymSession,
  updateGymSessionStatus,
  upsertActualSetLog,
} from '../core/api/gymSessionsDb';

export default function useGymSessions() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sessions, setSessions] = useState([]);
  const [exerciseOptions, setExerciseOptions] = useState([]);
  const [movementOptions, setMovementOptions] = useState([]);
  const [appUserId, setAppUserId] = useState(null);

  const ensureUserId = useCallback(async () => {
    if (appUserId) return appUserId;
    const resolvedUserId = await getOrCreateCurrentAppUserId(user);
    setAppUserId(resolvedUserId);
    return resolvedUserId;
  }, [appUserId, user]);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const userId = await ensureUserId();
      const rows = await listUserGymSessions({ userId });
      setSessions(rows);
      return rows;
    } catch (nextError) {
      setError(nextError?.message || 'Unable to load gym sessions right now.');
      return [];
    } finally {
      setLoading(false);
    }
  }, [ensureUserId]);

  const loadExerciseOptions = useCallback(async () => {
    try {
      setError('');
      const userId = await ensureUserId();
      const rows = await listUserSessionExerciseLibrary({ userId });
      setExerciseOptions(rows);
      return rows;
    } catch (nextError) {
      setError(nextError?.message || 'Unable to load exercise list right now.');
      return [];
    }
  }, [ensureUserId]);

  const loadMovementOptions = useCallback(async () => {
    try {
      setError('');
      const userId = await ensureUserId();
      const rows = await listUserSessionMovementLibrary({ userId });
      setMovementOptions(rows);
      return rows;
    } catch (nextError) {
      setError(nextError?.message || 'Unable to load movement list right now.');
      return [];
    }
  }, [ensureUserId]);

  const create = useCallback(
    async (payload) => {
      const userId = await ensureUserId();
      const created = await createGymSession({ userId, payload });
      await refresh();
      return created;
    },
    [ensureUserId, refresh],
  );

  const duplicate = useCallback(
    async ({ sessionId, newTitle }) => {
      const userId = await ensureUserId();
      const created = await duplicateGymSession({ userId, sessionId, newTitle });
      await refresh();
      return created;
    },
    [ensureUserId, refresh],
  );

  const remove = useCallback(
    async ({ sessionId }) => {
      const userId = await ensureUserId();
      await deleteGymSession({ userId, sessionId });
      await refresh();
      return true;
    },
    [ensureUserId, refresh],
  );

  const setStatus = useCallback(
    async ({ sessionId, status }) => {
      const userId = await ensureUserId();
      const result = await updateGymSessionStatus({ userId, sessionId, status });
      await refresh();
      return result;
    },
    [ensureUserId, refresh],
  );

  const update = useCallback(
    async ({ sessionId, payload }) => {
      const userId = await ensureUserId();
      const result = await updateGymSession({ userId, sessionId, payload });
      await refresh();
      return result;
    },
    [ensureUserId, refresh],
  );

  const logActualSet = useCallback(
    async ({ sessionExerciseId, setIndex, actualReps, actualWeightKg, actualSpeedKph }) => {
      const userId = await ensureUserId();
      return upsertActualSetLog({
        userId,
        sessionExerciseId,
        setIndex,
        actualReps,
        actualWeightKg,
        actualSpeedKph,
      });
    },
    [ensureUserId],
  );

  const reorder = useCallback(
    async ({ sessionId, orderedSessionExerciseIds }) => {
      const userId = await ensureUserId();
      const result = await reorderSessionExercises({ userId, sessionId, orderedSessionExerciseIds });
      await refresh();
      return result;
    },
    [ensureUserId, refresh],
  );

  const getDetail = useCallback(
    async ({ sessionId }) => {
      const userId = await ensureUserId();
      return getGymSessionDetail({ userId, sessionId });
    },
    [ensureUserId],
  );

  const listRecentCompleted = useCallback(
    async ({ excludeSessionId = '', limit = 12 } = {}) => {
      const userId = await ensureUserId();
      return listRecentCompletedGymSessions({ userId, excludeSessionId, limit });
    },
    [ensureUserId],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  const api = useMemo(
    () => ({
      loading,
      error,
      sessions,
      exerciseOptions,
      movementOptions,
      refresh,
      loadExerciseOptions,
      loadMovementOptions,
      create,
      remove,
      duplicate,
      update,
      setStatus,
      logActualSet,
      reorder,
      getDetail,
      listRecentCompleted,
      appUserId,
      setError,
    }),
    [
      appUserId,
      create,
      remove,
      duplicate,
      error,
      exerciseOptions,
      movementOptions,
      getDetail,
      listRecentCompleted,
      loadExerciseOptions,
      loadMovementOptions,
      loading,
      logActualSet,
      refresh,
      reorder,
      sessions,
      update,
      setStatus,
    ],
  );

  return api;
}
