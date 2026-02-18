import { Ionicons } from '@expo/vector-icons';
import { FlatList, Modal, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import CategoryChipRow from '../catalog/CategoryChipRow';
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
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerRow}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          <TouchableOpacity style={styles.closeButton} activeOpacity={0.9} onPress={onClose}>
            <Ionicons name="close" size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>

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

        <CategoryChipRow
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={onSelectCategory}
        />

        <FlatList
          data={data}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={8}
          windowSize={6}
          ListEmptyComponent={<Text style={styles.emptyText}>{emptyText}</Text>}
        />

        <View style={styles.footer}>
          {footerContent}
          <TouchableOpacity style={styles.doneButton} activeOpacity={0.9} onPress={onClose}>
            <Text style={styles.doneButtonText}>{doneLabel}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 6,
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 4,
    color: COLORS.muted,
    fontSize: 12,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.32)',
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.3)',
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    height: 46,
  },
  searchInput: {
    marginLeft: 8,
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
  },
  list: {
    flex: 1,
    marginTop: 4,
  },
  listContent: {
    paddingBottom: 12,
    gap: 8,
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(162,167,179,0.16)',
    paddingTop: 10,
    paddingBottom: 8,
    gap: 8,
  },
  doneButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.3)',
    backgroundColor: COLORS.card,
    alignItems: 'center',
    paddingVertical: 12,
  },
  doneButtonText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
});

export default SelectFromCatalogModal;
