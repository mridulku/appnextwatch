import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';
import {
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import CatalogItemCard from '../cards/CatalogItemCard';
import COLORS from '../../theme/colors';

function CatalogPickerModal({
  visible,
  title,
  subtitle,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  categories,
  selectedCategory,
  onSelectCategory,
  items,
  selectedIdSet,
  pendingAddId,
  pendingRemoveId,
  getItemId,
  getItemTitle,
  getItemSubtitle,
  getItemIcon,
  getItemImageUrl,
  getItemBadges,
  onAdd,
  onRemove,
  onClose,
  emptyText = 'No items match this filter.',
  selectedActionMode = 'added',
}) {
  const renderRow = useCallback(
    ({ item }) => {
      const id = getItemId(item);
      const isAdded = selectedIdSet.has(id);
      const isBusy = pendingAddId === id || pendingRemoveId === id;

      let primaryActionLabel = 'ADD';
      let primaryActionVariant = 'accent';
      let primaryActionDisabled = false;
      let onPrimaryAction = () => onAdd(id);

      if (isAdded) {
        if (selectedActionMode === 'remove' && onRemove) {
          primaryActionLabel = isBusy ? '...' : 'REMOVE';
          primaryActionVariant = 'danger';
          primaryActionDisabled = isBusy;
          onPrimaryAction = () => onRemove(id);
        } else {
          primaryActionLabel = 'ADDED';
          primaryActionVariant = 'success';
          primaryActionDisabled = true;
          onPrimaryAction = undefined;
        }
      } else if (isBusy) {
        primaryActionLabel = '...';
        primaryActionDisabled = true;
      }

      const icon = getItemIcon ? getItemIcon(item) : null;
      const badgeFromIcon = icon
        ? [{ label: icon, tone: 'default' }]
        : [];
      const badges = getItemBadges ? getItemBadges(item) : badgeFromIcon;

      return (
        <CatalogItemCard
          title={getItemTitle(item)}
          subtitle={getItemSubtitle(item)}
          imageUrl={getItemImageUrl ? getItemImageUrl(item) : null}
          badges={badges}
          selected={isAdded}
          primaryActionLabel={primaryActionLabel}
          primaryActionVariant={primaryActionVariant}
          primaryActionDisabled={primaryActionDisabled}
          onPrimaryAction={onPrimaryAction}
        />
      );
    },
    [
      getItemBadges,
      getItemIcon,
      getItemId,
      getItemImageUrl,
      getItemSubtitle,
      getItemTitle,
      onAdd,
      onRemove,
      pendingAddId,
      pendingRemoveId,
      selectedActionMode,
      selectedIdSet,
    ],
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose} />

        <View style={styles.sheetCard}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{title}</Text>
          <Text style={styles.sheetSubtitle}>{subtitle}</Text>

          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={16} color={COLORS.muted} />
            <TextInput
              value={searchValue}
              onChangeText={onSearchChange}
              style={styles.searchInput}
              placeholder={searchPlaceholder}
              placeholderTextColor={COLORS.muted}
            />
            {searchValue.trim() ? (
              <TouchableOpacity style={styles.clearButton} activeOpacity={0.9} onPress={() => onSearchChange('')}>
                <Ionicons name="close" size={14} color={COLORS.text} />
              </TouchableOpacity>
            ) : null}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {categories.map((category) => {
              const active = category === selectedCategory;
              return (
                <TouchableOpacity
                  key={category}
                  style={[styles.categoryChip, active && styles.categoryChipActive]}
                  activeOpacity={0.9}
                  onPress={() => onSelectCategory(category)}
                >
                  <Text style={[styles.categoryText, active && styles.categoryTextActive]}>{category}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {items.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>{emptyText}</Text>
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={(item) => getItemId(item)}
              renderItem={renderRow}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              initialNumToRender={8}
              windowSize={6}
            />
          )}

          <TouchableOpacity style={styles.doneButton} activeOpacity={0.9} onPress={onClose}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheetCard: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    borderBottomWidth: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    minHeight: 420,
    maxHeight: '85%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(162,167,179,0.56)',
    marginBottom: 12,
  },
  sheetTitle: {
    color: COLORS.text,
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 36,
  },
  sheetSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 4,
    marginBottom: 12,
  },
  searchWrap: {
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
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    marginLeft: 8,
  },
  clearButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(162,167,179,0.15)',
  },
  chipsRow: {
    gap: 8,
    paddingTop: 12,
    paddingBottom: 8,
  },
  categoryChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.28)',
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  categoryChipActive: {
    borderColor: 'rgba(245,201,106,0.46)',
    backgroundColor: 'rgba(245,201,106,0.16)',
  },
  categoryText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  categoryTextActive: {
    color: COLORS.accent,
  },
  list: {
    flex: 1,
    marginTop: 4,
  },
  listContent: {
    paddingBottom: 12,
    gap: 8,
  },
  emptyWrap: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 14,
    textAlign: 'center',
  },
  doneButton: {
    marginTop: 10,
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

export default CatalogPickerModal;
