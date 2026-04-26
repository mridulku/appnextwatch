import DateTimePicker from '@react-native-community/datetimepicker';
import { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import useGymSessions from '../../../hooks/useGymSessions';
import COLORS from '../../../theme/colors';
import UI_TOKENS from '../../../ui/tokens';
import { estimateSessionCalories, estimateSessionDurationMin } from './sessionDuration';

function formatDateInput(date) {
  return date.toISOString().slice(0, 10);
}

function formatDateLabel(date) {
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function parseInitialDate(value) {
  if (!value) return new Date();
  const parsed = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function toDateOnly(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export default function GymSessionFinalizeScreen({ navigation, route }) {
  const sessionsApi = useGymSessions();
  const creationMode = route?.params?.creationMode === 'manual_now' ? 'manual_now' : 'planned';
  const entryMode = route?.params?.entryMode === 'retro_log' ? 'retro_log' : 'default';
  const exercises = Array.isArray(route?.params?.exercises) ? route.params.exercises : [];
  const suggestedTitle = String(route?.params?.suggestedTitle || 'Session').trim() || 'Session';
  const presetDateISO = typeof route?.params?.presetDateISO === 'string' ? route.params.presetDateISO : '';
  const isManualNow = creationMode === 'manual_now';
  const isRetroLog = entryMode === 'retro_log';

  const [title, setTitle] = useState(suggestedTitle);
  const [sessionDate, setSessionDate] = useState(() => parseInitialDate(presetDateISO));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [sessionStatus, setSessionStatus] = useState(isRetroLog ? 'complete' : 'not_started');
  const [saving, setSaving] = useState(false);

  const estimatedDurationMin = useMemo(
    () => estimateSessionDurationMin(exercises.map((entry) => ({ name: entry.name, sets: entry.sets }))),
    [exercises],
  );
  const estimatedCalories = useMemo(
    () => estimateSessionCalories(estimatedDurationMin),
    [estimatedDurationMin],
  );
  const sessionDayTs = useMemo(() => toDateOnly(sessionDate).getTime(), [sessionDate]);
  const todayTs = useMemo(() => toDateOnly(new Date()).getTime(), []);
  const isPastSessionDate = sessionDayTs < todayTs;
  const isFutureSessionDate = sessionDayTs > todayTs;
  const allowedStatuses = isPastSessionDate ? ['complete'] : isFutureSessionDate ? ['not_started'] : ['not_started', 'complete'];

  useEffect(() => {
    if (!allowedStatuses.includes(sessionStatus)) {
      setSessionStatus(allowedStatuses[0]);
    }
  }, [allowedStatuses, sessionStatus]);

  const canSave = exercises.length > 0 && String(title || '').trim().length > 0 && !saving;

  const onSave = async () => {
    if (!canSave) return;
    const targetDateISO = formatDateInput(sessionDate);
    const existingSameDate = (sessionsApi.sessions || []).find((session) => String(session?.dateISO || '').slice(0, 10) === targetDateISO);
    if (existingSameDate) {
      sessionsApi.setError('Only one session is allowed per day. Open the existing session for that date instead.');
      return;
    }

    try {
      setSaving(true);
      const created = await sessionsApi.create({
        title: String(title || '').trim(),
        dateISO: targetDateISO,
        durationMin: estimatedDurationMin,
        estCalories: estimatedCalories,
        whyNote: '',
        status: 'not_started',
        exercises,
      });

      if (sessionStatus === 'complete') {
        await sessionsApi.setStatus({ sessionId: created.id, status: 'complete' });
      }

      navigation.replace('GymSessionWork', { sessionId: created.id });
    } catch (error) {
      sessionsApi.setError(error?.message || 'Could not save this session right now.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>{isRetroLog ? 'Log past session' : 'Save session'}</Text>
          <Text style={styles.title}>Name and date</Text>
          <Text style={styles.subtitle}>
            {isRetroLog
              ? 'Set the session title and confirm the date you want to log.'
              : 'Set the final session title and when this session should live in the schedule.'}
          </Text>

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Session name</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Push day"
              placeholderTextColor={COLORS.muted}
              style={styles.input}
            />
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Session date</Text>
            <TouchableOpacity style={styles.dateButton} activeOpacity={0.92} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.dateButtonText}>{formatDateLabel(sessionDate)}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Status</Text>
            <View style={styles.statusRow}>
              {allowedStatuses.includes('not_started') ? (
                <TouchableOpacity
                  style={[styles.statusChip, sessionStatus === 'not_started' ? styles.statusChipActive : null]}
                  activeOpacity={0.92}
                  onPress={() => setSessionStatus('not_started')}
                >
                  <Text style={[styles.statusChipText, sessionStatus === 'not_started' ? styles.statusChipTextActive : null]}>
                    To do
                  </Text>
                </TouchableOpacity>
              ) : null}
              {allowedStatuses.includes('complete') ? (
                <TouchableOpacity
                  style={[styles.statusChip, sessionStatus === 'complete' ? styles.statusChipActive : null]}
                  activeOpacity={0.92}
                  onPress={() => setSessionStatus('complete')}
                >
                  <Text style={[styles.statusChipText, sessionStatus === 'complete' ? styles.statusChipTextActive : null]}>
                    Completed
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <Text style={styles.statusRuleText}>
              {isPastSessionDate
                ? 'Past sessions can only be saved as completed.'
                : isFutureSessionDate
                  ? 'Future sessions can only be saved as to do.'
                  : 'Today can be saved as to do or completed.'}
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Session summary</Text>
            <Text style={styles.summaryMeta}>
              {exercises.length} exercise{exercises.length === 1 ? '' : 's'} • {exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0)} sets
            </Text>
          </View>

          {sessionsApi.error ? <Text style={styles.inlineError}>{sessionsApi.error}</Text> : null}
        </View>
      </ScrollView>

      <View style={styles.footerBar}>
        <TouchableOpacity style={styles.backButton} activeOpacity={0.92} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveButton, !canSave ? styles.saveButtonDisabled : null]}
          activeOpacity={canSave ? 0.92 : 1}
          disabled={!canSave}
          onPress={onSave}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : isRetroLog ? 'Save session' : isManualNow ? 'Save session' : 'Save session'}
          </Text>
        </TouchableOpacity>
      </View>

      {showDatePicker ? (
        <DateTimePicker
          value={sessionDate}
          mode="date"
          display="default"
          onChange={(_, nextDate) => {
            setShowDatePicker(false);
            if (nextDate) setSessionDate(nextDate);
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    paddingHorizontal: UI_TOKENS.spacing.md,
    paddingTop: UI_TOKENS.spacing.md,
    paddingBottom: 112,
  },
  card: {
    borderRadius: UI_TOKENS.radius.lg,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.lg,
    gap: UI_TOKENS.spacing.sm,
  },
  eyebrow: {
    color: COLORS.accent,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  title: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.title + 5,
    fontWeight: '800',
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.subtitle,
    lineHeight: UI_TOKENS.typography.subtitle + 7,
  },
  fieldWrap: {
    marginTop: UI_TOKENS.spacing.xs,
    gap: 6,
  },
  label: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  input: {
    minHeight: 48,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.28)',
    backgroundColor: COLORS.cardSoft,
    color: COLORS.text,
    paddingHorizontal: UI_TOKENS.spacing.sm,
    fontSize: UI_TOKENS.typography.subtitle + 1,
  },
  dateButton: {
    minHeight: 48,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(245,201,106,0.34)',
    backgroundColor: 'rgba(245,201,106,0.1)',
    justifyContent: 'center',
    paddingHorizontal: UI_TOKENS.spacing.sm,
  },
  dateButtonText: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 1,
    fontWeight: '700',
  },
  summaryCard: {
    marginTop: UI_TOKENS.spacing.sm,
    borderRadius: UI_TOKENS.radius.md,
    backgroundColor: COLORS.cardSoft,
    padding: UI_TOKENS.spacing.sm,
    gap: 4,
  },
  summaryTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle,
    fontWeight: '700',
  },
  summaryMeta: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusChip: {
    minHeight: 42,
    borderRadius: 999,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.28)',
    backgroundColor: COLORS.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  statusChipActive: {
    borderColor: 'rgba(245,201,106,0.34)',
    backgroundColor: 'rgba(245,201,106,0.12)',
  },
  statusChipText: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.meta + 1,
    fontWeight: '700',
  },
  statusChipTextActive: {
    color: COLORS.accent,
  },
  statusRuleText: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
    lineHeight: UI_TOKENS.typography.subtitle + 2,
  },
  inlineError: {
    color: '#FFB4A8',
    fontSize: UI_TOKENS.typography.meta,
  },
  footerBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(14,15,20,0.96)',
    borderTopWidth: UI_TOKENS.border.hairline,
    borderTopColor: 'rgba(162,167,179,0.18)',
    flexDirection: 'row',
    gap: UI_TOKENS.spacing.sm,
    paddingHorizontal: UI_TOKENS.spacing.md,
    paddingTop: UI_TOKENS.spacing.sm,
    paddingBottom: UI_TOKENS.spacing.md,
  },
  backButton: {
    minHeight: 46,
    minWidth: 88,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.28)',
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: UI_TOKENS.spacing.sm,
  },
  backButtonText: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle,
    fontWeight: '700',
  },
  saveButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: UI_TOKENS.radius.md,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: COLORS.bg,
    fontSize: UI_TOKENS.typography.subtitle + 1,
    fontWeight: '800',
  },
});
