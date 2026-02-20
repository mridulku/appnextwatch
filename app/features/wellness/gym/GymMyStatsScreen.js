import { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import useGymStats from '../../../hooks/useGymStats';
import COLORS from '../../../theme/colors';
import UI_TOKENS from '../../../ui/tokens';

const GOAL_LABELS = {
  strength: 'Strength',
  hypertrophy: 'Hypertrophy',
  fat_loss: 'Fat loss',
  general: 'General',
};

const EXPERIENCE_LABELS = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

function formatDateShort(iso) {
  if (!iso) return '—';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(iso) {
  if (!iso) return '—';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function StatsCard({ title, subtitle, onEditPress, editLabel = 'Edit', children }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderTextWrap}>
          <Text style={styles.cardTitle}>{title}</Text>
          {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
        </View>
        {onEditPress ? (
          <TouchableOpacity style={styles.editButton} activeOpacity={0.9} onPress={onEditPress}>
            <Ionicons name="create-outline" size={14} color={COLORS.text} />
            <Text style={styles.editButtonText}>{editLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function MetricRow({ label, value }) {
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function TrendBars({ entries }) {
  const values = entries.map((entry) => Number(entry.valueKg) || 0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 0.1);

  return (
    <>
      <View style={styles.trendBarsRow}>
        {entries.map((entry) => {
          const normalized = (entry.valueKg - min) / range;
          const barHeight = 10 + normalized * 44;
          return (
            <View key={entry.id} style={styles.trendBarWrap}>
              <View style={[styles.trendBarFill, { height: barHeight }]} />
            </View>
          );
        })}
      </View>
      <View style={styles.trendLabelsRow}>
        <Text style={styles.trendLabel}>
          {formatDateShort(entries[0]?.dateISO)} · {entries[0]?.valueKg?.toFixed(1)} kg
        </Text>
        <Text style={styles.trendLabel}>
          {formatDateShort(entries[entries.length - 1]?.dateISO)} · {entries[entries.length - 1]?.valueKg?.toFixed(1)} kg
        </Text>
      </View>
    </>
  );
}

function GymMyStatsScreen({ navigation, embedded = false, showHeader = true, topContent = null }) {
  const {
    loading,
    error,
    stats,
    adherence,
    hasAnyData,
    latestWeightEntry,
    weightTrend30Days,
    hydrate,
  } = useGymStats();

  useFocusEffect(
    useCallback(() => {
      hydrate();
    }, [hydrate]),
  );

  const openEdit = () => navigation?.navigate('GymStatsEdit');

  const trendEntries = useMemo(() => {
    if (!Array.isArray(weightTrend30Days)) return [];
    return weightTrend30Days.slice(-8);
  }, [weightTrend30Days]);

  const RootContainer = embedded ? View : SafeAreaView;

  if (loading) {
    return (
      <RootContainer style={styles.safeArea}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading gym stats...</Text>
        </View>
      </RootContainer>
    );
  }

  return (
    <RootContainer style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {topContent}
        {showHeader ? (
          <View style={styles.heroHeader}>
            <Text style={styles.heroTitle}>My Stats</Text>
            <Text style={styles.heroSubtitle}>Your body metrics and training targets.</Text>
          </View>
        ) : null}

        {!hasAnyData ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Start setup</Text>
            <Text style={styles.emptySubtitle}>Add your baseline body metrics and training targets.</Text>
            <TouchableOpacity style={styles.primaryButton} activeOpacity={0.9} onPress={openEdit}>
              <Text style={styles.primaryButtonText}>Set up Gym Stats</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.topEditRow}>
            <TouchableOpacity style={styles.topEditButton} activeOpacity={0.9} onPress={openEdit}>
              <Ionicons name="create-outline" size={15} color={COLORS.text} />
              <Text style={styles.topEditButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
        )}

        <StatsCard title="Targets" subtitle="Goal direction and schedule." onEditPress={openEdit}>
          <MetricRow label="Goal type" value={GOAL_LABELS[stats.gymTargets.goalType] || 'Not set'} />
          <MetricRow
            label="Training frequency"
            value={stats.gymTargets.trainingFrequencyPerWeek ? `${stats.gymTargets.trainingFrequencyPerWeek}x/week` : 'Not set'}
          />
          <MetricRow label="Timeline" value={stats.gymTargets.timelineLabel || 'Not set'} />
          <MetricRow label="Experience" value={EXPERIENCE_LABELS[stats.gymTargets.experienceLevel] || 'Not set'} />
        </StatsCard>

        <StatsCard title="Current Body Metrics" subtitle="Most recent profile snapshot." onEditPress={openEdit}>
          <MetricRow
            label="Height"
            value={stats.gymProfile.heightCm ? `${Math.round(stats.gymProfile.heightCm)} cm` : 'Not set'}
          />
          <MetricRow
            label="Latest weight"
            value={latestWeightEntry ? `${latestWeightEntry.valueKg.toFixed(1)} kg` : 'No entries'}
          />
          <MetricRow
            label="Waist"
            value={stats.gymProfile.waistCm ? `${Number(stats.gymProfile.waistCm).toFixed(1)} cm` : 'Not set'}
          />
          <MetricRow
            label="Body fat"
            value={stats.gymProfile.bodyFatPct ? `${Number(stats.gymProfile.bodyFatPct).toFixed(1)}%` : 'Not set'}
          />
        </StatsCard>

        <StatsCard title="Trends" subtitle="Last 30 days weight trend." onEditPress={openEdit}>
          {trendEntries.length >= 3 ? (
            <TrendBars entries={trendEntries} />
          ) : (
            <View style={styles.placeholderRow}>
              <Text style={styles.placeholderText}>Add weight entries to see trend.</Text>
              <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.9} onPress={openEdit}>
                <Text style={styles.secondaryButtonText}>Add entries</Text>
              </TouchableOpacity>
            </View>
          )}
        </StatsCard>

        {adherence.hasData ? (
          <StatsCard title="Adherence" subtitle="Training consistency based on your workout logs.">
            <MetricRow label="Workouts this week" value={String(adherence.workoutsThisWeek)} />
            <MetricRow label="Last workout" value={formatDateTime(adherence.lastWorkoutAt)} />
            <MetricRow label="Last 30 days" value={`${adherence.workoutsLast30Days} sessions`} />
          </StatsCard>
        ) : null}

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </ScrollView>
    </RootContainer>
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
  heroHeader: {
    gap: UI_TOKENS.spacing.xs,
  },
  heroTitle: {
    color: COLORS.text,
    fontSize: 34,
    fontWeight: '700',
  },
  heroSubtitle: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.subtitle + 1,
  },
  emptyCard: {
    borderRadius: UI_TOKENS.radius.lg,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.md,
    gap: UI_TOKENS.spacing.sm,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 3,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.subtitle,
  },
  topEditRow: {
    alignItems: 'flex-end',
  },
  topEditButton: {
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.32)',
    backgroundColor: COLORS.card,
    paddingHorizontal: UI_TOKENS.spacing.sm,
    paddingVertical: UI_TOKENS.spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  topEditButtonText: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
  card: {
    borderRadius: UI_TOKENS.radius.lg,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.md,
    gap: UI_TOKENS.spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: UI_TOKENS.spacing.sm,
  },
  cardHeaderTextWrap: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 2,
    fontWeight: '700',
  },
  cardSubtitle: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
  editButton: {
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.3)',
    backgroundColor: 'rgba(162,167,179,0.08)',
    paddingHorizontal: UI_TOKENS.spacing.xs,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editButtonText: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: UI_TOKENS.border.hairline,
    borderTopColor: 'rgba(162,167,179,0.14)',
    paddingTop: UI_TOKENS.spacing.xs,
  },
  metricLabel: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta + 1,
  },
  metricValue: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.meta + 1,
    fontWeight: '700',
  },
  trendBarsRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: UI_TOKENS.spacing.xs,
  },
  trendBarWrap: {
    flex: 1,
    borderRadius: UI_TOKENS.radius.sm,
    backgroundColor: 'rgba(162,167,179,0.12)',
    minHeight: 10,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  trendBarFill: {
    width: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: UI_TOKENS.radius.sm,
  },
  trendLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: UI_TOKENS.spacing.xs,
  },
  trendLabel: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
  placeholderRow: {
    gap: UI_TOKENS.spacing.sm,
  },
  placeholderText: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.subtitle,
  },
  primaryButton: {
    borderRadius: UI_TOKENS.radius.md,
    backgroundColor: COLORS.accent,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: COLORS.bg,
    fontSize: UI_TOKENS.typography.subtitle,
    fontWeight: '700',
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(245,201,106,0.55)',
    backgroundColor: 'rgba(245,201,106,0.16)',
    paddingHorizontal: UI_TOKENS.spacing.sm,
    paddingVertical: UI_TOKENS.spacing.xs,
  },
  secondaryButtonText: {
    color: COLORS.accent,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
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
});

export default GymMyStatsScreen;
