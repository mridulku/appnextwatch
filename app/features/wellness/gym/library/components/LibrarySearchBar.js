import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import COLORS from '../../../../../theme/colors';
import UI_TOKENS from '../../../../../ui/tokens';

function LibrarySearchBar({
  value,
  onChangeText,
  onOpenFilters,
  filterCount = 0,
  showFilterButton = true,
  placeholder = 'Search muscles, exercises, machines',
}) {
  return (
    <View style={styles.row}>
      <View style={styles.inputWrap}>
        <Ionicons name="search-outline" size={16} color={COLORS.muted} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.muted}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>
      {showFilterButton ? (
        <TouchableOpacity style={styles.filterButton} activeOpacity={0.9} onPress={onOpenFilters}>
          <Ionicons name="options-outline" size={16} color={COLORS.text} />
          {filterCount ? <View style={styles.countDot} /> : null}
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: UI_TOKENS.spacing.xs,
  },
  inputWrap: {
    flex: 1,
    minHeight: 42,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.28)',
    backgroundColor: COLORS.card,
    paddingHorizontal: UI_TOKENS.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: UI_TOKENS.spacing.xs,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle,
    paddingVertical: 8,
  },
  filterButton: {
    width: 42,
    height: 42,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.28)',
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.accent,
  },
});

export default LibrarySearchBar;
