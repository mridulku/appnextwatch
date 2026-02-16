import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import COLORS from '../../../theme/colors';

function formatDateTime(iso) {
  const date = new Date(iso);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDuration(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const mins = Math.round(safe / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem ? `${hrs}h ${rem}m` : `${hrs}h`;
}

function SessionSummaryScreen({ route }) {
  const record = route.params?.sessionRecord;

  if (!record) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Session not found</Text>
          <Text style={styles.emptyText}>This summary record is unavailable.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isWorkout = record.type === 'workout';
  const isCompleted = record.status === 'completed';
  const timeline = Array.isArray(record.summary?.timeline) ? record.summary.timeline : [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={[styles.typePill, isWorkout ? styles.typeWorkout : styles.typeCooking]}>
              <Ionicons
                name={isWorkout ? 'barbell-outline' : 'restaurant-outline'}
                size={13}
                color={isWorkout ? COLORS.accent2 : COLORS.accent}
              />
              <Text style={[styles.typePillText, isWorkout ? styles.typeWorkoutText : styles.typeCookingText]}>
                {isWorkout ? 'Workout' : 'Cooking'}
              </Text>
            </View>

            <View style={[styles.statusPill, isCompleted ? styles.statusCompleted : styles.statusAbandoned]}>
              <Text style={[styles.statusText, isCompleted ? styles.statusCompletedText : styles.statusAbandonedText]}>
                {isCompleted ? 'Completed' : 'Abandoned'}
              </Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>{record.title}</Text>
          <Text style={styles.heroMeta}>{formatDateTime(record.startedAt)}</Text>
          <Text style={styles.heroMeta}>Duration: {formatDuration(record.durationSeconds)}</Text>
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.sectionTitle}>Key stats</Text>

          {isWorkout ? (
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{record.summary?.exercisesCount ?? 0}</Text>
                <Text style={styles.statLabel}>Exercises</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{record.summary?.setsCount ?? 0}</Text>
                <Text style={styles.statLabel}>Sets</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{record.summary?.volumeKg ?? 0} kg</Text>
                <Text style={styles.statLabel}>Volume</Text>
              </View>
            </View>
          ) : (
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{record.summary?.stepsCompleted ?? 0}</Text>
                <Text style={styles.statLabel}>Steps done</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{record.summary?.totalSteps ?? 0}</Text>
                <Text style={styles.statLabel}>Total steps</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{record.summary?.activeTimeMinutes ?? 0} min</Text>
                <Text style={styles.statLabel}>Active time</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.timelineCard}>
          <Text style={styles.sectionTitle}>Timeline</Text>

          {timeline.length === 0 ? (
            <Text style={styles.timelineEmpty}>No timeline data available.</Text>
          ) : (
            timeline.map((item, index) => (
              <View key={`${item.title}_${index}`} style={styles.timelineRow}>
                <View style={styles.timelineDot} />
                <View style={styles.timelineTextWrap}>
                  <Text style={styles.timelineTitle}>{item.title}</Text>
                  <Text style={styles.timelineMeta}>{item.note ?? item.status ?? 'Logged'}</Text>
                </View>
              </View>
            ))
          )}
        </View>
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 10,
  },
  heroCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.card,
    padding: 12,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typePill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typeWorkout: {
    borderColor: 'rgba(90,209,232,0.45)',
    backgroundColor: 'rgba(90,209,232,0.14)',
  },
  typeCooking: {
    borderColor: 'rgba(245,201,106,0.45)',
    backgroundColor: 'rgba(245,201,106,0.14)',
  },
  typePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  typeWorkoutText: {
    color: COLORS.accent2,
  },
  typeCookingText: {
    color: COLORS.accent,
  },
  statusPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusCompleted: {
    borderColor: 'rgba(111,230,189,0.44)',
    backgroundColor: 'rgba(111,230,189,0.15)',
  },
  statusAbandoned: {
    borderColor: 'rgba(255,160,124,0.44)',
    backgroundColor: 'rgba(255,160,124,0.15)',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusCompletedText: {
    color: '#84E9C6',
  },
  statusAbandonedText: {
    color: '#FFBA9F',
  },
  heroTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '700',
    marginTop: 10,
  },
  heroMeta: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 4,
  },
  statsCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.card,
    padding: 12,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statItem: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  statValue: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  statLabel: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 3,
  },
  timelineCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.card,
    padding: 12,
  },
  timelineEmpty: {
    color: COLORS.muted,
    fontSize: 12,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    marginBottom: 10,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
    backgroundColor: COLORS.accent2,
  },
  timelineTextWrap: {
    flex: 1,
  },
  timelineTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  timelineMeta: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 2,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 12,
  },
});

export default SessionSummaryScreen;
