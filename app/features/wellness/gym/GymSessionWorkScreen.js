import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import useGymSessions from '../../../hooks/useGymSessions';
import COLORS from '../../../theme/colors';
import UI_TOKENS from '../../../ui/tokens';
import {
  formatMeasurementNumber,
  formatMeasuredSetRow,
  getExerciseMeasurementConfig,
  getMeasurementStepperNextValue,
  getMeasurementValuePatch,
  summarizeMeasuredSets,
} from './exerciseMeasurement';
import { estimateSessionCalories, estimateSessionDurationMin } from './sessionDuration';

function formatDateInput(date) {
  return date.toISOString().slice(0, 10);
}

function formatDateLabel(date) {
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function parseInitialDate(value) {
  if (!value) return new Date();
  const parsed = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function toDateOnly(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function normalizeSessionType(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (raw.includes('push')) return 'Push day';
  if (raw.includes('pull')) return 'Pull day';
  if (raw.includes('leg')) return 'Leg day';
  return 'Push day';
}

function mapSessionExerciseToDraft(exercise) {
  const measurement = getExerciseMeasurementConfig({
    movementSlug: exercise.movementSlug,
    movementName: exercise.name,
    equipment: exercise.equipment,
    primaryMuscleGroup: exercise.muscle,
    weightStepKg: exercise.weightStepKg,
    weightMeasureMode: exercise.weightMeasureMode,
    weightFixedValues: exercise.weightFixedValues,
  });
  return {
    id: exercise.id,
    movementId: exercise.movementId,
    movementName: exercise.name,
    movementSlug: exercise.movementSlug || '',
    name: exercise.name,
    variantName: exercise.variantName,
    variantLabel: exercise.variantLabel || exercise.equipment || 'Variant',
    muscle: exercise.muscle,
    equipment: exercise.equipment,
    weightStepKg: exercise.weightStepKg,
    weightMeasureMode: exercise.weightMeasureMode,
    weightFixedValues: exercise.weightFixedValues,
    measurement,
    imageUrl: exercise.imageUrl || null,
    sets: (exercise.sets || []).map((setRow, index) => ({
      id: setRow.id || `${exercise.id}_set_${index + 1}`,
      setNumber: setRow.setIndex || index + 1,
      reps: String(setRow.plannedReps ?? ''),
      weight: String(setRow.plannedWeightKg ?? ''),
      speed: String(setRow.plannedSpeedKph ?? ''),
    })),
  };
}

function ExerciseThumb({ uri, size = 84, icon = 'barbell-outline' }) {
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: 20 }} resizeMode="cover" />;
  }

  return (
    <View style={[styles.thumbFallback, { width: size, height: size, borderRadius: 20 }]}> 
      <Ionicons name={icon} size={Math.round(size * 0.34)} color={COLORS.accent} />
    </View>
  );
}

function StepperField({ value, label, placeholder, defaultValue, config, fieldKey, onChangeText }) {
  return (
    <View style={styles.stepperField}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControl}>
        <TouchableOpacity
          style={styles.stepperButton}
          activeOpacity={0.9}
          onPress={() => onChangeText(getMeasurementStepperNextValue({
            config,
            key: fieldKey,
            currentValue: value,
            delta: -1,
            fallbackValue: defaultValue,
          }))}
        >
          <Ionicons name="remove" size={14} color={COLORS.text} />
        </TouchableOpacity>
        <TextInput
          value={formatMeasurementNumber(value)}
          onChangeText={onChangeText}
          keyboardType={((fieldKey === config.secondaryKey) ? config.secondaryAllowsDecimal : config.primaryAllowsDecimal) ? 'decimal-pad' : 'number-pad'}
          placeholder={placeholder}
          placeholderTextColor={COLORS.muted}
          style={styles.stepperInput}
          textAlign="center"
        />
        <TouchableOpacity
          style={styles.stepperButton}
          activeOpacity={0.9}
          onPress={() => onChangeText(getMeasurementStepperNextValue({
            config,
            key: fieldKey,
            currentValue: value,
            delta: 1,
            fallbackValue: defaultValue,
          }))}
        >
          <Ionicons name="add" size={14} color={COLORS.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SetEditorRow({ setRow, measurement, onChange }) {
  return (
    <View style={styles.setEditorRow}>
      <View style={styles.setIndexPill}>
        <Text style={styles.setIndexText}>Set {setRow.setNumber}</Text>
      </View>
      <StepperField
        value={setRow[measurement.primaryKey]}
        label={measurement.primaryLabel}
        placeholder={measurement.primaryPlaceholder}
        defaultValue={measurement.primaryDefaultValue}
        config={measurement}
        fieldKey={measurement.primaryKey}
        onChangeText={(value) =>
          onChange({ [measurement.primaryKey]: getMeasurementValuePatch({ mode: measurement.primaryAllowsDecimal ? 'reps_weight' : 'reps_only' }, value) })
        }
      />
      {measurement.secondaryKey ? (
        <StepperField
          value={setRow[measurement.secondaryKey]}
          label={measurement.secondaryLabel}
          placeholder={measurement.secondaryPlaceholder}
          defaultValue={measurement.secondaryDefaultValue}
          config={measurement}
          fieldKey={measurement.secondaryKey}
          onChangeText={(value) => onChange({ [measurement.secondaryKey]: getMeasurementValuePatch(measurement, value) })}
        />
      ) : (
        <View style={[styles.stepperField, styles.stepperFieldGhost]} />
      )}
    </View>
  );
}

function ExerciseCard({ exercise, expanded, onToggle, onUpdateSet, onOpenExercise }) {
  return (
    <View style={[styles.exerciseCard, expanded ? styles.exerciseCardExpanded : null]}>
      <TouchableOpacity style={styles.exerciseCardHeader} activeOpacity={0.92} onPress={onToggle}>
        <ExerciseThumb uri={exercise.imageUrl} size={expanded ? 112 : 84} icon="barbell-outline" />
        <View style={styles.exerciseCardMain}>
          <View style={styles.exerciseCardTopRow}>
            <View style={styles.exerciseCardTitleWrap}>
              <Text style={styles.exerciseTitle}>{exercise.name}</Text>
              <Text style={styles.exerciseVariant}>{exercise.variantLabel || exercise.variantName}</Text>
            </View>
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.muted} />
          </View>
          <Text style={styles.exerciseMeta}>{exercise.muscle} • {exercise.equipment}</Text>
          <View style={styles.summaryPillRow}>
            <View style={styles.summaryPill}>
              <Ionicons name="albums-outline" size={13} color={COLORS.accent2} />
              <Text style={styles.summaryPillText}>{summarizeMeasuredSets(exercise.sets, exercise.measurement)}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {expanded ? (
        <View style={styles.expandedBody}>
          <View style={styles.exerciseActionRow}>
            <TouchableOpacity style={styles.detailButton} activeOpacity={0.9} onPress={onOpenExercise}>
              <Ionicons name="open-outline" size={14} color={COLORS.accent2} />
              <Text style={styles.detailButtonText}>Details</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.setEditorList}>
            {exercise.sets.map((setRow) => (
              <SetEditorRow
                key={setRow.id}
                setRow={setRow}
                measurement={exercise.measurement}
                onChange={(patch) => onUpdateSet(setRow.id, patch)}
              />
            ))}
          </View>
          <View style={styles.setChipsWrap}>
            {exercise.sets.map((setRow) => (
              <View key={`chip_${setRow.id}`} style={styles.setChip}>
                <Text style={styles.setChipText}>{formatMeasuredSetRow(setRow, exercise.measurement)}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

export default function GymSessionWorkScreen({ route, navigation }) {
  const sessionId = route.params?.sessionId;
  const sessionsApi = useGymSessions();

  const [session, setSession] = useState(null);
  const [sessionType, setSessionType] = useState('Push day');
  const [sessionDate, setSessionDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [draftDate, setDraftDate] = useState(new Date());
  const [exerciseDrafts, setExerciseDrafts] = useState([]);
  const [expandedExerciseId, setExpandedExerciseId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
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
      setSessionType(normalizeSessionType(detail.title));
      const nextDate = parseInitialDate(detail.dateISO);
      setSessionDate(nextDate);
      setDraftDate(nextDate);
      setExerciseDrafts((detail.exercises || []).map(mapSessionExerciseToDraft));
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

  const sessionDayTs = useMemo(() => toDateOnly(sessionDate).getTime(), [sessionDate]);
  const totalSets = useMemo(() => exerciseDrafts.reduce((sum, exercise) => sum + exercise.sets.length, 0), [exerciseDrafts]);
  const estimatedDurationMin = useMemo(
    () => estimateSessionDurationMin(exerciseDrafts.map((entry) => ({ name: entry.name, sets: entry.sets }))),
    [exerciseDrafts],
  );
  const estimatedCalories = useMemo(() => estimateSessionCalories(estimatedDurationMin), [estimatedDurationMin]);
  const canSave = !loading && !saving;

  const openDatePicker = () => {
    setDraftDate(sessionDate);
    setShowDatePicker(true);
  };

  const toggleEditMode = async () => {
    if (isEditing) {
      await hydrate();
      setIsEditing(false);
      return;
    }
    setInlineError('');
    setIsEditing(true);
  };

  const updateSet = (exerciseId, setId, patch) => {
    setExerciseDrafts((prev) =>
      prev.map((exercise) => {
        if (exercise.id !== exerciseId) return exercise;
        return {
          ...exercise,
          sets: exercise.sets.map((setRow) => (setRow.id === setId ? { ...setRow, ...patch } : setRow)),
        };
      }),
    );
  };

  const onSave = async () => {
    if (!session?.id || !canSave) return;

    const targetDateISO = formatDateInput(sessionDate);
    const conflictingSession = (sessionsApi.sessions || []).find(
      (entry) => entry.id !== session.id && String(entry.dateISO || '').slice(0, 10) === targetDateISO,
    );
    if (conflictingSession) {
      setInlineError('A session already exists on that date. Choose another date.');
      return;
    }

    try {
      setSaving(true);
      setInlineError('');
      await sessionsApi.update({
        sessionId: session.id,
        payload: {
          title: sessionType,
          dateISO: targetDateISO,
          durationMin: estimatedDurationMin,
          estCalories: estimatedCalories,
          whyNote: session.whyNote || '',
          status: session?.status || 'not_started',
          exercises: exerciseDrafts.map((exercise) => ({
            id: exercise.id,
            sets: exercise.sets.map((setRow) => ({
              setIndex: setRow.setNumber,
              reps: setRow.reps,
              weight: exercise.measurement.secondaryKey ? setRow.weight : '',
              speed: exercise.measurement.secondaryKey === 'speed' ? setRow.speed : '',
            })),
          })),
        },
      });
      await hydrate();
      setIsEditing(false);
    } catch (error) {
      setInlineError(error?.message || 'Could not save this session right now.');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = () => {
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
  };

  if (loading) {
    return (
      <View style={styles.emptyContainer}>
        <ActivityIndicator color={COLORS.accent} />
        <Text style={styles.emptyBody}>Loading session...</Text>
      </View>
    );
  }

  if (inlineError && !session) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Session unavailable</Text>
        <Text style={styles.emptyBody}>{inlineError}</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Session not found</Text>
        <Text style={styles.emptyBody}>Go back and choose a created session.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerCard}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.iconButton} activeOpacity={0.9} onPress={toggleEditMode}>
                <Ionicons name={isEditing ? 'close-outline' : 'create-outline'} size={15} color={COLORS.accent2} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButtonDanger} activeOpacity={0.9} onPress={onDelete}>
                <Ionicons name="trash-outline" size={15} color="#FFB4A8" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Session type</Text>
            {isEditing ? (
              <View style={styles.typeChipRow}>
                {['Push day', 'Pull day', 'Leg day'].map((option) => {
                  const active = sessionType === option;
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[styles.typeChip, active ? styles.typeChipActive : null]}
                      activeOpacity={0.92}
                      onPress={() => setSessionType(option)}
                    >
                      <Text style={[styles.typeChipText, active ? styles.typeChipTextActive : null]}>{option}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={styles.readOnlyValuePill}>
                <Text style={styles.readOnlyValueText}>{sessionType}</Text>
              </View>
            )}
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Session date</Text>
            {isEditing ? (
              <TouchableOpacity style={styles.dateButton} activeOpacity={0.92} onPress={openDatePicker}>
                <Text style={styles.dateButtonText}>{formatDateLabel(sessionDate)}</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.readOnlyValuePill}>
                <Text style={styles.readOnlyValueText}>{formatDateLabel(sessionDate)}</Text>
              </View>
            )}
          </View>

          <Text style={styles.quickMetaText}>{exerciseDrafts.length} exercises • {totalSets} sets</Text>

          {inlineError ? <Text style={styles.inlineError}>{inlineError}</Text> : null}
        </View>

        <View style={styles.exerciseStack}>
          {exerciseDrafts.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              expanded={expandedExerciseId === exercise.id}
              onToggle={() => setExpandedExerciseId((prev) => (prev === exercise.id ? '' : exercise.id))}
              onUpdateSet={(setId, patch) => updateSet(exercise.id, setId, patch)}
              onOpenExercise={() =>
                navigation.navigate('ExerciseDetail', {
                  exerciseId: exercise.movementId,
                  exerciseName: exercise.variantName || exercise.name,
                })
              }
            />
          ))}
        </View>
      </ScrollView>

      {isEditing ? (
        <View style={styles.footerBar}>
          <TouchableOpacity
            style={[styles.saveButton, !canSave ? styles.saveButtonDisabled : null]}
            activeOpacity={canSave ? 0.92 : 1}
            disabled={!canSave}
            onPress={onSave}
          >
            <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save changes'}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <Modal visible={showDatePicker} transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
        <View style={styles.dateModalBackdrop}>
          <View style={styles.dateModalCard}>
            <Text style={styles.dateModalTitle}>Choose date</Text>
            <DateTimePicker
              value={draftDate}
              mode="date"
              display="inline"
              onChange={(_, nextDate) => {
                if (nextDate) setDraftDate(nextDate);
              }}
            />
            <View style={styles.dateModalActions}>
              <TouchableOpacity style={styles.dateModalButtonSecondary} activeOpacity={0.92} onPress={() => setShowDatePicker(false)}>
                <Text style={styles.dateModalButtonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dateModalButtonPrimary}
                activeOpacity={0.92}
                onPress={() => {
                  setSessionDate(draftDate);
                  setShowDatePicker(false);
                }}
              >
                <Text style={styles.dateModalButtonPrimaryText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: {
    paddingHorizontal: UI_TOKENS.spacing.md,
    paddingTop: UI_TOKENS.spacing.sm,
    paddingBottom: 112,
    gap: UI_TOKENS.spacing.md,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: UI_TOKENS.spacing.md,
    gap: 8,
  },
  emptyTitle: { color: COLORS.text, fontSize: UI_TOKENS.typography.subtitle + 1, fontWeight: '700' },
  emptyBody: { marginTop: 2, color: COLORS.muted, fontSize: UI_TOKENS.typography.meta, textAlign: 'center' },
  headerCard: {
    borderRadius: UI_TOKENS.radius.lg,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.lg,
    gap: UI_TOKENS.spacing.sm,
  },
  headerTopRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8 },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconButton: {
    width: 42, height: 42, borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline, borderColor: 'rgba(90,209,232,0.28)', backgroundColor: 'rgba(90,209,232,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  iconButtonDanger: {
    width: 42, height: 42, borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline, borderColor: 'rgba(255,150,130,0.28)', backgroundColor: 'rgba(255,150,130,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  fieldWrap: { marginTop: UI_TOKENS.spacing.xs, gap: 6 },
  label: { color: COLORS.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  typeChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    minHeight: 42,
    borderRadius: 999,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeChipActive: {
    borderColor: 'rgba(245,201,106,0.34)',
    backgroundColor: 'rgba(245,201,106,0.12)',
  },
  typeChipText: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.meta + 1,
    fontWeight: '700',
  },
  typeChipTextActive: {
    color: COLORS.accent,
  },
  readOnlyValuePill: {
    minHeight: 48,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.cardSoft,
    justifyContent: 'center',
    paddingHorizontal: UI_TOKENS.spacing.sm,
  },
  readOnlyValueText: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 1,
    fontWeight: '700',
  },
  dateButton: {
    minHeight: 48, borderRadius: UI_TOKENS.radius.md, borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(245,201,106,0.34)', backgroundColor: 'rgba(245,201,106,0.1)', justifyContent: 'center', paddingHorizontal: UI_TOKENS.spacing.sm,
  },
  dateButtonText: { color: COLORS.text, fontSize: UI_TOKENS.typography.subtitle + 1, fontWeight: '700' },
  quickMetaText: { color: COLORS.muted, fontSize: UI_TOKENS.typography.meta, fontWeight: '700' },
  inlineError: { color: '#FFB4A8', fontSize: UI_TOKENS.typography.meta },
  exerciseStack: { gap: UI_TOKENS.spacing.sm },
  exerciseCard: {
    borderRadius: UI_TOKENS.radius.lg, borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.2)', backgroundColor: COLORS.card, overflow: 'hidden',
  },
  exerciseCardExpanded: { borderColor: 'rgba(90,209,232,0.35)', backgroundColor: '#1A2030' },
  exerciseCardHeader: { padding: UI_TOKENS.spacing.sm, flexDirection: 'row', gap: UI_TOKENS.spacing.sm, alignItems: 'center' },
  thumbFallback: {
    backgroundColor: 'rgba(245,201,106,0.12)', borderWidth: UI_TOKENS.border.hairline, borderColor: 'rgba(245,201,106,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  exerciseCardMain: { flex: 1, gap: 6 },
  exerciseCardTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: UI_TOKENS.spacing.xs },
  exerciseCardTitleWrap: { flex: 1 },
  exerciseTitle: { color: COLORS.text, fontSize: UI_TOKENS.typography.title, fontWeight: '800' },
  exerciseVariant: { marginTop: 2, color: COLORS.accent, fontSize: UI_TOKENS.typography.meta + 1, fontWeight: '700' },
  exerciseMeta: { color: COLORS.muted, fontSize: UI_TOKENS.typography.meta },
  summaryPillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  summaryPill: {
    borderRadius: 999,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(90,209,232,0.28)',
    backgroundColor: 'rgba(90,209,232,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryPillText: { color: COLORS.accent2, fontSize: UI_TOKENS.typography.meta, fontWeight: '700' },
  expandedBody: { paddingHorizontal: UI_TOKENS.spacing.sm, paddingBottom: UI_TOKENS.spacing.sm, gap: UI_TOKENS.spacing.sm },
  exerciseActionRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  detailButton: {
    borderRadius: 999, borderWidth: UI_TOKENS.border.hairline, borderColor: 'rgba(90,209,232,0.36)', backgroundColor: 'rgba(90,209,232,0.1)',
    paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  detailButtonText: { color: COLORS.accent2, fontSize: UI_TOKENS.typography.meta, fontWeight: '700' },
  setEditorList: { gap: 8 },
  setEditorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  setIndexPill: { width: 54, minHeight: 40, borderRadius: UI_TOKENS.radius.sm, backgroundColor: COLORS.cardSoft, alignItems: 'center', justifyContent: 'center' },
  setIndexText: { color: COLORS.text, fontSize: UI_TOKENS.typography.meta, fontWeight: '700' },
  stepperField: { flex: 1, gap: 6 },
  stepperFieldGhost: { opacity: 0 },
  stepperLabel: { color: COLORS.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.28 },
  stepperControl: {
    minHeight: 42, borderRadius: UI_TOKENS.radius.sm, borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)', backgroundColor: COLORS.bg, flexDirection: 'row', alignItems: 'center', overflow: 'hidden',
  },
  stepperButton: { width: 34, minHeight: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.cardSoft },
  stepperInput: { flex: 1, minHeight: 42, color: COLORS.text, fontSize: UI_TOKENS.typography.subtitle, fontWeight: '700', paddingHorizontal: 8 },
  setChipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  setChip: {
    borderRadius: 999, borderWidth: UI_TOKENS.border.hairline, borderColor: 'rgba(245,201,106,0.28)', backgroundColor: 'rgba(245,201,106,0.1)', paddingHorizontal: 10, paddingVertical: 6,
  },
  setChipText: { color: COLORS.text, fontSize: UI_TOKENS.typography.meta, fontWeight: '700' },
  footerBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: UI_TOKENS.border.hairline,
    borderTopColor: 'rgba(162,167,179,0.18)', backgroundColor: 'rgba(14,15,20,0.96)', paddingHorizontal: UI_TOKENS.spacing.md,
    paddingTop: UI_TOKENS.spacing.sm, paddingBottom: UI_TOKENS.spacing.md, flexDirection: 'row', justifyContent: 'flex-end',
  },
  saveButton: { minHeight: 46, borderRadius: UI_TOKENS.radius.md, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: COLORS.bg, fontSize: UI_TOKENS.typography.subtitle + 1, fontWeight: '800' },
  dateModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,12,16,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: UI_TOKENS.spacing.md,
  },
  dateModalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: UI_TOKENS.radius.lg,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.md,
    gap: UI_TOKENS.spacing.sm,
  },
  dateModalTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 2,
    fontWeight: '800',
  },
  dateModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: UI_TOKENS.spacing.xs,
  },
  dateModalButtonSecondary: {
    minHeight: 40,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: UI_TOKENS.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateModalButtonSecondaryText: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.meta + 1,
    fontWeight: '700',
  },
  dateModalButtonPrimary: {
    minHeight: 40,
    borderRadius: UI_TOKENS.radius.md,
    backgroundColor: COLORS.accent,
    paddingHorizontal: UI_TOKENS.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateModalButtonPrimaryText: {
    color: COLORS.bg,
    fontSize: UI_TOKENS.typography.meta + 1,
    fontWeight: '800',
  },
});
