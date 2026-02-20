import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import COLORS from '../../theme/colors';
import UI_TOKENS from '../tokens';

function formatCountLabel(count) {
  if (count === null || count === undefined) return '— items';
  if (count === 1) return '1 item';
  return `${count} items`;
}

function SetupWidget({
  sections,
  completedCount,
  totalCount,
  loading,
  onPressSection,
}) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>Setup</Text>
          <Text style={styles.subtitle}>Finish setup to unlock planning</Text>
        </View>
        <View style={styles.progressPill}>
          <Text style={styles.progressText}>
            {loading ? `—/${totalCount}` : `${completedCount}/${totalCount}`} complete
          </Text>
        </View>
      </View>

      <View style={styles.rowsWrap}>
        {sections.map((section) => (
          <TouchableOpacity
            key={section.key}
            style={styles.row}
            activeOpacity={0.9}
            onPress={() => onPressSection?.(section)}
          >
            <View style={styles.iconWrap}>
              <Ionicons name={section.icon} size={15} color={COLORS.accent2} />
            </View>

            <View style={styles.textWrap}>
              <Text style={styles.rowTitle}>{section.title}</Text>
              <Text style={styles.rowMeta}>
                {section.subtitle} · {formatCountLabel(section.count)}
              </Text>
            </View>

            <View style={[styles.statePill, section.isComplete ? styles.stateDone : styles.stateSetup]}>
              {loading ? (
                <ActivityIndicator size="small" color={COLORS.muted} />
              ) : section.isComplete ? (
                <>
                  <Ionicons name="checkmark-circle" size={12} color="#7DE7BF" />
                  <Text style={[styles.stateText, styles.stateDoneText]}>Done</Text>
                </>
              ) : (
                <>
                  <Ionicons name="ellipse-outline" size={11} color={COLORS.accent} />
                  <Text style={[styles.stateText, styles.stateSetupText]}>Setup</Text>
                </>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: UI_TOKENS.radius.lg,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.22)',
    paddingHorizontal: UI_TOKENS.spacing.md,
    paddingVertical: UI_TOKENS.spacing.md,
    marginBottom: UI_TOKENS.spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: UI_TOKENS.spacing.sm,
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.title,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 2,
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
  progressPill: {
    borderRadius: 999,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(245,201,106,0.42)',
    backgroundColor: 'rgba(245,201,106,0.14)',
    paddingHorizontal: UI_TOKENS.spacing.sm,
    paddingVertical: 5,
  },
  progressText: {
    color: COLORS.accent,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
  rowsWrap: {
    marginTop: UI_TOKENS.spacing.sm,
    gap: UI_TOKENS.spacing.xs,
  },
  row: {
    minHeight: 50,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: UI_TOKENS.spacing.sm,
    paddingVertical: UI_TOKENS.spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: UI_TOKENS.spacing.sm,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: 'rgba(90,209,232,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle,
    fontWeight: '700',
  },
  rowMeta: {
    marginTop: 1,
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
  statePill: {
    minWidth: 68,
    height: 30,
    borderRadius: 999,
    borderWidth: UI_TOKENS.border.hairline,
    paddingHorizontal: UI_TOKENS.spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  stateDone: {
    borderColor: 'rgba(109,225,176,0.4)',
    backgroundColor: 'rgba(109,225,176,0.16)',
  },
  stateSetup: {
    borderColor: 'rgba(245,201,106,0.4)',
    backgroundColor: 'rgba(245,201,106,0.12)',
  },
  stateText: {
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
  stateDoneText: {
    color: '#7DE7BF',
  },
  stateSetupText: {
    color: COLORS.accent,
  },
});

export default SetupWidget;
