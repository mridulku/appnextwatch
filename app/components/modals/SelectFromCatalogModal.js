import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import CategoryChipsRow from '../../ui/components/CategoryChipsRow';
import FullSheetModal from '../../ui/components/FullSheetModal';
import UI_TOKENS from '../../ui/tokens';
import COLORS from '../../theme/colors';

function SelectFromCatalogModal({
  visible,
  title,
  subtitle,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  categories,
  selectedCategory,
  onSelectCategory,
  data,
  keyExtractor,
  renderItem,
  onClose,
  doneLabel = 'Done',
  footerContent,
  emptyText = 'No items match this filter.',
}) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo?.({ y: 0, animated: false });
    }, 0);
    return () => clearTimeout(timer);
  }, [visible, selectedCategory, searchValue, data?.length]);

  return (
    <FullSheetModal
      visible={visible}
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      footer={(
        <View style={styles.footerWrap}>
          {footerContent}
          <TouchableOpacity style={styles.doneButton} activeOpacity={0.9} onPress={onClose}>
            <Text style={styles.doneButtonText}>{doneLabel}</Text>
          </TouchableOpacity>
        </View>
      )}
    >
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color={COLORS.muted} />
        <TextInput
          value={searchValue}
          onChangeText={onSearchChange}
          style={styles.searchInput}
          placeholder={searchPlaceholder}
          placeholderTextColor={COLORS.muted}
        />
      </View>

      <CategoryChipsRow
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={onSelectCategory}
      />

      <View style={styles.list}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
        >
          {data.length === 0 ? (
            <Text style={styles.emptyText}>{emptyText}</Text>
          ) : (
            data.map((item, index) => (
              <View key={keyExtractor(item, index)} style={styles.rowWrap}>
                {renderItem({ item, index })}
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </FullSheetModal>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    marginTop: UI_TOKENS.spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.3)',
    backgroundColor: COLORS.card,
    paddingHorizontal: UI_TOKENS.spacing.sm,
    height: 46,
  },
  searchInput: {
    marginLeft: UI_TOKENS.spacing.xs,
    flex: 1,
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle,
  },
  list: {
    flex: 1,
    marginTop: UI_TOKENS.spacing.xs,
  },
  listContent: {
    paddingBottom: UI_TOKENS.modal.footerHeight + UI_TOKENS.spacing.md,
  },
  rowWrap: {
    marginBottom: UI_TOKENS.spacing.sm,
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.subtitle,
    textAlign: 'center',
    marginTop: UI_TOKENS.spacing.md,
  },
  footerWrap: {
    gap: UI_TOKENS.spacing.sm,
  },
  doneButton: {
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.3)',
    backgroundColor: COLORS.card,
    alignItems: 'center',
    paddingVertical: 12,
  },
  doneButtonText: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 1,
    fontWeight: '700',
  },
});

export default SelectFromCatalogModal;
