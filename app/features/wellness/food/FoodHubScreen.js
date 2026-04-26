import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuth } from '../../../context/AuthContext';
import useFoodLogs from '../../../hooks/useFoodLogs';
import COLORS from '../../../theme/colors';
import UI_TOKENS from '../../../ui/tokens';

const FOOD_START_MONTH = new Date(2026, 3, 1);

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function toDayKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isSameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function maxMonth(a, b) {
  return a.getTime() >= b.getTime() ? a : b;
}

function currentMonthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function buildCalendarCells(selectedMonth, logsByDate) {
  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);
  const today = new Date();
  const todayKey = toDayKey(today);
  const cells = [];
  const startWeekday = monthStart.getDay();

  for (let i = 0; i < startWeekday; i += 1) cells.push({ key: `blank_${i}`, type: 'blank' });

  for (let day = 1; day <= monthEnd.getDate(); day += 1) {
    const date = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), day);
    const dayKey = toDayKey(date);
    const log = logsByDate.get(dayKey) || null;
    const isFuture = dayKey > todayKey;

    let tone = 'pending';
    if (log) tone = 'logged';
    else if (isFuture) tone = 'future';

    cells.push({
      key: dayKey,
      type: 'day',
      day,
      date,
      dayKey,
      log,
      tone,
    });
  }

  while (cells.length % 7 !== 0) cells.push({ key: `tail_${cells.length}`, type: 'blank' });
  return cells;
}

function getMonthStats(selectedMonth, logsByDate) {
  const today = new Date();
  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);
  const rangeEnd = isSameMonth(selectedMonth, today) ? today : monthEnd;
  const stats = {
    totalDays: rangeEnd.getDate(),
    loggedDays: 0,
    averageCalories: 0,
  };
  let calorieTotal = 0;

  const cursor = new Date(monthStart);
  while (cursor.getTime() <= rangeEnd.getTime()) {
    const log = logsByDate.get(toDayKey(cursor));
    if (log) {
      stats.loggedDays += 1;
      calorieTotal += log.totalCalories || 0;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  stats.averageCalories = stats.loggedDays ? Math.round(calorieTotal / stats.loggedDays) : 0;

  return stats;
}

export default function FoodHubScreen({ navigation }) {
  const { user } = useAuth();
  const { loading, logsByDate, hydrate } = useFoodLogs(user);
  const [selectedMonth, setSelectedMonth] = useState(() => maxMonth(startOfMonth(new Date()), FOOD_START_MONTH));
  const latestMonth = currentMonthStart();

  useFocusEffect(
    useCallback(() => {
      hydrate();
    }, [hydrate]),
  );

  const cells = useMemo(() => buildCalendarCells(selectedMonth, logsByDate), [logsByDate, selectedMonth]);
  const monthStats = useMemo(() => getMonthStats(selectedMonth, logsByDate), [logsByDate, selectedMonth]);
  const canGoBack = selectedMonth.getTime() > FOOD_START_MONTH.getTime();
  const canGoForward = selectedMonth.getTime() < latestMonth.getTime();

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading food calendar...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Food</Text>

        <View style={styles.monthBar}>
          <TouchableOpacity
            style={[styles.monthButton, !canGoBack ? styles.monthButtonDisabled : null]}
            activeOpacity={0.9}
            disabled={!canGoBack}
            onPress={() => setSelectedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
          >
            <Ionicons name="chevron-back" size={16} color={!canGoBack ? COLORS.muted : COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text>
          <TouchableOpacity
            style={[styles.monthButton, !canGoForward ? styles.monthButtonDisabled : null]}
            activeOpacity={0.9}
            disabled={!canGoForward}
            onPress={() => setSelectedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
          >
            <Ionicons name="chevron-forward" size={16} color={!canGoForward ? COLORS.muted : COLORS.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.calendarCard}>
          <View style={styles.weekHeaderRow}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <Text key={day} style={styles.weekHeaderText}>{day}</Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {cells.map((cell) => {
              if (cell.type === 'blank') return <View key={cell.key} style={styles.blankCell} />;
              return (
                <TouchableOpacity
                  key={cell.key}
                  style={[
                    styles.dayCell,
                    cell.tone === 'logged' ? styles.dayCellLogged : null,
                    cell.tone === 'pending' ? styles.dayCellPending : null,
                    cell.tone === 'future' ? styles.dayCellFuture : null,
                  ]}
                  activeOpacity={0.92}
                  onPress={() => navigation.navigate('FoodLog', { dateISO: cell.dayKey })}
                >
                  <Text style={[styles.dayNumber, cell.tone === 'logged' ? styles.dayNumberLogged : null]}>
                    {cell.day}
                  </Text>
                  <View style={styles.dayCellMarkerSpacer} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.statsEyebrow}>This month</Text>
          <Text style={styles.statsTitle}>{selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statTile}>
              <Text style={styles.statLabel}>Days</Text>
              <Text style={styles.statValue}>{monthStats.totalDays}</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.statLabel}>Logged</Text>
              <Text style={styles.statValue}>{monthStats.loggedDays}</Text>
            </View>
            <View style={[styles.statTile, styles.statTileAccent]}>
              <Text style={styles.statLabel}>Avg kcal</Text>
              <Text style={styles.statValue}>{monthStats.averageCalories}</Text>
            </View>
          </View>
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
    padding: UI_TOKENS.spacing.md,
    paddingBottom: UI_TOKENS.spacing.xl,
    gap: UI_TOKENS.spacing.sm,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.bg,
  },
  loadingText: {
    color: COLORS.muted,
    fontSize: 13,
  },
  title: {
    color: COLORS.text,
    fontSize: 34,
    fontWeight: '700',
    marginBottom: UI_TOKENS.spacing.xs,
  },
  monthBar: {
    borderRadius: UI_TOKENS.radius.lg,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: COLORS.card,
    paddingHorizontal: UI_TOKENS.spacing.sm,
    paddingVertical: UI_TOKENS.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthButton: {
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: COLORS.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthButtonDisabled: {
    opacity: 0.45,
  },
  monthLabel: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 2,
    fontWeight: '800',
  },
  calendarCard: {
    borderRadius: UI_TOKENS.radius.lg,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: COLORS.card,
    paddingHorizontal: UI_TOKENS.spacing.xs,
    paddingVertical: UI_TOKENS.spacing.xs,
    gap: UI_TOKENS.spacing.xs,
  },
  weekHeaderRow: {
    flexDirection: 'row',
  },
  weekHeaderText: {
    flex: 1,
    textAlign: 'center',
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
    paddingVertical: 4,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  blankCell: {
    width: '14.2857%',
    height: 62,
    marginBottom: 5,
  },
  dayCell: {
    width: '14.2857%',
    height: 62,
    borderRadius: 10,
    borderWidth: UI_TOKENS.border.hairline,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 7,
    paddingBottom: 6,
    paddingHorizontal: 3,
    marginBottom: 5,
  },
  dayCellFuture: {
    borderColor: 'rgba(162,167,179,0.18)',
    backgroundColor: 'rgba(162,167,179,0.06)',
  },
  dayCellPending: {
    borderColor: 'rgba(245,201,106,0.34)',
    backgroundColor: 'rgba(245,201,106,0.12)',
  },
  dayCellLogged: {
    borderColor: 'rgba(108,190,113,0.38)',
    backgroundColor: 'rgba(118,222,141,0.14)',
  },
  dayNumber: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 14,
  },
  dayNumberLogged: {
    color: COLORS.text,
  },
  dayCellMarkerSpacer: {
    minHeight: 14,
  },
  statsCard: {
    borderRadius: UI_TOKENS.radius.lg,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.sm,
    gap: UI_TOKENS.spacing.xs,
  },
  statsEyebrow: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 1,
    fontWeight: '800',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: UI_TOKENS.spacing.xs,
  },
  statTile: {
    flex: 1,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: UI_TOKENS.spacing.xs + 2,
    paddingVertical: UI_TOKENS.spacing.xs + 1,
    gap: 1,
  },
  statTileAccent: {
    borderColor: 'rgba(245,201,106,0.24)',
    backgroundColor: 'rgba(245,201,106,0.12)',
  },
  statLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '700',
  },
  statValue: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle,
    fontWeight: '800',
  },
});
