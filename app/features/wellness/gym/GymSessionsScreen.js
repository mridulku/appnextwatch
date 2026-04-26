import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import COLORS from '../../../theme/colors';
import UI_TOKENS from '../../../ui/tokens';
import useGymSessions from '../../../hooks/useGymSessions';

const HISTORY_START_DATE = new Date(2026, 2, 4);

function getSessionDateParts(session) {
  const baseDate = session?.dateISO || session?.createdAt || null;
  if (!baseDate) {
    return {
      weekdayLabel: '--',
      dayNumber: '--',
      monthLabel: 'Recent',
      yearLabel: '',
    };
  }

  const date = new Date(baseDate);
  if (Number.isNaN(date.getTime())) {
    return {
      weekdayLabel: '--',
      dayNumber: '--',
      monthLabel: 'Recent',
      yearLabel: '',
    };
  }

  return {
    weekdayLabel: date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
    dayNumber: date.toLocaleDateString('en-US', { day: 'numeric' }),
    monthLabel: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    yearLabel: date.toLocaleDateString('en-US', { year: 'numeric' }),
  };
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function sameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function toDayKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMonthOptions(startDate, endDate) {
  const cursor = startOfMonth(startDate);
  const last = startOfMonth(endDate);
  const result = [];

  while (cursor.getTime() <= last.getTime()) {
    result.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return result;
}

function maxDate(a, b) {
  return a.getTime() >= b.getTime() ? a : b;
}

function getMonthDaysInRange(selectedMonth, rangeStart, rangeEnd) {
  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);
  const effectiveStart = monthStart;
  const effectiveEnd = monthEnd;

  const days = [];
  const cursor = new Date(effectiveStart);
  while (cursor.getTime() <= effectiveEnd.getTime()) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days.reverse();
}

function buildCalendarCells(selectedMonth, rangeStart, rangeEnd, sessionsByDay) {
  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);
  const startWeekday = monthStart.getDay();
  const daysInMonth = monthEnd.getDate();
  const cells = [];

  for (let index = 0; index < startWeekday; index += 1) {
    cells.push({ key: `blank_${index}`, type: 'blank' });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), day);
    const key = toDayKey(date);
    const sessions = sessionsByDay.get(key) || [];
    const isEmpty = !sessions.length;
    const primarySession = sessions[0] || null;
    const today = new Date();
    const dayTime = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const todayTime = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const cellTone = primarySession ? 'session' : dayTime < todayTime ? 'rest' : 'empty';

    cells.push({
      key,
      type: 'day',
      day,
      date,
      sessions,
      isEmpty,
      dayType: primarySession?.dominantDayLabel || '',
      cellTone,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ key: `tail_${cells.length}`, type: 'blank' });
  }

  return cells;
}

function formatReadableDate(value) {
  if (!value) return 'No sessions yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No sessions yet';
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function formatDaysBackLabel(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const diffDays = Math.round((todayDay - targetDay) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'today';
  if (diffDays === 1) return '1 day back';
  return `${diffDays} days back`;
}

function getMonthStats(selectedMonth, sessionsByDay) {
  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);
  const now = new Date();
  const isCurrentMonth = sameMonth(selectedMonth, now);
  const daysInScope = isCurrentMonth ? now.getDate() : monthEnd.getDate();
  const stats = {
    sessionCount: 0,
    pushCount: 0,
    pullCount: 0,
    legCount: 0,
    generalCount: 0,
    totalDays: daysInScope,
  };

  const cursor = new Date(monthStart);
  while (cursor.getTime() <= monthEnd.getTime()) {
    const sessions = sessionsByDay.get(toDayKey(cursor)) || [];
    if (sessions.length) {
      stats.sessionCount += 1;
      const dayType = sessions[0]?.dominantDayLabel || '';
      if (dayType === 'Push day') stats.pushCount += 1;
      else if (dayType === 'Pull day') stats.pullCount += 1;
      else if (dayType === 'Leg day') stats.legCount += 1;
      else stats.generalCount += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return stats;
}

function SessionCard({ session, navigation, compactStatus = false }) {
  const dateParts = getSessionDateParts(session);

  return (
    <TouchableOpacity
      style={styles.sessionCard}
      activeOpacity={0.9}
      onPress={() => navigation.navigate('GymSessionWork', { sessionId: session.id })}
    >
      <View style={styles.sessionDateThumb}>
        <View style={styles.sessionDatePrimaryRow}>
          <Ionicons name="calendar-outline" size={11} color={COLORS.text} />
          <Text style={styles.sessionDatePrimary}>
            {dateParts.weekdayLabel} {dateParts.dayNumber}
          </Text>
        </View>
        <Text style={styles.sessionDateSecondary}>
          {dateParts.monthLabel} {dateParts.yearLabel}
        </Text>
      </View>

      <View style={styles.sessionBody}>
        <View style={styles.sessionInfoStack}>
          {session.dominantDayLabel ? (
            <View style={styles.sessionMetaPillWide}>
              <Ionicons name="sparkles-outline" size={12} color={COLORS.accent} />
              <Text style={styles.sessionMetaPillText} numberOfLines={1}>
                {session.dominantDayLabel}
              </Text>
            </View>
          ) : null}
          <View style={styles.sessionMetaPillWide}>
            <Ionicons name="barbell-outline" size={12} color={COLORS.text} />
            <Text style={styles.sessionMetaPillText} numberOfLines={1}>
              {session.exerciseCount || 0} exercise{(session.exerciseCount || 0) === 1 ? '' : 's'}
            </Text>
          </View>
        </View>
      </View>

      <View
        style={[
          styles.sessionStatusThumb,
          compactStatus ? styles.sessionStatusThumbCompact : null,
          styles.sessionStatusThumbSession,
        ]}
      >
        <Ionicons name="barbell-outline" size={14} color={COLORS.accent} />
        {!compactStatus ? (
          <Text style={[styles.sessionStatusThumbText, styles.sessionStatusThumbTextSession]} numberOfLines={2}>
            Session
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function EmptyDayCard({ date, navigation }) {
  const dateParts = getSessionDateParts({ dateISO: date.toISOString() });
  const dateISO = toDayKey(date);
  const today = new Date();
  const dayTime = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const todayTime = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const isPast = dayTime < todayTime;

  return (
    <TouchableOpacity
      style={[styles.sessionCard, styles.sessionCardEmpty]}
      activeOpacity={0.9}
      onPress={() => navigation.navigate('GymSessionCreate', { creationMode: 'planned', presetDateISO: dateISO, entryMode: 'retro_log' })}
    >
      <View style={[styles.sessionDateThumb, styles.sessionDateThumbMuted]}>
        <View style={styles.sessionDatePrimaryRow}>
          <Ionicons name="calendar-outline" size={11} color={COLORS.muted} />
          <Text style={[styles.sessionDatePrimary, styles.sessionDatePrimaryMuted]}>
            {dateParts.weekdayLabel} {dateParts.dayNumber}
          </Text>
        </View>
        <Text style={[styles.sessionDateSecondary, styles.sessionDateSecondaryMuted]}>
          {dateParts.monthLabel} {dateParts.yearLabel}
        </Text>
      </View>

      <View style={styles.sessionBody}>
        <View style={styles.sessionInfoStack}>
          <Text style={styles.emptyDayTitle}>{isPast ? 'Rest day' : 'No session created'}</Text>
          <Text style={styles.emptyDayAction}>Tap to add one</Text>
        </View>
      </View>

      <View style={[styles.sessionStatusThumb, styles.sessionStatusThumbCompact, styles.sessionStatusThumbEmpty]}>
        <Ionicons name="add" size={16} color={COLORS.muted} />
      </View>
    </TouchableOpacity>
  );
}

function ViewToggle({ value, onChange }) {
  return (
    <View style={styles.viewToggleWrap}>
      {[
        { key: 'list', icon: 'list-outline' },
        { key: 'calendar', icon: 'calendar-outline' },
      ].map((option) => {
        const active = value === option.key;
        return (
          <TouchableOpacity
            key={option.key}
            style={[styles.viewToggleButton, active ? styles.viewToggleButtonActive : null]}
            activeOpacity={0.9}
            onPress={() => onChange(option.key)}
          >
            <Ionicons
              name={option.icon}
              size={15}
              color={active ? COLORS.text : COLORS.muted}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function CalendarDayCell({ cell, navigation }) {
  if (cell.type !== 'day') {
    return <View style={styles.calendarCellBlank} />;
  }

  const primarySession = cell.sessions[0] || null;
  const dayMarker = primarySession
    ? cell.dayType === 'Push day'
      ? 'push'
      : cell.dayType === 'Pull day'
        ? 'pull'
        : cell.dayType === 'Leg day'
          ? 'leg'
          : 'gym'
    : cell.cellTone === 'rest'
      ? 'rest'
      : '';

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[
        styles.calendarCell,
        cell.cellTone === 'session'
          ? styles.calendarCellSession
          : cell.cellTone === 'rest'
            ? styles.calendarCellRest
            : styles.calendarCellEmpty,
      ]}
      onPress={() => {
        if (primarySession) {
          navigation.navigate('GymSessionWork', { sessionId: primarySession.id });
          return;
        }
        navigation.navigate('GymSessionCreate', {
          creationMode: 'planned',
          presetDateISO: toDayKey(cell.date),
          entryMode: 'retro_log',
        });
      }}
    >
      <Text
        style={[
          styles.calendarCellDay,
          primarySession ? styles.calendarCellDayFilled : styles.calendarCellDayEmpty,
        ]}
      >
        {cell.day}
      </Text>
      {dayMarker ? (
        <View style={[styles.calendarMarkerPill, cell.cellTone === 'session' ? styles.calendarMarkerPillSession : styles.calendarMarkerPillRest]}>
          <Text style={[styles.calendarMarkerText, cell.cellTone === 'session' ? styles.calendarMarkerTextSession : styles.calendarMarkerTextRest]}>
            {dayMarker}
          </Text>
        </View>
      ) : (
        <View style={styles.calendarMarkerSpacer} />
      )}
    </TouchableOpacity>
  );
}

function LegendSwatch({ colorStyle, label, markerText, compact = false }) {
  return (
    <View style={[styles.legendItem, compact ? styles.legendItemCompact : null]}>
      <View style={[styles.legendSwatch, colorStyle, compact ? styles.legendSwatchCompact : null]}>
        {markerText ? <Text style={styles.legendSwatchMarkerText}>{markerText}</Text> : null}
      </View>
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function LegendModal({ visible, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.legendModalBackdrop} onPress={onClose}>
        <Pressable style={styles.legendModalCard} onPress={() => {}}>
          <View style={styles.legendModalHeader}>
            <View>
              <Text style={styles.legendModalTitle}>Calendar legend</Text>
              <Text style={styles.legendModalSubtitle}>Status colors and day-type markers</Text>
            </View>
            <TouchableOpacity style={styles.legendCloseButton} activeOpacity={0.9} onPress={onClose}>
              <Ionicons name="close" size={16} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.legendSection}>
            <Text style={styles.legendSectionTitle}>Status</Text>
            <View style={styles.legendModalStack}>
              <LegendSwatch colorStyle={styles.legendSwatchSession} label="Session created" />
              <LegendSwatch colorStyle={styles.legendSwatchRest} label="Rest day" />
              <LegendSwatch colorStyle={styles.legendSwatchEmpty} label="Today/later" />
            </View>
          </View>

          <View style={styles.legendSection}>
            <Text style={styles.legendSectionTitle}>Day type</Text>
            <View style={styles.legendModalStack}>
              <LegendSwatch colorStyle={styles.legendSwatchIcon} label="Push day" markerText="push" />
              <LegendSwatch colorStyle={styles.legendSwatchIcon} label="Pull day" markerText="pull" />
              <LegendSwatch colorStyle={styles.legendSwatchIcon} label="Leg day" markerText="leg" />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function SummaryTile({ label, value, icon, accent = false }) {
  return (
    <View style={[styles.summaryTile, accent ? styles.summaryTileAccent : null]}>
      <View style={styles.summaryTileLabelRow}>
        <Ionicons name={icon} size={13} color={accent ? COLORS.accent : COLORS.muted} />
        <Text style={styles.summaryTileLabel}>{label}</Text>
      </View>
      <Text style={styles.summaryTileValue}>{value}</Text>
    </View>
  );
}

function LastSessionCard({ session }) {
  return (
    <View style={styles.topSummaryCard}>
      <View style={styles.lastSessionCard}>
        <View style={styles.summaryTileLabelRow}>
          <Ionicons name="time-outline" size={13} color={COLORS.accent} />
          <Text style={styles.summaryTileLabel}>Last session</Text>
        </View>
        <Text style={styles.lastSessionValue}>
          {session ? formatReadableDate(session.dateISO || session.createdAt) : 'No sessions yet'}
        </Text>
        {session ? (
          <Text style={styles.lastSessionMeta}>{formatDaysBackLabel(session.dateISO || session.createdAt)}</Text>
        ) : null}
      </View>
    </View>
  );
}

function MonthStatsCard({ selectedMonth, stats }) {
  return (
    <View style={styles.monthStatsCard}>
      <View style={styles.monthStatsHeader}>
        <View>
          <Text style={styles.monthStatsEyebrow}>This month</Text>
          <Text style={styles.monthStatsTitle}>
            {selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
        </View>
        <View style={styles.monthStatsHeroPill}>
          <Ionicons name="barbell-outline" size={13} color={COLORS.accent} />
          <Text style={styles.monthStatsHeroText}>
            {stats.sessionCount} session{stats.sessionCount === 1 ? '' : 's'}
          </Text>
        </View>
      </View>

      <View style={styles.monthStatsGrid}>
        <SummaryTile label="Days" value={String(stats.totalDays)} icon="calendar-clear-outline" accent />
        <SummaryTile label="Push day" value={String(stats.pushCount)} icon="hand-left-outline" />
        <SummaryTile label="Pull day" value={String(stats.pullCount)} icon="hand-right-outline" />
        <SummaryTile label="Leg day" value={String(stats.legCount)} icon="walk-outline" />
        <SummaryTile label="General" value={String(stats.generalCount)} icon="sparkles-outline" />
      </View>
    </View>
  );
}

function GymSessionsScreen() {
  const navigation = useNavigation();
  const sessionsApi = useGymSessions();
  const [historyViewMode, setHistoryViewMode] = useState('calendar');
  const [legendVisible, setLegendVisible] = useState(false);
  const today = useMemo(() => new Date(), []);
  const latestSessionDate = useMemo(() => {
    const sessionDates = (sessionsApi.sessions || [])
      .map((session) => new Date(session?.dateISO || session?.createdAt || 0))
      .filter((date) => !Number.isNaN(date.getTime()));
    return sessionDates.length ? sessionDates.reduce((acc, date) => maxDate(acc, date), today) : today;
  }, [sessionsApi.sessions, today]);
  const monthOptions = useMemo(() => getMonthOptions(HISTORY_START_DATE, latestSessionDate), [latestSessionDate]);
  const [historyMonthIndex, setHistoryMonthIndex] = useState(monthOptions.length - 1);

  const sessionsByDay = useMemo(() => {
    const grouped = new Map();
    (sessionsApi.sessions || []).forEach((session) => {
      const baseDate = session?.dateISO || session?.createdAt;
      if (!baseDate) return;
      const date = new Date(baseDate);
      if (Number.isNaN(date.getTime())) return;
      const key = toDayKey(date);
      const existing = grouped.get(key) || [];
      existing.push(session);
      grouped.set(key, existing);
    });

    grouped.forEach((sessions, key) => {
      grouped.set(
        key,
        [...sessions].sort(
          (a, b) =>
            new Date(b?.createdAt || b?.dateISO || 0).getTime() -
            new Date(a?.createdAt || a?.dateISO || 0).getTime(),
        ),
      );
    });

    return grouped;
  }, [sessionsApi.sessions]);

  const selectedHistoryMonth = monthOptions[historyMonthIndex] || today;
  const historyDays = useMemo(
    () => getMonthDaysInRange(selectedHistoryMonth, HISTORY_START_DATE, latestSessionDate),
    [selectedHistoryMonth, latestSessionDate],
  );
  const historyCalendarCells = useMemo(
    () => buildCalendarCells(selectedHistoryMonth, HISTORY_START_DATE, latestSessionDate, sessionsByDay),
    [selectedHistoryMonth, latestSessionDate, sessionsByDay],
  );
  const sortedSessions = useMemo(() => {
    const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    return [...(sessionsApi.sessions || [])]
      .filter((session) => {
        const sessionDate = new Date(session?.dateISO || session?.createdAt || 0);
        if (Number.isNaN(sessionDate.getTime())) return false;
        const sessionDay = new Date(
          sessionDate.getFullYear(),
          sessionDate.getMonth(),
          sessionDate.getDate(),
        ).getTime();
        return sessionDay <= todayDay;
      })
      .sort(
        (a, b) =>
          new Date(b?.dateISO || b?.createdAt || 0).getTime() -
          new Date(a?.dateISO || a?.createdAt || 0).getTime(),
      );
  }, [sessionsApi.sessions, today]);
  const latestSession = sortedSessions[0] || null;
  const monthStats = useMemo(
    () => getMonthStats(selectedHistoryMonth, sessionsByDay),
    [selectedHistoryMonth, sessionsByDay],
  );

  useFocusEffect(
    useCallback(() => {
      sessionsApi.refresh();
    }, [sessionsApi.refresh]),
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionWrap}>
          <LastSessionCard session={latestSession} />
          <View style={styles.monthSelectorCard}>
            <View style={styles.monthSelectorMain}>
              <TouchableOpacity
                style={[styles.monthNavButton, historyMonthIndex === 0 ? styles.monthNavButtonDisabled : null]}
                activeOpacity={0.9}
                disabled={historyMonthIndex === 0}
                onPress={() => setHistoryMonthIndex((prev) => Math.max(0, prev - 1))}
              >
                <Ionicons name="chevron-back" size={16} color={historyMonthIndex === 0 ? COLORS.muted : COLORS.text} />
              </TouchableOpacity>
              <Text style={styles.monthSelectorText}>
                {selectedHistoryMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </Text>
              <TouchableOpacity
                style={[
                  styles.monthNavButton,
                  historyMonthIndex === monthOptions.length - 1 ? styles.monthNavButtonDisabled : null,
                ]}
                activeOpacity={0.9}
                disabled={historyMonthIndex === monthOptions.length - 1}
                onPress={() => setHistoryMonthIndex((prev) => Math.min(monthOptions.length - 1, prev + 1))}
              >
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={historyMonthIndex === monthOptions.length - 1 ? COLORS.muted : COLORS.text}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.monthSelectorRight}>
              <TouchableOpacity style={styles.legendIconButton} activeOpacity={0.9} onPress={() => setLegendVisible(true)}>
                <Ionicons name="information-circle-outline" size={15} color={COLORS.muted} />
              </TouchableOpacity>
              <ViewToggle value={historyViewMode} onChange={setHistoryViewMode} />
            </View>
          </View>
          {sessionsApi.error ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{sessionsApi.error}</Text>
              <TouchableOpacity style={styles.retryButton} activeOpacity={0.9} onPress={sessionsApi.refresh}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : historyViewMode === 'list' && historyDays.length > 0 ? (
            <View style={styles.listWrap}>
              {historyDays.map((day) => {
                const sessions = sessionsByDay.get(toDayKey(day)) || [];
                if (!sessions.length) {
                  return <EmptyDayCard key={toDayKey(day)} date={day} navigation={navigation} />;
                }

                return sessions.map((session) => (
                  <SessionCard key={session.id} session={session} navigation={navigation} compactStatus />
                ));
              })}
            </View>
          ) : historyViewMode === 'calendar' && historyCalendarCells.length > 0 ? (
            <View style={styles.calendarWrap}>
              <View style={styles.calendarWeekHeader}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => (
                  <Text key={label} style={styles.calendarWeekday}>
                    {label}
                  </Text>
                ))}
              </View>
              <View style={styles.calendarGrid}>
                {historyCalendarCells.map((cell) => (
                  <CalendarDayCell key={cell.key} cell={cell} navigation={navigation} />
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.emptySectionCard}>
              <Text style={styles.emptyStateText}>No sessions yet.</Text>
            </View>
          )}
          <MonthStatsCard selectedMonth={selectedHistoryMonth} stats={monthStats} />
        </View>
        <LegendModal visible={legendVisible} onClose={() => setLegendVisible(false)} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    paddingHorizontal: UI_TOKENS.spacing.md,
    paddingTop: UI_TOKENS.spacing.sm,
    paddingBottom: UI_TOKENS.spacing.xl * 2,
    gap: UI_TOKENS.spacing.md,
  },
  sectionWrap: {
    gap: UI_TOKENS.spacing.sm,
  },
  topSummaryCard: {
    borderRadius: UI_TOKENS.radius.lg,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.xs + 2,
    gap: UI_TOKENS.spacing.xs,
  },
  lastSessionCard: {
    minHeight: 68,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(245,201,106,0.34)',
    backgroundColor: 'rgba(245,201,106,0.08)',
    paddingHorizontal: UI_TOKENS.spacing.sm,
    paddingVertical: UI_TOKENS.spacing.sm,
    justifyContent: 'center',
    gap: 4,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: UI_TOKENS.spacing.xs,
  },
  summaryTile: {
    flex: 1,
    minHeight: 56,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: UI_TOKENS.spacing.xs + 2,
    paddingVertical: UI_TOKENS.spacing.xs,
    justifyContent: 'space-between',
  },
  summaryTileAccent: {
    borderColor: 'rgba(245,201,106,0.34)',
    backgroundColor: 'rgba(245,201,106,0.08)',
  },
  summaryTileLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryTileLabel: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  summaryTileValue: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.meta + 1,
    fontWeight: '800',
  },
  lastSessionValue: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 1,
    fontWeight: '800',
  },
  lastSessionMeta: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '600',
  },
  monthSelectorCard: {
    minHeight: 42,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: COLORS.card,
    paddingHorizontal: UI_TOKENS.spacing.xs + 2,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  monthSelectorMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthSelectorRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: UI_TOKENS.spacing.xs,
  },
  monthSelectorText: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.meta + 1,
    fontWeight: '700',
  },
  monthNavButton: {
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: COLORS.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthNavButtonDisabled: {
    opacity: 0.5,
  },
  legendIconButton: {
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewToggleWrap: {
    flexDirection: 'row',
    gap: UI_TOKENS.spacing.xs,
  },
  viewToggleButton: {
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewToggleButtonActive: {
    borderColor: 'rgba(245,201,106,0.42)',
    backgroundColor: 'rgba(245,201,106,0.12)',
  },
  errorCard: {
    marginTop: UI_TOKENS.spacing.xs,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(255,124,123,0.4)',
    backgroundColor: 'rgba(255,124,123,0.12)',
    padding: UI_TOKENS.spacing.sm,
  },
  errorText: {
    color: '#FFB4A8',
    fontSize: UI_TOKENS.typography.meta,
  },
  retryButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(255,124,123,0.45)',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  retryButtonText: {
    color: '#FFB4A8',
    fontWeight: '700',
    fontSize: UI_TOKENS.typography.meta,
  },
  loadingWrap: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: UI_TOKENS.spacing.sm,
  },
  loadingText: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
  sessionCard: {
    borderRadius: UI_TOKENS.radius.lg,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: COLORS.card,
    paddingHorizontal: UI_TOKENS.spacing.sm,
    paddingVertical: UI_TOKENS.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: UI_TOKENS.spacing.sm,
    minHeight: 76,
  },
  sessionCardEmpty: {
    opacity: 0.95,
  },
  sessionDateThumb: {
    width: 88,
    minHeight: 52,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(245,201,106,0.42)',
    backgroundColor: 'rgba(245,201,106,0.1)',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: UI_TOKENS.spacing.xs + 2,
    paddingVertical: UI_TOKENS.spacing.xs,
    flexShrink: 0,
  },
  sessionDateThumbMuted: {
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: 'rgba(162,167,179,0.08)',
  },
  sessionDatePrimaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sessionDatePrimary: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  sessionDatePrimaryMuted: {
    color: COLORS.muted,
  },
  sessionDateSecondary: {
    color: COLORS.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginTop: 1,
  },
  sessionDateSecondaryMuted: {
    color: COLORS.muted,
  },
  sessionBody: {
    flex: 1,
    minWidth: 0,
  },
  sessionInfoStack: {
    flex: 1,
    minWidth: 0,
    gap: 6,
    justifyContent: 'center',
  },
  sessionMetaPillWide: {
    minHeight: 26,
    width: '100%',
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.28)',
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: UI_TOKENS.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
  },
  sessionMetaPillText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  sessionStatusThumb: {
    width: 86,
    minHeight: 52,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    paddingHorizontal: UI_TOKENS.spacing.xs + 2,
    paddingVertical: UI_TOKENS.spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    gap: 4,
  },
  sessionStatusThumbCompact: {
    width: 40,
    minHeight: 40,
    paddingHorizontal: 0,
    gap: 0,
  },
  sessionStatusThumbSession: {
    borderColor: 'rgba(118,222,141,0.34)',
    backgroundColor: 'rgba(118,222,141,0.12)',
  },
  sessionStatusThumbEmpty: {
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: 'rgba(162,167,179,0.08)',
  },
  sessionStatusThumbText: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  sessionStatusThumbTextSession: {
    color: '#9FE3B0',
  },
  listWrap: {
    gap: UI_TOKENS.spacing.xs,
  },
  calendarWrap: {
    borderRadius: UI_TOKENS.radius.lg,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: COLORS.card,
    paddingHorizontal: UI_TOKENS.spacing.xs,
    paddingVertical: UI_TOKENS.spacing.xs,
    gap: UI_TOKENS.spacing.xs,
  },
  calendarWeekHeader: {
    flexDirection: 'row',
  },
  calendarWeekday: {
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
  calendarCell: {
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
  calendarCellBlank: {
    width: '14.2857%',
    height: 62,
    marginBottom: 5,
  },
  calendarCellSession: {
    borderColor: 'rgba(118,222,141,0.34)',
    backgroundColor: 'rgba(118,222,141,0.14)',
  },
  calendarCellRest: {
    borderColor: 'rgba(245,201,106,0.34)',
    backgroundColor: 'rgba(245,201,106,0.12)',
  },
  calendarCellEmpty: {
    borderColor: 'rgba(162,167,179,0.18)',
    backgroundColor: 'rgba(162,167,179,0.06)',
  },
  calendarCellDay: {
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 14,
  },
  calendarCellDayEmpty: {
    color: COLORS.muted,
  },
  calendarCellDayFilled: {
    color: COLORS.text,
  },
  calendarMarkerPill: {
    minWidth: 28,
    minHeight: 14,
    paddingHorizontal: 5,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarMarkerPillSession: {
    backgroundColor: 'rgba(15,18,24,0.16)',
  },
  calendarMarkerPillRest: {
    backgroundColor: 'rgba(15,18,24,0.12)',
  },
  calendarMarkerText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.1,
    textTransform: 'lowercase',
  },
  calendarMarkerTextSession: {
    color: '#CFF5D7',
  },
  calendarMarkerTextRest: {
    color: '#FFE2A1',
  },
  calendarMarkerSpacer: {
    minHeight: 14,
  },
  emptyDayTitle: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  emptyDayAction: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  emptySectionCard: {
    minHeight: 88,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: UI_TOKENS.spacing.sm,
  },
  emptyStateText: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.subtitle,
    fontWeight: '600',
    textAlign: 'center',
  },
  monthStatsCard: {
    borderRadius: UI_TOKENS.radius.lg,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.sm,
    gap: UI_TOKENS.spacing.sm,
  },
  monthStatsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: UI_TOKENS.spacing.sm,
  },
  monthStatsEyebrow: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  monthStatsTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 2,
    fontWeight: '800',
    marginTop: 3,
  },
  monthStatsHeroPill: {
    minHeight: 28,
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(90,209,232,0.28)',
    backgroundColor: 'rgba(90,209,232,0.1)',
    paddingHorizontal: UI_TOKENS.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  monthStatsHeroText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  monthStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: UI_TOKENS.spacing.xs,
  },
  legendModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,12,16,0.72)',
    justifyContent: 'center',
    paddingHorizontal: UI_TOKENS.spacing.md,
  },
  legendModalCard: {
    borderRadius: UI_TOKENS.radius.lg,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.md,
    gap: UI_TOKENS.spacing.sm,
  },
  legendModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: UI_TOKENS.spacing.sm,
  },
  legendModalTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 5,
    fontWeight: '800',
  },
  legendModalSubtitle: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
    marginTop: 2,
  },
  legendCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 10,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendSection: {
    gap: 6,
  },
  legendSectionTitle: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: UI_TOKENS.spacing.xs,
  },
  legendGridCompact: {
    flexDirection: 'row',
    gap: UI_TOKENS.spacing.xs,
  },
  legendModalStack: {
    gap: UI_TOKENS.spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
    paddingRight: UI_TOKENS.spacing.xs,
  },
  legendItemCompact: {
    minWidth: 0,
    flex: 1,
  },
  legendSwatch: {
    width: 18,
    height: 18,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  legendSwatchCompact: {
    width: 18,
    height: 18,
  },
  legendSwatchSession: {
    backgroundColor: 'rgba(118,222,141,0.16)',
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(118,222,141,0.34)',
  },
  legendSwatchRest: {
    backgroundColor: 'rgba(245,201,106,0.14)',
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(245,201,106,0.34)',
  },
  legendSwatchEmpty: {
    backgroundColor: 'rgba(162,167,179,0.1)',
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
  },
  legendSwatchIcon: {
    backgroundColor: 'rgba(162,167,179,0.1)',
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
  },
  legendSwatchMarkerText: {
    color: COLORS.text,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.2,
    textTransform: 'lowercase',
  },
  legendText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
    flexShrink: 1,
  },
});

export default GymSessionsScreen;
