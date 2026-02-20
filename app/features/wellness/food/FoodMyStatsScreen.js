import { useCallback } from 'react';
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

import { useAuth } from '../../../context/AuthContext';
import useFoodStats from '../../../hooks/useFoodStats';
import COLORS from '../../../theme/colors';
import UI_TOKENS from '../../../ui/tokens';

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

function FoodMyStatsScreen({ navigation }) {
  const { user } = useAuth();
  const {
    loading,
    error,
    stats,
    signals,
    hasAnyData,
    hasBehaviorSignals,
    hydrate,
  } = useFoodStats(user);

  useFocusEffect(
    useCallback(() => {
      hydrate();
    }, [hydrate]),
  );

  const openEdit = () => navigation?.navigate('FoodStatsEdit');

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading food stats...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroHeader}>
          <Text style={styles.heroTitle}>My Stats</Text>
          <Text style={styles.heroSubtitle}>Targets, adherence, and nutrition history.</Text>
        </View>

        {!hasAnyData ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Set up Food Stats</Text>
            <Text style={styles.emptySubtitle}>Start with a protein target and preferences.</Text>
            <TouchableOpacity style={styles.primaryButton} activeOpacity={0.9} onPress={openEdit}>
              <Text style={styles.primaryButtonText}>Set up Food Stats</Text>
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

        <StatsCard title="Targets" subtitle="Daily targets and diet preference." onEditPress={openEdit}>
          <MetricRow
            label="Protein target"
            value={stats.foodTargets.proteinG ? `${Math.round(stats.foodTargets.proteinG)} g/day` : 'Not set'}
          />
          <MetricRow
            label="Calories target"
            value={stats.foodTargets.caloriesKcal ? `${Math.round(stats.foodTargets.caloriesKcal)} kcal/day` : 'Not set'}
          />
          <MetricRow
            label="Carbs target"
            value={stats.foodTargets.carbsG ? `${Math.round(stats.foodTargets.carbsG)} g/day` : 'Not set'}
          />
          <MetricRow
            label="Fat target"
            value={stats.foodTargets.fatG ? `${Math.round(stats.foodTargets.fatG)} g/day` : 'Not set'}
          />
          <MetricRow
            label="Diet preference"
            value={stats.foodProfile.dietPreference || 'Not set'}
          />
        </StatsCard>

        <StatsCard title="Adherence" subtitle="Nutrition intake adherence over the last 7 days.">
          {signals.hasNutritionTracking && signals.nutritionAdherence ? (
            <>
              <MetricRow
                label="Avg calories (7d)"
                value={`${Math.round(signals.nutritionAdherence.avgCalories || 0)} kcal`}
              />
              <MetricRow
                label="Avg protein (7d)"
                value={`${Math.round(signals.nutritionAdherence.avgProtein || 0)} g`}
              />
              <MetricRow
                label="Days on target (7d)"
                value={`${signals.nutritionAdherence.daysOnTarget || 0}`}
              />
            </>
          ) : (
            <Text style={styles.placeholderText}>Start logging meals to see adherence.</Text>
          )}
        </StatsCard>

        {hasBehaviorSignals ? (
          <StatsCard title="Pantry & Behavior Signals" subtitle="Derived from existing app activity.">
            {signals.pantryCount !== null ? (
              <MetricRow label="Items in pantry" value={String(signals.pantryCount)} />
            ) : null}
            <MetricRow
              label="Recipes cooked this week"
              value={String(signals.recipesCookedThisWeek || 0)}
            />
          </StatsCard>
        ) : null}

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
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

export default FoodMyStatsScreen;

