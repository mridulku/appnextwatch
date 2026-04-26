import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import COLORS from '../../../../../theme/colors';
import UI_TOKENS from '../../../../../ui/tokens';

function LibraryActiveFilterChips({
  chips = [],
  onRemove,
  onClearAll,
}) {
  if (!chips.length) return null;

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {chips.map((chip) => (
          <TouchableOpacity key={`${chip.type}_${chip.id}`} style={styles.chip} activeOpacity={0.9} onPress={() => onRemove?.(chip)}>
            <Text style={styles.chipText} numberOfLines={1}>{chip.label}</Text>
            <Ionicons name="close" size={12} color={COLORS.muted} />
          </TouchableOpacity>
        ))}
      </ScrollView>
      <TouchableOpacity style={styles.clearButton} activeOpacity={0.9} onPress={onClearAll}>
        <Text style={styles.clearButtonText}>Clear all</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: UI_TOKENS.spacing.xs,
    gap: UI_TOKENS.spacing.xs,
  },
  scrollContent: {
    gap: UI_TOKENS.spacing.xs,
    paddingRight: 8,
  },
  chip: {
    maxWidth: 220,
    minHeight: 30,
    borderRadius: UI_TOKENS.radius.lg,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(245,201,106,0.45)',
    backgroundColor: 'rgba(245,201,106,0.14)',
    paddingHorizontal: UI_TOKENS.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipText: {
    color: COLORS.accent,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
    flexShrink: 1,
  },
  clearButton: {
    alignSelf: 'flex-start',
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.35)',
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: UI_TOKENS.spacing.sm,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
});

export default LibraryActiveFilterChips;
