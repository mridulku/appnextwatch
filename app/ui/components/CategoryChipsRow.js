import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';

import COLORS from '../../theme/colors';
import UI_TOKENS from '../tokens';

function CategoryChipsRow({ categories = [], selectedCategory = 'All', onSelectCategory }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {categories.map((category) => {
        const active = category === selectedCategory;
        return (
          <TouchableOpacity
            key={category}
            style={[styles.chip, active && styles.chipActive]}
            activeOpacity={0.9}
            onPress={() => onSelectCategory(category)}
          >
            <Text style={[styles.text, active && styles.textActive]} numberOfLines={1}>
              {category}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: UI_TOKENS.spacing.sm,
    paddingTop: UI_TOKENS.spacing.sm,
    paddingBottom: UI_TOKENS.spacing.sm,
  },
  chip: {
    height: UI_TOKENS.control.chipHeight,
    borderRadius: 999,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.28)',
    backgroundColor: COLORS.card,
    paddingHorizontal: UI_TOKENS.spacing.sm,
    justifyContent: 'center',
  },
  chipActive: {
    borderColor: 'rgba(245,201,106,0.5)',
    backgroundColor: 'rgba(245,201,106,0.18)',
  },
  text: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '600',
  },
  textActive: {
    color: COLORS.accent,
    fontWeight: '700',
  },
});

export default CategoryChipsRow;
