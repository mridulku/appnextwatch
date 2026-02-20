import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import COLORS from '../../../theme/colors';
import UI_TOKENS from '../../../ui/tokens';
import {
  buildWorkoutWeekSections,
  formatDaySubtitle,
  formatDayTitle,
  getDayTypeLabel,
  getStatusLabel,
} from './gymLogWeeks';

function GymLogsScreen({ navigation }) {
  const { todayDay, currentWeek, earlierThisWeek, laterThisWeek, pastWeeks, upcomingWeeks } = useMemo(
    () => buildWorkoutWeekSections(),
    [],
  );

  const [expandedMap, setExpandedMap] = useState({
    [currentWeek.startDate]: true,
  });

  const toggleWeek = (startDate) => {
    setExpandedMap((prev) => ({ ...prev, [startDate]: !prev[startDate] }));
  };

  const openDayDetail = (day) => {
    if (!day || day.plannedType === 'rest' || !day.detail) return;
    navigation?.navigate('GymLogDetail', { logId: day.detail.id, log: day.detail });
  };

  const renderStatusPill = (status) => {
    const styleMap = {
      completed: [styles.statusPill, styles.statusCompleted],
      missed: [styles.statusPill, styles.statusMissed],
      rest: [styles.statusPill, styles.statusRest],
      planned: [styles.statusPill, styles.statusPlanned],
    };

    const textMap = {
      completed: [styles.statusText, styles.statusCompletedText],
      missed: [styles.statusText, styles.statusMissedText],
      rest: [styles.statusText, styles.statusRestText],
      planned: [styles.statusText, styles.statusPlannedText],
    };

    return (
      <View style={styleMap[status] || styleMap.planned}>
        <Text style={textMap[status] || textMap.planned}>{getStatusLabel(status)}</Text>
      </View>
    );
  };

  const renderDayRow = (day) => {
    const isRest = day.plannedType === 'rest';
    const isCompleted = day.status === 'completed';

    return (
      <TouchableOpacity
        key={day.dateISO}
        style={styles.dayRow}
        activeOpacity={isRest ? 1 : 0.9}
        onPress={() => openDayDetail(day)}
        disabled={isRest}
      >
        <View style={styles.dayLeft}>
          <Text style={styles.dayTitle}>{formatDayTitle(day.dateISO)}</Text>
          <Text style={styles.daySubtitle}>{formatDaySubtitle(day.dateISO)}</Text>
        </View>

        <View style={styles.dayMiddle}>
          <View style={[styles.typePill, isRest ? styles.typeRestPill : styles.typeWorkoutPill]}>
            <Text style={[styles.typePillText, isRest ? styles.typeRestText : styles.typeWorkoutText]}>
              {getDayTypeLabel(day.plannedType)}
            </Text>
          </View>
        </View>

        <View style={styles.dayRight}>
          {renderStatusPill(day.status)}
          {isCompleted && day.summary ? (
            <Text style={styles.metricText}>{day.summary.durationMin || 0}m • {day.summary.sets || 0} sets</Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const renderWeekCard = (week) => {
    const isExpanded = Boolean(expandedMap[week.startDate]);

    return (
      <View key={week.startDate} style={styles.weekWrap}>
        <TouchableOpacity style={styles.weekHeaderCard} activeOpacity={0.92} onPress={() => toggleWeek(week.startDate)}>
          <View>
            <Text style={styles.weekTitle}>Week {week.weekIndex}</Text>
            <Text style={styles.weekSubtitle}>{week.rangeLabel}</Text>
          </View>

          <View style={styles.weekRight}>
            <View style={[styles.weekSummaryPill, week.weekKind === 'upcoming' ? styles.weekDraftPill : null]}>
              <Text style={[styles.weekSummaryText, week.weekKind === 'upcoming' ? styles.weekDraftText : null]}>
                {week.completionSummary.label}
              </Text>
            </View>
            <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.muted} />
          </View>
        </TouchableOpacity>

        {isExpanded ? <View style={styles.daysCard}>{week.days.map(renderDayRow)}</View> : null}
      </View>
    );
  };

  const sectionItems = [
    { key: 'today', kind: 'today' },
    { key: 'this_week', kind: 'this_week' },
    { key: 'past_weeks', kind: 'weeks', title: 'Past weeks', weeks: pastWeeks },
    { key: 'upcoming_weeks', kind: 'weeks', title: 'Upcoming weeks', weeks: upcomingWeeks },
  ];

  return (
    <View style={styles.container}>
      <FlatList
        data={sectionItems}
        keyExtractor={(item) => item.key}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          if (item.kind === 'today') {
            return (
              <View style={styles.sectionWrap}>
                <Text style={styles.sectionHeader}>Today</Text>
                {todayDay ? (
                  <TouchableOpacity style={styles.todayCard} activeOpacity={0.92} onPress={() => openDayDetail(todayDay)}>
                    <View style={styles.todayLeft}>
                      <Text style={styles.todayDate}>{formatDayTitle(todayDay.dateISO)}, {formatDaySubtitle(todayDay.dateISO)}</Text>
                      <Text style={styles.todayType}>{getDayTypeLabel(todayDay.plannedType)}</Text>
                    </View>

                    <View style={styles.todayRight}>
                      {renderStatusPill(todayDay.status === 'planned' ? 'planned' : todayDay.status)}
                      <View style={styles.todayActionPill}>
                        <Text style={styles.todayActionText}>
                          {todayDay.status === 'completed' ? 'View details' : 'View plan'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          }

          if (item.kind === 'this_week') {
            return (
              <View style={styles.sectionWrap}>
                <Text style={styles.sectionHeader}>This week</Text>
                <View style={styles.weekSplitCard}>
                  <Text style={styles.subSectionHeader}>Earlier this week</Text>
                  {earlierThisWeek.length ? earlierThisWeek.map(renderDayRow) : <Text style={styles.emptyWeekText}>No earlier days.</Text>}

                  <Text style={[styles.subSectionHeader, styles.subSectionSpacing]}>Later this week</Text>
                  {laterThisWeek.length ? laterThisWeek.map(renderDayRow) : <Text style={styles.emptyWeekText}>No later days.</Text>}
                </View>
              </View>
            );
          }

          return (
            <View style={styles.sectionWrap}>
              <Text style={styles.sectionHeader}>{item.title}</Text>
              {(item.weeks || []).map(renderWeekCard)}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: UI_TOKENS.spacing.md,
    paddingTop: UI_TOKENS.spacing.sm,
  },
  listContent: {
    paddingBottom: UI_TOKENS.spacing.xl,
  },
  sectionWrap: {
    marginBottom: UI_TOKENS.spacing.md,
  },
  sectionHeader: {
    marginBottom: UI_TOKENS.spacing.xs,
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta + 1,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  todayCard: {
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(245,201,106,0.42)',
    backgroundColor: 'rgba(245,201,106,0.09)',
    paddingHorizontal: UI_TOKENS.spacing.md,
    paddingVertical: UI_TOKENS.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  todayLeft: {
    flex: 1,
    minWidth: 0,
  },
  todayDate: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '600',
  },
  todayType: {
    marginTop: 2,
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 1,
    fontWeight: '700',
  },
  todayRight: {
    alignItems: 'flex-end',
    gap: UI_TOKENS.spacing.xs,
  },
  todayActionPill: {
    borderRadius: 999,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.34)',
    backgroundColor: COLORS.card,
    paddingHorizontal: UI_TOKENS.spacing.xs + 2,
    paddingVertical: 2,
  },
  todayActionText: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: '700',
  },
  weekSplitCard: {
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.card,
    overflow: 'hidden',
  },
  subSectionHeader: {
    paddingHorizontal: UI_TOKENS.spacing.sm,
    paddingTop: UI_TOKENS.spacing.sm,
    paddingBottom: UI_TOKENS.spacing.xs,
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  subSectionSpacing: {
    marginTop: UI_TOKENS.spacing.xs,
  },
  emptyWeekText: {
    paddingHorizontal: UI_TOKENS.spacing.sm,
    paddingBottom: UI_TOKENS.spacing.sm,
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
  weekWrap: {
    marginBottom: UI_TOKENS.spacing.xs,
  },
  weekHeaderCard: {
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.card,
    paddingHorizontal: UI_TOKENS.spacing.sm,
    paddingVertical: UI_TOKENS.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weekTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 1,
    fontWeight: '700',
  },
  weekSubtitle: {
    marginTop: 2,
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
  weekRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  weekSummaryPill: {
    borderRadius: 999,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(113,228,179,0.4)',
    backgroundColor: 'rgba(113,228,179,0.16)',
    paddingHorizontal: UI_TOKENS.spacing.xs + 2,
    paddingVertical: 2,
  },
  weekSummaryText: {
    color: '#79E3B9',
    fontSize: 10,
    fontWeight: '700',
  },
  weekDraftPill: {
    borderColor: 'rgba(162,167,179,0.38)',
    backgroundColor: 'rgba(162,167,179,0.14)',
  },
  weekDraftText: {
    color: COLORS.muted,
  },
  daysCard: {
    marginTop: UI_TOKENS.spacing.xs,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.cardSoft,
    overflow: 'hidden',
  },
  dayRow: {
    paddingHorizontal: UI_TOKENS.spacing.sm,
    paddingVertical: UI_TOKENS.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: UI_TOKENS.border.hairline,
    borderBottomColor: 'rgba(162,167,179,0.18)',
  },
  dayLeft: {
    width: 78,
  },
  dayTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.meta + 1,
    fontWeight: '700',
  },
  daySubtitle: {
    marginTop: 1,
    color: COLORS.muted,
    fontSize: 10,
  },
  dayMiddle: {
    flex: 1,
    paddingHorizontal: UI_TOKENS.spacing.xs,
  },
  typePill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: UI_TOKENS.border.hairline,
    paddingHorizontal: UI_TOKENS.spacing.xs + 2,
    paddingVertical: 2,
  },
  typeWorkoutPill: {
    borderColor: 'rgba(245,201,106,0.44)',
    backgroundColor: 'rgba(245,201,106,0.16)',
  },
  typeRestPill: {
    borderColor: 'rgba(162,167,179,0.36)',
    backgroundColor: 'rgba(162,167,179,0.14)',
  },
  typePillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  typeWorkoutText: {
    color: COLORS.accent,
  },
  typeRestText: {
    color: COLORS.muted,
  },
  dayRight: {
    width: 108,
    alignItems: 'flex-end',
    gap: 3,
  },
  statusPill: {
    borderRadius: 999,
    borderWidth: UI_TOKENS.border.hairline,
    paddingHorizontal: UI_TOKENS.spacing.xs + 2,
    paddingVertical: 2,
  },
  statusCompleted: {
    borderColor: 'rgba(113,228,179,0.48)',
    backgroundColor: 'rgba(113,228,179,0.16)',
  },
  statusPlanned: {
    borderColor: 'rgba(245,201,106,0.48)',
    backgroundColor: 'rgba(245,201,106,0.16)',
  },
  statusMissed: {
    borderColor: 'rgba(255,130,130,0.42)',
    backgroundColor: 'rgba(255,130,130,0.16)',
  },
  statusRest: {
    borderColor: 'rgba(162,167,179,0.34)',
    backgroundColor: 'rgba(162,167,179,0.14)',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusCompletedText: {
    color: '#79E3B9',
  },
  statusPlannedText: {
    color: COLORS.accent,
  },
  statusMissedText: {
    color: '#FF9D9D',
  },
  statusRestText: {
    color: COLORS.muted,
  },
  metricText: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'right',
  },
});

export default GymLogsScreen;
