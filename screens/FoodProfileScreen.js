import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import COLORS from '../theme/colors';

const GOAL_OPTIONS = ['Fat loss', 'Maintenance', 'Lean bulk'];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatDateLabel(isoDate) {
  if (!isoDate) return '--';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function FoodProfileScreen({
  food,
  onUpdateFood,
  title = 'Food',
  subtitle = 'Targets and nutrition progress.',
}) {
  const [editVisible, setEditVisible] = useState(false);
  const [draft, setDraft] = useState({
    caloriesTarget: '',
    proteinTarget: '',
    carbsTarget: '',
    fatTarget: '',
    goalType: 'Maintenance',
    sixMonthGoal: '',
    targetWeightKg: '',
    planStartDate: '',
    planEndDate: '',
  });

  const weeklyStats = useMemo(() => {
    const history = Array.isArray(food.weeklyHistory) ? food.weeklyHistory : [];
    if (!history.length) {
      return { avgCalories: 0, avgProtein: 0, daysOnTarget: 0 };
    }

    const calorieTarget = Number(food.caloriesTarget) || 0;
    const proteinTarget = Number(food.proteinTarget) || 0;

    const avgCalories = Math.round(
      history.reduce((sum, day) => sum + (Number(day.calories) || 0), 0) / history.length,
    );
    const avgProtein = Math.round(
      history.reduce((sum, day) => sum + (Number(day.protein) || 0), 0) / history.length,
    );

    const daysOnTarget = history.filter((day) => {
      const calories = Number(day.calories) || 0;
      const protein = Number(day.protein) || 0;

      const caloriesWithinRange = calorieTarget > 0
        ? calories >= calorieTarget * 0.9 && calories <= calorieTarget * 1.1
        : true;
      const proteinWithinRange = proteinTarget > 0
        ? protein >= proteinTarget * 0.9
        : true;

      return caloriesWithinRange && proteinWithinRange;
    }).length;

    return { avgCalories, avgProtein, daysOnTarget };
  }, [food.caloriesTarget, food.proteinTarget, food.weeklyHistory]);

  const planProgress = useMemo(() => {
    const start = new Date(food.planStartDate);
    const end = new Date(food.planEndDate);
    const now = new Date();

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return 0;

    return clamp((now - start) / (end - start), 0, 1);
  }, [food.planEndDate, food.planStartDate]);

  const calorieAdherence = useMemo(() => {
    const target = Number(food.caloriesTarget) || 1;
    return clamp((weeklyStats.avgCalories / target) * 100, 0, 140);
  }, [food.caloriesTarget, weeklyStats.avgCalories]);

  const proteinAdherence = useMemo(() => {
    const target = Number(food.proteinTarget) || 1;
    return clamp((weeklyStats.avgProtein / target) * 100, 0, 140);
  }, [food.proteinTarget, weeklyStats.avgProtein]);

  const openEdit = () => {
    setDraft({
      caloriesTarget: String(food.caloriesTarget ?? ''),
      proteinTarget: String(food.proteinTarget ?? ''),
      carbsTarget: String(food.carbsTarget ?? ''),
      fatTarget: String(food.fatTarget ?? ''),
      goalType: food.goalType ?? 'Maintenance',
      sixMonthGoal: food.sixMonthGoal ?? '',
      targetWeightKg: String(food.targetWeightKg ?? ''),
      planStartDate: String(food.planStartDate ?? ''),
      planEndDate: String(food.planEndDate ?? ''),
    });
    setEditVisible(true);
  };

  const saveEdit = () => {
    const parsed = {
      caloriesTarget: Number(draft.caloriesTarget),
      proteinTarget: Number(draft.proteinTarget),
      carbsTarget: Number(draft.carbsTarget),
      fatTarget: Number(draft.fatTarget),
      targetWeightKg: Number(draft.targetWeightKg),
    };

    if (
      !Number.isFinite(parsed.caloriesTarget) || parsed.caloriesTarget <= 0 ||
      !Number.isFinite(parsed.proteinTarget) || parsed.proteinTarget <= 0 ||
      !Number.isFinite(parsed.carbsTarget) || parsed.carbsTarget <= 0 ||
      !Number.isFinite(parsed.fatTarget) || parsed.fatTarget <= 0
    ) {
      Alert.alert('Invalid values', 'Please enter valid nutrition targets.');
      return;
    }

    const startDate = new Date(draft.planStartDate);
    const endDate = new Date(draft.planEndDate);
    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime()) ||
      endDate <= startDate
    ) {
      Alert.alert('Invalid timeline', 'Use valid dates and keep end date after start date.');
      return;
    }

    const safeTargetWeight = Number.isFinite(parsed.targetWeightKg) && parsed.targetWeightKg > 0
      ? parsed.targetWeightKg
      : food.targetWeightKg;

    onUpdateFood({
      caloriesTarget: parsed.caloriesTarget,
      proteinTarget: parsed.proteinTarget,
      carbsTarget: parsed.carbsTarget,
      fatTarget: parsed.fatTarget,
      goalType: draft.goalType,
      sixMonthGoal: draft.sixMonthGoal.trim() || food.sixMonthGoal,
      targetWeightKg: safeTargetWeight,
      planStartDate: draft.planStartDate,
      planEndDate: draft.planEndDate,
    });
    setEditVisible(false);
  };

  const history = Array.isArray(food.weeklyHistory) ? food.weeklyHistory : [];

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerWrap}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Daily Targets</Text>
            <TouchableOpacity style={styles.editButton} activeOpacity={0.9} onPress={openEdit}>
              <Ionicons name="create-outline" size={14} color={COLORS.accent2} />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.targetGrid}>
            <View style={styles.targetCell}>
              <Text style={styles.targetLabel}>Calories</Text>
              <Text style={styles.targetValue}>{Math.round(Number(food.caloriesTarget) || 0)} kcal</Text>
            </View>
            <View style={styles.targetCell}>
              <Text style={styles.targetLabel}>Protein</Text>
              <Text style={styles.targetValue}>{Math.round(Number(food.proteinTarget) || 0)} g</Text>
            </View>
            <View style={styles.targetCell}>
              <Text style={styles.targetLabel}>Carbs</Text>
              <Text style={styles.targetValue}>{Math.round(Number(food.carbsTarget) || 0)} g</Text>
            </View>
            <View style={styles.targetCell}>
              <Text style={styles.targetLabel}>Fat</Text>
              <Text style={styles.targetValue}>{Math.round(Number(food.fatTarget) || 0)} g</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Goal Timeline</Text>
          <View style={styles.goalPill}>
            <Text style={styles.goalPillText}>{food.goalType}</Text>
          </View>
          <Text style={styles.goalSummary}>{food.sixMonthGoal}</Text>
          <Text style={styles.goalDates}>{formatDateLabel(food.planStartDate)} - {formatDateLabel(food.planEndDate)}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.max(6, planProgress * 100)}%` }]} />
          </View>
          <Text style={styles.progressText}>{Math.round(planProgress * 100)}% of plan completed</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>This Week</Text>

          <View style={styles.weekMetricsRow}>
            <View style={styles.weekMetricPill}>
              <Text style={styles.weekMetricLabel}>Avg Calories</Text>
              <Text style={styles.weekMetricValue}>{weeklyStats.avgCalories} kcal</Text>
            </View>
            <View style={styles.weekMetricPill}>
              <Text style={styles.weekMetricLabel}>Avg Protein</Text>
              <Text style={styles.weekMetricValue}>{weeklyStats.avgProtein} g</Text>
            </View>
            <View style={styles.weekMetricPill}>
              <Text style={styles.weekMetricLabel}>On Target</Text>
              <Text style={styles.weekMetricValue}>{weeklyStats.daysOnTarget}/7 days</Text>
            </View>
          </View>

          <Text style={styles.adherenceLabel}>Calories adherence</Text>
          <View style={styles.adherenceTrack}>
            <View style={[styles.adherenceFill, { width: `${Math.max(4, calorieAdherence)}%` }]} />
          </View>

          <Text style={styles.adherenceLabel}>Protein adherence</Text>
          <View style={styles.adherenceTrack}>
            <View style={[styles.adherenceFillProtein, { width: `${Math.max(4, proteinAdherence)}%` }]} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>History (7 days)</Text>
          {history.map((entry) => {
            const calorieWidth = clamp(
              ((Number(entry.calories) || 0) / (Number(food.caloriesTarget) || 1)) * 100,
              0,
              140,
            );
            const proteinWidth = clamp(
              ((Number(entry.protein) || 0) / (Number(food.proteinTarget) || 1)) * 100,
              0,
              140,
            );

            return (
              <View key={`history_${entry.day}`} style={styles.historyRow}>
                <Text style={styles.historyDay}>{entry.day}</Text>
                <View style={styles.historyBarsWrap}>
                  <View style={styles.historyTrack}>
                    <View style={[styles.historyFillCalories, { width: `${Math.max(4, calorieWidth)}%` }]} />
                  </View>
                  <View style={styles.historyTrack}>
                    <View style={[styles.historyFillProtein, { width: `${Math.max(4, proteinWidth)}%` }]} />
                  </View>
                </View>
                <View style={styles.historyValues}>
                  <Text style={styles.historyValueText}>{entry.calories} kcal</Text>
                  <Text style={styles.historyValueText}>{entry.protein} g</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <Modal visible={editVisible} transparent animationType="fade" onRequestClose={() => setEditVisible(false)}>
        <View style={styles.modalRoot}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setEditVisible(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Food Targets</Text>

            <TextInput
              style={styles.input}
              value={draft.caloriesTarget}
              onChangeText={(value) => setDraft((prev) => ({ ...prev, caloriesTarget: value }))}
              keyboardType="number-pad"
              placeholder="Calories target (kcal)"
              placeholderTextColor={COLORS.muted}
            />
            <TextInput
              style={styles.input}
              value={draft.proteinTarget}
              onChangeText={(value) => setDraft((prev) => ({ ...prev, proteinTarget: value }))}
              keyboardType="number-pad"
              placeholder="Protein target (g)"
              placeholderTextColor={COLORS.muted}
            />
            <TextInput
              style={styles.input}
              value={draft.carbsTarget}
              onChangeText={(value) => setDraft((prev) => ({ ...prev, carbsTarget: value }))}
              keyboardType="number-pad"
              placeholder="Carbs target (g)"
              placeholderTextColor={COLORS.muted}
            />
            <TextInput
              style={styles.input}
              value={draft.fatTarget}
              onChangeText={(value) => setDraft((prev) => ({ ...prev, fatTarget: value }))}
              keyboardType="number-pad"
              placeholder="Fat target (g)"
              placeholderTextColor={COLORS.muted}
            />

            <View style={styles.goalOptionWrap}>
              {GOAL_OPTIONS.map((option) => {
                const active = draft.goalType === option;
                return (
                  <TouchableOpacity
                    key={option}
                    style={[styles.goalOptionChip, active && styles.goalOptionChipActive]}
                    activeOpacity={0.9}
                    onPress={() => setDraft((prev) => ({ ...prev, goalType: option }))}
                  >
                    <Text style={[styles.goalOptionText, active && styles.goalOptionTextActive]}>{option}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={draft.sixMonthGoal}
              onChangeText={(value) => setDraft((prev) => ({ ...prev, sixMonthGoal: value }))}
              placeholder="6-month goal summary"
              placeholderTextColor={COLORS.muted}
              multiline
            />
            <TextInput
              style={styles.input}
              value={draft.targetWeightKg}
              onChangeText={(value) => setDraft((prev) => ({ ...prev, targetWeightKg: value }))}
              keyboardType="decimal-pad"
              placeholder="Target weight (kg)"
              placeholderTextColor={COLORS.muted}
            />
            <TextInput
              style={styles.input}
              value={draft.planStartDate}
              onChangeText={(value) => setDraft((prev) => ({ ...prev, planStartDate: value }))}
              placeholder="Plan start date (YYYY-MM-DD)"
              placeholderTextColor={COLORS.muted}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              value={draft.planEndDate}
              onChangeText={(value) => setDraft((prev) => ({ ...prev, planEndDate: value }))}
              placeholder="Plan end date (YYYY-MM-DD)"
              placeholderTextColor={COLORS.muted}
              autoCapitalize="none"
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity style={styles.modalSecondaryButton} activeOpacity={0.9} onPress={() => setEditVisible(false)}>
                <Text style={styles.modalSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalPrimaryButton} activeOpacity={0.9} onPress={saveEdit}>
                <Text style={styles.modalPrimaryText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 26,
  },
  headerWrap: {
    marginBottom: 10,
  },
  title: {
    color: COLORS.text,
    fontSize: 29,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: 3,
    color: COLORS.muted,
    fontSize: 12,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  editButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(90,209,232,0.38)',
    backgroundColor: 'rgba(90,209,232,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editButtonText: {
    color: COLORS.accent2,
    fontSize: 11,
    fontWeight: '700',
  },
  targetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  targetCell: {
    width: '48.8%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  targetLabel: {
    color: COLORS.muted,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  targetValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 3,
  },
  goalPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(245,201,106,0.4)',
    backgroundColor: 'rgba(245,201,106,0.16)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 7,
  },
  goalPillText: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  goalSummary: {
    color: COLORS.text,
    opacity: 0.92,
    fontSize: 12,
    marginTop: 8,
    lineHeight: 18,
  },
  goalDates: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 6,
  },
  progressTrack: {
    marginTop: 8,
    height: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(162,167,179,0.2)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
  },
  progressText: {
    color: COLORS.text,
    fontSize: 11,
    marginTop: 6,
    fontWeight: '600',
  },
  weekMetricsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  weekMetricPill: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  weekMetricLabel: {
    color: COLORS.muted,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  weekMetricValue: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  adherenceLabel: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 8,
    marginBottom: 4,
  },
  adherenceTrack: {
    height: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(162,167,179,0.2)',
    overflow: 'hidden',
  },
  adherenceFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
  },
  adherenceFillProtein: {
    height: '100%',
    backgroundColor: COLORS.accent2,
  },
  historyRow: {
    marginTop: 8,
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopColor: 'rgba(162,167,179,0.14)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyDay: {
    width: 30,
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  historyBarsWrap: {
    flex: 1,
    gap: 4,
  },
  historyTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(162,167,179,0.2)',
    overflow: 'hidden',
  },
  historyFillCalories: {
    height: '100%',
    backgroundColor: COLORS.accent,
  },
  historyFillProtein: {
    height: '100%',
    backgroundColor: COLORS.accent2,
  },
  historyValues: {
    width: 78,
  },
  historyValueText: {
    color: COLORS.muted,
    fontSize: 10,
    textAlign: 'right',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8,9,12,0.58)',
  },
  modalCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.25)',
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.cardSoft,
    color: COLORS.text,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginBottom: 8,
    fontSize: 13,
  },
  inputMultiline: {
    minHeight: 62,
    textAlignVertical: 'top',
  },
  goalOptionWrap: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  goalOptionChip: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.3)',
    backgroundColor: COLORS.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 32,
  },
  goalOptionChipActive: {
    borderColor: 'rgba(245,201,106,0.45)',
    backgroundColor: 'rgba(245,201,106,0.15)',
  },
  goalOptionText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  goalOptionTextActive: {
    color: COLORS.accent,
  },
  modalActionsRow: {
    marginTop: 2,
    flexDirection: 'row',
    gap: 8,
  },
  modalSecondaryButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.3)',
    backgroundColor: COLORS.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  modalSecondaryText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  modalPrimaryButton: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  modalPrimaryText: {
    color: COLORS.bg,
    fontSize: 12,
    fontWeight: '700',
  },
});

export default FoodProfileScreen;
