import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View, Image, TouchableOpacity } from 'react-native';

import { ITEM_PLACEHOLDER_IMAGE } from '../../../../core/placeholders';
import COLORS from '../../../../theme/colors';
import UI_TOKENS from '../../../../ui/tokens';

function asNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getVolume(sets = []) {
  return (sets || []).reduce((sum, setRow) => sum + asNumber(setRow.reps) * asNumber(setRow.weight), 0);
}

function SetsList({ sets, tone = 'planned' }) {
  return (
    <View style={styles.setsList}>
      {(sets || []).map((setRow) => (
        <View key={`${tone}_${setRow.set}`} style={styles.setRow}>
          <View style={[styles.setChip, tone === 'actual' ? styles.setChipActual : styles.setChipPlanned]}>
            <Text style={[styles.setChipText, tone === 'actual' ? styles.setChipTextActual : styles.setChipTextPlanned]}>
              Set {setRow.set}
            </Text>
          </View>
          <Text style={styles.setRowText}>{asNumber(setRow.reps)} reps</Text>
          <Text style={styles.setRowDot}>•</Text>
          <Text style={styles.setRowText}>{asNumber(setRow.weight)} kg</Text>
        </View>
      ))}
    </View>
  );
}

function LogExerciseCard({ exercise, expanded, onToggle, onLogPress }) {
  const plannedSets = exercise?.planned_sets || [];
  const actualSets = exercise?.actual_sets;
  const isLogged = exercise?.status === 'logged' || (Array.isArray(actualSets) && actualSets.length > 0);

  const plannedVolume = getVolume(plannedSets);
  const actualVolume = getVolume(actualSets || []);
  const deltaVolume = isLogged ? actualVolume - plannedVolume : null;

  return (
    <View style={styles.container}>
      <Pressable onPress={onToggle} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
        <View style={styles.left}>
          <Image source={ITEM_PLACEHOLDER_IMAGE} style={styles.image} resizeMode="cover" />
        </View>

        <View style={styles.middle}>
          <Text style={styles.title} numberOfLines={2}>{exercise?.name || 'Exercise'}</Text>
          <Text style={styles.meta} numberOfLines={1}>
            {exercise?.primaryGroup || 'Muscle'} • {exercise?.equipment || 'Equipment'}
          </Text>
        </View>

        <View style={styles.right}>
          {isLogged ? (
            <View style={[styles.statusPill, styles.statusLogged]}>
              <Text style={[styles.statusText, styles.statusLoggedText]}>Logged</Text>
            </View>
          ) : (
            <View style={[styles.statusPill, styles.statusPlanned]}>
              <Text style={[styles.statusText, styles.statusPlannedText]}>Planned</Text>
            </View>
          )}

          <View style={styles.viewPill}>
            <Text style={styles.viewPillText}>View sets</Text>
            <Ionicons name={expanded ? 'chevron-down' : 'chevron-forward'} size={12} color={COLORS.muted} />
          </View>
        </View>
      </Pressable>

      {expanded ? (
        <View style={styles.expandWrap}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="list-outline" size={14} color={COLORS.muted} />
            <Text style={styles.sectionHeaderText}>Planned</Text>
          </View>
          <SetsList sets={plannedSets} tone="planned" />

          {isLogged ? (
            <>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="checkmark-done-outline" size={14} color="#79E3B9" />
                <Text style={styles.sectionHeaderText}>Actual</Text>
                {deltaVolume !== null && deltaVolume !== 0 ? (
                  <View style={styles.deltaPill}>
                    <Text style={styles.deltaPillText}>{deltaVolume > 0 ? '+' : ''}{Math.round(deltaVolume)} kg volume</Text>
                  </View>
                ) : null}
              </View>
              <SetsList sets={actualSets || []} tone="actual" />
            </>
          ) : (
            <TouchableOpacity style={styles.inlineLogCta} activeOpacity={0.92} onPress={onLogPress}>
              <Text style={styles.inlineLogCtaText}>Log this exercise</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: UI_TOKENS.spacing.xs,
  },
  card: {
    borderRadius: UI_TOKENS.radius.lg,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.md,
    flexDirection: 'row',
    gap: UI_TOKENS.spacing.sm,
    minHeight: UI_TOKENS.card.minHeight,
  },
  cardPressed: {
    backgroundColor: COLORS.cardSoft,
  },
  left: {
    width: UI_TOKENS.card.imageSize,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  image: {
    width: UI_TOKENS.card.imageSize,
    height: UI_TOKENS.card.imageSize,
    borderRadius: UI_TOKENS.card.imageRadius,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: 'rgba(162,167,179,0.1)',
  },
  middle: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  title: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 2,
    fontWeight: '700',
    lineHeight: 20,
  },
  meta: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
    marginTop: UI_TOKENS.spacing.xs,
  },
  right: {
    width: 130,
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
  },
  statusPill: {
    borderRadius: 999,
    borderWidth: UI_TOKENS.border.hairline,
    paddingHorizontal: UI_TOKENS.spacing.xs + 3,
    paddingVertical: 3,
  },
  statusLogged: {
    borderColor: 'rgba(113,228,179,0.48)',
    backgroundColor: 'rgba(113,228,179,0.16)',
  },
  statusPlanned: {
    borderColor: 'rgba(245,201,106,0.48)',
    backgroundColor: 'rgba(245,201,106,0.16)',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusLoggedText: {
    color: '#79E3B9',
  },
  statusPlannedText: {
    color: COLORS.accent,
  },
  viewPill: {
    marginTop: 2,
    borderRadius: 999,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.32)',
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: UI_TOKENS.spacing.xs + 2,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewPillText: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '700',
  },
  expandWrap: {
    marginTop: UI_TOKENS.spacing.xs,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: COLORS.cardSoft,
    padding: UI_TOKENS.spacing.sm,
    gap: UI_TOKENS.spacing.xs,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionHeaderText: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
  deltaPill: {
    marginLeft: 'auto',
    borderRadius: 999,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(245,201,106,0.45)',
    backgroundColor: 'rgba(245,201,106,0.16)',
    paddingHorizontal: UI_TOKENS.spacing.xs + 2,
    paddingVertical: 2,
  },
  deltaPillText: {
    color: COLORS.accent,
    fontSize: 10,
    fontWeight: '700',
  },
  setsList: {
    gap: 6,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  setChip: {
    borderRadius: 999,
    borderWidth: UI_TOKENS.border.hairline,
    paddingHorizontal: UI_TOKENS.spacing.xs + 2,
    paddingVertical: 2,
  },
  setChipPlanned: {
    borderColor: 'rgba(162,167,179,0.3)',
    backgroundColor: 'rgba(162,167,179,0.12)',
  },
  setChipActual: {
    borderColor: 'rgba(113,228,179,0.42)',
    backgroundColor: 'rgba(113,228,179,0.14)',
  },
  setChipText: {
    fontSize: 10,
    fontWeight: '700',
  },
  setChipTextPlanned: {
    color: COLORS.muted,
  },
  setChipTextActual: {
    color: '#79E3B9',
  },
  setRowText: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '600',
  },
  setRowDot: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
  inlineLogCta: {
    marginTop: 2,
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(245,201,106,0.5)',
    backgroundColor: 'rgba(245,201,106,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 34,
  },
  inlineLogCtaText: {
    color: COLORS.accent,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
});

export default LogExerciseCard;
