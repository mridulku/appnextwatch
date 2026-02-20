import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import QuantityStepper from '../../../ui/components/QuantityStepper';
import CategoryChipsRow from '../../../ui/components/CategoryChipsRow';
import useGymStats from '../../../hooks/useGymStats';
import COLORS from '../../../theme/colors';
import UI_TOKENS from '../../../ui/tokens';

const GOAL_TYPES = ['Strength', 'Hypertrophy', 'Fat loss', 'General'];
const GOAL_TYPE_TO_VALUE = {
  Strength: 'strength',
  Hypertrophy: 'hypertrophy',
  'Fat loss': 'fat_loss',
  General: 'general',
};
const GOAL_VALUE_TO_LABEL = {
  strength: 'Strength',
  hypertrophy: 'Hypertrophy',
  fat_loss: 'Fat loss',
  general: 'General',
};

const EXPERIENCE_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const EXPERIENCE_TO_VALUE = {
  Beginner: 'beginner',
  Intermediate: 'intermediate',
  Advanced: 'advanced',
};
const EXPERIENCE_VALUE_TO_LABEL = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

const TIMELINE_OPTIONS = ['3 months', '6 months', '12 months'];

function formatDate(iso) {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return 'Unknown';
  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function parseOptionalNumber(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  const parsed = Number(text);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function Card({ title, subtitle, children }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

function GymStatsEditScreen({ navigation }) {
  const {
    loading,
    error,
    stats,
    hydrate,
    saveGymProfile,
    saveGymTargets,
    addWeightEntry,
    deleteWeightEntry,
    clearGymStats,
  } = useGymStats();

  const [goalTypeLabel, setGoalTypeLabel] = useState('');
  const [experienceLabel, setExperienceLabel] = useState('');
  const [timelineText, setTimelineText] = useState('');
  const [frequency, setFrequency] = useState(3);
  const [heightCm, setHeightCm] = useState('');
  const [waistCm, setWaistCm] = useState('');
  const [bodyFatPct, setBodyFatPct] = useState('');
  const [weightInput, setWeightInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [inlineError, setInlineError] = useState('');

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    setGoalTypeLabel(GOAL_VALUE_TO_LABEL[stats.gymTargets.goalType] || '');
    setExperienceLabel(EXPERIENCE_VALUE_TO_LABEL[stats.gymTargets.experienceLevel] || '');
    setTimelineText(stats.gymTargets.timelineLabel || '');
    setFrequency(Math.round(stats.gymTargets.trainingFrequencyPerWeek || 3));
    setHeightCm(stats.gymProfile.heightCm ? String(Math.round(stats.gymProfile.heightCm)) : '');
    setWaistCm(stats.gymProfile.waistCm ? String(Number(stats.gymProfile.waistCm).toFixed(1)) : '');
    setBodyFatPct(stats.gymProfile.bodyFatPct ? String(Number(stats.gymProfile.bodyFatPct).toFixed(1)) : '');
  }, [
    stats.gymProfile.bodyFatPct,
    stats.gymProfile.heightCm,
    stats.gymProfile.waistCm,
    stats.gymTargets.experienceLevel,
    stats.gymTargets.goalType,
    stats.gymTargets.timelineLabel,
    stats.gymTargets.trainingFrequencyPerWeek,
  ]);

  const weights = stats.gymEntries.weightEntries || [];

  const hasChanges = useMemo(() => {
    const nextGoal = GOAL_TYPE_TO_VALUE[goalTypeLabel] || null;
    const nextExperience = EXPERIENCE_TO_VALUE[experienceLabel] || null;
    const nextHeight = parseOptionalNumber(heightCm);
    const nextWaist = parseOptionalNumber(waistCm);
    const nextBodyFat = parseOptionalNumber(bodyFatPct);
    const nextTimeline = timelineText.trim();
    const nextFrequency = Number.isFinite(frequency) && frequency > 0 ? frequency : null;

    return (
      nextGoal !== (stats.gymTargets.goalType || null)
      || nextExperience !== (stats.gymTargets.experienceLevel || null)
      || nextTimeline !== (stats.gymTargets.timelineLabel || '')
      || nextFrequency !== (stats.gymTargets.trainingFrequencyPerWeek || null)
      || nextHeight !== (stats.gymProfile.heightCm || null)
      || nextWaist !== (stats.gymProfile.waistCm || null)
      || nextBodyFat !== (stats.gymProfile.bodyFatPct || null)
    );
  }, [
    bodyFatPct,
    experienceLabel,
    frequency,
    goalTypeLabel,
    heightCm,
    stats.gymProfile.bodyFatPct,
    stats.gymProfile.heightCm,
    stats.gymProfile.waistCm,
    stats.gymTargets.experienceLevel,
    stats.gymTargets.goalType,
    stats.gymTargets.timelineLabel,
    stats.gymTargets.trainingFrequencyPerWeek,
    timelineText,
    waistCm,
  ]);

  const onAddWeight = async () => {
    const parsedWeight = parseOptionalNumber(weightInput);
    if (!parsedWeight || parsedWeight < 20 || parsedWeight > 300) {
      Alert.alert('Invalid weight', 'Enter a weight between 20 and 300 kg.');
      return;
    }

    setInlineError('');
    await addWeightEntry({
      valueKg: parsedWeight,
      dateISO: new Date().toISOString(),
    });
    setWeightInput('');
  };

  const onDeleteWeight = (entryId) => {
    Alert.alert('Delete entry?', 'This weight entry will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteWeightEntry(entryId).catch((nextError) => {
            setInlineError(nextError?.message || 'Could not delete entry.');
          });
        },
      },
    ]);
  };

  const onSave = async () => {
    const nextHeight = parseOptionalNumber(heightCm);
    const nextWaist = parseOptionalNumber(waistCm);
    const nextBodyFat = parseOptionalNumber(bodyFatPct);

    if (nextHeight !== null && (nextHeight < 100 || nextHeight > 250)) {
      Alert.alert('Invalid height', 'Height must be between 100 and 250 cm.');
      return;
    }
    if (nextWaist !== null && (nextWaist < 40 || nextWaist > 200)) {
      Alert.alert('Invalid waist', 'Waist must be between 40 and 200 cm.');
      return;
    }
    if (nextBodyFat !== null && (nextBodyFat < 2 || nextBodyFat > 70)) {
      Alert.alert('Invalid body fat', 'Body fat % must be between 2 and 70.');
      return;
    }

    try {
      setSaving(true);
      setInlineError('');
      await saveGymProfile({
        heightCm: nextHeight,
        waistCm: nextWaist,
        bodyFatPct: nextBodyFat,
      });
      await saveGymTargets({
        goalType: GOAL_TYPE_TO_VALUE[goalTypeLabel] || null,
        experienceLevel: EXPERIENCE_TO_VALUE[experienceLabel] || null,
        timelineLabel: timelineText.trim(),
        trainingFrequencyPerWeek: Number.isFinite(frequency) && frequency > 0 ? frequency : null,
      });
      navigation.goBack();
    } catch (nextError) {
      setInlineError(nextError?.message || 'Could not save gym stats.');
    } finally {
      setSaving(false);
    }
  };

  const onClearAll = () => {
    Alert.alert('Clear all Gym stats?', 'This will remove profile, targets, and all weight entries.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear all',
        style: 'destructive',
        onPress: async () => {
          try {
            await clearGymStats();
            navigation.goBack();
          } catch (nextError) {
            setInlineError(nextError?.message || 'Could not clear gym stats.');
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
          <Text style={styles.loadingText}>Loading edit form...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card title="Targets" subtitle="Set your training goal and plan cadence.">
          <Text style={styles.fieldLabel}>Goal type</Text>
          <CategoryChipsRow
            categories={GOAL_TYPES}
            selectedCategory={goalTypeLabel}
            onSelectCategory={setGoalTypeLabel}
          />

          <Text style={styles.fieldLabel}>Training frequency</Text>
          <QuantityStepper
            valueLabel={`${Math.max(1, frequency)}x/week`}
            onDecrement={() => setFrequency((prev) => Math.max(1, prev - 1))}
            onIncrement={() => setFrequency((prev) => Math.min(14, prev + 1))}
          />

          <Text style={styles.fieldLabel}>Timeline</Text>
          <CategoryChipsRow
            categories={TIMELINE_OPTIONS}
            selectedCategory={TIMELINE_OPTIONS.includes(timelineText) ? timelineText : ''}
            onSelectCategory={setTimelineText}
          />
          <TextInput
            value={timelineText}
            onChangeText={setTimelineText}
            style={styles.input}
            placeholder="Custom timeline (e.g., 9 months)"
            placeholderTextColor={COLORS.muted}
          />

          <Text style={styles.fieldLabel}>Experience level</Text>
          <CategoryChipsRow
            categories={EXPERIENCE_LEVELS}
            selectedCategory={experienceLabel}
            onSelectCategory={setExperienceLabel}
          />
        </Card>

        <Card title="Body metrics" subtitle="Baseline body profile used in dashboard.">
          <Text style={styles.fieldLabel}>Height (cm)</Text>
          <TextInput
            value={heightCm}
            onChangeText={setHeightCm}
            style={styles.input}
            keyboardType="numeric"
            placeholder="e.g. 178"
            placeholderTextColor={COLORS.muted}
          />

          <Text style={styles.fieldLabel}>Waist (cm) · optional</Text>
          <TextInput
            value={waistCm}
            onChangeText={setWaistCm}
            style={styles.input}
            keyboardType="numeric"
            placeholder="e.g. 84"
            placeholderTextColor={COLORS.muted}
          />

          <Text style={styles.fieldLabel}>Body fat % · optional</Text>
          <TextInput
            value={bodyFatPct}
            onChangeText={setBodyFatPct}
            style={styles.input}
            keyboardType="numeric"
            placeholder="e.g. 18"
            placeholderTextColor={COLORS.muted}
          />
        </Card>

        <Card title="Weight entries" subtitle="Add and manage your weight trend history.">
          <View style={styles.addWeightRow}>
            <TextInput
              value={weightInput}
              onChangeText={setWeightInput}
              style={[styles.input, styles.addWeightInput]}
              keyboardType="numeric"
              placeholder="Today's weight (kg)"
              placeholderTextColor={COLORS.muted}
            />
            <TouchableOpacity style={styles.inlineAddButton} activeOpacity={0.9} onPress={onAddWeight}>
              <Text style={styles.inlineAddButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          {weights.length === 0 ? (
            <Text style={styles.emptyText}>No weight entries yet.</Text>
          ) : (
            <View style={styles.entriesList}>
              {weights.map((entry) => (
                <View key={entry.id} style={styles.entryRow}>
                  <View>
                    <Text style={styles.entryDate}>{formatDate(entry.dateISO)}</Text>
                    <Text style={styles.entryValue}>{entry.valueKg.toFixed(1)} kg</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.entryDeleteButton}
                    activeOpacity={0.9}
                    onPress={() => onDeleteWeight(entry.id)}
                  >
                    <Ionicons name="trash-outline" size={14} color="#FFB4A8" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </Card>

        {error || inlineError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{inlineError || error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.saveButton, (!hasChanges || saving) && styles.buttonDisabled]}
          activeOpacity={0.9}
          onPress={onSave}
          disabled={!hasChanges || saving}
        >
          {saving ? (
            <ActivityIndicator color={COLORS.bg} />
          ) : (
            <Text style={styles.saveButtonText}>Save changes</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.clearButton} activeOpacity={0.9} onPress={onClearAll}>
          <Text style={styles.clearButtonText}>Clear all Gym stats</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    padding: UI_TOKENS.spacing.md,
    paddingBottom: UI_TOKENS.spacing.xl,
    gap: UI_TOKENS.spacing.sm,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: UI_TOKENS.spacing.sm,
  },
  loadingText: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.subtitle,
  },
  card: {
    borderRadius: UI_TOKENS.radius.lg,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.md,
    gap: UI_TOKENS.spacing.sm,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 3,
    fontWeight: '700',
  },
  cardSubtitle: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
  fieldLabel: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '600',
    marginTop: UI_TOKENS.spacing.xs,
  },
  input: {
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.3)',
    backgroundColor: 'rgba(162,167,179,0.08)',
    color: COLORS.text,
    paddingHorizontal: UI_TOKENS.spacing.sm,
    paddingVertical: 11,
    fontSize: UI_TOKENS.typography.subtitle,
  },
  addWeightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: UI_TOKENS.spacing.sm,
  },
  addWeightInput: {
    flex: 1,
  },
  inlineAddButton: {
    minHeight: 42,
    borderRadius: UI_TOKENS.radius.md,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: UI_TOKENS.spacing.md,
  },
  inlineAddButtonText: {
    color: COLORS.bg,
    fontSize: UI_TOKENS.typography.subtitle,
    fontWeight: '700',
  },
  entriesList: {
    gap: UI_TOKENS.spacing.xs,
  },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: 'rgba(162,167,179,0.08)',
    paddingHorizontal: UI_TOKENS.spacing.sm,
    paddingVertical: UI_TOKENS.spacing.xs,
  },
  entryDate: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
  entryValue: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle,
    fontWeight: '700',
    marginTop: 2,
  },
  entryDeleteButton: {
    width: UI_TOKENS.control.iconButton,
    height: UI_TOKENS.control.iconButton,
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(255,145,107,0.45)',
    backgroundColor: 'rgba(255,145,107,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.subtitle,
  },
  errorCard: {
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,124,123,0.4)',
    backgroundColor: 'rgba(255,124,123,0.12)',
    padding: UI_TOKENS.spacing.sm,
  },
  errorText: {
    color: '#FFB4A8',
    fontSize: UI_TOKENS.typography.meta,
  },
  saveButton: {
    borderRadius: UI_TOKENS.radius.md,
    backgroundColor: COLORS.accent,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: COLORS.bg,
    fontSize: UI_TOKENS.typography.subtitle,
    fontWeight: '700',
  },
  clearButton: {
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(255,124,123,0.45)',
    backgroundColor: 'rgba(255,124,123,0.12)',
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: {
    color: '#FFB4A8',
    fontSize: UI_TOKENS.typography.subtitle,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.55,
  },
});

export default GymStatsEditScreen;
