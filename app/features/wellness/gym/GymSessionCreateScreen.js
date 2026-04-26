import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  PanResponder,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuth } from '../../../context/AuthContext';
import { getOrCreateAppUser } from '../../../core/api/foodInventoryDb';
import { getExerciseAiAdvice, listExerciseHistory } from '../../../core/api/gymSessionsDb';
import FullSheetModal from '../../../ui/components/FullSheetModal';
import COLORS from '../../../theme/colors';
import UI_TOKENS from '../../../ui/tokens';
import useGymSessions from '../../../hooks/useGymSessions';
import {
  formatMeasurementNumber,
  formatMeasuredSetRow,
  getExerciseMeasurementConfig,
  getMeasurementStepperNextValue,
  getMeasurementValuePatch,
  summarizeMeasuredSets,
} from './exerciseMeasurement';

const CARD_SLOT_HEIGHT = 124;
const DAY_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'push', label: 'Push' },
  { key: 'pull', label: 'Pull' },
  { key: 'legs', label: 'Legs' },
];
const BUILDER_MODES = {
  FAVORITES: 'favorites',
  MANUAL: 'manual',
};
const BUILDER_STEPS = {
  CHOOSE: 'choose',
  BUILD: 'build',
};
const SESSION_ENTRY_OPTIONS = [
  { key: 'push', label: 'Push', mode: BUILDER_MODES.FAVORITES, icon: 'arrow-up-outline' },
  { key: 'pull', label: 'Pull', mode: BUILDER_MODES.FAVORITES, icon: 'arrow-down-outline' },
  { key: 'legs', label: 'Legs', mode: BUILDER_MODES.FAVORITES, icon: 'walk-outline' },
  { key: 'manual', label: 'Manual', mode: BUILDER_MODES.MANUAL, icon: 'create-outline' },
];

function createMeasuredSet(index, measurement) {
  return {
    id: `set_${Date.now()}_${index + 1}`,
    setNumber: index + 1,
    reps: measurement.primaryKey === 'reps' ? String(measurement.primaryDefaultValue ?? '') : '',
    weight: measurement.secondaryKey === 'weight' ? String(measurement.secondaryDefaultValue ?? '') : '',
    speed: measurement.secondaryKey === 'speed' ? String(measurement.secondaryDefaultValue ?? '') : '',
  };
}

function createMeasuredSetFromHistory(index, measurement, setRow = {}) {
  return {
    id: `set_${Date.now()}_${index + 1}`,
    setNumber: index + 1,
    reps: measurement.primaryKey === 'reps' ? String(setRow?.reps ?? measurement.primaryDefaultValue ?? '') : '',
    weight: measurement.secondaryKey === 'weight' ? String(setRow?.weight ?? measurement.secondaryDefaultValue ?? '') : '',
    speed: measurement.secondaryKey === 'speed' ? String(setRow?.speed ?? measurement.secondaryDefaultValue ?? '') : '',
  };
}

function createExerciseDraft(movement, variant, historyRow = null) {
  const measurement = getExerciseMeasurementConfig({
    movementSlug: movement.slug,
    movementName: movement.name,
    equipment: variant.equipment,
    primaryMuscleGroup: variant.muscle || movement.muscle,
    weightStepKg: variant.weightStepKg,
    weightMeasureMode: variant.weightMeasureMode,
    weightFixedValues: variant.weightFixedValues,
  });
  const historySets = Array.isArray(historyRow?.sets) && historyRow.sets.length
    ? historyRow.sets.map((setRow, index) => createMeasuredSetFromHistory(index, measurement, setRow))
    : null;
  return {
    instanceId: `${variant.id}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    movementId: movement.id,
    movementName: movement.name,
    movementSlug: movement.slug || '',
    movementDay: movement.day || 'general',
    movementImageUrl: movement.image_url || null,
    libraryId: variant.id,
    name: movement.name,
    variantName: variant.name,
    variantLabel: variant.variantLabel || variant.equipment || 'Variant',
    muscle: variant.muscle,
    equipment: variant.equipment,
    measurement,
    imageUrl: variant.image_url || movement.image_url || null,
    sets: historySets || [createMeasuredSet(0, measurement), createMeasuredSet(1, measurement), createMeasuredSet(2, measurement)],
  };
}

function normalizeSetNumbers(sets) {
  return sets.map((setRow, index) => ({ ...setRow, setNumber: index + 1 }));
}

function moveItem(rows, fromIndex, toIndex) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= rows.length || toIndex >= rows.length) {
    return rows;
  }
  const next = [...rows];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

function getDayTitle(dayKey = '') {
  if (dayKey === 'push') return 'Push day';
  if (dayKey === 'pull') return 'Pull day';
  if (dayKey === 'legs') return 'Leg day';
  return 'Session';
}

function formatHistoryDate(dateISO) {
  if (!dateISO) return 'Unknown date';
  const value = new Date(`${dateISO}T00:00:00`);
  if (Number.isNaN(value.getTime())) return dateISO;
  return value.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function renderHistorySetSummary(item) {
  const measurementConfig = getExerciseMeasurementConfig({
    movementSlug: item?.movementSlug,
    movementName: item?.movementName,
    name: item?.variantName,
    equipment: item?.equipment,
    primaryMuscleGroup: item?.muscle,
    weightStepKg: item?.weightStepKg,
    weightMeasureMode: item?.weightMeasureMode,
    weightFixedValues: item?.weightFixedValues,
  });
  return (item?.sets || []).map((setRow) => `Set ${setRow.setIndex}: ${formatMeasuredSetRow(setRow, measurementConfig)}`);
}

function deriveSessionTitle(exercises = [], selectedDay = '') {
  if (!exercises.length) return getDayTitle(selectedDay);

  const dayKeys = Array.from(new Set(exercises.map((exercise) => String(exercise.movementDay || 'general').trim().toLowerCase()).filter(Boolean)));
  if (dayKeys.length === 1) {
    if (dayKeys[0] === 'push') return 'Push day';
    if (dayKeys[0] === 'pull') return 'Pull day';
    if (dayKeys[0] === 'legs') return 'Leg day';
    return 'Full day';
  }
  return 'Full day';
}

function sortFavoriteVariants(rows = []) {
  return [...rows].sort((a, b) => {
    const aSort = Number(a?.variant?.favoriteSortOrder || 0) || Number.MAX_SAFE_INTEGER;
    const bSort = Number(b?.variant?.favoriteSortOrder || 0) || Number.MAX_SAFE_INTEGER;
    if (aSort !== bSort) return aSort - bSort;
    return String(a?.variant?.name || '').localeCompare(String(b?.variant?.name || ''));
  });
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

function StepperField({
  value,
  label,
  placeholder,
  defaultValue,
  config,
  fieldKey,
  onChangeText,
}) {
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

function SetEditorRow({ setRow, measurement, onChange, onRemove, canRemove }) {
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
      <TouchableOpacity
        style={[styles.setRemoveButton, !canRemove ? styles.setRemoveButtonDisabled : null]}
        activeOpacity={canRemove ? 0.9 : 1}
        onPress={onRemove}
        disabled={!canRemove}
      >
        <Ionicons name="remove" size={14} color={canRemove ? '#FFB29F' : COLORS.muted} />
      </TouchableOpacity>
    </View>
  );
}

function MovementPickerCard({
  movement,
  isExpanded,
  addedCount,
  onToggle,
  onAddVariant,
}) {
  const variants = movement.variants || [];
  const autoVariant = variants.length === 1 ? variants[0] : null;

  return (
    <View style={styles.pickerMovementCard}>
      <TouchableOpacity
        style={styles.pickerMovementTouch}
        activeOpacity={0.9}
        onPress={() => {
          if (autoVariant) {
            onAddVariant(autoVariant);
            return;
          }
          onToggle();
        }}
      >
        <ExerciseThumb uri={movement.image_url} size={76} icon="flash-outline" />
        <View style={styles.pickerMovementMain}>
          <View style={styles.pickerTopRow}>
            <Text style={styles.pickerMovementTitle}>{movement.name}</Text>
            <View style={styles.pickerBadges}>
              {movement.favoriteCount ? (
                <View style={styles.favoriteBadge}>
                  <Ionicons name="star" size={11} color={COLORS.accent} />
                  <Text style={styles.favoriteBadgeText}>{movement.favoriteCount}</Text>
                </View>
              ) : null}
              {addedCount ? (
                <View style={styles.addedBadge}>
                  <Ionicons name="checkmark" size={11} color={COLORS.accent2} />
                  <Text style={styles.addedBadgeText}>{addedCount} added</Text>
                </View>
              ) : null}
            </View>
          </View>
          <Text style={styles.pickerMovementMeta}>
            {movement.muscle} • {movement.variantCount} variant{movement.variantCount === 1 ? '' : 's'} • {String(movement.day || 'general').replace(/^./, (value) => value.toUpperCase())}
          </Text>
          <View style={styles.pickerHintRow}>
            <Text style={styles.pickerHintText}>{autoVariant ? 'Add directly' : isExpanded ? 'Hide variants' : 'Choose a variant'}</Text>
            <Ionicons
              name={autoVariant ? 'add-circle-outline' : isExpanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={COLORS.accent}
            />
          </View>
        </View>
      </TouchableOpacity>

      {isExpanded && !autoVariant ? (
        <View style={styles.variantList}>
          {variants.map((variant) => (
            <TouchableOpacity key={variant.id} style={styles.variantCard} activeOpacity={0.88} onPress={() => onAddVariant(variant)}>
              <ExerciseThumb uri={variant.image_url || movement.image_url} size={58} icon="fitness-outline" />
              <View style={styles.variantCardMain}>
                <View style={styles.variantCardTitleRow}>
                  <Text style={styles.variantCardTitle}>{variant.name}</Text>
                  {variant.isFavorite ? <Ionicons name="star" size={13} color={COLORS.accent} /> : null}
                </View>
                <Text style={styles.variantCardMeta}>
                  {variant.variantLabel || variant.equipment} • {variant.equipment}
                </Text>
              </View>
              <Ionicons name="add" size={18} color={COLORS.accent2} />
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function ExerciseCard({
  exercise,
  expanded,
  dragging,
  canDrag,
  canMoveUp,
  canMoveDown,
  onToggle,
  onRemove,
  onMoveUp,
  onMoveDown,
  onAddSet,
  onRemoveSet,
  onUpdateSet,
  historyPreview,
  historyPreviewLoading,
  adviceState,
  onOpenLastTime,
  onOpenAiAdvice,
  handlePanHandlers,
}) {
  return (
    <View style={[styles.exerciseCard, expanded ? styles.exerciseCardExpanded : null, dragging ? styles.exerciseCardDragging : null]}>
      <Pressable style={styles.exerciseCardHeader} onPress={onToggle}>
        <ExerciseThumb uri={exercise.imageUrl || exercise.movementImageUrl} size={expanded ? 112 : 84} icon="barbell-outline" />

        <View style={styles.exerciseCardMain}>
          <View style={styles.exerciseCardTopRow}>
            <View style={styles.exerciseCardTitleWrap}>
              <Text style={styles.exerciseTitle}>{exercise.name}</Text>
              <Text style={styles.exerciseVariant}>{exercise.variantLabel || exercise.variantName}</Text>
            </View>
            <View style={styles.exerciseTopActions}>
              <View style={styles.reorderArrowColumn}>
                <TouchableOpacity
                  style={[styles.reorderArrowButton, !canMoveUp ? styles.reorderArrowButtonDisabled : null]}
                  activeOpacity={canMoveUp ? 0.9 : 1}
                  disabled={!canMoveUp}
                  onPress={onMoveUp}
                >
                  <Ionicons name="chevron-up" size={14} color={canMoveUp ? COLORS.text : COLORS.muted} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.reorderArrowButton, !canMoveDown ? styles.reorderArrowButtonDisabled : null]}
                  activeOpacity={canMoveDown ? 0.9 : 1}
                  disabled={!canMoveDown}
                  onPress={onMoveDown}
                >
                  <Ionicons name="chevron-down" size={14} color={canMoveDown ? COLORS.text : COLORS.muted} />
                </TouchableOpacity>
              </View>
              <View
                style={[styles.dragHandle, !canDrag ? styles.dragHandleDisabled : null]}
                {...(canDrag ? handlePanHandlers : {})}
              >
                <Ionicons name="reorder-three-outline" size={18} color={canDrag ? COLORS.text : COLORS.muted} />
              </View>
              <TouchableOpacity style={styles.removeExerciseButton} activeOpacity={0.9} onPress={onRemove}>
                <Ionicons name="trash-outline" size={16} color="#FFB29F" />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.exerciseMeta}>
            {exercise.muscle} • {exercise.equipment}
          </Text>

          <View style={styles.summaryPillRow}>
            <View style={styles.summaryPill}>
              <Ionicons name="albums-outline" size={13} color={COLORS.accent2} />
              <Text style={styles.summaryPillText}>{summarizeMeasuredSets(exercise.sets, exercise.measurement)}</Text>
            </View>
          </View>
        </View>
      </Pressable>

      {expanded ? (
        <View style={styles.expandedBody}>
          <Text style={styles.expandedSectionLabel}>Planned sets</Text>
          <View style={styles.setEditorList}>
            {exercise.sets.map((setRow) => (
              <SetEditorRow
                key={setRow.id}
                setRow={setRow}
                measurement={exercise.measurement}
                canRemove={exercise.sets.length > 1}
                onRemove={() => onRemoveSet(setRow.id)}
                onChange={(patch) => onUpdateSet(setRow.id, patch)}
              />
            ))}
          </View>

          <View style={styles.expandedActionsRow}>
            <TouchableOpacity style={styles.ghostAction} activeOpacity={0.9} onPress={onAddSet}>
              <Ionicons name="add" size={15} color={COLORS.accent2} />
              <Text style={styles.ghostActionText}>Add set</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ghostActionDanger} activeOpacity={0.9} onPress={onRemove}>
              <Ionicons name="trash-outline" size={15} color="#FFB29F" />
              <Text style={styles.ghostActionDangerText}>Remove exercise</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.lastHistoryCard} activeOpacity={0.92} onPress={onOpenLastTime}>
            <View style={styles.lastHistoryHeader}>
              <View style={styles.lastHistoryTitleRow}>
                <Ionicons name="time-outline" size={14} color={COLORS.accent} />
                <Text style={styles.lastHistoryLabel}>Last time</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={COLORS.muted} />
            </View>
            {historyPreviewLoading ? (
              <View style={styles.lastHistoryLoadingRow}>
                <ActivityIndicator size="small" color={COLORS.accent} />
                <Text style={styles.lastHistoryEmpty}>Loading recent history...</Text>
              </View>
            ) : historyPreview ? (
              <View style={styles.lastHistoryContent}>
                <Text style={styles.lastHistoryDate}>{formatHistoryDate(historyPreview.sessionDateISO)}</Text>
                {renderHistorySetSummary(historyPreview).map((line, index) => (
                  <Text key={`${exercise.instanceId}_history_${index}`} style={styles.lastHistoryLine}>
                    {line}
                  </Text>
                ))}
              </View>
            ) : (
              <Text style={styles.lastHistoryEmpty}>No history for this exercise yet.</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.aiAdviceCard} activeOpacity={0.92} onPress={onOpenAiAdvice}>
            <View style={styles.aiAdviceHeader}>
              <View style={styles.aiAdviceTitleRow}>
                <Ionicons name="sparkles-outline" size={14} color={COLORS.accent2} />
                <Text style={styles.aiAdviceLabel}>AI advice</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={COLORS.muted} />
            </View>
            {adviceState?.status === 'loading' ? (
              <View style={styles.lastHistoryLoadingRow}>
                <ActivityIndicator size="small" color={COLORS.accent2} />
                <Text style={styles.aiAdviceMuted}>Generating advice...</Text>
              </View>
            ) : adviceState?.status === 'ready' ? (
              <Text style={styles.aiAdviceText}>{adviceState.advice}</Text>
            ) : adviceState?.status === 'error' ? (
              <Text style={styles.aiAdviceError}>Could not generate advice right now.</Text>
            ) : (
              <Text style={styles.aiAdviceMuted}>
                {adviceState?.status === 'empty' ? 'Not enough history for AI advice yet.' : 'Tap to generate advice.'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

function GymSessionCreateScreen({ navigation, route }) {
  const { user } = useAuth();
  const sessionsApi = useGymSessions();
  const creationMode = route?.params?.creationMode === 'manual_now' ? 'manual_now' : 'planned';
  const presetDateISO = typeof route?.params?.presetDateISO === 'string' ? route.params.presetDateISO : '';
  const entryMode = route?.params?.entryMode === 'retro_log' ? 'retro_log' : 'default';
  const isManualNow = creationMode === 'manual_now';

  const dragY = useRef(new Animated.Value(0)).current;
  const dragStartIndexRef = useRef(-1);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');
  const [pickerDayFilter, setPickerDayFilter] = useState('all');
  const [builderStep, setBuilderStep] = useState(BUILDER_STEPS.CHOOSE);
  const [builderMode, setBuilderMode] = useState(BUILDER_MODES.FAVORITES);
  const [selectedSessionDay, setSelectedSessionDay] = useState('');
  const [exercises, setExercises] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [expandedMovementIds, setExpandedMovementIds] = useState({});
  const [expandedExerciseId, setExpandedExerciseId] = useState('');
  const [draggingExerciseId, setDraggingExerciseId] = useState('');
  const [historyPreviewByLibraryId, setHistoryPreviewByLibraryId] = useState({});
  const [historyRowsByLibraryId, setHistoryRowsByLibraryId] = useState({});
  const [historyLoadingLibraryId, setHistoryLoadingLibraryId] = useState('');
  const [adviceStateByLibraryId, setAdviceStateByLibraryId] = useState({});

  const ensureHistoryRowsForVariant = useCallback(async (libraryId, movementId) => {
    if (!libraryId) return [];
    const cached = historyRowsByLibraryId[libraryId];
    if (cached !== undefined) return cached;

    setHistoryLoadingLibraryId(libraryId);
    try {
      const appUser = await getOrCreateAppUser({
        username: user?.username || 'demo user',
        name: user?.name || 'Demo User',
      });
      const rows = await listExerciseHistory({
        userId: appUser.id,
        exerciseId: libraryId,
        movementId: movementId || null,
        limit: 5,
      });
      const latestHistory = rows[0] || null;
      setHistoryRowsByLibraryId((prev) => ({
        ...prev,
        [libraryId]: rows,
      }));
      setHistoryPreviewByLibraryId((prev) => ({
        ...prev,
        [libraryId]: prev[libraryId] === undefined ? latestHistory : prev[libraryId],
      }));
      return rows;
    } catch (_error) {
      setHistoryRowsByLibraryId((prev) => ({
        ...prev,
        [libraryId]: [],
      }));
      setHistoryPreviewByLibraryId((prev) => ({
        ...prev,
        [libraryId]: prev[libraryId] === undefined ? null : prev[libraryId],
      }));
      return [];
    } finally {
      setHistoryLoadingLibraryId((current) => (current === libraryId ? '' : current));
    }
  }, [historyRowsByLibraryId, user?.name, user?.username]);

  useEffect(() => {
    let mounted = true;

    const loadOptions = async () => {
      setOptionsLoading(true);
      await sessionsApi.loadMovementOptions();
      if (mounted) {
        setOptionsLoading(false);
      }
    };

    loadOptions();
    return () => {
      mounted = false;
    };
  }, [sessionsApi.loadMovementOptions]);

  useEffect(() => {
    let cancelled = false;

    async function loadExpandedExerciseHistory() {
      if (!expandedExercise?.libraryId) return;
      if (historyRowsByLibraryId[expandedExercise.libraryId] !== undefined) return;

      try {
        const rows = await ensureHistoryRowsForVariant(
          expandedExercise.libraryId,
          expandedExercise.movementId || null,
        );
        if (cancelled) return;
        if (!rows.length) {
          setAdviceStateByLibraryId((prev) => ({
            ...prev,
            [expandedExercise.libraryId]: {
              status: 'empty',
              advice: 'Not enough history for AI advice yet.',
            },
          }));
        }
      } catch (_error) {
        if (cancelled) return;
        setHistoryRowsByLibraryId((prev) => ({
          ...prev,
          [expandedExercise.libraryId]: [],
        }));
        setHistoryPreviewByLibraryId((prev) => ({
          ...prev,
          [expandedExercise.libraryId]: null,
        }));
        setAdviceStateByLibraryId((prev) => (prev[expandedExercise.libraryId] ? prev : {
          ...prev,
          [expandedExercise.libraryId]: {
            status: 'empty',
            advice: 'Not enough history for AI advice yet.',
          },
        }));
      }
    }

    loadExpandedExerciseHistory();
    return () => {
      cancelled = true;
    };
  }, [ensureHistoryRowsForVariant, expandedExercise?.libraryId, expandedExercise?.movementId, historyRowsByLibraryId]);

  const derivedTitle = useMemo(() => deriveSessionTitle(exercises, selectedSessionDay), [exercises, selectedSessionDay]);

  const totalSets = useMemo(
    () => exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0),
    [exercises],
  );

  const addedCountByMovementId = useMemo(
    () =>
      exercises.reduce((acc, exercise) => {
        acc[exercise.movementId] = (acc[exercise.movementId] || 0) + 1;
        return acc;
      }, {}),
    [exercises],
  );

  const filteredMovements = useMemo(() => {
    const query = pickerQuery.trim().toLowerCase();
    return sessionsApi.movementOptions.filter((movement) => {
      const matchesDay = pickerDayFilter === 'all' || String(movement.day || '').toLowerCase() === pickerDayFilter;
      if (!matchesDay) return false;
      if (!query) return true;
      const nameMatch = movement.name.toLowerCase().includes(query);
      const aliasMatch = (movement.aliases || []).some((alias) => String(alias || '').toLowerCase().includes(query));
      const muscleMatch = String(movement.muscle || '').toLowerCase().includes(query);
      const variantMatch = (movement.variants || []).some((variant) => {
        const variantName = String(variant.name || '').toLowerCase();
        const label = String(variant.variantLabel || '').toLowerCase();
        const equipment = String(variant.equipment || '').toLowerCase();
        return variantName.includes(query) || label.includes(query) || equipment.includes(query);
      });
      return nameMatch || aliasMatch || muscleMatch || variantMatch;
    });
  }, [pickerDayFilter, pickerQuery, sessionsApi.movementOptions]);

  const allFavoriteVariants = useMemo(() => {
    const rows = [];
    (sessionsApi.movementOptions || []).forEach((movement) => {
      (movement.variants || []).forEach((variant) => {
        if (!variant.isFavorite) return;
        rows.push({ id: variant.id, movement, variant });
      });
    });
    return sortFavoriteVariants(rows);
  }, [sessionsApi.movementOptions]);

  const favoriteCountByDay = useMemo(
    () =>
      allFavoriteVariants.reduce((acc, row) => {
        const dayKey = String(row?.movement?.day || 'general').toLowerCase();
        acc[dayKey] = (acc[dayKey] || 0) + 1;
        return acc;
      }, {}),
    [allFavoriteVariants],
  );

  const canContinue = exercises.length > 0;

  const expandedExercise = useMemo(
    () => exercises.find((item) => item.instanceId === expandedExerciseId) || null,
    [exercises, expandedExerciseId],
  );

  const fetchLatestHistoryForVariant = async (libraryId, movementId) => {
    const cached = historyPreviewByLibraryId[libraryId];
    if (cached !== undefined) return cached;

    const appUser = await getOrCreateAppUser({
      username: user?.username || 'demo user',
      name: user?.name || 'Demo User',
    });
    const rows = await listExerciseHistory({
      userId: appUser.id,
      exerciseId: libraryId,
      movementId: movementId || null,
      limit: 1,
    });
    const historyRow = rows[0] || null;
    setHistoryPreviewByLibraryId((prev) => ({
      ...prev,
      [libraryId]: historyRow,
    }));
    return historyRow;
  };

  const toggleMovement = (movementId) => {
    setExpandedMovementIds((prev) => ({
      ...prev,
      [movementId]: !prev[movementId],
    }));
  };

  const addMovementVariant = async (movement, variant) => {
    const historyRow = await fetchLatestHistoryForVariant(variant.id, movement.id);
    const nextExercise = createExerciseDraft(movement, variant, historyRow);
    setExercises((prev) => [...prev, nextExercise]);
    setExpandedExerciseId('');
  };

  const applyFavoriteDayPlan = async (dayKey) => {
    const orderedRows = allFavoriteVariants.filter((row) => String(row?.movement?.day || '').toLowerCase() === dayKey);
    setSelectedSessionDay(dayKey);
    setPickerDayFilter(dayKey);
    setExpandedExerciseId('');
    const draftedExercises = await Promise.all(
      orderedRows.map(async ({ movement, variant }) => {
        const historyRow = await fetchLatestHistoryForVariant(variant.id, movement.id);
        return createExerciseDraft(movement, variant, historyRow);
      }),
    );
    setExercises(draftedExercises);
    if (!orderedRows.length) {
      sessionsApi.setError(`No favorite exercises are saved for ${getDayTitle(dayKey).toLowerCase()}. Switch to Manual to add exercises yourself.`);
    } else {
      sessionsApi.setError('');
    }
  };

  const startBuilderFromOption = (optionKey) => {
    sessionsApi.setError('');

    if (optionKey === 'manual') {
      setBuilderMode(BUILDER_MODES.MANUAL);
      setSelectedSessionDay('');
      setPickerDayFilter('all');
      setExercises([]);
      setExpandedExerciseId('');
      setBuilderStep(BUILDER_STEPS.BUILD);
      return;
    }

    setBuilderMode(BUILDER_MODES.FAVORITES);
    setSelectedSessionDay(optionKey);
    setPickerDayFilter(optionKey);
    applyFavoriteDayPlan(optionKey);
    setBuilderStep(BUILDER_STEPS.BUILD);
  };

  const onResetBuilder = () => {
    setBuilderStep(BUILDER_STEPS.CHOOSE);
    setExercises([]);
    setExpandedExerciseId('');
    setDraggingExerciseId('');
    setExpandedMovementIds({});
    sessionsApi.setError('');
  };

  const removeExercise = (instanceId) => {
    setExercises((prev) => prev.filter((entry) => entry.instanceId !== instanceId));
    setExpandedExerciseId((prev) => (prev === instanceId ? '' : prev));
  };

  const addSet = (instanceId) => {
    setExercises((prev) =>
      prev.map((exercise) => {
        if (exercise.instanceId !== instanceId) return exercise;
        return {
          ...exercise,
          sets: [
            ...exercise.sets,
            createMeasuredSet(exercise.sets.length, exercise.measurement),
          ],
        };
      }),
    );
  };

  const removeSet = (instanceId, setId) => {
    setExercises((prev) =>
      prev.map((exercise) => {
        if (exercise.instanceId !== instanceId || exercise.sets.length <= 1) return exercise;
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

  const moveExerciseByDelta = (instanceId, delta) => {
    setExercises((prev) => {
      const fromIndex = prev.findIndex((exercise) => exercise.instanceId === instanceId);
      const toIndex = fromIndex + delta;
      if (fromIndex < 0 || toIndex < 0 || toIndex >= prev.length) return prev;
      return moveItem(prev, fromIndex, toIndex);
    });
  };

  const finishDrag = (gestureDy) => {
    const fromIndex = dragStartIndexRef.current;
    if (fromIndex < 0) {
      setDraggingExerciseId('');
      dragY.setValue(0);
      return;
    }

    const toIndex = Math.max(0, Math.min(exercises.length - 1, fromIndex + Math.round(gestureDy / CARD_SLOT_HEIGHT)));
    if (toIndex !== fromIndex) {
      setExercises((prev) => moveItem(prev, fromIndex, toIndex));
    }

    Animated.spring(dragY, {
      toValue: 0,
      friction: 7,
      tension: 60,
      useNativeDriver: true,
    }).start(() => {
      dragStartIndexRef.current = -1;
      setDraggingExerciseId('');
    });
  };

  const getHandlePanHandlers = (instanceId, index) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => exercises.length > 1,
      onMoveShouldSetPanResponder: (_, gestureState) => exercises.length > 1 && Math.abs(gestureState.dy) > 4,
      onPanResponderGrant: () => {
        dragStartIndexRef.current = index;
        setDraggingExerciseId(instanceId);
        setExpandedExerciseId('');
        dragY.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        dragY.setValue(gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => finishDrag(gestureState.dy),
      onPanResponderTerminate: () => finishDrag(0),
    }).panHandlers;

  const onContinue = async () => {
    if (!canContinue) return;
    navigation.navigate('GymSessionFinalize', {
      creationMode,
      entryMode,
      exercises,
      presetDateISO,
      suggestedTitle: derivedTitle || 'Session',
    });
  };

  const openExerciseHistory = (exercise) => {
    navigation.navigate('ExerciseDetail', {
      movementId: exercise.movementId || null,
      exerciseId: exercise.libraryId,
      selectedVariantId: exercise.libraryId,
      exerciseName: exercise.variantName || exercise.name,
      fromCatalog: true,
      isAdded: false,
      initialHistoryExpanded: true,
    });
  };

  const openExerciseAiAdvice = async (exercise) => {
    if (!exercise?.libraryId) return;
    const currentState = adviceStateByLibraryId[exercise.libraryId];
    if (currentState?.status === 'loading' || currentState?.status === 'ready') {
      return;
    }

    let historyRows = historyRowsByLibraryId[exercise.libraryId];
    if (!Array.isArray(historyRows)) {
      historyRows = await ensureHistoryRowsForVariant(exercise.libraryId, exercise.movementId || null);
    }
    if (!Array.isArray(historyRows)) {
      setAdviceStateByLibraryId((prev) => ({
        ...prev,
        [exercise.libraryId]: {
          status: 'error',
          advice: 'Could not generate advice right now.',
        },
      }));
      return;
    }
    if (!historyRows.length) {
      setAdviceStateByLibraryId((prev) => ({
        ...prev,
        [exercise.libraryId]: {
          status: 'empty',
          advice: 'Not enough history for AI advice yet.',
        },
      }));
      return;
    }

    try {
      setAdviceStateByLibraryId((prev) => ({
        ...prev,
        [exercise.libraryId]: {
          status: 'loading',
          advice: '',
        },
      }));
      const appUser = await getOrCreateAppUser({
        username: user?.username || 'demo user',
        name: user?.name || 'Demo User',
      });
      const adviceResult = await getExerciseAiAdvice({
        userId: appUser.id,
        exercise,
        currentDraftSets: exercise.sets,
        history: historyRows,
      });
      const adviceText = String(adviceResult?.advice || '').trim();
      setAdviceStateByLibraryId((prev) => ({
        ...prev,
        [exercise.libraryId]: adviceText
          ? { status: 'ready', advice: adviceText }
          : { status: 'error', advice: 'Could not generate advice right now.' },
      }));
    } catch (_error) {
      setAdviceStateByLibraryId((prev) => ({
        ...prev,
        [exercise.libraryId]: {
          status: 'error',
          advice: 'Could not generate advice right now.',
        },
      }));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!draggingExerciseId}
        >
          <View style={styles.heroCard}>
            <View style={styles.heroSpacer} />
          </View>

          {builderStep === BUILDER_STEPS.CHOOSE ? (
            <View style={styles.builderCard}>
              <View style={styles.builderOptionGrid}>
                {SESSION_ENTRY_OPTIONS.map((option) => {
                  const count =
                    option.mode === BUILDER_MODES.FAVORITES
                      ? favoriteCountByDay[option.key] || 0
                      : null;
                  return (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        styles.builderOptionCard,
                        option.mode === BUILDER_MODES.MANUAL ? styles.builderOptionCardManual : styles.builderOptionCardFavorites,
                      ]}
                      activeOpacity={0.92}
                      onPress={() => startBuilderFromOption(option.key)}
                    >
                      <View
                        style={[
                          styles.builderOptionIconWrap,
                          option.mode === BUILDER_MODES.MANUAL ? styles.builderOptionIconWrapManual : styles.builderOptionIconWrapFavorites,
                        ]}
                      >
                        <Ionicons
                          name={option.icon}
                          size={18}
                          color={option.mode === BUILDER_MODES.MANUAL ? COLORS.accent2 : COLORS.accent}
                        />
                      </View>
                      <Text style={styles.builderOptionTitle}>{option.label}</Text>
                      {count !== null ? (
                        <Text style={styles.builderOptionMeta}>
                          {count} favorite{count === 1 ? '' : 's'}
                        </Text>
                      ) : (
                        <Text style={styles.builderOptionMeta}>Empty session</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : (
            <View style={styles.builderLockedCard}>
              <View style={styles.builderLockedMain}>
                <Text style={styles.builderLockedEyebrow}>Session setup</Text>
                <Text style={styles.builderLockedTitle}>
                  {builderMode === BUILDER_MODES.FAVORITES ? getDayTitle(selectedSessionDay) : 'Manual'}
                </Text>
                <Text style={styles.builderLockedMeta}>
                  {builderMode === BUILDER_MODES.FAVORITES
                    ? 'Loaded from your saved favorites. You can still add extra exercises manually.'
                    : 'Empty session. Add exactly the exercises you want.'}
                </Text>
              </View>
              <TouchableOpacity style={styles.builderResetButton} activeOpacity={0.9} onPress={onResetBuilder}>
                <Ionicons name="refresh-outline" size={14} color={COLORS.muted} />
                <Text style={styles.builderResetButtonText}>Change plan</Text>
              </TouchableOpacity>
            </View>
          )}

          {builderStep === BUILDER_STEPS.BUILD ? (
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Exercise cards</Text>
              <Text style={styles.sectionSubtitle}>
                {exercises.length} exercise{exercises.length === 1 ? '' : 's'} • {totalSets} sets
              </Text>
            </View>
            <TouchableOpacity style={styles.addSectionButton} activeOpacity={0.92} onPress={() => setPickerVisible(true)}>
              <Ionicons name="add" size={15} color={COLORS.bg} />
              <Text style={styles.addSectionButtonText}>{builderMode === BUILDER_MODES.MANUAL ? 'Add exercise' : 'Add manually'}</Text>
            </TouchableOpacity>
          </View>
          ) : null}

          {sessionsApi.error ? <Text style={styles.inlineError}>{sessionsApi.error}</Text> : null}

          {builderStep === BUILDER_STEPS.BUILD && exercises.length === 0 ? (
            <TouchableOpacity style={styles.emptyStateCard} activeOpacity={0.92} onPress={() => setPickerVisible(true)}>
              <View style={styles.emptyStateLine} />
              <View style={styles.emptyStateCenter}>
                <Ionicons name={builderMode === BUILDER_MODES.FAVORITES ? 'sparkles-outline' : 'albums-outline'} size={18} color={COLORS.accent} />
                <Text style={styles.emptyStateTitle}>
                  {builderMode === BUILDER_MODES.FAVORITES
                    ? selectedSessionDay
                      ? 'No favorite exercises loaded'
                      : 'Choose a day to start'
                    : 'No exercises added yet'}
                </Text>
              </View>
              <View style={styles.emptyStateLine} />
            </TouchableOpacity>
          ) : builderStep === BUILDER_STEPS.BUILD ? (
            <View style={styles.exerciseStack}>
              {exercises.map((exercise, index) => {
                const dragging = draggingExerciseId === exercise.instanceId;
                return (
                  <Animated.View
                    key={exercise.instanceId}
                    style={[
                      styles.exerciseStackItem,
                      dragging ? { transform: [{ translateY: dragY }], zIndex: 20 } : null,
                    ]}
                  >
                    <ExerciseCard
                      exercise={exercise}
                      expanded={expandedExerciseId === exercise.instanceId && !draggingExerciseId}
                      dragging={dragging}
                      canDrag={exercises.length > 1}
                      canMoveUp={index > 0}
                      canMoveDown={index < exercises.length - 1}
                      onToggle={() =>
                        setExpandedExerciseId((prev) => (prev === exercise.instanceId ? '' : exercise.instanceId))
                      }
                      onRemove={() => removeExercise(exercise.instanceId)}
                      onMoveUp={() => moveExerciseByDelta(exercise.instanceId, -1)}
                      onMoveDown={() => moveExerciseByDelta(exercise.instanceId, 1)}
                      onAddSet={() => addSet(exercise.instanceId)}
                      onRemoveSet={(setId) => removeSet(exercise.instanceId, setId)}
                      onUpdateSet={(setId, patch) => updateSet(exercise.instanceId, setId, patch)}
                      onOpenLastTime={() => openExerciseHistory(exercise)}
                      onOpenAiAdvice={() => openExerciseAiAdvice(exercise)}
                      historyPreview={historyPreviewByLibraryId[exercise.libraryId]}
                      historyPreviewLoading={historyLoadingLibraryId === exercise.libraryId}
                      adviceState={adviceStateByLibraryId[exercise.libraryId]}
                      handlePanHandlers={getHandlePanHandlers(exercise.instanceId, index)}
                    />
                  </Animated.View>
                );
              })}
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.footerBar}>
          <View style={styles.footerSummary}>
            <Text style={styles.footerSummaryTitle}>{derivedTitle || 'Session'}</Text>
            <Text style={styles.footerSummaryMeta}>
              {exercises.length} exercise{exercises.length === 1 ? '' : 's'} • {totalSets} sets
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.saveButton, !canContinue || builderStep !== BUILDER_STEPS.BUILD ? styles.saveButtonDisabled : null]}
            activeOpacity={canContinue && builderStep === BUILDER_STEPS.BUILD ? 0.92 : 1}
            disabled={!canContinue || builderStep !== BUILDER_STEPS.BUILD}
            onPress={onContinue}
          >
            <Text style={styles.saveButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>

        <FullSheetModal
          visible={pickerVisible}
          title="Add exercise"
          subtitle={builderMode === BUILDER_MODES.MANUAL
            ? 'Choose a movement, then pick the exact variant you want in this session.'
            : 'Add extra exercises manually after your favorites are loaded.'}
          onClose={() => setPickerVisible(false)}
          footer={
            <View style={styles.modalFooterWrap}>
              <Text style={styles.modalFooterText}>
                {exercises.length} exercise{exercises.length === 1 ? '' : 's'} added
              </Text>
              <TouchableOpacity style={styles.modalDoneButton} activeOpacity={0.92} onPress={() => setPickerVisible(false)}>
                <Text style={styles.modalDoneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          }
        >
          <View style={styles.pickerSearchWrap}>
            <Ionicons name="search-outline" size={16} color={COLORS.muted} />
            <TextInput
              value={pickerQuery}
              onChangeText={setPickerQuery}
              placeholder="Search movements or variants"
              placeholderTextColor={COLORS.muted}
              style={styles.pickerSearchInput}
            />
          </View>

          <View style={styles.dayFilterRow}>
            {DAY_FILTERS.map((filter) => {
              const active = pickerDayFilter === filter.key;
              return (
                <TouchableOpacity
                  key={filter.key}
                  style={[styles.dayFilterChip, active ? styles.dayFilterChipActive : null]}
                  activeOpacity={0.9}
                  onPress={() => setPickerDayFilter(filter.key)}
                >
                  <Text style={[styles.dayFilterChipText, active ? styles.dayFilterChipTextActive : null]}>
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <ScrollView
            style={styles.modalResults}
            contentContainerStyle={styles.modalResultsContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {optionsLoading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={COLORS.accent} />
                <Text style={styles.loadingText}>Loading movement library...</Text>
              </View>
            ) : filteredMovements.length === 0 ? (
              <View style={styles.emptyModalState}>
                <Text style={styles.emptyModalTitle}>No matching movements</Text>
                <Text style={styles.emptyModalBody}>Try a different search or seed more movement data into the library.</Text>
              </View>
            ) : (
              <>
                {filteredMovements.map((movement) => (
                  <MovementPickerCard
                    key={movement.id}
                    movement={movement}
                    isExpanded={Boolean(expandedMovementIds[movement.id])}
                    addedCount={addedCountByMovementId[movement.id] || 0}
                    onToggle={() => toggleMovement(movement.id)}
                    onAddVariant={(variant) => addMovementVariant(movement, variant)}
                  />
                ))}
              </>
            )}
          </ScrollView>
        </FullSheetModal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: UI_TOKENS.spacing.md,
    paddingTop: UI_TOKENS.spacing.sm,
    paddingBottom: 132,
    gap: UI_TOKENS.spacing.md,
  },
  heroCard: {
    paddingVertical: UI_TOKENS.spacing.xs,
  },
  heroSpacer: {
    height: 2,
  },
  builderCard: {
    borderRadius: UI_TOKENS.radius.lg,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.md,
    gap: UI_TOKENS.spacing.sm,
  },
  builderOptionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  builderOptionCard: {
    width: '48%',
    minHeight: 108,
    borderRadius: UI_TOKENS.radius.lg,
    borderWidth: UI_TOKENS.border.hairline,
    paddingHorizontal: UI_TOKENS.spacing.md,
    paddingVertical: UI_TOKENS.spacing.md,
    justifyContent: 'space-between',
  },
  builderOptionCardFavorites: {
    borderColor: 'rgba(245,201,106,0.24)',
    backgroundColor: 'rgba(245,201,106,0.08)',
  },
  builderOptionCardManual: {
    borderColor: 'rgba(90,209,232,0.24)',
    backgroundColor: 'rgba(90,209,232,0.08)',
  },
  builderOptionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  builderOptionIconWrapFavorites: {
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(245,201,106,0.28)',
    backgroundColor: 'rgba(245,201,106,0.12)',
  },
  builderOptionIconWrapManual: {
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(90,209,232,0.28)',
    backgroundColor: 'rgba(90,209,232,0.12)',
  },
  builderOptionTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 3,
    fontWeight: '800',
  },
  builderOptionMeta: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta + 1,
    fontWeight: '600',
  },
  builderLockedCard: {
    borderRadius: UI_TOKENS.radius.lg,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.md,
    gap: UI_TOKENS.spacing.sm,
  },
  builderLockedMain: {
    gap: 4,
  },
  builderLockedEyebrow: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  builderLockedTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 3,
    fontWeight: '800',
  },
  builderLockedMeta: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta + 1,
    lineHeight: UI_TOKENS.typography.subtitle + 3,
  },
  builderResetButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  builderResetButtonText: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: UI_TOKENS.spacing.sm,
  },
  addSectionButton: {
    minHeight: 36,
    borderRadius: 999,
    backgroundColor: COLORS.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
  },
  addSectionButtonText: {
    color: COLORS.bg,
    fontSize: UI_TOKENS.typography.meta + 1,
    fontWeight: '800',
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.title,
    fontWeight: '800',
  },
  sectionSubtitle: {
    marginTop: 2,
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
  inlineError: {
    color: '#FFB4A8',
    fontSize: UI_TOKENS.typography.meta,
  },
  emptyStateCard: {
    borderRadius: UI_TOKENS.radius.lg,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.18)',
    backgroundColor: COLORS.card,
    paddingHorizontal: UI_TOKENS.spacing.md,
    paddingVertical: UI_TOKENS.spacing.lg,
    alignItems: 'center',
    gap: UI_TOKENS.spacing.sm,
  },
  emptyStateLine: {
    width: '100%',
    height: UI_TOKENS.border.hairline,
    backgroundColor: 'rgba(162,167,179,0.14)',
  },
  emptyStateCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyStateTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 1,
    fontWeight: '700',
  },
  exerciseStack: {
    gap: UI_TOKENS.spacing.sm,
  },
  exerciseStackItem: {
    minHeight: CARD_SLOT_HEIGHT,
  },
  exerciseCard: {
    borderRadius: UI_TOKENS.radius.lg,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.card,
    overflow: 'hidden',
  },
  exerciseCardExpanded: {
    borderColor: 'rgba(90,209,232,0.35)',
    backgroundColor: '#1A2030',
  },
  exerciseCardDragging: {
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.32,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 9,
  },
  exerciseCardHeader: {
    padding: UI_TOKENS.spacing.sm,
    flexDirection: 'row',
    gap: UI_TOKENS.spacing.sm,
    alignItems: 'center',
  },
  thumbFallback: {
    backgroundColor: 'rgba(245,201,106,0.12)',
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(245,201,106,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseCardMain: {
    flex: 1,
    gap: 6,
  },
  exerciseCardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: UI_TOKENS.spacing.xs,
  },
  exerciseCardTitleWrap: {
    flex: 1,
  },
  exerciseTopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reorderArrowColumn: {
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderArrowButton: {
    width: 28,
    height: 24,
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderArrowButtonDisabled: {
    opacity: 0.45,
  },
  exerciseTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.title,
    fontWeight: '800',
  },
  exerciseVariant: {
    marginTop: 2,
    color: COLORS.accent,
    fontSize: UI_TOKENS.typography.meta + 1,
    fontWeight: '700',
  },
  exerciseMeta: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
  summaryPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
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
  summaryPillText: {
    color: COLORS.accent2,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
  dragHandle: {
    width: 34,
    height: 34,
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.28)',
    backgroundColor: COLORS.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragHandleDisabled: {
    opacity: 0.5,
  },
  removeExerciseButton: {
    width: 34,
    height: 34,
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(255,150,130,0.35)',
    backgroundColor: 'rgba(255,150,130,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedBody: {
    paddingHorizontal: UI_TOKENS.spacing.sm,
    paddingBottom: UI_TOKENS.spacing.sm,
    gap: UI_TOKENS.spacing.sm,
  },
  expandedSectionLabel: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.36,
  },
  setEditorList: {
    gap: 8,
  },
  setEditorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setIndexPill: {
    width: 54,
    minHeight: 40,
    borderRadius: UI_TOKENS.radius.sm,
    backgroundColor: COLORS.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setIndexText: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
  stepperField: {
    flex: 1,
    gap: 6,
  },
  stepperFieldGhost: {
    opacity: 0,
  },
  stepperLabel: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.28,
  },
  stepperControl: {
    minHeight: 42,
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.bg,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  stepperButton: {
    width: 34,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.cardSoft,
  },
  stepperInput: {
    flex: 1,
    minHeight: 42,
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle,
    fontWeight: '700',
    paddingHorizontal: 8,
  },
  setRemoveButton: {
    width: 40,
    height: 40,
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(255,150,130,0.25)',
    backgroundColor: 'rgba(255,150,130,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  setRemoveButtonDisabled: {
    borderColor: 'rgba(162,167,179,0.18)',
    backgroundColor: 'rgba(162,167,179,0.08)',
  },
  expandedActionsRow: {
    flexDirection: 'row',
    gap: UI_TOKENS.spacing.xs,
    flexWrap: 'wrap',
  },
  ghostAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(90,209,232,0.36)',
    backgroundColor: 'rgba(90,209,232,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ghostActionText: {
    color: COLORS.accent2,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
  ghostActionDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(255,150,130,0.32)',
    backgroundColor: 'rgba(255,150,130,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ghostActionDangerText: {
    color: '#FFB29F',
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
  lastHistoryCard: {
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(245,201,106,0.22)',
    backgroundColor: 'rgba(245,201,106,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  lastHistoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  lastHistoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lastHistoryLabel: {
    color: COLORS.accent,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
  lastHistoryContent: {
    gap: 3,
  },
  lastHistoryDate: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.meta + 1,
    fontWeight: '700',
  },
  lastHistoryLine: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
    lineHeight: 18,
  },
  lastHistoryEmpty: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
  lastHistoryLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiAdviceCard: {
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(90,209,232,0.22)',
    backgroundColor: 'rgba(90,209,232,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  aiAdviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  aiAdviceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiAdviceLabel: {
    color: COLORS.accent2,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
  aiAdviceText: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.meta,
    lineHeight: 19,
  },
  aiAdviceMuted: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
  aiAdviceError: {
    color: '#FFB4A8',
    fontSize: UI_TOKENS.typography.meta,
  },
  footerBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: UI_TOKENS.border.hairline,
    borderTopColor: 'rgba(162,167,179,0.18)',
    backgroundColor: 'rgba(14,15,20,0.96)',
    paddingHorizontal: UI_TOKENS.spacing.md,
    paddingTop: UI_TOKENS.spacing.sm,
    paddingBottom: UI_TOKENS.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: UI_TOKENS.spacing.sm,
  },
  footerSummary: {
    flex: 1,
  },
  footerSummaryTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 1,
    fontWeight: '800',
  },
  footerSummaryMeta: {
    marginTop: 2,
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
  saveButton: {
    minHeight: 46,
    borderRadius: UI_TOKENS.radius.md,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: COLORS.bg,
    fontSize: UI_TOKENS.typography.subtitle + 1,
    fontWeight: '800',
  },
  pickerSearchWrap: {
    marginTop: UI_TOKENS.spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.28)',
    backgroundColor: COLORS.card,
    paddingHorizontal: UI_TOKENS.spacing.sm,
    minHeight: 46,
  },
  pickerSearchInput: {
    marginLeft: UI_TOKENS.spacing.xs,
    flex: 1,
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle,
  },
  modalResults: {
    flex: 1,
    marginTop: UI_TOKENS.spacing.sm,
  },
  modalResultsContent: {
    paddingBottom: UI_TOKENS.spacing.lg,
    gap: UI_TOKENS.spacing.sm,
  },
  loadingWrap: {
    minHeight: 140,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
  emptyModalState: {
    borderRadius: UI_TOKENS.radius.md,
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.lg,
    gap: 6,
  },
  emptyModalTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 1,
    fontWeight: '700',
  },
  emptyModalBody: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
  pickerMovementCard: {
    borderRadius: UI_TOKENS.radius.lg,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.18)',
    backgroundColor: COLORS.card,
    overflow: 'hidden',
  },
  pickerMovementTouch: {
    padding: UI_TOKENS.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: UI_TOKENS.spacing.sm,
  },
  pickerMovementMain: {
    flex: 1,
    gap: 4,
  },
  pickerBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pickerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: UI_TOKENS.spacing.xs,
  },
  pickerMovementTitle: {
    flex: 1,
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 2,
    fontWeight: '800',
  },
  pickerMovementMeta: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
  pickerHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerHintText: {
    color: COLORS.accent,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
  addedBadge: {
    borderRadius: 999,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(90,209,232,0.4)',
    backgroundColor: 'rgba(90,209,232,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addedBadgeText: {
    color: COLORS.accent2,
    fontSize: 10,
    fontWeight: '700',
  },
  favoriteBadge: {
    borderRadius: 999,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(245,201,106,0.32)',
    backgroundColor: 'rgba(245,201,106,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  favoriteBadgeText: {
    color: COLORS.accent,
    fontSize: 10,
    fontWeight: '700',
  },
  variantList: {
    paddingHorizontal: UI_TOKENS.spacing.sm,
    paddingBottom: UI_TOKENS.spacing.sm,
    gap: 8,
  },
  variantCard: {
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.16)',
    backgroundColor: COLORS.cardSoft,
    padding: UI_TOKENS.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: UI_TOKENS.spacing.sm,
  },
  variantCardMain: {
    flex: 1,
    gap: 3,
  },
  variantCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  variantCardTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle,
    fontWeight: '700',
    flex: 1,
  },
  variantCardMeta: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
  dayFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  dayFilterChip: {
    minHeight: UI_TOKENS.control.chipHeight,
    borderRadius: 999,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.18)',
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayFilterChipActive: {
    borderColor: 'rgba(245,201,106,0.34)',
    backgroundColor: 'rgba(245,201,106,0.12)',
  },
  dayFilterChipText: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
  dayFilterChipTextActive: {
    color: COLORS.accent,
  },
  favoriteSection: {
    marginBottom: UI_TOKENS.spacing.md,
    gap: UI_TOKENS.spacing.sm,
  },
  favoriteSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: UI_TOKENS.spacing.sm,
  },
  favoriteSectionTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
  },
  favoriteSectionMeta: {
    color: COLORS.accent,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
  favoriteVariantGrid: {
    gap: UI_TOKENS.spacing.xs,
  },
  favoriteVariantCard: {
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(245,201,106,0.2)',
    backgroundColor: 'rgba(245,201,106,0.08)',
    paddingHorizontal: UI_TOKENS.spacing.sm,
    paddingVertical: UI_TOKENS.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: UI_TOKENS.spacing.sm,
  },
  favoriteVariantTextWrap: {
    flex: 1,
    gap: 2,
  },
  favoriteVariantTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  favoriteVariantMeta: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  modalFooterWrap: {
    gap: UI_TOKENS.spacing.sm,
  },
  modalFooterText: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
  modalDoneButton: {
    borderRadius: UI_TOKENS.radius.md,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  modalDoneButtonText: {
    color: COLORS.bg,
    fontSize: UI_TOKENS.typography.subtitle + 1,
    fontWeight: '800',
  },
});

export default GymSessionCreateScreen;
