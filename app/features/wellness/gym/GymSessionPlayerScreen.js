import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Animated, PanResponder, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import YouTubeEmbed from '../../../components/YouTubeEmbed';
import useGymSessions from '../../../hooks/useGymSessions';
import COLORS from '../../../theme/colors';
import UI_TOKENS from '../../../ui/tokens';
import { formatMeasuredSetRow, getExerciseMeasurementConfig, getMeasurementValuePatch } from './exerciseMeasurement';

function getDisplayStatus(session) {
  const rawStatus = String(session?.status || '').toLowerCase();
  if (rawStatus === 'complete') return 'complete';
  if (rawStatus === 'in_progress') return 'ongoing';

  const baseDate = session?.dateISO || session?.createdAt || null;
  const date = baseDate ? new Date(baseDate) : null;
  if (!date || Number.isNaN(date.getTime())) return 'upcoming';

  const today = new Date();
  const sessionDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  if (sessionDay < todayDay) return 'expired';
  return 'upcoming';
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatDuration(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const min = Math.floor(safe / 60);
  const sec = safe % 60;
  return `${min}m${String(sec).padStart(2, '0')}s`;
}

function formatStartedAt(value) {
  if (!value) return 'Not started yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not started yet';
  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function buildYoutubeSearchFallback(movementName = '') {
  const title = String(movementName || '').trim() || 'exercise';
  return {
    youtubeId: 'dQw4w9WgXcQ',
    title: `${title} tutorial placeholder`,
  };
}

function mapSetRows(sets = [], mode) {
  return (sets || []).map((setRow, index) => ({
    set: Number(setRow?.setIndex || setRow?.set || index + 1),
    reps: mode === 'actual' ? toNumber(setRow?.actualReps ?? setRow?.reps, 0) : toNumber(setRow?.plannedReps ?? setRow?.reps, 0),
    weight: mode === 'actual' ? toNumber(setRow?.actualWeightKg ?? setRow?.weight, 0) : toNumber(setRow?.plannedWeightKg ?? setRow?.weight, 0),
  }));
}

function formatSetLine(setRow, measurement) {
  return formatMeasuredSetRow(setRow, measurement);
}

function deriveLastTimeByMovement(historyRows = []) {
  const map = {};
  historyRows.forEach((session) => {
    (session.exercises || []).forEach((exercise) => {
      if (!exercise?.movementId || map[exercise.movementId]) return;
      const actualSets = mapSetRows(exercise.sets || [], 'actual').filter((setRow) => setRow.reps > 0 || setRow.weight > 0);
      if (!actualSets.length) return;
      map[exercise.movementId] = {
        sessionId: session.id,
        sessionDateISO: session.dateISO,
        movementName: exercise.name,
        variantName: exercise.variantName,
        sets: actualSets,
      };
    });
  });
  return map;
}

function ExerciseSetEditor({ rows, measurement, onChange }) {
  return (
    <View style={styles.editorWrap}>
      {rows.map((row) => (
        <View key={`edit_${row.set}`} style={styles.editorRow}>
          <View style={styles.setPill}><Text style={styles.setPillText}>Set {row.set}</Text></View>
          <TextInput
            value={String(row[measurement.primaryKey] ?? 0)}
            onChangeText={(text) => onChange(row.set, { [measurement.primaryKey]: getMeasurementValuePatch({ mode: 'reps_only' }, text) })}
            keyboardType="number-pad"
            placeholder={measurement.primaryPlaceholder}
            placeholderTextColor={COLORS.muted}
            style={styles.editorInput}
          />
          {measurement.secondaryKey ? (
            <TextInput
              value={String(row[measurement.secondaryKey] ?? 0)}
              onChangeText={(text) => onChange(row.set, { [measurement.secondaryKey]: getMeasurementValuePatch(measurement, text) })}
              keyboardType="decimal-pad"
              placeholder={measurement.secondaryPlaceholder}
              placeholderTextColor={COLORS.muted}
              style={styles.editorInput}
            />
          ) : (
            <View style={[styles.editorInput, styles.editorInputGhost]} />
          )}
        </View>
      ))}
    </View>
  );
}

export default function GymSessionPlayerScreen({ route, navigation }) {
  const sessionId = route.params?.sessionId;
  const sessionsApi = useGymSessions();
  const dragX = useRef(new Animated.Value(0)).current;
  const mountTimeRef = useRef(Date.now());

  const [loading, setLoading] = useState(true);
  const [inlineError, setInlineError] = useState('');
  const [session, setSession] = useState(null);
  const [historyRows, setHistoryRows] = useState([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [draftActualByExerciseId, setDraftActualByExerciseId] = useState({});
  const [savedExerciseIds, setSavedExerciseIds] = useState({});
  const [savingExerciseId, setSavingExerciseId] = useState('');
  const [gestureHint, setGestureHint] = useState('');
  const [completing, setCompleting] = useState(false);
  const [timerPaused, setTimerPaused] = useState(false);

  const hydrate = useCallback(async () => {
    if (!sessionId) {
      setSession(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setInlineError('');
      const [detail, history] = await Promise.all([
        sessionsApi.getDetail({ sessionId }),
        sessionsApi.listRecentCompleted({ excludeSessionId: sessionId, limit: 12 }),
      ]);
      setSession(detail);
      setHistoryRows(history || []);
      const initialActual = {};
      const initialSaved = {};
      (detail?.exercises || []).forEach((exercise) => {
      const actualRows = mapSetRows(exercise.sets || [], 'actual');
      const measurement = getExerciseMeasurementConfig({
        movementSlug: exercise.movementSlug,
        movementName: exercise.name,
        equipment: exercise.equipment,
        primaryMuscleGroup: exercise.muscle,
        weightStepKg: exercise.weightStepKg,
      });
      if (actualRows.some((row) => row.reps > 0 || (measurement.secondaryKey ? row.weight > 0 : false))) {
        initialSaved[exercise.id] = true;
      }
        initialActual[exercise.id] = actualRows.length ? actualRows : mapSetRows(exercise.sets || [], 'planned');
      });
      setDraftActualByExerciseId(initialActual);
      setSavedExerciseIds(initialSaved);
      setCardIndex(0);
      mountTimeRef.current = detail?.startedAt ? new Date(detail.startedAt).getTime() : null;
      setElapsedSeconds(detail?.startedAt ? Math.floor((Date.now() - new Date(detail.startedAt).getTime()) / 1000) : 0);
      setTimerPaused(false);
    } catch (error) {
      setInlineError(error?.message || 'Could not load this session right now.');
    } finally {
      setLoading(false);
    }
  }, [sessionId, sessionsApi]);

  useFocusEffect(
    useCallback(() => {
      hydrate();
      return () => {
        setTimerPaused(true);
      };
    }, [hydrate]),
  );

  useEffect(() => {
    const timer = setInterval(() => {
      if (!mountTimeRef.current || timerPaused) return;
      setElapsedSeconds(Math.floor((Date.now() - mountTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [timerPaused]);

  const cardModels = useMemo(() => {
    const lastTimeMap = deriveLastTimeByMovement(historyRows);
    return (session?.exercises || []).map((exercise) => {
      const plannedSets = mapSetRows(exercise.sets || [], 'planned');
      const currentActual = draftActualByExerciseId[exercise.id] || mapSetRows(exercise.sets || [], 'actual') || plannedSets;
      const lastTime = lastTimeMap[exercise.movementId] || null;

      return {
        id: exercise.id,
        sessionExerciseId: exercise.id,
        movementId: exercise.movementId,
        exerciseId: exercise.exerciseId,
        movementName: exercise.name,
        variantName: exercise.variantName,
        variantLabel: exercise.variantLabel,
        measurement: getExerciseMeasurementConfig({
          movementSlug: exercise.movementSlug,
          movementName: exercise.name,
          equipment: exercise.equipment,
          primaryMuscleGroup: exercise.muscle,
          weightStepKg: exercise.weightStepKg,
        }),
        imageUrl: exercise.imageUrl,
        plannedSets,
        actualSets: currentActual,
        videoYoutubeId: exercise.movementVideoYoutubeId || buildYoutubeSearchFallback(exercise.name).youtubeId,
        lastTime,
      };
    });
  }, [draftActualByExerciseId, historyRows, session?.exercises]);

  const currentCard = cardModels[cardIndex] || null;
  const totalCards = cardModels.length;
  const canAdvance = currentCard ? Boolean(savedExerciseIds[currentCard.id]) : false;
  const allSaved = totalCards > 0 && cardModels.every((card) => savedExerciseIds[card.id]);

  const updateSet = useCallback((exerciseId, setNumber, patch) => {
    setDraftActualByExerciseId((prev) => ({
      ...prev,
      [exerciseId]: (prev[exerciseId] || []).map((row) =>
        row.set === setNumber
          ? {
              ...row,
              ...patch,
              reps: patch.reps !== undefined ? toNumber(patch.reps, 0) : row.reps,
              weight: patch.weight !== undefined ? toNumber(patch.weight, 0) : row.weight,
            }
          : row,
      ),
    }));
    setSavedExerciseIds((prev) => ({ ...prev, [exerciseId]: false }));
  }, []);

  const saveCurrentExercise = useCallback(async () => {
    if (!currentCard || savingExerciseId) return;
    try {
      setSavingExerciseId(currentCard.id);
      setInlineError('');
      const rows = draftActualByExerciseId[currentCard.id] || [];
      await Promise.all(
        rows.map((setRow) =>
          sessionsApi.logActualSet({
            sessionExerciseId: currentCard.sessionExerciseId,
            setIndex: setRow.set,
            actualReps: setRow.reps,
            actualWeightKg: currentCard.measurement?.secondaryKey ? setRow.weight : null,
          }),
        ),
      );
      if (String(session?.status || '').toLowerCase() !== 'in_progress') {
        const statusResult = await sessionsApi.setStatus({ sessionId: session.id, status: 'in_progress' });
        const startedAt = statusResult?.started_at || new Date().toISOString();
        mountTimeRef.current = new Date(startedAt).getTime();
        setElapsedSeconds(Math.floor((Date.now() - mountTimeRef.current) / 1000));
        setTimerPaused(false);
        setSession((prev) => (prev ? { ...prev, status: 'in_progress', startedAt } : prev));
      }
      setSavedExerciseIds((prev) => ({ ...prev, [currentCard.id]: true }));
      setGestureHint('Saved. Swipe to continue.');
    } catch (error) {
      setInlineError(error?.message || 'Could not save actual sets right now.');
    } finally {
      setSavingExerciseId('');
    }
  }, [currentCard, draftActualByExerciseId, savingExerciseId, session?.id, session?.status, sessionsApi]);

  const goNext = useCallback(() => {
    if (!currentCard) return;
    if (!savedExerciseIds[currentCard.id]) {
      setGestureHint('Save this exercise before moving on.');
      return;
    }
    setGestureHint('');
    setCardIndex((prev) => Math.min(prev + 1, totalCards - 1));
  }, [currentCard, savedExerciseIds, totalCards]);

  const goPrev = useCallback(() => {
    setGestureHint('');
    setCardIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const completeSession = useCallback(async () => {
    if (!session?.id || !allSaved || completing) return;
    try {
      setCompleting(true);
      await sessionsApi.setStatus({ sessionId: session.id, status: 'complete' });
      navigation.replace('GymSessionWork', { sessionId: session.id });
    } catch (error) {
      setInlineError(error?.message || 'Could not complete this session right now.');
    } finally {
      setCompleting(false);
    }
  }, [allSaved, completing, navigation, session?.id, sessionsApi]);

  const togglePause = useCallback(() => {
    if (!session?.startedAt) {
      setGestureHint('Start logging an exercise to begin the timer.');
      return;
    }
    setTimerPaused((prev) => !prev);
    setGestureHint((prev) => (timerPaused ? 'Timer resumed.' : 'Timer paused.'));
  }, [session?.startedAt, timerPaused]);

  const goBack = useCallback(() => {
    setTimerPaused(true);
    navigation.goBack();
  }, [navigation]);

  const panResponder = useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 12,
      onPanResponderMove: (_, gestureState) => {
        dragX.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        const threshold = 110;
        if (gestureState.dx <= -threshold && canAdvance && cardIndex < totalCards - 1) {
          Animated.timing(dragX, {
            toValue: -420,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            dragX.setValue(0);
            goNext();
          });
          return;
        }
        if (gestureState.dx >= threshold && cardIndex > 0) {
          Animated.timing(dragX, {
            toValue: 420,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            dragX.setValue(0);
            goPrev();
          });
          return;
        }
        if (gestureState.dx <= -threshold && !canAdvance) {
          setGestureHint('Save this exercise before swiping to the next one.');
        }
        Animated.spring(dragX, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 7,
        }).start();
      },
    }),
    [canAdvance, cardIndex, dragX, goNext, goPrev, totalCards],
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerWrap}>
          <ActivityIndicator color={COLORS.accent} />
          <Text style={styles.centerText}>Loading session player...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (inlineError && !session) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerWrap}>
          <Text style={styles.errorTitle}>Session unavailable</Text>
          <Text style={styles.centerText}>{inlineError}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!session || !currentCard) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerWrap}>
          <Text style={styles.errorTitle}>No exercises found</Text>
          <Text style={styles.centerText}>Go back and choose another session.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.screenHeader}>
          <TouchableOpacity style={styles.backPill} activeOpacity={0.9} onPress={goBack}>
            <Ionicons name="chevron-back" size={18} color={COLORS.text} />
            <Text style={styles.backPillText}>Gym</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Workout Session</Text>
        </View>

        <View style={styles.topBar}>
          <View style={styles.sessionStatusCard}>
            <Text style={styles.sessionStatusLabel}>Started at</Text>
            <Text style={styles.sessionStatusValue}>{formatStartedAt(session?.startedAt)}</Text>
            <Text style={styles.sessionStatusMeta}>
              {session?.startedAt ? `${timerPaused ? 'Paused' : 'Running'} • ${formatDuration(elapsedSeconds)} since start` : 'Waiting to begin'}
            </Text>
          </View>

          <View style={styles.topIconActions}>
            <TouchableOpacity style={styles.iconChromeButton} activeOpacity={0.9} onPress={togglePause}>
              <Ionicons
                name={timerPaused ? 'play' : 'pause'}
                size={16}
                color={session?.startedAt ? COLORS.text : COLORS.muted}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconChromeButton, (!allSaved || completing) && styles.iconChromeButtonMuted]}
              activeOpacity={0.9}
              disabled={!allSaved || completing}
              onPress={completeSession}
            >
              <Ionicons name="checkmark" size={18} color={allSaved ? COLORS.accent : COLORS.muted} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.cardStage}>
          {cardIndex < totalCards - 1 ? <View style={styles.nextCardGhost} /> : null}
          <Animated.View
            style={[styles.cardShell, { transform: [{ translateX: dragX }, { rotate: dragX.interpolate({ inputRange: [-220, 0, 220], outputRange: ['-8deg', '0deg', '8deg'] }) }] }]}
            {...panResponder.panHandlers}
          >
            <ScrollView style={styles.cardScroll} contentContainerStyle={styles.cardContent} showsVerticalScrollIndicator={false}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderText}>
                  <Text style={styles.cardTitle}>{currentCard.movementName}</Text>
                  {currentCard.variantLabel ? <Text style={styles.cardVariant}>{currentCard.variantLabel}</Text> : null}
                </View>
                <TouchableOpacity
                  style={styles.cardDetailButton}
                  activeOpacity={0.9}
                  onPress={() =>
                    navigation.navigate('ExerciseDetail', {
                      movementId: currentCard.movementId,
                      exerciseId: currentCard.exerciseId,
                      selectedVariantId: currentCard.exerciseId,
                      exerciseName: currentCard.movementName,
                    })
                  }
                >
                  <Ionicons name="open-outline" size={14} color={COLORS.accent2} />
                  <Text style={styles.cardDetailText}>Details</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.infoSection}>
                <Text style={styles.infoSectionTitle}>Planned</Text>
                <ExerciseSetEditor
                  rows={currentCard.actualSets}
                  measurement={currentCard.measurement}
                  onChange={(setNumber, patch) => updateSet(currentCard.id, setNumber, patch)}
                />
                <TouchableOpacity
                  style={[styles.saveButton, savingExerciseId === currentCard.id ? styles.saveButtonDisabled : null]}
                  activeOpacity={0.9}
                  onPress={saveCurrentExercise}
                  disabled={savingExerciseId === currentCard.id}
                >
                  {savingExerciseId === currentCard.id ? (
                    <ActivityIndicator size="small" color={COLORS.bg} />
                  ) : (
                    <Text style={styles.saveButtonText}>{savedExerciseIds[currentCard.id] ? 'Saved' : 'Save planned as done'}</Text>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.infoSection}>
                <Text style={styles.infoSectionTitle}>Last time</Text>
                {currentCard.lastTime ? (
                  <View style={styles.infoBlock}>
                    {currentCard.lastTime.sets.map((setRow) => (
                      <Text key={`last_${currentCard.id}_${setRow.set}`} style={styles.infoLine}>{formatSetLine(setRow, currentCard.measurement)}</Text>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.infoEmpty}>No completed history yet.</Text>
                )}
              </View>

              <View style={styles.infoSection}>
                <Text style={styles.infoSectionTitle}>Video</Text>
                <YouTubeEmbed
                  youtubeId={currentCard.videoYoutubeId}
                  title={`${currentCard.movementName} tutorial`}
                  showControls
                />
              </View>

              {gestureHint ? <Text style={styles.gestureHint}>{gestureHint}</Text> : null}
              {inlineError ? <Text style={styles.inlineError}>{inlineError}</Text> : null}
            </ScrollView>
          </Animated.View>
        </View>

        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.chromeTile, cardIndex === 0 && styles.chromeTileMuted]}
            activeOpacity={0.9}
            disabled={cardIndex === 0}
            onPress={goPrev}
          >
            <Text style={styles.chromeTileLabel}>Previous</Text>
            <Text style={styles.chromeTileValueSmall}>{cardIndex === 0 ? 'Start' : `#${cardIndex}`}</Text>
          </TouchableOpacity>

          <View style={styles.progressTile}>
            <Text style={styles.chromeTileLabel}>Exercise</Text>
            <Text style={styles.progressValue}>{cardIndex + 1} of {totalCards}</Text>
          </View>

          <TouchableOpacity
            style={[styles.chromeTile, !canAdvance && styles.chromeTileMuted]}
            activeOpacity={0.9}
            disabled={!canAdvance}
            onPress={goNext}
          >
            <Text style={styles.chromeTileLabel}>Next</Text>
            <Text style={styles.chromeTileValueSmall}>
              {cardIndex === totalCards - 1 ? (allSaved ? 'Done' : 'Locked') : canAdvance ? 'Swipe' : 'Locked'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    flex: 1,
    paddingHorizontal: UI_TOKENS.spacing.md,
    paddingVertical: UI_TOKENS.spacing.sm,
    gap: UI_TOKENS.spacing.sm,
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: UI_TOKENS.spacing.sm,
  },
  backPill: {
    minHeight: 44,
    borderRadius: 999,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.card,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backPillText: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 1,
    fontWeight: '700',
  },
  screenTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.title + 4,
    fontWeight: '800',
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: UI_TOKENS.spacing.md,
    gap: UI_TOKENS.spacing.sm,
  },
  centerText: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.subtitle,
    textAlign: 'center',
  },
  errorTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.title,
    fontWeight: '700',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: UI_TOKENS.spacing.xs,
  },
  topIconActions: {
    width: 52,
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: UI_TOKENS.spacing.xs,
  },
  bottomBar: {
    flexDirection: 'row',
    gap: UI_TOKENS.spacing.xs,
    alignItems: 'stretch',
  },
  chromeTile: {
    flex: 1,
    minHeight: 58,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(245,201,106,0.42)',
    backgroundColor: 'rgba(245,201,106,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: UI_TOKENS.spacing.xs,
  },
  chromeTileMuted: {
    opacity: 0.45,
  },
  chromeTileLabel: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  chromeTileValue: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 6,
    fontWeight: '800',
    marginTop: 2,
  },
  chromeTileValueSmall: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
  },
  progressTile: {
    flex: 1,
    minHeight: 58,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(245,201,106,0.42)',
    backgroundColor: 'rgba(245,201,106,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: UI_TOKENS.spacing.sm,
  },
  progressValue: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 4,
    fontWeight: '800',
    marginTop: 2,
  },
  sessionStatusCard: {
    flex: 1,
    minHeight: 96,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(245,201,106,0.42)',
    backgroundColor: 'rgba(245,201,106,0.1)',
    paddingHorizontal: UI_TOKENS.spacing.sm,
    paddingVertical: UI_TOKENS.spacing.sm,
    justifyContent: 'center',
    gap: 4,
  },
  sessionStatusLabel: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sessionStatusValue: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 2,
    fontWeight: '800',
  },
  sessionStatusMeta: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '600',
  },
  iconChromeButton: {
    width: 44,
    height: 44,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(245,201,106,0.36)',
    backgroundColor: 'rgba(245,201,106,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconChromeButtonMuted: {
    opacity: 0.45,
  },
  cardStage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextCardGhost: {
    position: 'absolute',
    top: 22,
    width: '92%',
    height: '92%',
    borderRadius: UI_TOKENS.radius.lg,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.14)',
  },
  cardShell: {
    width: '100%',
    maxWidth: 430,
    flex: 1,
    borderRadius: UI_TOKENS.radius.lg,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: COLORS.card,
    overflow: 'hidden',
  },
  cardScroll: {
    flex: 1,
  },
  cardContent: {
    padding: UI_TOKENS.spacing.md,
    gap: UI_TOKENS.spacing.sm,
    paddingBottom: UI_TOKENS.spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: UI_TOKENS.spacing.sm,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.title + 4,
    fontWeight: '800',
  },
  cardVariant: {
    color: COLORS.accent,
    fontSize: UI_TOKENS.typography.subtitle,
    fontWeight: '700',
    marginTop: 4,
  },
  cardDetailButton: {
    minHeight: 34,
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(90,209,232,0.4)',
    backgroundColor: 'rgba(90,209,232,0.12)',
    paddingHorizontal: UI_TOKENS.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardDetailText: {
    color: COLORS.accent2,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
  infoSection: {
    gap: UI_TOKENS.spacing.xs,
  },
  infoSectionTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 1,
    fontWeight: '700',
  },
  infoBlock: {
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.18)',
    backgroundColor: COLORS.cardSoft,
    padding: UI_TOKENS.spacing.sm,
    gap: 4,
  },
  infoLine: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle,
    fontWeight: '700',
  },
  infoEmpty: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta + 1,
  },
  editorWrap: {
    gap: UI_TOKENS.spacing.xs,
  },
  editorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: UI_TOKENS.spacing.xs,
  },
  setPill: {
    width: 62,
    minHeight: 38,
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.18)',
    backgroundColor: COLORS.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setPillText: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.meta + 1,
    fontWeight: '700',
  },
  editorInput: {
    flex: 1,
    minHeight: 38,
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.18)',
    backgroundColor: COLORS.cardSoft,
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle,
    fontWeight: '700',
    paddingHorizontal: UI_TOKENS.spacing.sm,
  },
  editorInputGhost: {
    opacity: 0,
  },
  saveButton: {
    minHeight: 42,
    borderRadius: UI_TOKENS.radius.md,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: UI_TOKENS.spacing.xs,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: COLORS.bg,
    fontSize: UI_TOKENS.typography.subtitle,
    fontWeight: '800',
  },
  gestureHint: {
    color: COLORS.accent,
    fontSize: UI_TOKENS.typography.meta + 1,
    fontWeight: '700',
    textAlign: 'center',
  },
  inlineError: {
    color: '#FFB4A8',
    fontSize: UI_TOKENS.typography.meta + 1,
    textAlign: 'center',
  },
});
