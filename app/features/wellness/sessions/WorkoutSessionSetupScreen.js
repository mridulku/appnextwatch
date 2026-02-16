import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { WORKOUT_SESSION_TEMPLATES } from '../../../data/seeds/sessionSeeds';
import { createSessionHistoryId } from '../../../core/storage/sessionHistoryStorage';
import COLORS from '../../../theme/colors';

const DURATION_OPTIONS = [30, 45, 60];

function WorkoutSessionSetupScreen({ navigation }) {
  const [selectedTemplateId, setSelectedTemplateId] = useState(WORKOUT_SESSION_TEMPLATES[0]?.id);
  const [targetDuration, setTargetDuration] = useState(WORKOUT_SESSION_TEMPLATES[0]?.estimatedMinutes ?? 45);

  const selectedTemplate = useMemo(
    () => WORKOUT_SESSION_TEMPLATES.find((item) => item.id === selectedTemplateId) ?? WORKOUT_SESSION_TEMPLATES[0],
    [selectedTemplateId],
  );

  const startWorkoutSession = () => {
    if (!selectedTemplate) return;

    navigation.navigate('WorkoutSessionRun', {
      sessionId: createSessionHistoryId('workout'),
      sessionType: 'workout',
      sessionTitle: selectedTemplate.name,
      startedAt: new Date().toISOString(),
      sessionTemplate: {
        name: selectedTemplate.name,
        totalMinutes: targetDuration,
        exercises: selectedTemplate.exercises,
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Workout Session Setup</Text>
        <Text style={styles.subtitle}>Pick your template and start a focused training block.</Text>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Suggested today</Text>
          <View style={styles.suggestedRow}>
            <View style={styles.suggestedIconWrap}>
              <Ionicons name="barbell-outline" size={18} color={COLORS.accent2} />
            </View>
            <View style={styles.suggestedTextWrap}>
              <Text style={styles.suggestedTitle}>{WORKOUT_SESSION_TEMPLATES[0].name}</Text>
              <Text style={styles.suggestedMeta}>{WORKOUT_SESSION_TEMPLATES[0].estimatedMinutes} min • {WORKOUT_SESSION_TEMPLATES[0].difficulty}</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Choose workout template</Text>
          {WORKOUT_SESSION_TEMPLATES.map((template) => {
            const active = template.id === selectedTemplateId;
            return (
              <TouchableOpacity
                key={template.id}
                style={[styles.templateCard, active && styles.templateCardActive]}
                activeOpacity={0.92}
                onPress={() => {
                  setSelectedTemplateId(template.id);
                  setTargetDuration(template.estimatedMinutes);
                }}
              >
                <View>
                  <Text style={styles.templateTitle}>{template.name}</Text>
                  <Text style={styles.templateMeta}>{template.estimatedMinutes} min • {template.difficulty}</Text>
                  <Text style={styles.templateSub}>{template.exercises.length} planned exercises</Text>
                </View>
                {active ? <Ionicons name="checkmark-circle" size={18} color={COLORS.accent} /> : null}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Duration target</Text>
          <View style={styles.durationRow}>
            {DURATION_OPTIONS.map((minutes) => {
              const active = minutes === targetDuration;
              return (
                <TouchableOpacity
                  key={minutes}
                  style={[styles.durationChip, active && styles.durationChipActive]}
                  activeOpacity={0.9}
                  onPress={() => setTargetDuration(minutes)}
                >
                  <Text style={[styles.durationChipText, active && styles.durationChipTextActive]}>{minutes} min</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity style={styles.startButton} activeOpacity={0.92} onPress={startWorkoutSession}>
          <Ionicons name="play" size={15} color={COLORS.bg} />
          <Text style={styles.startButtonText}>Start</Text>
        </TouchableOpacity>
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
    paddingBottom: 26,
  },
  title: {
    color: COLORS.text,
    fontSize: 29,
    fontWeight: '700',
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 12,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.card,
    padding: 12,
    marginBottom: 10,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 9,
  },
  suggestedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  suggestedIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: 'rgba(90,209,232,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  suggestedTextWrap: {
    flex: 1,
  },
  suggestedTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  suggestedMeta: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 2,
  },
  templateCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: COLORS.cardSoft,
    padding: 10,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  templateCardActive: {
    borderColor: 'rgba(245,201,106,0.46)',
    backgroundColor: 'rgba(245,201,106,0.12)',
  },
  templateTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  templateMeta: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 2,
  },
  templateSub: {
    color: COLORS.accent2,
    fontSize: 11,
    marginTop: 5,
  },
  durationRow: {
    flexDirection: 'row',
    gap: 8,
  },
  durationChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.3)',
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  durationChipActive: {
    borderColor: 'rgba(245,201,106,0.5)',
    backgroundColor: 'rgba(245,201,106,0.16)',
  },
  durationChipText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  durationChipTextActive: {
    color: COLORS.accent,
  },
  startButton: {
    marginTop: 6,
    borderRadius: 14,
    minHeight: 46,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  startButtonText: {
    color: COLORS.bg,
    fontSize: 14,
    fontWeight: '700',
  },
});

export default WorkoutSessionSetupScreen;
