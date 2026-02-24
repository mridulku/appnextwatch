import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import COLORS from '../../../theme/colors';
import UI_TOKENS from '../../../ui/tokens';
import useGymSessions from '../../../hooks/useGymSessions';
import { estimateExerciseDurationMin, estimateSessionCalories, estimateSessionDurationMin } from './sessionDuration';

function createSet(index) {
  return {
    id: `set_${Date.now()}_${index + 1}`,
    setNumber: index + 1,
    reps: '',
    weight: '',
  };
}

function createExerciseDraft(exercise) {
  return {
    instanceId: `${exercise.id}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    libraryId: exercise.id,
    name: exercise.name,
    muscle: exercise.muscle,
    equipment: exercise.equipment,
    sets: [createSet(0), createSet(1), createSet(2)],
  };
}

function normalizeSetNumbers(sets) {
  return sets.map((setRow, index) => ({ ...setRow, setNumber: index + 1 }));
}

function GymSessionCreateScreen({ navigation }) {
  const sessionsApi = useGymSessions();

  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [whyNote, setWhyNote] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [exercises, setExercises] = useState([]);
  const [saving, setSaving] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadOptions = async () => {
      setOptionsLoading(true);
      await sessionsApi.loadExerciseOptions();
      if (mounted) {
        setOptionsLoading(false);
      }
    };

    loadOptions();
    return () => {
      mounted = false;
    };
  }, [sessionsApi.loadExerciseOptions]);

  const canSave = exercises.length > 0 && !saving && step === 2;

  const totalSets = useMemo(
    () => exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0),
    [exercises],
  );

  const addedCountByLibraryId = useMemo(
    () =>
      exercises.reduce((acc, exercise) => {
        const key = exercise.libraryId;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {}),
    [exercises],
  );

  const estimatedDurationMin = useMemo(
    () => estimateSessionDurationMin(exercises.map((entry) => ({ name: entry.name, sets: entry.sets }))),
    [exercises],
  );

  const estimatedCalories = useMemo(
    () => estimateSessionCalories(estimatedDurationMin),
    [estimatedDurationMin],
  );

  const addExercise = (exercise) => {
    setExercises((prev) => [...prev, createExerciseDraft(exercise)]);
    setShowPicker(false);
  };

  const removeExercise = (instanceId) => {
    setExercises((prev) => prev.filter((entry) => entry.instanceId !== instanceId));
  };

  const moveExercise = (instanceId, direction) => {
    setExercises((prev) => {
      const index = prev.findIndex((entry) => entry.instanceId === instanceId);
      if (index < 0) return prev;

      const nextIndex = direction === 'up' ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;

      const next = [...prev];
      const temp = next[index];
      next[index] = next[nextIndex];
      next[nextIndex] = temp;
      return next;
    });
  };

  const addSet = (instanceId) => {
    setExercises((prev) =>
      prev.map((exercise) => {
        if (exercise.instanceId !== instanceId) return exercise;
        const next = {
          id: `set_${Date.now()}_${exercise.sets.length + 1}`,
          setNumber: exercise.sets.length + 1,
          reps: '',
          weight: '',
        };
        return { ...exercise, sets: [...exercise.sets, next] };
      }),
    );
  };

  const removeSet = (instanceId, setId) => {
    setExercises((prev) =>
      prev.map((exercise) => {
        if (exercise.instanceId !== instanceId) return exercise;
        if (exercise.sets.length <= 1) return exercise;
        return {
          ...exercise,
          sets: normalizeSetNumbers(exercise.sets.filter((setRow) => setRow.id !== setId)),
        };
      }),
    );
  };

  const updateSet = (instanceId, setId, patch) => {
    setExercises((prev) =>
      prev.map((exercise) => {
        if (exercise.instanceId !== instanceId) return exercise;
        return {
          ...exercise,
          sets: exercise.sets.map((setRow) => (setRow.id === setId ? { ...setRow, ...patch } : setRow)),
        };
      }),
    );
  };

  const onSave = async () => {
    if (!canSave) return;

    try {
      setSaving(true);
      const created = await sessionsApi.create({
        title,
        durationMin: estimatedDurationMin,
        estCalories: estimatedCalories,
        whyNote,
        exercises,
      });

      navigation.replace('GymSessionWork', { sessionId: created.id });
    } catch (error) {
      sessionsApi.setError(error?.message || 'Could not save this session right now.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <View style={styles.stepRow}>
          <View style={[styles.stepPill, step === 1 ? styles.stepPillActive : null]}>
            <Text style={[styles.stepPillText, step === 1 ? styles.stepPillTextActive : null]}>Step 1 · Exercises</Text>
          </View>
          <View style={[styles.stepPill, step === 2 ? styles.stepPillActive : null]}>
            <Text style={[styles.stepPillText, step === 2 ? styles.stepPillTextActive : null]}>Step 2 · Details</Text>
          </View>
        </View>

        {step === 1 ? (
          <>
            <Text style={styles.sectionTitle}>Build your session</Text>
            <Text style={styles.sectionSubtitle}>Add exercises first, then set title and notes in step 2.</Text>

            <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.9} onPress={() => setShowPicker((prev) => !prev)}>
              <Ionicons name={showPicker ? 'chevron-up' : 'add'} size={15} color={COLORS.accent} />
              <Text style={styles.secondaryButtonText}>{showPicker ? 'Close exercise list' : 'Add exercise'}</Text>
            </TouchableOpacity>

            {sessionsApi.error ? <Text style={styles.inlineError}>{sessionsApi.error}</Text> : null}

            {showPicker ? (
              <View style={styles.pickerCard}>
                {optionsLoading ? (
                  <View style={styles.loadingInlineWrap}>
                    <ActivityIndicator color={COLORS.accent} />
                    <Text style={styles.loadingInlineText}>Loading exercise list...</Text>
                  </View>
                ) : sessionsApi.exerciseOptions.length === 0 ? (
                  <View style={styles.emptyPickerWrap}>
                    <Text style={styles.emptyPickerTitle}>No catalog exercises found</Text>
                    <Text style={styles.emptyPickerBody}>Seed or add catalog exercises in Supabase to build a session.</Text>
                    <TouchableOpacity
                      style={styles.emptyPickerCta}
                      activeOpacity={0.9}
                      onPress={() => navigation.navigate('GymHome', { initialSegment: 'Exercises' })}
                    >
                      <Text style={styles.emptyPickerCtaText}>Open Library Exercises</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  sessionsApi.exerciseOptions.map((exercise) => (
                    <Pressable
                      key={exercise.id}
                      style={({ pressed }) => [styles.pickerRow, pressed ? styles.pickerRowPressed : null]}
                      onPress={() => addExercise(exercise)}
                    >
                      <View style={styles.pickerRowMain}>
                        <Text style={styles.pickerName}>{exercise.name}</Text>
                        <Text style={styles.pickerMeta}>{exercise.muscle} • {exercise.equipment}</Text>
                      </View>
                      <View style={styles.pickerRight}>
                        {addedCountByLibraryId[exercise.id] ? (
                          <View style={styles.addedBadge}>
                            <Ionicons name="checkmark" size={11} color={COLORS.accent2} />
                            <Text style={styles.addedBadgeText}>Added {addedCountByLibraryId[exercise.id]}x</Text>
                          </View>
                        ) : null}
                        <Text style={styles.pickerAddText}>Add</Text>
                      </View>
                    </Pressable>
                  ))
                )}
              </View>
            ) : null}
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Session details</Text>
            <Text style={styles.sectionSubtitle}>Finalize name and rationale. Duration is auto-estimated.</Text>

            <Text style={styles.label}>Session name</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Push day, Pull day, etc."
              placeholderTextColor={COLORS.muted}
              style={styles.titleInput}
            />

            <Text style={styles.label}>Why this plan</Text>
            <TextInput
              value={whyNote}
              onChangeText={setWhyNote}
              placeholder="Optional note"
              placeholderTextColor={COLORS.muted}
              style={styles.titleInput}
            />

            <View style={styles.estimatesRow}>
              <View style={styles.estimateTile}>
                <Text style={styles.estimateLabel}>Estimated duration</Text>
                <Text style={styles.estimateValue}>{estimatedDurationMin} min</Text>
              </View>
              <View style={styles.estimateTile}>
                <Text style={styles.estimateLabel}>Estimated calories</Text>
                <Text style={styles.estimateValue}>{estimatedCalories}</Text>
              </View>
            </View>
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Exercises</Text>
        <Text style={styles.sectionSubtitle}>{exercises.length} exercises • {totalSets} sets total</Text>

        {exercises.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No exercises added yet.</Text>
          </View>
        ) : (
          <View style={styles.exerciseList}>
            {exercises.map((exercise, index) => (
              <View key={exercise.instanceId} style={styles.exerciseCard}>
                <View style={styles.exerciseHead}>
                  <View style={styles.exerciseHeadMain}>
                    <Text style={styles.exerciseTitle}>{exercise.name}</Text>
                    <Text style={styles.exerciseMeta}>
                      {exercise.muscle} • {exercise.equipment} • est {estimateExerciseDurationMin({ name: exercise.name, sets: exercise.sets })} min
                    </Text>
                  </View>
                  <View style={styles.exerciseActions}>
                    <TouchableOpacity
                      style={[styles.orderButton, index === 0 ? styles.orderButtonDisabled : null]}
                      activeOpacity={index === 0 ? 1 : 0.85}
                      onPress={() => moveExercise(exercise.instanceId, 'up')}
                      disabled={index === 0}
                    >
                      <Ionicons name="arrow-up" size={13} color={index === 0 ? COLORS.muted : COLORS.accent2} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.orderButton, index === exercises.length - 1 ? styles.orderButtonDisabled : null]}
                      activeOpacity={index === exercises.length - 1 ? 1 : 0.85}
                      onPress={() => moveExercise(exercise.instanceId, 'down')}
                      disabled={index === exercises.length - 1}
                    >
                      <Ionicons
                        name="arrow-down"
                        size={13}
                        color={index === exercises.length - 1 ? COLORS.muted : COLORS.accent2}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.removeExerciseButton}
                      activeOpacity={0.85}
                      onPress={() => removeExercise(exercise.instanceId)}
                    >
                      <Ionicons name="trash-outline" size={14} color="#FFB29F" />
                    </TouchableOpacity>
                  </View>
                </View>

                {exercise.sets.map((setRow) => (
                  <View key={setRow.id} style={styles.setRow}>
                    <Text style={styles.setLabel}>Set {setRow.setNumber}</Text>
                    <TextInput
                      value={setRow.reps}
                      onChangeText={(value) => updateSet(exercise.instanceId, setRow.id, { reps: value })}
                      keyboardType="number-pad"
                      placeholder="Reps"
                      placeholderTextColor={COLORS.muted}
                      style={styles.setInput}
                    />
                    <TextInput
                      value={setRow.weight}
                      onChangeText={(value) => updateSet(exercise.instanceId, setRow.id, { weight: value })}
                      keyboardType="decimal-pad"
                      placeholder="Kg"
                      placeholderTextColor={COLORS.muted}
                      style={styles.setInput}
                    />
                    <TouchableOpacity
                      style={styles.removeSetButton}
                      activeOpacity={0.9}
                      onPress={() => removeSet(exercise.instanceId, setRow.id)}
                    >
                      <Ionicons name="remove" size={12} color={COLORS.muted} />
                    </TouchableOpacity>
                  </View>
                ))}

                <TouchableOpacity style={styles.addSetButton} activeOpacity={0.9} onPress={() => addSet(exercise.instanceId)}>
                  <Ionicons name="add" size={12} color={COLORS.accent2} />
                  <Text style={styles.addSetText}>Add set</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {step === 1 ? (
        <TouchableOpacity
          style={[styles.primaryButton, exercises.length === 0 ? styles.primaryButtonDisabled : null]}
          activeOpacity={exercises.length === 0 ? 1 : 0.9}
          disabled={exercises.length === 0}
          onPress={() => setStep(2)}
        >
          <Text style={styles.primaryButtonText}>Continue to details</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.footerActions}>
          <TouchableOpacity style={styles.secondaryFooterButton} activeOpacity={0.9} onPress={() => setStep(1)}>
            <Text style={styles.secondaryFooterButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryButton, styles.primaryButtonGrow, !canSave ? styles.primaryButtonDisabled : null]}
            activeOpacity={!canSave ? 1 : 0.9}
            disabled={!canSave}
            onPress={onSave}
          >
            <Text style={styles.primaryButtonText}>{saving ? 'Saving session...' : 'Save session'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: {
    paddingHorizontal: UI_TOKENS.spacing.md,
    paddingTop: UI_TOKENS.spacing.sm,
    paddingBottom: UI_TOKENS.spacing.xl,
    gap: UI_TOKENS.spacing.xs,
  },
  card: {
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.md,
    gap: UI_TOKENS.spacing.xs,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 1,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
  stepRow: {
    flexDirection: 'row',
    gap: UI_TOKENS.spacing.xs,
    marginBottom: UI_TOKENS.spacing.xs,
  },
  stepPill: {
    flex: 1,
    borderRadius: 999,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.32)',
    backgroundColor: COLORS.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 30,
  },
  stepPillActive: {
    borderColor: 'rgba(245,201,106,0.5)',
    backgroundColor: 'rgba(245,201,106,0.14)',
  },
  stepPillText: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
  stepPillTextActive: {
    color: COLORS.accent,
  },
  label: {
    marginTop: 3,
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  metaRow: {
    flexDirection: 'row',
    gap: UI_TOKENS.spacing.xs,
  },
  metaField: {
    flex: 1,
  },
  titleInput: {
    minHeight: 40,
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.28)',
    backgroundColor: COLORS.cardSoft,
    color: COLORS.text,
    paddingHorizontal: UI_TOKENS.spacing.sm,
  },
  estimatesRow: {
    marginTop: UI_TOKENS.spacing.xs,
    flexDirection: 'row',
    gap: UI_TOKENS.spacing.xs,
  },
  estimateTile: {
    flex: 1,
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.28)',
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: UI_TOKENS.spacing.sm,
    paddingVertical: UI_TOKENS.spacing.xs,
  },
  estimateLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.25,
  },
  estimateValue: {
    marginTop: 2,
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle,
    fontWeight: '700',
  },
  secondaryButton: {
    minHeight: 38,
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(245,201,106,0.46)',
    backgroundColor: 'rgba(245,201,106,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  secondaryButtonText: {
    color: COLORS.accent,
    fontSize: UI_TOKENS.typography.meta + 1,
    fontWeight: '700',
  },
  inlineError: {
    color: '#FFB4A8',
    fontSize: UI_TOKENS.typography.meta,
  },
  pickerCard: {
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.2)',
    overflow: 'hidden',
    backgroundColor: COLORS.cardSoft,
  },
  loadingInlineWrap: {
    minHeight: 68,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: UI_TOKENS.spacing.sm,
  },
  loadingInlineText: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
  emptyPickerWrap: {
    padding: UI_TOKENS.spacing.sm,
    gap: 6,
  },
  emptyPickerTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.meta + 1,
    fontWeight: '700',
  },
  emptyPickerBody: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
  emptyPickerCta: {
    alignSelf: 'flex-start',
    marginTop: 4,
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(245,201,106,0.45)',
    backgroundColor: 'rgba(245,201,106,0.14)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  emptyPickerCtaText: {
    color: COLORS.accent,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
  pickerRow: {
    minHeight: 48,
    paddingHorizontal: UI_TOKENS.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: UI_TOKENS.spacing.xs,
    borderBottomWidth: UI_TOKENS.border.hairline,
    borderBottomColor: 'rgba(162,167,179,0.14)',
  },
  pickerRowPressed: { opacity: 0.82 },
  pickerRowMain: { flex: 1 },
  pickerName: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.body,
    fontWeight: '600',
  },
  pickerMeta: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
    marginTop: 2,
  },
  pickerAddText: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  pickerRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  addedBadge: {
    borderRadius: 999,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(90,209,232,0.48)',
    backgroundColor: 'rgba(90,209,232,0.16)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  addedBadgeText: {
    color: COLORS.accent2,
    fontSize: 10,
    fontWeight: '700',
  },
  emptyWrap: {
    borderRadius: UI_TOKENS.radius.sm,
    backgroundColor: COLORS.cardSoft,
    paddingVertical: UI_TOKENS.spacing.md,
    alignItems: 'center',
  },
  emptyText: { color: COLORS.muted, fontSize: UI_TOKENS.typography.meta },
  exerciseList: { gap: UI_TOKENS.spacing.xs },
  exerciseCard: {
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: COLORS.cardSoft,
    padding: UI_TOKENS.spacing.sm,
    gap: 6,
  },
  exerciseHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: UI_TOKENS.spacing.xs,
  },
  exerciseHeadMain: { flex: 1 },
  exerciseActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  orderButton: {
    width: 26,
    height: 28,
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(90,209,232,0.35)',
    backgroundColor: 'rgba(90,209,232,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderButtonDisabled: {
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: 'rgba(162,167,179,0.08)',
  },
  exerciseTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.body,
    fontWeight: '700',
  },
  exerciseMeta: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  removeExerciseButton: {
    width: 28,
    height: 28,
    borderRadius: UI_TOKENS.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(255,150,130,0.35)',
    backgroundColor: 'rgba(255,150,130,0.12)',
  },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  setLabel: {
    width: 40,
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  setInput: {
    flex: 1,
    minHeight: 34,
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.3)',
    backgroundColor: COLORS.card,
    color: COLORS.text,
    paddingHorizontal: UI_TOKENS.spacing.xs,
    fontSize: UI_TOKENS.typography.meta + 1,
  },
  removeSetButton: {
    width: 30,
    height: 34,
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.28)',
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSetButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(90,209,232,0.42)',
    backgroundColor: 'rgba(90,209,232,0.14)',
    paddingHorizontal: UI_TOKENS.spacing.xs + 2,
    paddingVertical: 4,
  },
  addSetText: {
    color: COLORS.accent2,
    fontSize: 10,
    fontWeight: '700',
  },
  primaryButton: {
    minHeight: 44,
    borderRadius: UI_TOKENS.radius.md,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonGrow: {
    flex: 1,
  },
  primaryButtonDisabled: { opacity: 0.5 },
  primaryButtonText: {
    color: COLORS.bg,
    fontSize: UI_TOKENS.typography.body,
    fontWeight: '700',
  },
  footerActions: {
    flexDirection: 'row',
    gap: UI_TOKENS.spacing.xs,
  },
  secondaryFooterButton: {
    minHeight: 44,
    minWidth: 90,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.3)',
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: UI_TOKENS.spacing.sm,
  },
  secondaryFooterButtonText: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.body,
    fontWeight: '700',
  },
});

export default GymSessionCreateScreen;
