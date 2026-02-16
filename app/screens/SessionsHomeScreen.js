import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { TODAY_COOKING_MEAL_OPTIONS, WORKOUT_SESSION_TEMPLATES } from '../data/sessionSeeds';
import { loadSessionHistory } from '../core/sessionHistoryStorage';
import COLORS from '../theme/colors';

const TYPE_META = {
  workout: {
    icon: 'barbell-outline',
    tint: COLORS.accent2,
    tintBg: 'rgba(90,209,232,0.14)',
  },
  cooking: {
    icon: 'restaurant-outline',
    tint: COLORS.accent,
    tintBg: 'rgba(245,201,106,0.14)',
  },
};

function formatDuration(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const mins = Math.round(safe / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem ? `${hrs}h ${rem}m` : `${hrs}h`;
}

function formatTime(iso) {
  const date = new Date(iso);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDateLabel(dateString) {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (getDateKey(date) === getDateKey(today)) return 'Today';
  if (getDateKey(date) === getDateKey(yesterday)) return 'Yesterday';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getHistorySections(items) {
  const grouped = items.reduce((acc, item) => {
    const key = getDateKey(new Date(item.startedAt));
    if (!acc[key]) {
      acc[key] = {
        title: getDateLabel(item.startedAt),
        items: [],
      };
    }
    acc[key].items.push(item);
    return acc;
  }, {});

  return Object.entries(grouped)
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([key, value]) => ({
      key,
      title: value.title,
      data: value.items,
    }));
}

function SessionsHomeScreen({ navigation, route }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const autoNavHandledRef = useRef(null);

  const hydrateHistory = useCallback(async () => {
    setLoading(true);
    const records = await loadSessionHistory();
    setHistory(records);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      hydrateHistory();
    }, [hydrateHistory]),
  );

  const initialHandledKey = route.params?.startFlow;
  useFocusEffect(
    useCallback(() => {
      if (!initialHandledKey) return undefined;
      if (autoNavHandledRef.current === initialHandledKey) return undefined;
      autoNavHandledRef.current = initialHandledKey;

      const type = route.params?.startFlow;
      const timer = setTimeout(() => {
        if (type === 'cooking') {
          navigation.navigate('CookingSessionSetup');
        } else if (type === 'workout') {
          navigation.navigate('WorkoutSessionSetup');
        }
        navigation.setParams({ startFlow: undefined });
      }, 120);

      return () => clearTimeout(timer);
    }, [initialHandledKey, navigation, route.params?.startFlow]),
  );

  const historySections = useMemo(() => getHistorySections(history), [history]);

  const latestWorkout = useMemo(
    () => history.find((entry) => entry.type === 'workout'),
    [history],
  );
  const latestCooking = useMemo(
    () => history.find((entry) => entry.type === 'cooking'),
    [history],
  );

  const workoutTemplate = WORKOUT_SESSION_TEMPLATES[0];
  const dinnerSuggestion = TODAY_COOKING_MEAL_OPTIONS.find((item) => item.id === 'dinner') ?? TODAY_COOKING_MEAL_OPTIONS[0];

  const renderHistoryCard = ({ item }) => {
    const meta = TYPE_META[item.type] ?? TYPE_META.workout;
    const isCompleted = item.status === 'completed';

    const summaryLine = item.type === 'workout'
      ? `${item.summary?.exercisesCount ?? 0} exercises • ${item.summary?.setsCount ?? 0} sets`
      : `${item.summary?.stepsCompleted ?? 0}/${item.summary?.totalSteps ?? 0} steps`;

    return (
      <TouchableOpacity
        style={styles.historyCard}
        activeOpacity={0.92}
        onPress={() => navigation.navigate('SessionSummary', { sessionRecord: item })}
      >
        <View style={styles.historyTopRow}>
          <View style={styles.historyLeft}>
            <View style={[styles.typeIconWrap, { backgroundColor: meta.tintBg }]}> 
              <Ionicons name={meta.icon} size={16} color={meta.tint} />
            </View>
            <View style={styles.historyTextWrap}>
              <Text style={styles.historyTitle}>{item.title}</Text>
              <Text style={styles.historyMeta}>{formatTime(item.startedAt)} • {formatDuration(item.durationSeconds)}</Text>
            </View>
          </View>

          <View style={[styles.statusPill, isCompleted ? styles.statusCompleted : styles.statusAbandoned]}>
            <Text style={[styles.statusText, isCompleted ? styles.statusCompletedText : styles.statusAbandonedText]}>
              {isCompleted ? 'Completed' : 'Abandoned'}
            </Text>
          </View>
        </View>

        <Text style={styles.historySummary}>{summaryLine}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <SectionList
        sections={historySections}
        keyExtractor={(item) => item.id}
        renderItem={renderHistoryCard}
        renderSectionHeader={({ section }) => (
          <Text style={styles.dateHeader}>{section.title}</Text>
        )}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <Text style={styles.title}>Sessions</Text>
            <Text style={styles.subtitle}>Start a workout or cooking session. Track your history.</Text>

            <View style={styles.startSectionCard}>
              <Text style={styles.startSectionTitle}>Start a session</Text>

              <TouchableOpacity
                style={styles.startCard}
                activeOpacity={0.92}
                onPress={() => navigation.navigate('WorkoutSessionSetup')}
              >
                <View style={styles.startCardTopRow}>
                  <View style={styles.startIconWrap}>
                    <Ionicons name="barbell-outline" size={16} color={COLORS.accent2} />
                  </View>
                  <View style={styles.startMetaPill}>
                    <Text style={styles.startMetaText}>{workoutTemplate.estimatedMinutes} min • {workoutTemplate.difficulty}</Text>
                  </View>
                </View>
                <Text style={styles.startCardTitle}>Start Workout Session</Text>
                <Text style={styles.startCardSubtle}>Today: {workoutTemplate.name}</Text>
                <Text style={styles.startCardFoot}>Last done: {latestWorkout ? getDateLabel(latestWorkout.startedAt) : 'No sessions yet'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.startCard}
                activeOpacity={0.92}
                onPress={() => navigation.navigate('CookingSessionSetup')}
              >
                <View style={styles.startCardTopRow}>
                  <View style={[styles.startIconWrap, styles.startIconWarm]}>
                    <Ionicons name="restaurant-outline" size={16} color={COLORS.accent} />
                  </View>
                  <View style={styles.startMetaPill}>
                    <Text style={styles.startMetaText}>{dinnerSuggestion.estimatedMinutes} min • {dinnerSuggestion.difficulty}</Text>
                  </View>
                </View>
                <Text style={styles.startCardTitle}>Start Cooking Session</Text>
                <Text style={styles.startCardSubtle}>Today&apos;s dinner: {dinnerSuggestion.dishName}</Text>
                <Text style={styles.startCardFoot}>Last done: {latestCooking ? getDateLabel(latestCooking.startedAt) : 'No sessions yet'}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.historyHeading}>Session history</Text>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyWrap}>
              <ActivityIndicator color={COLORS.accent} />
              <Text style={styles.emptyText}>Loading session history...</Text>
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <Ionicons name="time-outline" size={20} color={COLORS.muted} />
              <Text style={styles.emptyTitle}>No sessions yet</Text>
              <Text style={styles.emptyText}>Start your first workout or cooking session.</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  headerWrap: {
    marginBottom: 8,
  },
  title: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 4,
  },
  startSectionCard: {
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.card,
    padding: 12,
    gap: 10,
  },
  startSectionTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  startCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: COLORS.cardSoft,
    padding: 10,
  },
  startCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  startIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(90,209,232,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startIconWarm: {
    backgroundColor: 'rgba(245,201,106,0.14)',
  },
  startMetaPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.25)',
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  startMetaText: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '600',
  },
  startCardTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
  },
  startCardSubtle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 4,
  },
  startCardFoot: {
    color: COLORS.accent2,
    fontSize: 11,
    marginTop: 7,
  },
  historyHeading: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 8,
  },
  dateHeader: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.35,
    marginBottom: 8,
    marginTop: 6,
  },
  historyCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.card,
    padding: 10,
    marginBottom: 8,
  },
  historyTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  typeIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  historyTextWrap: {
    flex: 1,
  },
  historyTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  historyMeta: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 2,
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
  historySummary: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 8,
  },
  emptyWrap: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.card,
    alignItems: 'center',
    paddingVertical: 26,
    gap: 6,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 12,
  },
});

export default SessionsHomeScreen;
