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

import COLORS from '../../../theme/colors';

function formatValue(value, unit = '') {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '--';
  return `${Number(value)}${unit ? ` ${unit}` : ''}`;
}

function formatUpdatedDate(value) {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Never';

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function BodyProfileScreen({
  body,
  onUpdateBody,
  title = 'Body',
  subtitle = 'Your body metrics and goals.',
}) {
  const [editVisible, setEditVisible] = useState(false);
  const [draft, setDraft] = useState({
    heightCm: '',
    weightKg: '',
    bodyFatPct: '',
    waistCm: '',
    targetWeightKg: '',
    targetBodyFatPct: '',
    timelineMonths: '',
  });

  const progressRatio = useMemo(() => {
    const start = Number(body.startWeightKg);
    const current = Number(body.weightKg);
    const target = Number(body.targetWeightKg);

    if (!Number.isFinite(start) || !Number.isFinite(current) || !Number.isFinite(target)) return 0;
    const totalSpan = Math.abs(start - target);
    if (totalSpan <= 0.01) return 1;

    return clamp(Math.abs(start - current) / totalSpan, 0, 1);
  }, [body.startWeightKg, body.targetWeightKg, body.weightKg]);

  const weeklyPaceText = useMemo(() => {
    const current = Number(body.weightKg);
    const target = Number(body.targetWeightKg);
    const timelineMonths = Number(body.timelineMonths);

    if (!Number.isFinite(current) || !Number.isFinite(target) || !Number.isFinite(timelineMonths)) {
      return 'Set a timeline to estimate your weekly pace.';
    }

    const weeks = Math.max(1, timelineMonths * 4.345);
    const delta = Math.abs(current - target);
    const pace = (delta / weeks).toFixed(1);

    if (target < current) {
      return `Estimated pace: ~${pace} kg/week reduction.`;
    }
    if (target > current) {
      return `Estimated pace: ~${pace} kg/week gain.`;
    }
    return 'You are at your target weight range.';
  }, [body.timelineMonths, body.targetWeightKg, body.weightKg]);

  const trendBars = useMemo(() => {
    const data = Array.isArray(body.trend) ? body.trend : [];
    if (!data.length) return [];

    const maxValue = Math.max(...data);
    const minValue = Math.min(...data);
    const span = Math.max(0.1, maxValue - minValue);

    return data.map((entry) => ({
      raw: entry,
      height: 18 + ((entry - minValue) / span) * 40,
    }));
  }, [body.trend]);

  const openEdit = () => {
    setDraft({
      heightCm: String(body.heightCm ?? ''),
      weightKg: String(body.weightKg ?? ''),
      bodyFatPct: String(body.bodyFatPct ?? ''),
      waistCm: String(body.waistCm ?? ''),
      targetWeightKg: String(body.targetWeightKg ?? ''),
      targetBodyFatPct: String(body.targetBodyFatPct ?? ''),
      timelineMonths: String(body.timelineMonths ?? ''),
    });
    setEditVisible(true);
  };

  const saveEdit = () => {
    const parsed = {
      heightCm: Number(draft.heightCm),
      weightKg: Number(draft.weightKg),
      bodyFatPct: Number(draft.bodyFatPct),
      waistCm: Number(draft.waistCm),
      targetWeightKg: Number(draft.targetWeightKg),
      targetBodyFatPct: Number(draft.targetBodyFatPct),
      timelineMonths: Number(draft.timelineMonths),
    };

    if (
      !Number.isFinite(parsed.heightCm) || parsed.heightCm <= 0 ||
      !Number.isFinite(parsed.weightKg) || parsed.weightKg <= 0 ||
      !Number.isFinite(parsed.targetWeightKg) || parsed.targetWeightKg <= 0 ||
      !Number.isFinite(parsed.timelineMonths) || parsed.timelineMonths <= 0
    ) {
      Alert.alert('Invalid values', 'Please enter valid positive numbers for key body metrics.');
      return;
    }

    onUpdateBody({
      ...parsed,
      lastUpdatedAt: new Date().toISOString(),
    });
    setEditVisible(false);
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerWrap}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Current</Text>
            <TouchableOpacity style={styles.editButton} activeOpacity={0.9} onPress={openEdit}>
              <Ionicons name="create-outline" size={14} color={COLORS.accent2} />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.metricsGrid}>
            <View style={styles.metricCell}>
              <Text style={styles.metricLabel}>Height</Text>
              <Text style={styles.metricValue}>{formatValue(body.heightCm, 'cm')}</Text>
            </View>
            <View style={styles.metricCell}>
              <Text style={styles.metricLabel}>Weight</Text>
              <Text style={styles.metricValue}>{formatValue(body.weightKg, 'kg')}</Text>
            </View>
            <View style={styles.metricCell}>
              <Text style={styles.metricLabel}>Body Fat</Text>
              <Text style={styles.metricValue}>{formatValue(body.bodyFatPct, '%')}</Text>
            </View>
            <View style={styles.metricCell}>
              <Text style={styles.metricLabel}>Waist</Text>
              <Text style={styles.metricValue}>{formatValue(body.waistCm, 'cm')}</Text>
            </View>
          </View>

          <Text style={styles.updatedText}>Last updated: {formatUpdatedDate(body.lastUpdatedAt)}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Targets</Text>

          <View style={styles.targetRow}>
            <Text style={styles.targetLabel}>Target weight</Text>
            <Text style={styles.targetValue}>{formatValue(body.targetWeightKg, 'kg')}</Text>
          </View>
          <View style={styles.targetRow}>
            <Text style={styles.targetLabel}>Target body fat</Text>
            <Text style={styles.targetValue}>{formatValue(body.targetBodyFatPct, '%')}</Text>
          </View>
          <View style={styles.targetRow}>
            <Text style={styles.targetLabel}>Timeline</Text>
            <Text style={styles.targetValue}>{formatValue(body.timelineMonths, 'months')}</Text>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.max(6, progressRatio * 100)}%` }]} />
          </View>
          <Text style={styles.progressText}>{Math.round(progressRatio * 100)}% toward target</Text>
          <Text style={styles.paceText}>{weeklyPaceText}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Progress & Trends</Text>

          <View style={styles.trendRow}>
            <View style={styles.trendPill}>
              <Text style={styles.trendPillLabel}>7D</Text>
              <Text style={styles.trendPillValue}>{formatValue(body.weight7dDeltaKg, 'kg')}</Text>
            </View>
            <View style={styles.trendPill}>
              <Text style={styles.trendPillLabel}>30D</Text>
              <Text style={styles.trendPillValue}>{formatValue(body.weight30dDeltaKg, 'kg')}</Text>
            </View>
            <View style={styles.trendPill}>
              <Text style={styles.trendPillLabel}>Workouts</Text>
              <Text style={styles.trendPillValue}>{formatValue(body.workoutsCompletedThisWeek)}</Text>
            </View>
          </View>

          <View style={styles.sparklineWrap}>
            {trendBars.map((entry, index) => (
              <View key={`trend_${index}`} style={styles.sparkBarContainer}>
                <View style={[styles.sparkBar, { height: entry.height }]} />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <Modal visible={editVisible} transparent animationType="fade" onRequestClose={() => setEditVisible(false)}>
        <View style={styles.modalRoot}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setEditVisible(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Body Metrics</Text>

            <TextInput
              style={styles.input}
              value={draft.heightCm}
              onChangeText={(value) => setDraft((prev) => ({ ...prev, heightCm: value }))}
              keyboardType="decimal-pad"
              placeholder="Height (cm)"
              placeholderTextColor={COLORS.muted}
            />
            <TextInput
              style={styles.input}
              value={draft.weightKg}
              onChangeText={(value) => setDraft((prev) => ({ ...prev, weightKg: value }))}
              keyboardType="decimal-pad"
              placeholder="Weight (kg)"
              placeholderTextColor={COLORS.muted}
            />
            <TextInput
              style={styles.input}
              value={draft.bodyFatPct}
              onChangeText={(value) => setDraft((prev) => ({ ...prev, bodyFatPct: value }))}
              keyboardType="decimal-pad"
              placeholder="Body fat (%)"
              placeholderTextColor={COLORS.muted}
            />
            <TextInput
              style={styles.input}
              value={draft.waistCm}
              onChangeText={(value) => setDraft((prev) => ({ ...prev, waistCm: value }))}
              keyboardType="decimal-pad"
              placeholder="Waist (cm)"
              placeholderTextColor={COLORS.muted}
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
              value={draft.targetBodyFatPct}
              onChangeText={(value) => setDraft((prev) => ({ ...prev, targetBodyFatPct: value }))}
              keyboardType="decimal-pad"
              placeholder="Target body fat (%)"
              placeholderTextColor={COLORS.muted}
            />
            <TextInput
              style={styles.input}
              value={draft.timelineMonths}
              onChangeText={(value) => setDraft((prev) => ({ ...prev, timelineMonths: value }))}
              keyboardType="number-pad"
              placeholder="Timeline (months)"
              placeholderTextColor={COLORS.muted}
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
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricCell: {
    width: '48.8%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  metricLabel: {
    color: COLORS.muted,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  metricValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 3,
  },
  updatedText: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 8,
  },
  targetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 7,
  },
  targetLabel: {
    color: COLORS.muted,
    fontSize: 12,
  },
  targetValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  progressTrack: {
    marginTop: 4,
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
  paceText: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 3,
  },
  trendRow: {
    flexDirection: 'row',
    gap: 8,
  },
  trendPill: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  trendPillLabel: {
    color: COLORS.muted,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  trendPillValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3,
  },
  sparklineWrap: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    minHeight: 82,
  },
  sparkBarContainer: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  sparkBar: {
    width: 12,
    borderRadius: 8,
    backgroundColor: COLORS.accent2,
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

export default BodyProfileScreen;
