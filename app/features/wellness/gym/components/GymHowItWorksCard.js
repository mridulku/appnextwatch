import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import COLORS from '../../../../theme/colors';
import UI_TOKENS from '../../../../ui/tokens';

function GymHowItWorksCard({ title = 'How this works', points = [] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.wrap}>
      <TouchableOpacity style={styles.header} activeOpacity={0.9} onPress={() => setExpanded((prev) => !prev)}>
        <View style={styles.headerLeft}>
          <Ionicons name="information-circle-outline" size={14} color={COLORS.muted} />
          <Text style={styles.title}>{title}</Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={COLORS.muted} />
      </TouchableOpacity>

      {expanded ? (
        <View style={styles.content}>
          {points.map((point, index) => (
            <Text key={`${point.slice(0, 20)}_${index}`} style={styles.point}>
              {`\u2022 ${point}`}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: 'rgba(17,20,29,0.62)',
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: UI_TOKENS.spacing.sm,
    paddingVertical: UI_TOKENS.spacing.xs + 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta + 1,
    fontWeight: '700',
  },
  content: {
    borderTopWidth: UI_TOKENS.border.hairline,
    borderTopColor: 'rgba(162,167,179,0.2)',
    paddingHorizontal: UI_TOKENS.spacing.sm,
    paddingTop: UI_TOKENS.spacing.xs,
    paddingBottom: UI_TOKENS.spacing.sm,
    gap: 4,
  },
  point: {
    color: '#B8C0CF',
    fontSize: UI_TOKENS.typography.meta,
    lineHeight: 16,
  },
});

export default GymHowItWorksCard;
