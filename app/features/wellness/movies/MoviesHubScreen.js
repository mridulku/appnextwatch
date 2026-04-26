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
import useMovieLogs from '../../../hooks/useMovieLogs';
import COLORS from '../../../theme/colors';
import UI_TOKENS from '../../../ui/tokens';

const MOVIES_START_MONTH = new Date(2026, 3, 1);

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
    cells.push({ key: dayKey, type: 'day', day, dayKey, tone });
  }
  while (cells.length % 7 !== 0) cells.push({ key: `tail_${cells.length}`, type: 'blank' });
  return cells;
}

function getMonthStats(selectedMonth, logsByDate) {
  const today = new Date();
  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);
  const rangeEnd = isSameMonth(selectedMonth, today) ? today : monthEnd;
  const stats = { totalDays: rangeEnd.getDate(), loggedDays: 0, entryCount: 0, movieCount: 0, showCount: 0 };
  const cursor = new Date(monthStart);
  while (cursor.getTime() <= rangeEnd.getTime()) {
    const log = logsByDate.get(toDayKey(cursor));
    if (log) {
      stats.loggedDays += 1;
      stats.entryCount += log.itemCount || 0;
      stats.movieCount += log.movieCount || 0;
      stats.showCount += log.showCount || 0;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return stats;
}

export default function MoviesHubScreen({ navigation }) {
  const { user } = useAuth();
  const { loading, logsByDate, hydrate } = useMovieLogs(user);
  const [selectedMonth, setSelectedMonth] = useState(startOfMonth(MOVIES_START_MONTH));
  const latestMonth = currentMonthStart();

  useFocusEffect(useCallback(() => { hydrate(); }, [hydrate]));

  const cells = useMemo(() => buildCalendarCells(selectedMonth, logsByDate), [selectedMonth, logsByDate]);
  const monthStats = useMemo(() => getMonthStats(selectedMonth, logsByDate), [selectedMonth, logsByDate]);
  const canGoBack = selectedMonth.getTime() > MOVIES_START_MONTH.getTime();
  const canGoForward = selectedMonth.getTime() < latestMonth.getTime();

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading movie calendar...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Movies</Text>

        <View style={styles.monthBar}>
          <TouchableOpacity
            style={[styles.monthButton, !canGoBack ? styles.monthButtonDisabled : null]}
            disabled={!canGoBack}
            activeOpacity={0.9}
            onPress={() => setSelectedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
          >
            <Ionicons name="chevron-back" size={16} color={!canGoBack ? COLORS.muted : COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text>
          <TouchableOpacity
            style={[styles.monthButton, !canGoForward ? styles.monthButtonDisabled : null]}
            disabled={!canGoForward}
            activeOpacity={0.9}
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
                  onPress={() => navigation.navigate('MovieLog', { dateISO: cell.dayKey })}
                >
                  <Text style={[styles.dayNumber, cell.tone === 'logged' ? styles.dayNumberLogged : null]}>{cell.day}</Text>
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
            <View style={styles.statTile}>
              <Text style={styles.statLabel}>Entries</Text>
              <Text style={styles.statValue}>{monthStats.entryCount}</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.statLabel}>Movies</Text>
              <Text style={styles.statValue}>{monthStats.movieCount}</Text>
            </View>
            <View style={[styles.statTile, styles.statTileAccent]}>
              <Text style={styles.statLabel}>Shows</Text>
              <Text style={styles.statValue}>{monthStats.showCount}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: UI_TOKENS.spacing.md, paddingBottom: UI_TOKENS.spacing.xl, gap: UI_TOKENS.spacing.sm },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: COLORS.bg },
  loadingText: { color: COLORS.muted, fontSize: 13 },
  title: { color: COLORS.text, fontSize: 34, fontWeight: '700', marginBottom: UI_TOKENS.spacing.xs },
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
    width: 28, height: 28, borderRadius: 9, borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(162,167,179,0.04)',
  },
  monthButtonDisabled: { opacity: 0.45 },
  monthLabel: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  calendarCard: {
    borderRadius: UI_TOKENS.radius.lg,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.18)',
    backgroundColor: COLORS.card,
    paddingHorizontal: UI_TOKENS.spacing.sm,
    paddingTop: UI_TOKENS.spacing.sm,
    paddingBottom: UI_TOKENS.spacing.md,
  },
  weekHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: UI_TOKENS.spacing.sm, paddingHorizontal: 2 },
  weekHeaderText: { width: '14.2%', textAlign: 'center', color: COLORS.muted, fontSize: 11, fontWeight: '600' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  blankCell: { width: '12.9%', height: 62 },
  dayCell: {
    width: '12.9%', height: 62, borderRadius: 14, borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.18)', backgroundColor: '#222733', paddingTop: 9, alignItems: 'center',
  },
  dayCellLogged: { backgroundColor: 'rgba(74, 128, 98, 0.32)', borderColor: 'rgba(120,210,152,0.45)' },
  dayCellPending: { backgroundColor: 'rgba(97, 84, 58, 0.35)', borderColor: 'rgba(231,191,94,0.45)' },
  dayCellFuture: { backgroundColor: '#222733', borderColor: 'rgba(162,167,179,0.18)' },
  dayNumber: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  dayNumberLogged: { color: '#F4FFFA' },
  dayCellMarkerSpacer: { marginTop: 'auto', height: 4 },
  statsCard: {
    borderRadius: UI_TOKENS.radius.lg,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.18)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.md,
    gap: UI_TOKENS.spacing.sm,
  },
  statsEyebrow: { color: COLORS.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2 },
  statsTitle: { color: COLORS.text, fontSize: 17, fontWeight: '700' },
  statsGrid: { flexDirection: 'row', gap: 8 },
  statTile: {
    flex: 1, minHeight: 78, borderRadius: 16, borderWidth: UI_TOKENS.border.hairline, borderColor: 'rgba(162,167,179,0.18)',
    backgroundColor: '#222733', paddingHorizontal: 10, paddingVertical: 12, justifyContent: 'space-between',
  },
  statTileAccent: { borderColor: 'rgba(231,191,94,0.4)', backgroundColor: 'rgba(97,84,58,0.3)' },
  statLabel: { color: COLORS.muted, fontSize: 10, fontWeight: '700' },
  statValue: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
});
