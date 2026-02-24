import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { getGymTemplateDetail } from '../../../core/api/gymTemplatesDb';
import useGymSessions from '../../../hooks/useGymSessions';
import COLORS from '../../../theme/colors';
import UI_TOKENS from '../../../ui/tokens';
import GymLogDetailScreen from './GymLogDetailScreen';

function getTomorrowISO() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function mapTemplateToSessionLikeLog(template) {
  return {
    id: `template_${template.id}`,
    dateISO: getTomorrowISO(),
    dayType: template.name,
    workoutType: template.name,
    durationMin: 60,
    status: 'planned',
    summary: {
      estCalories: '—',
    },
    decisionTrace: {
      phase: 'Template',
      lastSignal: 'Catalog template blueprint',
      adjustment: 'Use this as your planned structure and create a trackable session instance.',
      note: template.description || 'Template blueprint for a standard training day.',
    },
    exercises: (template.exercises || []).map((exercise) => ({
      id: exercise.id,
      name: exercise.name,
      muscleGroup: exercise.primaryMuscleGroup || 'Muscle',
      equipment: exercise.equipment || 'Equipment',
      planned_sets: (exercise.sets || []).map((setRow, index) => ({
        set: setRow.setIndex || index + 1,
        reps: Number(setRow.plannedReps) || 0,
        weight: Number(setRow.plannedWeightKg) || 0,
      })),
      actual_sets: [],
    })),
  };
}

function mapTemplateToCreatePayload(template) {
  return {
    title: template.name,
    dateISO: new Date().toISOString().slice(0, 10),
    durationMin: 60,
    estCalories: '',
    whyNote: template.description || '',
    exercises: (template.exercises || []).map((exercise) => ({
      libraryId: exercise.exerciseId,
      name: exercise.name,
      muscle: exercise.primaryMuscleGroup || 'Muscle',
      equipment: exercise.equipment || 'Equipment',
      sets: (exercise.sets || []).map((setRow, index) => ({
        id: `set_${exercise.id}_${setRow.setIndex || index + 1}`,
        setNumber: setRow.setIndex || index + 1,
        reps: String(setRow.plannedReps ?? ''),
        weight: String(setRow.plannedWeightKg ?? ''),
      })),
    })),
  };
}

function GymTemplateDetailScreen({ route, navigation }) {
  const templateId = route.params?.templateId;
  const sessionsApi = useGymSessions();

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [template, setTemplate] = useState(null);

  useEffect(() => {
    let mounted = true;

    const hydrate = async () => {
      try {
        setLoading(true);
        setError('');
        const detail = await getGymTemplateDetail(templateId);
        if (mounted) setTemplate(detail);
      } catch (nextError) {
        if (mounted) setError(nextError?.message || 'Could not load this template right now.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    hydrate();

    return () => {
      mounted = false;
    };
  }, [templateId]);

  const logPayload = useMemo(() => {
    if (!template) return null;
    return mapTemplateToSessionLikeLog(template);
  }, [template]);

  const createFromTemplate = async () => {
    if (!template || creating) return;

    try {
      setCreating(true);
      setError('');
      const payload = mapTemplateToCreatePayload(template);
      const created = await sessionsApi.create(payload);
      navigation.replace('GymSessionWork', { sessionId: created.id });
    } catch (nextError) {
      setError(nextError?.message || 'Could not create session from template.');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={COLORS.accent} />
        <Text style={styles.centeredText}>Loading template...</Text>
      </View>
    );
  }

  if (error && !template) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Template unavailable</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!template || !logPayload) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Template unavailable</Text>
        <Text style={styles.errorText}>Template not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GymLogDetailScreen
        navigation={navigation}
        route={{ params: { logId: logPayload.id, log: logPayload } }}
      />

      <View style={styles.bottomActions}>
        {error ? <Text style={styles.inlineError}>{error}</Text> : null}
        <TouchableOpacity
          style={[styles.primaryButton, creating ? styles.primaryButtonDisabled : null]}
          activeOpacity={creating ? 1 : 0.9}
          onPress={createFromTemplate}
          disabled={creating}
        >
          <Text style={styles.primaryButtonText}>{creating ? 'Creating session...' : 'Create Session from Template'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  centered: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: UI_TOKENS.spacing.md,
  },
  centeredText: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
  errorTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 1,
    fontWeight: '700',
  },
  errorText: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
    textAlign: 'center',
  },
  bottomActions: {
    position: 'absolute',
    left: UI_TOKENS.spacing.md,
    right: UI_TOKENS.spacing.md,
    bottom: UI_TOKENS.spacing.md,
    gap: 6,
  },
  inlineError: {
    color: '#FFB4A8',
    fontSize: UI_TOKENS.typography.meta,
    textAlign: 'center',
  },
  primaryButton: {
    minHeight: 44,
    borderRadius: UI_TOKENS.radius.md,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(245,201,106,0.55)',
  },
  primaryButtonDisabled: {
    opacity: 0.65,
  },
  primaryButtonText: {
    color: COLORS.bg,
    fontSize: UI_TOKENS.typography.body,
    fontWeight: '800',
  },
});

export default GymTemplateDetailScreen;
