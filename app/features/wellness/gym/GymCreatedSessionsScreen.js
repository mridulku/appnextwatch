import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import useGymSessions from '../../../hooks/useGymSessions';
import COLORS from '../../../theme/colors';
import UI_TOKENS from '../../../ui/tokens';

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

function getDisplayStatus(session) {
  const rawStatus = String(session?.status || '').toLowerCase();
  if (rawStatus === 'complete') return 'complete';
  if (rawStatus === 'in_progress') return 'ongoing';

  const baseDate = session?.dateISO || session?.createdAt || null;
  const date = baseDate ? new Date(baseDate) : null;
  if (!date || Number.isNaN(date.getTime())) return 'upcoming';

  const today = new Date();
  const sessionDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  if (sessionDay < todayDay) return 'expired';
  return 'upcoming';
}

function getStatusMeta(status) {
  if (status === 'ongoing') {
    return { label: 'Ongoing', badgeTone: 'warn', icon: 'play' };
  }
  return { label: 'Upcoming', badgeTone: 'default', icon: 'calendar' };
}

function SessionCard({ session, navigation }) {
  const statusMeta = getStatusMeta(getDisplayStatus(session));
  const dateParts = getSessionDateParts(session);
  const displayStatus = getDisplayStatus(session);

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
          statusMeta.badgeTone === 'warn' ? styles.sessionStatusThumbWarn : styles.sessionStatusThumbDefault,
        ]}
      >
        <Ionicons
          name={statusMeta.icon}
          size={14}
          color={statusMeta.badgeTone === 'warn' ? '#FFB98F' : COLORS.muted}
        />
        <Text
          style={[
            styles.sessionStatusThumbText,
            statusMeta.badgeTone === 'warn' ? styles.sessionStatusThumbTextWarn : styles.sessionStatusThumbTextDefault,
          ]}
          numberOfLines={2}
        >
          {statusMeta.label}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function GymCreatedSessionsScreen() {
  const navigation = useNavigation();
  const sessionsApi = useGymSessions();

  const createdSessions = useMemo(() => {
    return (sessionsApi.sessions || []).filter((session) => {
      const status = getDisplayStatus(session);
      return status === 'upcoming' || status === 'ongoing';
    });
  }, [sessionsApi.sessions]);

  useFocusEffect(
    useCallback(() => {
      sessionsApi.refresh();
    }, [sessionsApi.refresh]),
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {sessionsApi.loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading created sessions...</Text>
        </View>
      ) : createdSessions.length > 0 ? (
        <View style={styles.listWrap}>
          {createdSessions.map((session) => (
            <SessionCard key={session.id} session={session} navigation={navigation} />
          ))}
        </View>
      ) : (
        <View style={styles.emptySectionCard}>
          <Text style={styles.emptyStateText}>No created sessions yet.</Text>
        </View>
      )}
    </ScrollView>
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
    paddingBottom: UI_TOKENS.spacing.xl,
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
  listWrap: {
    gap: UI_TOKENS.spacing.xs,
  },
  emptySectionCard: {
    minHeight: 180,
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
  sessionDateSecondary: {
    color: COLORS.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginTop: 1,
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
  sessionStatusThumbDefault: {
    borderColor: 'rgba(162,167,179,0.3)',
    backgroundColor: 'rgba(162,167,179,0.12)',
  },
  sessionStatusThumbWarn: {
    borderColor: 'rgba(255,164,116,0.45)',
    backgroundColor: 'rgba(255,164,116,0.16)',
  },
  sessionStatusThumbText: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  sessionStatusThumbTextDefault: {
    color: COLORS.muted,
  },
  sessionStatusThumbTextWarn: {
    color: '#FFB98F',
  },
});
