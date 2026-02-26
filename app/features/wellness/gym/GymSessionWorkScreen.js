import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import COLORS from '../../../theme/colors';
import UI_TOKENS from '../../../ui/tokens';
import GymLogDetailScreen from './GymLogDetailScreen';
import useGymSessions from '../../../hooks/useGymSessions';
import { estimateExerciseDurationMin, estimateSessionCalories, estimateSessionDurationMin } from './sessionDuration';

function toLogStatus(sessionStatus) {
  if (sessionStatus === 'complete') return 'completed';
  return 'planned';
}

function mapSessionToLog(session) {
  const mappedExercises = (session.exercises || []).map((exercise) => {
    const plannedSets = (exercise.sets || []).map((setRow, index) => ({
      set: setRow.setIndex || index + 1,
      reps: Number(setRow.plannedReps) || 0,
      weight: Number(setRow.plannedWeightKg) || 0,
    }));

    return {
      id: exercise.id,
      exerciseCatalogId: exercise.exerciseId,
      name: exercise.name,
      muscleGroup: exercise.muscle,
      equipment: exercise.equipment,
      estimatedDurationMin: estimateExerciseDurationMin({ name: exercise.name, sets: plannedSets }),
      planned_sets: plannedSets,
      actual_sets: (exercise.sets || [])
        .filter((setRow) => setRow.actualReps !== null || setRow.actualWeightKg !== null)
        .map((setRow, index) => ({
          set: setRow.setIndex || index + 1,
          reps: Number(setRow.actualReps) || 0,
          weight: Number(setRow.actualWeightKg) || 0,
        })),
    };
  });

  const resolvedDurationMin = session.durationMin
    || estimateSessionDurationMin(mappedExercises.map((exercise) => ({ name: exercise.name, sets: exercise.planned_sets })));
  const resolvedCalories = session.estCalories ?? estimateSessionCalories(resolvedDurationMin);

  return {
    id: session.id,
    dateISO: session.dateISO || session.createdAt?.slice(0, 10),
    dayType: session.title || 'Workout Day',
    workoutType: session.title || 'Workout',
    durationMin: resolvedDurationMin || 45,
    status: toLogStatus(session.status),
    summary: {
      estCalories: resolvedCalories || '—',
    },
    decisionTrace: {
      phase: session.status === 'complete' ? 'Completed block step' : 'Build',
      lastSignal: 'Session template created manually',
      adjustment: 'Use planned sets and log actual performance.',
      note: session.whyNote || 'Structured from your custom session template.',
    },
    exercises: mappedExercises,
  };
}

function GymSessionWorkScreen({ route, navigation }) {
  const sessionId = route.params?.sessionId;
  const sessionsApi = useGymSessions();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inlineError, setInlineError] = useState('');

  const hydrate = useCallback(async () => {
    if (!sessionId) {
      setSession(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setInlineError('');
      const detail = await sessionsApi.getDetail({ sessionId });
      setSession(detail);
    } catch (error) {
      setInlineError(error?.message || 'Could not load this session right now.');
    } finally {
      setLoading(false);
    }
  }, [sessionId, sessionsApi]);

  useFocusEffect(
    useCallback(() => {
      hydrate();
    }, [hydrate]),
  );

  const logPayload = useMemo(() => (session ? mapSessionToLog(session) : null), [session]);

  const handleSessionStatusChange = useCallback(
    async (status) => {
      if (!session?.id) return;
      if (status !== 'completed') return;
      if (session.status === 'complete') return;

      await sessionsApi.setStatus({ sessionId: session.id, status: 'complete' });
      await hydrate();
    },
    [hydrate, session?.id, session?.status, sessionsApi.setStatus],
  );

  const handleLoggedCountChange = useCallback(
    async (loggedCount) => {
      if (!session?.id) return;
      if (session.status === 'complete') return;
      if (loggedCount <= 0) return;
      if (session.status === 'in_progress') return;

      await sessionsApi.setStatus({ sessionId: session.id, status: 'in_progress' });
      await hydrate();
    },
    [hydrate, session?.id, session?.status, sessionsApi.setStatus],
  );

  const handleActualSetsSave = useCallback(
    async ({ exerciseId, sets }) => {
      const operations = (sets || []).map((setRow, index) =>
        sessionsApi.logActualSet({
          sessionExerciseId: exerciseId,
          setIndex: Number(setRow?.set) || index + 1,
          actualReps: setRow.reps,
          actualWeightKg: setRow.weight,
        }),
      );

      await Promise.all(operations);
      await hydrate();
    },
    [hydrate, sessionsApi.logActualSet],
  );

  const handleDuplicateSession = useCallback(async () => {
    if (!session?.id) return;
    try {
      const created = await sessionsApi.duplicate({
        sessionId: session.id,
        newTitle: `${session.title} Copy`,
      });
      navigation.replace('GymSessionWork', { sessionId: created.id });
    } catch (error) {
      setInlineError(error?.message || 'Could not duplicate this session right now.');
    }
  }, [navigation, session?.id, session?.title, sessionsApi]);

  const handleDeleteSession = useCallback(() => {
    if (!session?.id) return;
    Alert.alert('Delete session?', `Delete "${session.title}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await sessionsApi.remove({ sessionId: session.id });
            navigation.goBack();
          } catch (error) {
            setInlineError(error?.message || 'Could not delete this session right now.');
          }
        },
      },
    ]);
  }, [navigation, session?.id, session?.title, sessionsApi]);

  if (loading) {
    return (
      <View style={styles.emptyContainer}>
        <ActivityIndicator color={COLORS.accent} />
        <Text style={styles.emptyBody}>Loading session...</Text>
      </View>
    );
  }

  if (inlineError) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Session unavailable</Text>
        <Text style={styles.emptyBody}>{inlineError}</Text>
      </View>
    );
  }

  if (!session || !logPayload) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Session not found</Text>
        <Text style={styles.emptyBody}>Go back and choose a created session.</Text>
      </View>
    );
  }

  return (
    <GymLogDetailScreen
      navigation={navigation}
      route={{ params: { logId: session.id, log: logPayload } }}
      sessionRecordingSessionId={session.id}
      onSessionStatusChange={handleSessionStatusChange}
      onLoggedCountChange={handleLoggedCountChange}
      onActualSetsSave={handleActualSetsSave}
      onRequestDuplicate={handleDuplicateSession}
      onRequestDelete={handleDeleteSession}
    />
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: UI_TOKENS.spacing.md,
    gap: 8,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 1,
    fontWeight: '700',
  },
  emptyBody: {
    marginTop: 2,
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
    textAlign: 'center',
  },
});

export default GymSessionWorkScreen;
