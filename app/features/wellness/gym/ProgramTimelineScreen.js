import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import COLORS from '../../../theme/colors';
import UI_TOKENS from '../../../ui/tokens';
import {
  TRAINING_BLOCK,
  getCurrentPhase,
  getCurrentWeekInBlock,
  getDaysUntilNextCheckIn,
} from './program/trainingBlock';

function ProgramTimelineScreen() {
  const [expandedWhy, setExpandedWhy] = useState(true);
  const weekInBlock = useMemo(() => getCurrentWeekInBlock(), []);
  const currentPhase = useMemo(() => getCurrentPhase(weekInBlock), [weekInBlock]);
  const daysToCheckIn = useMemo(() => getDaysUntilNextCheckIn(), []);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Training Program</Text>
          <Text style={styles.heroSubtitle}>How your plan evolves over weeks</Text>
        </View>

        <View style={styles.currentCard}>
          <Text style={styles.currentTitle}>Current status</Text>
          <Text style={styles.currentWeek}>Week {weekInBlock} / {TRAINING_BLOCK.totalWeeks}</Text>
          <View style={styles.row}>
            <Text style={styles.metaLabel}>Phase</Text>
            <Text style={styles.metaValue}>{currentPhase.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.metaLabel}>Goal</Text>
            <Text style={styles.metaValue}>{TRAINING_BLOCK.goal}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.metaLabel}>Next check-in</Text>
            <Text style={styles.metaValue}>
              {TRAINING_BLOCK.weeklyCheckIn.label} ({daysToCheckIn}d)
            </Text>
          </View>
        </View>

        <Text style={styles.sectionHeader}>Phase timeline</Text>
        {TRAINING_BLOCK.phases.map((phase, index) => {
          const isCurrent = phase.key === currentPhase.key;
          return (
            <View key={phase.key} style={[styles.phaseCard, isCurrent ? styles.phaseCurrent : null]}>
              <View style={styles.phaseHeader}>
                <View style={styles.phaseDotWrap}>
                  <View style={[styles.phaseDot, isCurrent ? styles.phaseDotCurrent : null]} />
                  {index < TRAINING_BLOCK.phases.length - 1 ? <View style={styles.phaseLine} /> : null}
                </View>

                <View style={styles.phaseMain}>
                  <View style={styles.phaseTopRow}>
                    <Text style={styles.phaseName}>{phase.name}</Text>
                    <Text style={styles.phaseWeeks}>Weeks {phase.weekStart}-{phase.weekEnd}</Text>
                  </View>
                  <Text style={styles.phaseSummary}>{phase.summary}</Text>
                  {phase.details.map((detail) => (
                    <Text key={`${phase.key}_${detail}`} style={styles.phaseDetail}>• {detail}</Text>
                  ))}
                </View>
              </View>
            </View>
          );
        })}

        <Text style={styles.sectionHeader}>How the system decides</Text>
        <View style={styles.logicCard}>
          <View style={styles.logicCol}>
            <Text style={styles.logicTitle}>Inputs</Text>
            {TRAINING_BLOCK.algorithmModel.inputs.map((input) => (
              <Text key={input} style={styles.logicItem}>• {input}</Text>
            ))}
          </View>
          <View style={styles.logicDivider} />
          <View style={styles.logicCol}>
            <Text style={styles.logicTitle}>Decisions</Text>
            {TRAINING_BLOCK.algorithmModel.decisions.map((decision) => (
              <Text key={decision} style={styles.logicItem}>• {decision}</Text>
            ))}
          </View>
        </View>

        <Text style={styles.sectionHeader}>Weekly check-in</Text>
        <View style={styles.checkinCard}>
          <View style={styles.checkinRow}>
            <Text style={styles.checkinTitle}>Once per week (2 min)</Text>
            <View style={styles.comingSoonPill}>
              <Text style={styles.comingSoonText}>Coming soon</Text>
            </View>
          </View>
          <Text style={styles.checkinItem}>• Body weight (optional)</Text>
          <Text style={styles.checkinItem}>• Waist (optional)</Text>
          <Text style={styles.checkinItem}>• Energy rating (1-5)</Text>
        </View>

        <TouchableOpacity style={styles.whyCard} activeOpacity={0.9} onPress={() => setExpandedWhy((prev) => !prev)}>
          <View style={styles.whyHeader}>
            <Text style={styles.whyTitle}>Why this matters</Text>
            <Ionicons name={expandedWhy ? 'chevron-up' : 'chevron-down'} size={14} color={COLORS.muted} />
          </View>
          {expandedWhy ? (
            <Text style={styles.whyText}>
              A clear phase model keeps progression stable and sustainable: build momentum, push load intelligently, absorb fatigue, then
              review and tune for the next block.
            </Text>
          ) : null}
        </TouchableOpacity>
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
    paddingBottom: UI_TOKENS.spacing.xl,
    gap: UI_TOKENS.spacing.sm,
  },
  heroCard: {
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.md,
  },
  heroTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.title + 3,
    fontWeight: '700',
  },
  heroSubtitle: {
    marginTop: 2,
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
  currentCard: {
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(245,201,106,0.42)',
    backgroundColor: 'rgba(245,201,106,0.09)',
    padding: UI_TOKENS.spacing.md,
    gap: 4,
  },
  currentTitle: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  currentWeek: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 3,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: UI_TOKENS.spacing.sm,
  },
  metaLabel: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
  metaValue: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
  sectionHeader: {
    marginTop: UI_TOKENS.spacing.xs,
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta + 1,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  phaseCard: {
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.sm,
  },
  phaseCurrent: {
    borderColor: 'rgba(113,228,179,0.42)',
    backgroundColor: 'rgba(113,228,179,0.1)',
  },
  phaseHeader: {
    flexDirection: 'row',
    gap: UI_TOKENS.spacing.sm,
  },
  phaseDotWrap: {
    width: 16,
    alignItems: 'center',
    paddingTop: 3,
  },
  phaseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(162,167,179,0.52)',
  },
  phaseDotCurrent: {
    backgroundColor: '#79E3B9',
  },
  phaseLine: {
    marginTop: 2,
    width: 1,
    flex: 1,
    backgroundColor: 'rgba(162,167,179,0.3)',
  },
  phaseMain: {
    flex: 1,
    gap: 2,
  },
  phaseTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: UI_TOKENS.spacing.sm,
  },
  phaseName: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 1,
    fontWeight: '700',
  },
  phaseWeeks: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
  phaseSummary: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.meta,
  },
  phaseDetail: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
  logicCard: {
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.sm,
    flexDirection: 'row',
  },
  logicCol: {
    flex: 1,
    gap: 2,
  },
  logicDivider: {
    width: UI_TOKENS.border.hairline,
    backgroundColor: 'rgba(162,167,179,0.26)',
    marginHorizontal: UI_TOKENS.spacing.sm,
  },
  logicTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.meta + 1,
    fontWeight: '700',
    marginBottom: 2,
  },
  logicItem: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
  checkinCard: {
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.sm,
    gap: 4,
  },
  checkinRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: UI_TOKENS.spacing.sm,
  },
  checkinTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.meta + 1,
    fontWeight: '700',
  },
  comingSoonPill: {
    borderRadius: 999,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.36)',
    backgroundColor: 'rgba(162,167,179,0.14)',
    paddingHorizontal: UI_TOKENS.spacing.xs + 2,
    paddingVertical: 2,
  },
  comingSoonText: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '700',
  },
  checkinItem: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
  whyCard: {
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.sm,
  },
  whyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  whyTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.meta + 1,
    fontWeight: '700',
  },
  whyText: {
    marginTop: UI_TOKENS.spacing.xs,
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
});

export default ProgramTimelineScreen;

