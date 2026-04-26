import { ActivityIndicator, Alert, Image, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import YouTubeEmbed from '../../../components/YouTubeEmbed';
import { useAuth } from '../../../context/AuthContext';
import { getOrCreateAppUser } from '../../../core/api/foodInventoryDb';
import { addUserSelection, getNextUserSelectionSortOrder, hasUserSelection, removeUserSelection } from '../../../core/api/catalogSelectionDb';
import {
  getExerciseMovementDetail,
  listMovementMachineMappings,
  listMovementMuscleScores,
  updateExerciseMeasurementSettings,
} from '../../../core/api/exerciseMovementsDb';
import { listExerciseHistory } from '../../../core/api/gymSessionsDb';
import { ITEM_PLACEHOLDER_IMAGE } from '../../../core/placeholders';
import COLORS from '../../../theme/colors';
import CatalogItemCard from '../../../ui/components/CatalogItemCard';
import UI_TOKENS from '../../../ui/tokens';
import { formatScore, getScoreBand } from './detail/useGymDetailData';
import { formatMeasuredSetRow, formatMeasurementNumber, getExerciseMeasurementConfig } from './exerciseMeasurement';

function ChevronAction() {
  return (
    <View style={styles.chevronAction}>
      <Ionicons name="chevron-forward" size={16} color={COLORS.text} />
    </View>
  );
}

function CollapsibleSection({ title, subtitle, iconName, expanded, onToggle, children }) {
  return (
    <View style={styles.sectionCard}>
      <TouchableOpacity style={styles.sectionHeaderButton} activeOpacity={0.9} onPress={onToggle}>
        <View style={styles.sectionHeaderCopy}>
          <View style={styles.sectionHeaderTitleRow}>
            <View style={styles.sectionHeaderIconWrap}>
              <Ionicons name={iconName} size={15} color={COLORS.accent} />
            </View>
            <Text style={styles.sectionTitle}>{title}</Text>
          </View>
          {subtitle ? <Text style={styles.sectionSubtitleCompact}>{subtitle}</Text> : null}
        </View>
        <View style={styles.sectionHeaderChevron}>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.muted} />
        </View>
      </TouchableOpacity>
      {expanded ? <View style={styles.sectionBody}>{children}</View> : null}
    </View>
  );
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

function getBestEverLabel(historyRows = []) {
  let bestWeight = null;
  let bestWeightReps = null;
  let bestReps = null;
  let bestMinutes = null;
  let bestMinutesSpeed = null;

  historyRows.forEach((row) => {
    const measurementConfig = getExerciseMeasurementConfig({
      movementSlug: row?.movementSlug,
      movementName: row?.movementName,
      name: row?.variantName,
      equipment: row?.equipment,
      primaryMuscleGroup: row?.muscle,
    });

    (row?.sets || []).forEach((setRow) => {
      const repsValue = Number(setRow?.reps);
      const weightValue = Number(setRow?.weight);
      const speedValue = Number(setRow?.speed);
      if (measurementConfig.mode === 'minutes_only') {
        if (Number.isFinite(repsValue)) bestMinutes = Math.max(bestMinutes || 0, repsValue);
        return;
      }
      if (measurementConfig.mode === 'minutes_speed') {
        if (Number.isFinite(repsValue)) {
          if (
            !bestMinutesSpeed
            || repsValue > bestMinutesSpeed.minutes
            || (repsValue === bestMinutesSpeed.minutes && Number.isFinite(speedValue) && speedValue > bestMinutesSpeed.speed)
          ) {
            bestMinutesSpeed = { minutes: repsValue, speed: Number.isFinite(speedValue) ? speedValue : 0 };
          }
        }
        return;
      }
      if (measurementConfig.mode === 'reps_only') {
        if (Number.isFinite(repsValue)) bestReps = Math.max(bestReps || 0, repsValue);
        return;
      }
      if (Number.isFinite(weightValue)) {
        if (bestWeight === null || weightValue > bestWeight) {
          bestWeight = weightValue;
          bestWeightReps = Number.isFinite(repsValue) ? repsValue : null;
        }
      }
      if (Number.isFinite(repsValue)) bestReps = Math.max(bestReps || 0, repsValue);
    });
  });

  if (bestWeight !== null) {
    return bestWeightReps ? `${bestWeight} kg x ${bestWeightReps}` : `${bestWeight} kg`;
  }
  if (bestMinutesSpeed) {
    return `${bestMinutesSpeed.minutes} min • ${bestMinutesSpeed.speed} kph`;
  }
  if (bestMinutes !== null) return `${bestMinutes} min`;
  if (bestReps !== null) return `${bestReps} reps`;
  return 'No history yet';
}

function renderHistorySetSummary(item) {
  const measurementConfig = getExerciseMeasurementConfig({
    movementSlug: item?.movementSlug,
    movementName: item?.movementName,
    name: item?.variantName,
    equipment: item?.equipment,
    primaryMuscleGroup: item?.muscle,
    weightStepKg: item?.weightStepKg,
  });
  return (item?.sets || []).map((setRow) => `Set ${setRow.setIndex}: ${formatMeasuredSetRow(setRow, measurementConfig)}`);
}

const WEIGHT_STEP_OPTIONS = [0.5, 1, 2.5, 5, 10];
const WEIGHT_MEASURE_MODES = {
  STEPS: 'steps',
  FIXED: 'fixed',
};

function formatMeasurementStepLabel(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '2.5 kg';
  return `${Number.isInteger(numeric) ? numeric : numeric.toFixed(1).replace(/\.0$/, '')} kg`;
}

function getMeasurementSummary(config) {
  if (config.mode === 'minutes_speed') return 'Minutes + speed';
  if (config.mode === 'minutes_only') return 'Minutes only';
  if (config.mode === 'reps_only') return 'Reps only';
  if (config.secondaryMode === WEIGHT_MEASURE_MODES.FIXED) {
    return config.secondaryFixedValues?.length
      ? `Fixed values: ${config.secondaryFixedValues.map(formatMeasurementStepLabel).join(', ')}`
      : 'Fixed values not set';
  }
  return `Weight changes by ${formatMeasurementStepLabel(config.secondaryStep)}`;
}

function sanitizeFixedWeightValues(values = []) {
  const unique = new Set();
  values.forEach((item) => {
    const parsed = Number(item);
    if (!Number.isFinite(parsed) || parsed < 0) return;
    unique.add(Math.round(parsed * 100) / 100);
  });
  return Array.from(unique).sort((a, b) => a - b);
}

function ExerciseDetailScreen({ route, navigation }) {
  const { user } = useAuth();
  const {
    itemId,
    exerciseId: routeExerciseId,
    movementId: routeMovementId,
    selectedVariantId: routeSelectedVariantId,
    item,
  } = route.params || {};
  const legacyExerciseId = routeExerciseId || itemId || null;

  const [isMutating, setIsMutating] = useState(false);
  const [measurementSaving, setMeasurementSaving] = useState(false);
  const [isAdded, setIsAdded] = useState(route.params?.isAdded ?? false);
  const [inlineError, setInlineError] = useState('');
  const [loading, setLoading] = useState(true);
  const [movement, setMovement] = useState(route.params?.movement || null);
  const [variants, setVariants] = useState([]);
  const [muscleScores, setMuscleScores] = useState([]);
  const [machineMatches, setMachineMatches] = useState([]);
  const [historyRows, setHistoryRows] = useState([]);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [targetMusclesExpanded, setTargetMusclesExpanded] = useState(false);
  const [machinesExpanded, setMachinesExpanded] = useState(false);
  const [howToExpanded, setHowToExpanded] = useState(false);
  const [measurementExpanded, setMeasurementExpanded] = useState(false);
  const [fixedWeightInput, setFixedWeightInput] = useState('');
  const [historyExpanded, setHistoryExpanded] = useState(Boolean(route.params?.initialHistoryExpanded));
  const fromCatalog = Boolean(route.params?.fromCatalog);

  useEffect(() => {
    let isActive = true;

    async function hydrateDetail() {
      try {
        setLoading(true);
        setInlineError('');
        const detail = await getExerciseMovementDetail({
          movementId: routeMovementId || null,
          exerciseId: legacyExerciseId || null,
        });
        const resolvedMovement = detail?.movement || null;
        const resolvedVariants = detail?.variants || [];
        const appUser = await getOrCreateAppUser({
          username: user?.username || 'demo user',
          name: user?.name || 'Demo User',
        });
        const selectedVariantId =
          routeSelectedVariantId ||
          legacyExerciseId ||
          resolvedVariants.find((variant) => variant?.is_primary_variant)?.id ||
          resolvedVariants[0]?.id ||
          null;
        const [movementMuscles, movementMachines, movementHistory] = await Promise.all([
          listMovementMuscleScores({ movementId: resolvedMovement?.id }),
          listMovementMachineMappings({ movementId: resolvedMovement?.id }),
          listExerciseHistory({
            userId: appUser.id,
            exerciseId: selectedVariantId,
            movementId: resolvedMovement?.id || null,
            limit: 8,
          }),
        ]);

        if (!isActive) return;
        setMovement(resolvedMovement);
        setVariants(resolvedVariants);
        setMuscleScores(movementMuscles || []);
        setMachineMatches(movementMachines || []);
        setHistoryRows(movementHistory || []);
      } catch (error) {
        if (!isActive) return;
        setInlineError(error?.message || 'Could not load movement detail');
      } finally {
        if (isActive) setLoading(false);
      }
    }

    hydrateDetail();
    return () => {
      isActive = false;
    };
  }, [legacyExerciseId, routeMovementId, routeSelectedVariantId, user?.name, user?.username]);

  const selectedVariant = useMemo(() => {
    const initialSelectedVariantId =
      routeSelectedVariantId ||
      legacyExerciseId ||
      variants.find((variant) => variant?.is_primary_variant)?.id ||
      variants[0]?.id ||
      null;

    return (
      variants.find((variant) => variant.id === initialSelectedVariantId) ||
      variants.find((variant) => variant?.is_primary_variant) ||
      variants[0] ||
      item ||
      null
    );
  }, [item, legacyExerciseId, routeSelectedVariantId, variants]);

  const heroImageSource = movement?.image_url
    ? { uri: movement.image_url }
    : selectedVariant?.image_url
      ? { uri: selectedVariant.image_url }
      : ITEM_PLACEHOLDER_IMAGE;
  const heroTitle = selectedVariant?.name || movement?.name || route.params?.exerciseName || 'Exercise';
  const heroSubtitle = `${selectedVariant?.primary_muscle_group || movement?.primary_muscle_group || 'Workout'} • ${selectedVariant?.equipment || movement?.movement_family || selectedVariant?.type || 'movement'}`;
  const measurementConfig = useMemo(
    () => getExerciseMeasurementConfig({
      movementSlug: movement?.slug,
      movementName: movement?.name,
      name: selectedVariant?.name,
      equipment: selectedVariant?.equipment,
      primaryMuscleGroup: selectedVariant?.primary_muscle_group || movement?.primary_muscle_group,
      weightStepKg: selectedVariant?.weight_step_kg,
      weightMeasureMode: selectedVariant?.weight_measure_mode,
      weightFixedValues: selectedVariant?.weight_fixed_values,
    }),
    [
      movement?.name,
      movement?.primary_muscle_group,
      movement?.slug,
      selectedVariant?.equipment,
      selectedVariant?.name,
      selectedVariant?.primary_muscle_group,
      selectedVariant?.weight_fixed_values,
      selectedVariant?.weight_measure_mode,
      selectedVariant?.weight_step_kg,
    ],
  );

  const applyMeasurementUpdate = useCallback(
    async ({ weightStepKg, weightMeasureMode, weightFixedValues }) => {
      if (!selectedVariant?.id || measurementSaving || measurementConfig.mode !== 'reps_weight') return;
      try {
        setMeasurementSaving(true);
        setInlineError('');
        const updated = await updateExerciseMeasurementSettings({
          exerciseId: selectedVariant.id,
          weightStepKg,
          weightMeasureMode,
          weightFixedValues,
        });
        setVariants((prev) => prev.map((variant) => (
          variant.id === selectedVariant.id
            ? {
              ...variant,
              weight_step_kg: updated?.weight_step_kg ?? weightStepKg,
              weight_measure_mode: updated?.weight_measure_mode ?? weightMeasureMode,
              weight_fixed_values: updated?.weight_fixed_values ?? weightFixedValues ?? [],
            }
            : variant
        )));
        setMovement((prev) => (
          prev
            ? {
              ...prev,
              variants: (prev?.variants || []).map((variant) => (
                variant.id === selectedVariant.id
                  ? {
                    ...variant,
                    weight_step_kg: updated?.weight_step_kg ?? weightStepKg,
                    weight_measure_mode: updated?.weight_measure_mode ?? weightMeasureMode,
                    weight_fixed_values: updated?.weight_fixed_values ?? weightFixedValues ?? [],
                  }
                  : variant
              )),
            }
            : prev
        ));
      } catch (error) {
        setInlineError(error?.message || 'Could not update measurement settings');
      } finally {
        setMeasurementSaving(false);
      }
    },
    [measurementConfig.mode, measurementSaving, selectedVariant?.id],
  );

  const onSelectWeightStep = useCallback(
    async (stepValue) => {
      await applyMeasurementUpdate({
        weightStepKg: stepValue,
        weightMeasureMode: WEIGHT_MEASURE_MODES.STEPS,
        weightFixedValues: measurementConfig.secondaryFixedValues || [],
      });
    },
    [applyMeasurementUpdate, measurementConfig.secondaryFixedValues],
  );

  const onSelectWeightMode = useCallback(
    async (modeValue) => {
      await applyMeasurementUpdate({
        weightStepKg: measurementConfig.secondaryStep,
        weightMeasureMode: modeValue,
        weightFixedValues: measurementConfig.secondaryFixedValues || [],
      });
    },
    [applyMeasurementUpdate, measurementConfig.secondaryFixedValues, measurementConfig.secondaryStep],
  );

  const onAddFixedWeightValue = useCallback(async () => {
    const parsed = Number(fixedWeightInput);
    if (!Number.isFinite(parsed) || parsed < 0) return;
    const nextValues = sanitizeFixedWeightValues([...(measurementConfig.secondaryFixedValues || []), parsed]);
    await applyMeasurementUpdate({
      weightStepKg: measurementConfig.secondaryStep,
      weightMeasureMode: WEIGHT_MEASURE_MODES.FIXED,
      weightFixedValues: nextValues,
    });
    setFixedWeightInput('');
  }, [applyMeasurementUpdate, fixedWeightInput, measurementConfig.secondaryFixedValues, measurementConfig.secondaryStep]);

  const onRemoveFixedWeightValue = useCallback(async (valueToRemove) => {
    const nextValues = sanitizeFixedWeightValues((measurementConfig.secondaryFixedValues || []).filter((value) => Number(value) !== Number(valueToRemove)));
    await applyMeasurementUpdate({
      weightStepKg: measurementConfig.secondaryStep,
      weightMeasureMode: WEIGHT_MEASURE_MODES.FIXED,
      weightFixedValues: nextValues,
    });
  }, [applyMeasurementUpdate, measurementConfig.secondaryFixedValues, measurementConfig.secondaryStep]);

  const targetMuscles = useMemo(
    () =>
      (muscleScores || []).map((row) => ({
        id: row.id,
        subgroupKey: row.muscle_subgroup?.name_key || '',
        groupKey: row.muscle_subgroup?.muscle?.name_key || '',
        subgroupName: row.muscle_subgroup?.name || 'Muscle',
        groupName: row.muscle_subgroup?.muscle?.name || 'Group',
        imageUrl: row.muscle_subgroup?.image_url || row.muscle_subgroup?.muscle?.image_url || null,
        targetScore: Number(row.target_score || 0),
      })),
    [muscleScores],
  );

  const recommendedMachines = useMemo(
    () =>
      (machineMatches || []).map((row) => ({
        id: row.id,
        machineId: row.machine_id,
        item: row.catalog_machine,
        relevanceScore: Number(row.relevance_score || 0),
      })),
    [machineMatches],
  );

  const lastHistoryRow = historyRows[0] || null;
  const olderHistoryRows = historyRows.slice(1, 5);
  const bestEverLabel = useMemo(() => getBestEverLabel(historyRows), [historyRows]);

  useFocusEffect(
    useCallback(
      () => {
        let active = true;

        async function hydrateFavoriteState() {
          if (!selectedVariant?.id) return;
          try {
            const appUser = await getOrCreateAppUser({
              username: user?.username || 'demo user',
              name: user?.name || 'Demo User',
            });
            const favorited = await hasUserSelection({
              table: 'user_exercises',
              userId: appUser.id,
              fkColumn: 'exercise_id',
              fkValue: selectedVariant.id,
            });
            if (!active) return;
            setIsAdded(favorited);
          } catch (error) {
            if (!active) return;
            setInlineError((prev) => prev || error?.message || 'Could not refresh favorite state');
          }
        }

        hydrateFavoriteState();
        return () => {
          active = false;
        };
      },
      [selectedVariant?.id, user?.name, user?.username],
    ),
  );

  const onToggleSaved = () => {
    if (!selectedVariant?.id || isMutating) return;

    const actionLabel = isAdded ? 'Remove' : 'Add';
    const actionMessage = isAdded
      ? `The variant ${selectedVariant.name} will be removed from your favorites.`
      : `The variant ${selectedVariant.name} will be marked as a favorite.`;

    Alert.alert(`${actionLabel} variant?`, actionMessage, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: actionLabel,
        style: isAdded ? 'destructive' : 'default',
        onPress: async () => {
          try {
            setIsMutating(true);
            setInlineError('');
            const appUser = await getOrCreateAppUser({
              username: user?.username || 'demo user',
              name: user?.name || 'Demo User',
            });
            await (isAdded
              ? removeUserSelection({
                table: 'user_exercises',
                userId: appUser.id,
                fkColumn: 'exercise_id',
                fkValue: selectedVariant.id,
              })
              : addUserSelection({
                table: 'user_exercises',
                userId: appUser.id,
                fkColumn: 'exercise_id',
                fkValue: selectedVariant.id,
                payload: {
                  sort_order: await getNextUserSelectionSortOrder({
                    table: 'user_exercises',
                    userId: appUser.id,
                  }),
                },
              }));
            const favorited = await hasUserSelection({
              table: 'user_exercises',
              userId: appUser.id,
              fkColumn: 'exercise_id',
              fkValue: selectedVariant.id,
            });
            setIsAdded(favorited);
          } catch (error) {
            setInlineError(error?.message || `Could not ${isAdded ? 'remove' : 'add'} variant`);
          } finally {
            setIsMutating(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading movement detail...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <TouchableOpacity activeOpacity={0.92} onPress={() => setImageViewerVisible(true)}>
            <Image source={heroImageSource} style={styles.heroImage} resizeMode="cover" />
          </TouchableOpacity>
          <View style={styles.heroTextWrap}>
            <Text style={styles.heroTitle}>{heroTitle}</Text>
            <Text style={styles.heroSubtitle}>{heroSubtitle}</Text>
            {selectedVariant?.variant_label ? (
              <Text style={styles.heroVariant}>{selectedVariant.variant_label}</Text>
            ) : null}
            <Text style={styles.heroHint}>Tap image to enlarge</Text>
          </View>
        </View>

        <CollapsibleSection
          title="Target muscles"
          subtitle={targetMuscles.length ? `${targetMuscles.length} mapped` : 'No mapped targets'}
          iconName="body-outline"
          expanded={targetMusclesExpanded}
          onToggle={() => setTargetMusclesExpanded((prev) => !prev)}
        >
          {targetMuscles.length ? (
            targetMuscles.map((row, index) => (
              <CatalogItemCard
                key={row.id}
                title={index === 0 ? `${row.subgroupName} • Top target` : row.subgroupName}
                subtitle={`${row.groupName} • ${formatScore(row.targetScore)} • ${getScoreBand(row.targetScore)}`}
                imageUrl={row.imageUrl}
                actionLabel="View"
                actionVariant="muted"
                onPress={() =>
                  navigation.navigate('MuscleDetail', {
                    groupKey: row.groupKey,
                    subKey: row.subgroupKey,
                    groupLabel: row.groupName,
                    subLabel: row.subgroupName,
                  })
                }
                rightAction={<ChevronAction />}
              />
            ))
          ) : (
            <Text style={styles.emptyText}>No scored muscle mappings yet.</Text>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title="Best machines for this exercise"
          subtitle={recommendedMachines.length ? `${recommendedMachines.length} matched` : 'No machine matches'}
          iconName="barbell-outline"
          expanded={machinesExpanded}
          onToggle={() => setMachinesExpanded((prev) => !prev)}
        >
          {recommendedMachines.length ? (
            recommendedMachines.map((row) => (
              <CatalogItemCard
                key={row.id}
                title={row.item?.name || 'Machine'}
                subtitle={`${row.item?.zone || 'Gym Zone'} • ${formatScore(row.relevanceScore)}`}
                imageUrl={row.item?.image_url || null}
                actionLabel="View"
                actionVariant="muted"
                onPress={() =>
                  navigation.navigate('MachineDetail', {
                    itemId: row.machineId,
                    item: row.item,
                    machineName: row.item?.name,
                    fromCatalog: true,
                    isAdded: false,
                  })
                }
                rightAction={<ChevronAction />}
              />
            ))
          ) : (
            <Text style={styles.emptyText}>No dedicated machine or setup mapped for this movement yet.</Text>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title="How to measure"
          subtitle={getMeasurementSummary(measurementConfig)}
          iconName="options-outline"
          expanded={measurementExpanded}
          onToggle={() => setMeasurementExpanded((prev) => !prev)}
        >
          {measurementConfig.mode === 'reps_weight' ? (
            <View style={styles.measurementSectionContent}>
              <Text style={styles.sectionSubtitle}>Choose how the kg steppers move for this exercise.</Text>
              <View style={styles.measurementModeRow}>
                <TouchableOpacity
                  style={[
                    styles.measurementOptionChip,
                    measurementConfig.secondaryMode === WEIGHT_MEASURE_MODES.STEPS && styles.measurementOptionChipActive,
                  ]}
                  activeOpacity={0.9}
                  disabled={measurementSaving}
                  onPress={() => onSelectWeightMode(WEIGHT_MEASURE_MODES.STEPS)}
                >
                  <Text
                    style={[
                      styles.measurementOptionText,
                      measurementConfig.secondaryMode === WEIGHT_MEASURE_MODES.STEPS && styles.measurementOptionTextActive,
                    ]}
                  >
                    Steps
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.measurementOptionChip,
                    measurementConfig.secondaryMode === WEIGHT_MEASURE_MODES.FIXED && styles.measurementOptionChipActive,
                  ]}
                  activeOpacity={0.9}
                  disabled={measurementSaving}
                  onPress={() => onSelectWeightMode(WEIGHT_MEASURE_MODES.FIXED)}
                >
                  <Text
                    style={[
                      styles.measurementOptionText,
                      measurementConfig.secondaryMode === WEIGHT_MEASURE_MODES.FIXED && styles.measurementOptionTextActive,
                    ]}
                  >
                    Fixed
                  </Text>
                </TouchableOpacity>
              </View>
              {measurementConfig.secondaryMode === WEIGHT_MEASURE_MODES.STEPS ? (
                <View style={styles.measurementOptionRow}>
                  {WEIGHT_STEP_OPTIONS.map((stepValue) => {
                    const isActive = Number(measurementConfig.secondaryStep) === Number(stepValue);
                    return (
                      <TouchableOpacity
                        key={`step_${stepValue}`}
                        style={[styles.measurementOptionChip, isActive && styles.measurementOptionChipActive]}
                        activeOpacity={0.9}
                        disabled={measurementSaving}
                        onPress={() => onSelectWeightStep(stepValue)}
                      >
                        <Text style={[styles.measurementOptionText, isActive && styles.measurementOptionTextActive]}>
                          {formatMeasurementStepLabel(stepValue)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.fixedValuesWrap}>
                  <View style={styles.measurementOptionRow}>
                    {(measurementConfig.secondaryFixedValues || []).map((value) => (
                      <View key={`fixed_${value}`} style={styles.fixedValueChip}>
                        <Text style={styles.fixedValueText}>{formatMeasurementStepLabel(value)}</Text>
                        <TouchableOpacity
                          style={styles.fixedValueRemove}
                          activeOpacity={0.9}
                          disabled={measurementSaving}
                          onPress={() => onRemoveFixedWeightValue(value)}
                        >
                          <Ionicons name="close" size={12} color={COLORS.text} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                  <View style={styles.fixedInputRow}>
                    <TextInput
                      value={fixedWeightInput}
                      onChangeText={setFixedWeightInput}
                      keyboardType="decimal-pad"
                      placeholder="10.5"
                      placeholderTextColor={COLORS.muted}
                      style={styles.fixedInput}
                    />
                    <TouchableOpacity
                      style={styles.fixedAddButton}
                      activeOpacity={0.9}
                      disabled={measurementSaving}
                      onPress={onAddFixedWeightValue}
                    >
                      <Ionicons name="add" size={14} color={COLORS.bg} />
                      <Text style={styles.fixedAddButtonText}>Add value</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ) : (
            <Text style={styles.emptyText}>
              {measurementConfig.mode === 'reps_only'
                ? 'This exercise is measured by reps only.'
                : measurementConfig.mode === 'minutes_speed'
                  ? 'This exercise is measured by minutes and speed.'
                  : 'This exercise is measured by minutes only.'}
            </Text>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title="History"
          subtitle={historyRows.length ? `${historyRows.length} recent logs` : 'Nothing done so far'}
          iconName="time-outline"
          expanded={historyExpanded}
          onToggle={() => setHistoryExpanded((prev) => !prev)}
        >
          {historyRows.length ? (
            <View style={styles.historySectionContent}>
              {lastHistoryRow ? (
                <View style={styles.historySummaryCard}>
                  <Text style={styles.historySummaryLabel}>Last time</Text>
                  <Text style={styles.historySummaryDate}>{formatHistoryDate(lastHistoryRow.sessionDateISO)}</Text>
                  <Text style={styles.historySummaryTitle}>{lastHistoryRow.variantName || lastHistoryRow.movementName}</Text>
                  {renderHistorySetSummary(lastHistoryRow).map((line, index) => (
                    <Text key={`${lastHistoryRow.id}-last-${index}`} style={styles.historyLine}>
                      {line}
                    </Text>
                  ))}
                </View>
              ) : null}

              <View style={styles.bestEverCard}>
                <Text style={styles.historySummaryLabel}>Best ever</Text>
                <Text style={styles.bestEverValue}>{bestEverLabel}</Text>
              </View>

              {olderHistoryRows.length ? (
                <View style={styles.historyOlderList}>
                  <Text style={styles.historySummaryLabel}>More history</Text>
                  {olderHistoryRows.map((row) => (
                    <View key={row.id} style={styles.historyListRow}>
                      <Text style={styles.historyListDate}>{formatHistoryDate(row.sessionDateISO)}</Text>
                      <Text style={styles.historyListTitle}>{row.variantName || row.movementName}</Text>
                      {renderHistorySetSummary(row).map((line, index) => (
                        <Text key={`${row.id}-older-${index}`} style={styles.historyListLine}>
                          {line}
                        </Text>
                      ))}
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ) : (
            <Text style={styles.emptyText}>Nothing done so far for this exercise.</Text>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title="How to do"
          subtitle="Video walkthrough"
          iconName="play-circle-outline"
          expanded={howToExpanded}
          onToggle={() => setHowToExpanded((prev) => !prev)}
        >
          <Text style={styles.sectionSubtitle}>Play the video to review the movement pattern and setup.</Text>
          <YouTubeEmbed
            youtubeId={movement?.video_youtube_id || 'dQw4w9WgXcQ'}
            title={`${heroTitle} tutorial placeholder`}
            showControls
          />
        </CollapsibleSection>

        {inlineError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{inlineError}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={[styles.removeButton, !isAdded && styles.addButton, (!selectedVariant?.id || isMutating) && styles.buttonDisabled]}
          activeOpacity={0.9}
          onPress={onToggleSaved}
          disabled={!selectedVariant?.id || isMutating}
        >
          {isMutating ? (
            <ActivityIndicator size="small" color={isAdded ? '#FFB4A8' : COLORS.bg} />
          ) : (
            <>
              <Ionicons
                name={isAdded ? 'trash-outline' : 'add-circle-outline'}
                size={16}
                color={isAdded ? '#FFB4A8' : COLORS.bg}
              />
              <Text style={[styles.removeText, !isAdded && styles.addText]}>
                {isAdded ? 'Remove favorite' : '★ Mark as favorite'}
              </Text>
            </>
          )}
        </TouchableOpacity>
        {fromCatalog ? (
          <TouchableOpacity style={styles.backButton} activeOpacity={0.9} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <Modal visible={imageViewerVisible} transparent animationType="fade" onRequestClose={() => setImageViewerVisible(false)}>
        <View style={styles.viewerRoot}>
          <Pressable style={styles.viewerBackdrop} onPress={() => setImageViewerVisible(false)} />
          <View style={styles.viewerCard}>
            <View style={styles.viewerHeader}>
              <Text style={styles.viewerTitle}>{heroTitle}</Text>
              <TouchableOpacity
                style={styles.viewerCloseButton}
                activeOpacity={0.9}
                onPress={() => setImageViewerVisible(false)}
              >
                <Ionicons name="close" size={18} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <Image source={heroImageSource} style={styles.viewerImage} resizeMode="contain" />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  content: {
    padding: UI_TOKENS.spacing.md,
    paddingBottom: UI_TOKENS.modal.footerHeight + UI_TOKENS.spacing.lg,
    gap: UI_TOKENS.spacing.sm,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: UI_TOKENS.spacing.sm,
  },
  loadingText: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.subtitle,
  },
  heroCard: {
    borderRadius: UI_TOKENS.radius.lg,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: UI_TOKENS.spacing.sm,
  },
  heroImage: {
    width: 96,
    height: 96,
    borderRadius: UI_TOKENS.card.imageRadius,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
  },
  heroTextWrap: { flex: 1 },
  heroTitle: { color: COLORS.text, fontSize: 24, fontWeight: '700' },
  heroSubtitle: { color: COLORS.muted, fontSize: UI_TOKENS.typography.subtitle, marginTop: 4 },
  heroVariant: { color: COLORS.accent, fontSize: UI_TOKENS.typography.meta, marginTop: 6, fontWeight: '700' },
  heroHint: { color: COLORS.accent, fontSize: UI_TOKENS.typography.meta, marginTop: 6, fontWeight: '600' },
  sectionCard: {
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.md,
    gap: UI_TOKENS.spacing.xs,
  },
  sectionHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: UI_TOKENS.spacing.sm,
  },
  sectionHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  sectionHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: UI_TOKENS.spacing.xs,
  },
  sectionHeaderIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(245,201,106,0.28)',
    backgroundColor: 'rgba(245,201,106,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderChevron: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { color: COLORS.text, fontSize: UI_TOKENS.typography.subtitle + 1, fontWeight: '700' },
  sectionSubtitle: { color: COLORS.muted, fontSize: UI_TOKENS.typography.meta, marginBottom: UI_TOKENS.spacing.xs },
  sectionSubtitleCompact: { color: COLORS.muted, fontSize: UI_TOKENS.typography.meta, marginTop: 4 },
  sectionBody: {
    marginTop: UI_TOKENS.spacing.xs,
    gap: UI_TOKENS.spacing.xs,
  },
  measurementSectionContent: {
    gap: UI_TOKENS.spacing.sm,
  },
  measurementModeRow: {
    flexDirection: 'row',
    gap: UI_TOKENS.spacing.xs,
  },
  measurementOptionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: UI_TOKENS.spacing.xs,
  },
  measurementOptionChip: {
    minHeight: UI_TOKENS.control.chipHeight,
    paddingHorizontal: UI_TOKENS.spacing.sm,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: 'rgba(162,167,179,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  measurementOptionChipActive: {
    borderColor: 'rgba(245,201,106,0.46)',
    backgroundColor: 'rgba(245,201,106,0.14)',
  },
  measurementOptionText: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
  measurementOptionTextActive: {
    color: COLORS.accent,
  },
  fixedValuesWrap: {
    gap: UI_TOKENS.spacing.sm,
  },
  fixedValueChip: {
    minHeight: UI_TOKENS.control.chipHeight,
    paddingLeft: UI_TOKENS.spacing.sm,
    paddingRight: UI_TOKENS.spacing.xs,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(79,209,197,0.26)',
    backgroundColor: 'rgba(79,209,197,0.08)',
    alignItems: 'center',
    flexDirection: 'row',
    gap: UI_TOKENS.spacing.xs,
  },
  fixedValueText: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
  fixedValueRemove: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(162,167,179,0.10)',
  },
  fixedInputRow: {
    flexDirection: 'row',
    gap: UI_TOKENS.spacing.xs,
    alignItems: 'center',
  },
  fixedInput: {
    flex: 1,
    minHeight: UI_TOKENS.control.inputHeight,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: 'rgba(162,167,179,0.08)',
    paddingHorizontal: UI_TOKENS.spacing.sm,
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.body,
    fontWeight: '700',
  },
  fixedAddButton: {
    minHeight: UI_TOKENS.control.inputHeight,
    paddingHorizontal: UI_TOKENS.spacing.sm,
    borderRadius: UI_TOKENS.radius.md,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  fixedAddButtonText: {
    color: COLORS.bg,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '800',
  },
  historySectionContent: {
    gap: UI_TOKENS.spacing.sm,
  },
  historySummaryCard: {
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(79,209,197,0.26)',
    backgroundColor: 'rgba(79,209,197,0.08)',
    padding: UI_TOKENS.spacing.sm,
    gap: 4,
  },
  historySummaryLabel: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  historySummaryDate: {
    color: COLORS.accent,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
  historySummaryTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 1,
    fontWeight: '700',
  },
  historyLine: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.meta,
    lineHeight: 18,
  },
  bestEverCard: {
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(245,201,106,0.24)',
    backgroundColor: 'rgba(245,201,106,0.08)',
    padding: UI_TOKENS.spacing.sm,
    gap: 4,
  },
  bestEverValue: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 1,
    fontWeight: '700',
  },
  historyOlderList: {
    gap: UI_TOKENS.spacing.sm,
  },
  historyListRow: {
    borderTopWidth: UI_TOKENS.border.hairline,
    borderTopColor: 'rgba(162,167,179,0.14)',
    paddingTop: UI_TOKENS.spacing.sm,
    gap: 2,
  },
  historyListDate: {
    color: COLORS.accent,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
  historyListTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle,
    fontWeight: '700',
  },
  historyListLine: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
    lineHeight: 18,
  },
  emptyText: { color: COLORS.muted, fontSize: UI_TOKENS.typography.meta },
  chevronAction: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,124,123,0.4)',
    backgroundColor: 'rgba(255,124,123,0.12)',
    padding: 12,
  },
  errorText: {
    color: '#FFB4A8',
    fontSize: 14,
  },
  bottomActions: {
    paddingHorizontal: UI_TOKENS.spacing.md,
    paddingTop: UI_TOKENS.spacing.sm,
    paddingBottom: UI_TOKENS.spacing.md,
    borderTopWidth: UI_TOKENS.border.hairline,
    borderTopColor: 'rgba(162,167,179,0.16)',
    backgroundColor: COLORS.bg,
    gap: UI_TOKENS.spacing.sm,
  },
  removeButton: {
    height: UI_TOKENS.control.chipHeight + 10,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(255,124,123,0.44)',
    backgroundColor: 'rgba(255,124,123,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: UI_TOKENS.spacing.xs,
  },
  addButton: {
    borderColor: 'rgba(245,201,106,0.66)',
    backgroundColor: COLORS.accent,
  },
  buttonDisabled: {
    opacity: 0.72,
  },
  removeText: {
    color: '#FFB4A8',
    fontSize: UI_TOKENS.typography.subtitle,
    fontWeight: '700',
  },
  addText: {
    color: COLORS.bg,
  },
  backButton: {
    height: UI_TOKENS.control.chipHeight + 10,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.26)',
    backgroundColor: 'rgba(162,167,179,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle,
    fontWeight: '700',
  },
  viewerRoot: {
    flex: 1,
    backgroundColor: 'rgba(3,7,18,0.74)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: UI_TOKENS.spacing.md,
  },
  viewerBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  viewerCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: UI_TOKENS.radius.lg,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.md,
    gap: UI_TOKENS.spacing.sm,
  },
  viewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: UI_TOKENS.spacing.sm,
  },
  viewerTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 2,
    fontWeight: '700',
    flex: 1,
  },
  viewerCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerImage: {
    width: '100%',
    height: 320,
    borderRadius: UI_TOKENS.radius.md,
  },
});

export default ExerciseDetailScreen;
