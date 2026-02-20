import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import COLORS from '../../../../theme/colors';
import UI_TOKENS from '../../../../ui/tokens';
import {
  TRAINING_BLOCK,
  getCurrentPhase,
  getCurrentWeekInBlock,
  getDaysUntilNextCheckIn,
} from '../program/trainingBlock';

function GymProgramBannerCard({ onPress }) {
  const weekInBlock = useMemo(() => getCurrentWeekInBlock(), []);
  const currentPhase = useMemo(() => getCurrentPhase(weekInBlock), [weekInBlock]);
  const daysToCheckIn = useMemo(() => getDaysUntilNextCheckIn(), []);

  return (
    <TouchableOpacity style={styles.programBanner} activeOpacity={0.92} onPress={onPress}>
      <View style={styles.programLeft}>
        <Text style={styles.programTitle}>{TRAINING_BLOCK.name}</Text>
        <Text style={styles.programPhase}>Phase: {currentPhase.name}</Text>
        <Text style={styles.programMeta}>
          Next check-in: {TRAINING_BLOCK.weeklyCheckIn.label} ({daysToCheckIn}d)
        </Text>
      </View>

      <View style={styles.programRight}>
        <View style={styles.programWeekPill}>
          <Text style={styles.programWeekText}>Week {weekInBlock}/{TRAINING_BLOCK.totalWeeks}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  programBanner: {
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(96,208,255,0.42)',
    backgroundColor: 'rgba(96,208,255,0.12)',
    paddingHorizontal: UI_TOKENS.spacing.md,
    paddingVertical: UI_TOKENS.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: UI_TOKENS.spacing.sm,
  },
  programLeft: {
    flex: 1,
    minWidth: 0,
  },
  programTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 1,
    fontWeight: '700',
  },
  programPhase: {
    marginTop: 1,
    color: '#73D9FF',
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
  programMeta: {
    marginTop: 2,
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
  programRight: {
    alignItems: 'flex-end',
    gap: UI_TOKENS.spacing.xs,
  },
  programWeekPill: {
    borderRadius: 999,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(96,208,255,0.45)',
    backgroundColor: 'rgba(96,208,255,0.16)',
    paddingHorizontal: UI_TOKENS.spacing.xs + 2,
    paddingVertical: 2,
  },
  programWeekText: {
    color: '#73D9FF',
    fontSize: 10,
    fontWeight: '700',
  },
});

export default GymProgramBannerCard;

