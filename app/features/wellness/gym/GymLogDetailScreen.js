import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import COLORS from '../../../theme/colors';
import UI_TOKENS from '../../../ui/tokens';
import { findLogById } from './mockGymLogs';
import { estimateExerciseDurationMin } from './sessionDuration';

function toDateOnly(value) {
  const date = value instanceof Date ? new Date(value) : new Date(`${String(value).slice(0, 10)}T00:00:00`);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDateTitle(value) {
  const date = toDateOnly(value);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isLikelyIsolation(name = '') {
  const key = String(name).toLowerCase();
  return ['curl', 'raise', 'pushdown', 'fly', 'extension'].some((token) => key.includes(token));
}

function defaultWeightForExercise(name = '', equipment = '') {
  const key = `${name} ${equipment}`.toLowerCase();
  if (key.includes('barbell')) return 40;
  if (key.includes('machine') || key.includes('cable')) return 30;
  if (key.includes('dumbbell')) return 12;
  return 20;
}

function buildFallbackPlannedSets(exercise) {
  const isolation = isLikelyIsolation(exercise?.name);
  const setCount = isolation ? 3 : 4;
  const reps = isolation ? 12 : 8;
  const weight = defaultWeightForExercise(exercise?.name, exercise?.equipment);
  return Array.from({ length: setCount }).map((_, index) => ({
    set: index + 1,
    reps,
    weight,
  }));
}

function normalizeSetRows(sets, fallbackExercise) {
  if (!Array.isArray(sets) || sets.length === 0) {
    return buildFallbackPlannedSets(fallbackExercise);
  }

  return sets.map((setRow, index) => ({
    set: toNumber(setRow?.set || setRow?.setIndex || index + 1, index + 1),
    reps: Math.max(0, Math.round(toNumber(setRow?.reps, 0))),
    weight: Math.max(0, Math.round(toNumber(setRow?.weight ?? setRow?.weightKg, 0) * 10) / 10),
  }));
}

function normalizeExercises(exercises = []) {
  return exercises.map((exercise, index) => ({
    id: exercise?.id || `exercise_${index + 1}`,
    exerciseCatalogId: exercise?.exerciseCatalogId || exercise?.exerciseId || null,
    name: exercise?.name || `Exercise ${index + 1}`,
    muscleGroup: exercise?.primaryGroup || exercise?.muscleGroup || 'Muscle',
    equipment: exercise?.equipment || 'Equipment',
    image: exercise?.image || null,
    plannedSets: normalizeSetRows(
      exercise?.planned_sets || exercise?.plannedSets || exercise?.planned || exercise?.sets,
      exercise,
    ),
    actualSets: Array.isArray(exercise?.actual_sets || exercise?.actualSets) && (exercise?.actual_sets || exercise?.actualSets).length
      ? normalizeSetRows(exercise?.actual_sets || exercise?.actualSets, exercise)
      : null,
    estimatedDurationMin:
      Number(exercise?.estimatedDurationMin)
      || estimateExerciseDurationMin({
        name: exercise?.name,
        sets: exercise?.planned_sets || exercise?.plannedSets || exercise?.planned || exercise?.sets,
      }),
  }));
}

function sumSets(exercises = [], actualByExerciseId = {}) {
  return exercises.reduce((sum, exercise) => {
    const actual = actualByExerciseId[exercise.id];
    if (actual && actual.length) return sum + actual.length;
    if (exercise.actualSets && exercise.actualSets.length) return sum + exercise.actualSets.length;
    return sum;
  }, 0);
}

function sumVolume(sets = []) {
  return sets.reduce((sum, setRow) => sum + toNumber(setRow.reps) * toNumber(setRow.weight), 0);
}

function sumExerciseVolume(exercises = [], actualByExerciseId = {}) {
  return Math.round(
    exercises.reduce((sum, exercise) => {
      const actual = actualByExerciseId[exercise.id];
      if (actual && actual.length) return sum + sumVolume(actual);
      if (exercise.actualSets && exercise.actualSets.length) return sum + sumVolume(exercise.actualSets);
      return sum;
    }, 0),
  );
}

function SetsRow({ setRow }) {
  const repsWarn = toNumber(setRow.reps) === 0;

  return (
    <View style={styles.setRow}>
      <View style={styles.setIndexPill}>
        <Text style={styles.setIndexText}>Set {setRow.set}</Text>
      </View>
      <View style={[styles.setValueChip, repsWarn ? styles.setWarnChip : null]}>
        <Text style={[styles.setValueText, repsWarn ? styles.setWarnText : null]}>{setRow.reps} reps</Text>
      </View>
      <View style={styles.setValueChip}>
        <Text style={styles.setValueText}>{setRow.weight} kg</Text>
      </View>
    </View>
  );
}

function ExerciseAccordionCard({
  exercise,
  expanded,
  onToggle,
  mode,
  dayIsFuture,
  onLogPress,
  onOpenExercise,
}) {
  const hasActual = Array.isArray(exercise.actualSets) && exercise.actualSets.length > 0;

  return (
    <View style={styles.exerciseCardWrap}>
      <Pressable onPress={onToggle} style={({ pressed }) => [styles.exerciseCard, pressed && styles.exerciseCardPressed]}>
        <View style={styles.exerciseThumbWrap}>
          <View style={styles.exerciseThumbFrame}>
            <Ionicons name="barbell-outline" size={20} color={COLORS.muted} />
          </View>
        </View>

        <View style={styles.exerciseMain}>
          <Text style={styles.exerciseTitle}>{exercise.name}</Text>
          <Text style={styles.exerciseMeta}>
            {exercise.muscleGroup} • {exercise.equipment}
            {exercise.estimatedDurationMin ? ` • est ${exercise.estimatedDurationMin} min` : ''}
          </Text>

          {mode === 'actual' && !hasActual ? (
            <Text style={styles.notLoggedText}>Not logged</Text>
          ) : null}
        </View>

        <View style={styles.exerciseRight}>
          {onOpenExercise ? (
            <TouchableOpacity
              style={styles.openDetailButton}
              activeOpacity={0.9}
              onPress={(event) => {
                event?.stopPropagation?.();
                onOpenExercise(exercise);
              }}
            >
              <Ionicons name="open-outline" size={13} color={COLORS.accent2} />
              <Text style={styles.openDetailText}>Details</Text>
            </TouchableOpacity>
          ) : null}
          {mode === 'planned' && hasActual ? (
            <View style={styles.loggedPill}>
              <Text style={styles.loggedPillText}>Logged</Text>
            </View>
          ) : null}
          <View style={styles.viewSetsPill}>
            <Text style={styles.viewSetsText}>View sets</Text>
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={12} color={COLORS.muted} />
          </View>
        </View>
      </Pressable>

      {expanded ? (
        <View style={styles.exerciseExpandPanel}>
          {mode === 'planned' ? (
            <>
              {exercise.plannedSets.map((setRow) => (
                <SetsRow key={`planned_${exercise.id}_${setRow.set}`} setRow={setRow} />
              ))}
              <TouchableOpacity
                style={[styles.logButton, dayIsFuture ? styles.logButtonDisabled : null]}
                activeOpacity={dayIsFuture ? 1 : 0.9}
                disabled={dayIsFuture}
                onPress={() => onLogPress(exercise)}
              >
                <Text style={[styles.logButtonText, dayIsFuture ? styles.logButtonDisabledText : null]}>
                  {dayIsFuture ? 'Scheduled' : 'Log this exercise'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {hasActual ? (
                <>
                  {exercise.actualSets.map((setRow) => (
                    <SetsRow key={`actual_${exercise.id}_${setRow.set}`} setRow={setRow} />
                  ))}
                  {!dayIsFuture ? (
                    <TouchableOpacity style={styles.logButtonSecondary} activeOpacity={0.9} onPress={() => onLogPress(exercise)}>
                      <Text style={styles.logButtonSecondaryText}>Edit logged sets</Text>
                    </TouchableOpacity>
                  ) : null}
                </>
              ) : (
                <View style={styles.actualEmptyWrap}>
                  <Text style={styles.actualEmptyText}>Not logged</Text>
                  {!dayIsFuture ? (
                    <TouchableOpacity style={styles.logButtonSecondary} activeOpacity={0.9} onPress={() => onLogPress(exercise)}>
                      <Text style={styles.logButtonSecondaryText}>Log now</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.futureLabelPill}>
                      <Text style={styles.futureLabelText}>Scheduled</Text>
                    </View>
                  )}
                </View>
              )}
            </>
          )}
        </View>
      ) : null}
    </View>
  );
}

function LogSetsModal({ visible, exercise, dayIsFuture, onClose, onSave }) {
  const initialRows = useMemo(() => {
    if (!exercise) return [];
    return (exercise.actualSets && exercise.actualSets.length ? exercise.actualSets : exercise.plannedSets).map((setRow, index) => ({
      set: index + 1,
      reps: toNumber(setRow.reps, 0),
      weight: toNumber(setRow.weight, 0),
    }));
  }, [exercise]);

  const [rows, setRows] = useState(initialRows);

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  const updateRow = (setNumber, patch) => {
    setRows((prev) => prev.map((row) => (row.set === setNumber ? { ...row, ...patch } : row)));
  };

  const addSet = () => {
    setRows((prev) => [
      ...prev,
      {
        set: prev.length + 1,
        reps: prev.length ? prev[prev.length - 1].reps : 8,
        weight: prev.length ? prev[prev.length - 1].weight : 20,
      },
    ]);
  };

  const removeSet = (setNumber) => {
    setRows((prev) => prev.filter((row) => row.set !== setNumber).map((row, index) => ({ ...row, set: index + 1 })));
  };

  const save = () => {
    const payload = rows.map((row, index) => ({
      set: index + 1,
      reps: Math.max(0, Math.round(toNumber(row.reps, 0))),
      weight: Math.max(0, Math.round(toNumber(row.weight, 0) * 10) / 10),
    }));
    onSave(payload);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{exercise?.name || 'Log sets'}</Text>
          <Text style={styles.modalSubtitle}>Logging actual sets</Text>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {rows.map((row) => (
              <View key={`modal_set_${row.set}`} style={styles.modalSetRow}>
                <Text style={styles.modalSetLabel}>Set {row.set}</Text>

                <TextInput
                  value={String(row.reps)}
                  onChangeText={(text) => updateRow(row.set, { reps: text.replace(/[^0-9]/g, '') })}
                  keyboardType="number-pad"
                  style={styles.modalInput}
                  placeholder="Reps"
                  placeholderTextColor={COLORS.muted}
                  editable={!dayIsFuture}
                />

                <TextInput
                  value={String(row.weight)}
                  onChangeText={(text) => updateRow(row.set, { weight: text.replace(/[^0-9.]/g, '') })}
                  keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
                  style={styles.modalInput}
                  placeholder="Weight"
                  placeholderTextColor={COLORS.muted}
                  editable={!dayIsFuture}
                />

                {!dayIsFuture ? (
                  <TouchableOpacity style={styles.removeSetButton} activeOpacity={0.9} onPress={() => removeSet(row.set)}>
                    <Ionicons name="trash-outline" size={14} color="#FF9D9D" />
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}

            {!dayIsFuture ? (
              <TouchableOpacity style={styles.addSetButton} activeOpacity={0.9} onPress={addSet}>
                <Text style={styles.addSetText}>+ Add set</Text>
              </TouchableOpacity>
            ) : null}
          </ScrollView>

          <View style={styles.modalActionsRow}>
            <TouchableOpacity style={styles.modalActionSecondary} activeOpacity={0.9} onPress={onClose}>
              <Text style={styles.modalActionSecondaryText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalActionPrimary, dayIsFuture ? styles.modalActionDisabled : null]}
              activeOpacity={dayIsFuture ? 1 : 0.9}
              disabled={dayIsFuture}
              onPress={save}
            >
              <Text style={[styles.modalActionPrimaryText, dayIsFuture ? styles.modalActionDisabledText : null]}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function GymLogDetailScreen({
  route,
  navigation,
  onSessionStatusChange,
  onLoggedCountChange,
  onActualSetsSave,
  onRequestDuplicate,
  onRequestDelete,
}) {
  const passedLog = route.params?.log || null;
  const logId = route.params?.logId;
  const sourceLog = passedLog || findLogById(logId);

  const initialExercises = useMemo(() => normalizeExercises(sourceLog?.exercises || []), [sourceLog?.exercises]);

  const dayDate = toDateOnly(sourceLog?.dateISO || new Date());
  const today = toDateOnly(new Date());
  const isFutureDay = dayDate.getTime() > today.getTime();
  const isPastDay = dayDate.getTime() < today.getTime();
  const isRestDay = /rest/i.test(String(sourceLog?.dayType || sourceLog?.workoutType || ''));

  const [activeTab, setActiveTab] = useState('planned');
  const [whyExpanded, setWhyExpanded] = useState(false);
  const [expandedMap, setExpandedMap] = useState({});
  const [actualByExerciseId, setActualByExerciseId] = useState(() => {
    const map = {};
    initialExercises.forEach((exercise) => {
      if (exercise.actualSets && exercise.actualSets.length) {
        map[exercise.id] = exercise.actualSets;
      }
    });
    return map;
  });
  const [sessionStatus, setSessionStatus] = useState(
    (() => {
      const normalized = String(sourceLog?.status || '').toLowerCase();
      if (['completed', 'skipped', 'rest', 'planned'].includes(normalized)) return normalized;
      return 'planned';
    })(),
  );
  const [editingExerciseId, setEditingExerciseId] = useState(null);

  const exercises = useMemo(
    () => initialExercises.map((exercise) => ({ ...exercise, actualSets: actualByExerciseId[exercise.id] || exercise.actualSets || null })),
    [initialExercises, actualByExerciseId],
  );

  const editingExercise = useMemo(() => exercises.find((exercise) => exercise.id === editingExerciseId) || null, [exercises, editingExerciseId]);

  const loggedCount = useMemo(
    () => exercises.filter((exercise) => Array.isArray(exercise.actualSets) && exercise.actualSets.length > 0).length,
    [exercises],
  );

  const allUnlogged = loggedCount === 0;

  const plannedSetCount = useMemo(
    () => exercises.reduce((sum, exercise) => sum + (exercise.plannedSets?.length || 0), 0),
    [exercises],
  );

  const plannedVolume = useMemo(
    () => Math.round(exercises.reduce((sum, exercise) => sum + sumVolume(exercise.plannedSets || []), 0)),
    [exercises],
  );

  const actualSetCount = useMemo(() => sumSets(exercises, actualByExerciseId), [exercises, actualByExerciseId]);
  const actualVolume = useMemo(() => sumExerciseVolume(exercises, actualByExerciseId), [exercises, actualByExerciseId]);

  useEffect(() => {
    if (!onSessionStatusChange) return;
    onSessionStatusChange(sessionStatus);
  }, [onSessionStatusChange, sessionStatus]);

  useEffect(() => {
    if (!onLoggedCountChange) return;
    onLoggedCountChange(loggedCount);
  }, [loggedCount, onLoggedCountChange]);

  if (!sourceLog) {
    return (
      <View style={styles.safeArea}>
        <View style={styles.notFoundCard}>
          <Text style={styles.notFoundTitle}>Log not found</Text>
          <TouchableOpacity style={styles.backButton} activeOpacity={0.9} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const decisionTrace = sourceLog?.decisionTrace || {
    phase: 'Base building',
    lastSignal: 'Last session showed late-set fatigue',
    adjustment: 'Kept sets stable and adjusted target load slightly',
    note: 'Focus on clean reps and consistent rest timing.',
  };

  const openLogModal = (exercise) => {
    if (!exercise || isFutureDay || isRestDay) return;
    setEditingExerciseId(exercise.id);
  };

  const openExerciseDetail = (exercise) => {
    if (!exercise) return;
    const itemId = exercise.exerciseCatalogId;
    if (!itemId) return;
    navigation.navigate('ExerciseDetail', {
      itemId,
      exerciseName: exercise.name,
      item: {
        id: itemId,
        name: exercise.name,
        primary_muscle_group: exercise.muscleGroup,
        equipment: exercise.equipment,
      },
      fromCatalog: true,
      isAdded: false,
    });
  };

  const saveActualSets = (setRows) => {
    if (!editingExerciseId) return;

    if (onActualSetsSave) {
      Promise.resolve(onActualSetsSave({ exerciseId: editingExerciseId, sets: setRows })).catch(() => {});
    }

    setActualByExerciseId((prev) => ({
      ...prev,
      [editingExerciseId]: setRows,
    }));
    setEditingExerciseId(null);
    setActiveTab('actual');
  };

  return (
    <View style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroTitle}>{sourceLog?.dayType || 'Workout Day'}</Text>
              <Text style={styles.heroSubtitle}>{formatDateTitle(sourceLog?.dateISO)}</Text>
            </View>
            <View style={styles.heroActions}>
              {onRequestDuplicate ? (
                <TouchableOpacity style={styles.heroIconButton} activeOpacity={0.9} onPress={onRequestDuplicate}>
                  <Ionicons name="copy-outline" size={15} color={COLORS.accent2} />
                </TouchableOpacity>
              ) : null}
              {onRequestDelete ? (
                <TouchableOpacity style={styles.heroIconButtonDanger} activeOpacity={0.9} onPress={onRequestDelete}>
                  <Ionicons name="trash-outline" size={15} color="#FFB4A8" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.summaryStrip}>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>Duration</Text>
            <Text style={styles.summaryValue}>{sourceLog?.durationMin || 45} min</Text>
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>Planned sets</Text>
            <Text style={styles.summaryValue}>{plannedSetCount}</Text>
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>Planned volume</Text>
            <Text style={styles.summaryValue}>{plannedVolume} kg</Text>
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>Calories</Text>
            <Text style={styles.summaryValue}>{sourceLog?.summary?.estCalories ?? '—'}</Text>
          </View>
        </View>

        <View style={styles.whyCard}>
          <TouchableOpacity style={styles.whyHeader} activeOpacity={0.9} onPress={() => setWhyExpanded((prev) => !prev)}>
            <Text style={styles.whyTitle}>Why this plan?</Text>
            <Ionicons name={whyExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.muted} />
          </TouchableOpacity>

          <Text style={styles.whySummary}>Based on last session + weekly volume target.</Text>

          {whyExpanded ? (
            <View style={styles.whyExpandedArea}>
              <Text style={styles.whyField}><Text style={styles.whyFieldLabel}>Phase:</Text> {decisionTrace.phase || '—'}</Text>
              <Text style={styles.whyField}><Text style={styles.whyFieldLabel}>Input:</Text> {decisionTrace.lastSignal || '—'}</Text>
              <Text style={styles.whyField}><Text style={styles.whyFieldLabel}>Decision:</Text> {decisionTrace.adjustment || '—'}</Text>
              {decisionTrace.note ? (
                <Text style={styles.whyField}><Text style={styles.whyFieldLabel}>Note:</Text> {decisionTrace.note}</Text>
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'planned' ? styles.tabButtonActive : null]}
            activeOpacity={0.9}
            onPress={() => setActiveTab('planned')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'planned' ? styles.tabButtonTextActive : null]}>Planned</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'actual' ? styles.tabButtonActive : null]}
            activeOpacity={0.9}
            onPress={() => setActiveTab('actual')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'actual' ? styles.tabButtonTextActive : null]}>Actual</Text>
          </TouchableOpacity>
        </View>

        {isRestDay ? (
          <View style={styles.restCard}>
            <Text style={styles.restTitle}>Rest day</Text>
            <Text style={styles.restSub}>Recovery and mobility focus. No exercise logging required.</Text>
          </View>
        ) : null}

        {activeTab === 'actual' && !isRestDay && isPastDay && allUnlogged ? (
          <View style={styles.actualEmptyCard}>
            <Text style={styles.actualEmptyTitle}>No workout logged</Text>
            <Text style={styles.actualEmptySub}>This day is in the past and no actual sets were recorded.</Text>
          </View>
        ) : null}

        {!isRestDay
          ? exercises.map((exercise) => {
              const expanded = Boolean(expandedMap[exercise.id]);
              return (
                <ExerciseAccordionCard
                  key={exercise.id}
                  exercise={exercise}
                  expanded={expanded}
                  mode={activeTab}
                  dayIsFuture={isFutureDay}
                  onLogPress={openLogModal}
                  onOpenExercise={openExerciseDetail}
                  onToggle={() => setExpandedMap((prev) => ({ ...prev, [exercise.id]: !prev[exercise.id] }))}
                />
              );
            })
          : null}

        {!isFutureDay && !isRestDay ? (
          <View style={styles.sessionActionsWrap}>
            {loggedCount > 0 ? (
              <TouchableOpacity
                style={styles.sessionActionPrimary}
                activeOpacity={0.9}
                onPress={() => setSessionStatus('completed')}
              >
                <Text style={styles.sessionActionPrimaryText}>Mark session completed</Text>
              </TouchableOpacity>
            ) : null}

            {loggedCount === 0 && isPastDay ? (
              <TouchableOpacity
                style={styles.sessionActionSecondary}
                activeOpacity={0.9}
                onPress={() => setSessionStatus('skipped')}
              >
                <Text style={styles.sessionActionSecondaryText}>Mark as skipped</Text>
              </TouchableOpacity>
            ) : null}

            <Text style={styles.sessionStateText}>Session status: {sessionStatus === 'completed' ? 'Completed' : sessionStatus === 'skipped' ? 'Skipped' : 'Planned'}</Text>
            {activeTab === 'actual' ? (
              <Text style={styles.actualSummaryText}>Actual summary: {actualSetCount} sets • {actualVolume} kg</Text>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <LogSetsModal
        visible={Boolean(editingExerciseId)}
        exercise={editingExercise}
        dayIsFuture={isFutureDay}
        onClose={() => setEditingExerciseId(null)}
        onSave={saveActualSets}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    paddingHorizontal: UI_TOKENS.spacing.md,
    paddingTop: UI_TOKENS.spacing.sm,
    paddingBottom: UI_TOKENS.spacing.xl,
  },
  heroCard: {
    borderRadius: UI_TOKENS.radius.lg,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.md,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: UI_TOKENS.spacing.sm,
  },
  heroTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: UI_TOKENS.spacing.xs,
  },
  heroIconButton: {
    width: UI_TOKENS.control.iconButton,
    height: UI_TOKENS.control.iconButton,
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(90,209,232,0.4)',
    backgroundColor: 'rgba(90,209,232,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIconButtonDanger: {
    width: UI_TOKENS.control.iconButton,
    height: UI_TOKENS.control.iconButton,
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(255,130,130,0.45)',
    backgroundColor: 'rgba(255,130,130,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.title + 6,
    fontWeight: '700',
  },
  heroSubtitle: {
    marginTop: 4,
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.subtitle,
  },
  summaryStrip: {
    marginTop: UI_TOKENS.spacing.sm,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.sm,
    gap: UI_TOKENS.spacing.xs,
  },
  summaryCell: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: UI_TOKENS.spacing.sm,
  },
  summaryLabel: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
  summaryValue: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
  whyCard: {
    marginTop: UI_TOKENS.spacing.sm,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.sm,
  },
  whyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  whyTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.meta + 1,
    fontWeight: '700',
  },
  whySummary: {
    marginTop: UI_TOKENS.spacing.xs,
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
  whyExpandedArea: {
    marginTop: UI_TOKENS.spacing.xs,
    gap: 4,
  },
  whyField: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.meta,
  },
  whyFieldLabel: {
    color: COLORS.muted,
    fontWeight: '700',
  },
  tabsRow: {
    marginTop: UI_TOKENS.spacing.sm,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.card,
    padding: 4,
    flexDirection: 'row',
    gap: 6,
  },
  tabButton: {
    flex: 1,
    minHeight: 36,
    borderRadius: UI_TOKENS.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: 'rgba(245,201,106,0.16)',
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(245,201,106,0.5)',
  },
  tabButtonText: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta + 1,
    fontWeight: '700',
  },
  tabButtonTextActive: {
    color: COLORS.accent,
  },
  restCard: {
    marginTop: UI_TOKENS.spacing.sm,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.sm,
  },
  restTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 1,
    fontWeight: '700',
  },
  restSub: {
    marginTop: 2,
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
  actualEmptyCard: {
    marginTop: UI_TOKENS.spacing.sm,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(255,164,116,0.42)',
    backgroundColor: 'rgba(255,164,116,0.12)',
    padding: UI_TOKENS.spacing.sm,
  },
  actualEmptyTitle: {
    color: '#FFD1AE',
    fontSize: UI_TOKENS.typography.subtitle,
    fontWeight: '700',
  },
  actualEmptySub: {
    marginTop: 2,
    color: '#FFB98F',
    fontSize: UI_TOKENS.typography.meta,
  },
  exerciseCardWrap: {
    marginTop: UI_TOKENS.spacing.xs,
  },
  exerciseCard: {
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: UI_TOKENS.spacing.sm,
  },
  exerciseCardPressed: {
    backgroundColor: COLORS.cardSoft,
  },
  exerciseThumbWrap: {
    width: UI_TOKENS.card.imageSize,
    alignItems: 'center',
  },
  exerciseThumbFrame: {
    width: UI_TOKENS.card.imageSize,
    height: UI_TOKENS.card.imageSize,
    borderRadius: UI_TOKENS.card.imageRadius,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: 'rgba(162,167,179,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseMain: {
    flex: 1,
    minWidth: 0,
  },
  exerciseTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 2,
    fontWeight: '700',
  },
  exerciseMeta: {
    marginTop: 2,
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
  notLoggedText: {
    marginTop: 2,
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '700',
  },
  exerciseRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  openDetailButton: {
    borderRadius: 999,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(90,209,232,0.35)',
    backgroundColor: 'rgba(90,209,232,0.12)',
    paddingHorizontal: UI_TOKENS.spacing.xs + 2,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  openDetailText: {
    color: COLORS.accent2,
    fontSize: 10,
    fontWeight: '700',
  },
  loggedPill: {
    borderRadius: 999,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(113,228,179,0.5)',
    backgroundColor: 'rgba(113,228,179,0.16)',
    paddingHorizontal: UI_TOKENS.spacing.xs + 2,
    paddingVertical: 2,
  },
  loggedPillText: {
    color: '#79E3B9',
    fontSize: 10,
    fontWeight: '700',
  },
  viewSetsPill: {
    borderRadius: 999,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.32)',
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: UI_TOKENS.spacing.xs + 2,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewSetsText: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '700',
  },
  exerciseExpandPanel: {
    marginTop: 4,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: COLORS.cardSoft,
    padding: UI_TOKENS.spacing.sm,
    gap: 6,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  setIndexPill: {
    borderRadius: 999,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.3)',
    backgroundColor: 'rgba(162,167,179,0.12)',
    paddingHorizontal: UI_TOKENS.spacing.xs + 2,
    paddingVertical: 2,
  },
  setIndexText: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '700',
  },
  setValueChip: {
    borderRadius: 999,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.3)',
    backgroundColor: 'rgba(162,167,179,0.12)',
    paddingHorizontal: UI_TOKENS.spacing.xs + 2,
    paddingVertical: 2,
  },
  setValueText: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: '700',
  },
  setWarnChip: {
    borderColor: 'rgba(255,164,116,0.5)',
    backgroundColor: 'rgba(255,164,116,0.16)',
  },
  setWarnText: {
    color: '#FFB98F',
  },
  logButton: {
    marginTop: 4,
    minHeight: 36,
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(245,201,106,0.52)',
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logButtonDisabled: {
    borderColor: 'rgba(162,167,179,0.36)',
    backgroundColor: 'rgba(162,167,179,0.16)',
  },
  logButtonText: {
    color: COLORS.bg,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '800',
  },
  logButtonDisabledText: {
    color: COLORS.muted,
  },
  logButtonSecondary: {
    marginTop: 4,
    minHeight: 34,
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.34)',
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logButtonSecondaryText: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
  actualEmptyWrap: {
    gap: 6,
  },
  actualEmptyText: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
  futureLabelPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.34)',
    backgroundColor: 'rgba(162,167,179,0.14)',
    paddingHorizontal: UI_TOKENS.spacing.xs + 2,
    paddingVertical: 2,
  },
  futureLabelText: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '700',
  },
  sessionActionsWrap: {
    marginTop: UI_TOKENS.spacing.sm,
    gap: UI_TOKENS.spacing.xs,
  },
  sessionActionPrimary: {
    minHeight: 42,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(113,228,179,0.5)',
    backgroundColor: 'rgba(113,228,179,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionActionPrimaryText: {
    color: '#79E3B9',
    fontSize: UI_TOKENS.typography.meta + 1,
    fontWeight: '700',
  },
  sessionActionSecondary: {
    minHeight: 42,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(255,130,130,0.46)',
    backgroundColor: 'rgba(255,130,130,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionActionSecondaryText: {
    color: '#FF9D9D',
    fontSize: UI_TOKENS.typography.meta + 1,
    fontWeight: '700',
  },
  sessionStateText: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
    textAlign: 'center',
  },
  actualSummaryText: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10,12,16,0.62)',
    padding: UI_TOKENS.spacing.lg,
    justifyContent: 'center',
  },
  modalCard: {
    borderRadius: UI_TOKENS.radius.lg,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.3)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.md,
    maxHeight: 560,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 2,
    fontWeight: '700',
  },
  modalSubtitle: {
    marginTop: 2,
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
  modalScroll: {
    marginTop: UI_TOKENS.spacing.sm,
  },
  modalSetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: UI_TOKENS.spacing.xs,
    marginBottom: UI_TOKENS.spacing.xs,
  },
  modalSetLabel: {
    width: 44,
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
  modalInput: {
    flex: 1,
    minHeight: 36,
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.34)',
    backgroundColor: COLORS.cardSoft,
    color: COLORS.text,
    paddingHorizontal: UI_TOKENS.spacing.sm,
    fontSize: UI_TOKENS.typography.meta,
  },
  removeSetButton: {
    width: 32,
    height: 32,
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(255,130,130,0.4)',
    backgroundColor: 'rgba(255,130,130,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSetButton: {
    marginTop: 2,
    minHeight: 34,
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.34)',
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSetText: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: UI_TOKENS.spacing.xs,
    marginTop: UI_TOKENS.spacing.sm,
  },
  modalActionSecondary: {
    flex: 1,
    minHeight: 40,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.34)',
    backgroundColor: COLORS.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActionSecondaryText: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
  modalActionPrimary: {
    flex: 1,
    minHeight: 40,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(245,201,106,0.5)',
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActionPrimaryText: {
    color: COLORS.bg,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '800',
  },
  modalActionDisabled: {
    borderColor: 'rgba(162,167,179,0.34)',
    backgroundColor: 'rgba(162,167,179,0.16)',
  },
  modalActionDisabledText: {
    color: COLORS.muted,
  },
  notFoundCard: {
    margin: UI_TOKENS.spacing.md,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.md,
    alignItems: 'center',
  },
  notFoundTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 1,
    fontWeight: '700',
  },
  backButton: {
    marginTop: UI_TOKENS.spacing.sm,
    minHeight: 40,
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.32)',
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: UI_TOKENS.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
});

export default GymLogDetailScreen;
