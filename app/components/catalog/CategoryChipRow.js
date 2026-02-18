import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';

import COLORS from '../../theme/colors';

function CategoryChipRow({ categories = [], selectedCategory = 'All', onSelectCategory }) {
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
    gap: 8,
    paddingTop: 10,
    paddingBottom: 8,
  },
  chip: {
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.28)',
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  chipActive: {
    borderColor: 'rgba(245,201,106,0.5)',
    backgroundColor: 'rgba(245,201,106,0.18)',
  },
  text: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  textActive: {
    color: COLORS.accent,
    fontWeight: '700',
  },
});

export default CategoryChipRow;
