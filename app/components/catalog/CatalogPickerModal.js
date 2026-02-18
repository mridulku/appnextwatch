import { Ionicons } from '@expo/vector-icons';
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
  onAdd,
  onRemove,
  onClose,
  emptyText = 'No items match this filter.',
}) {
  const renderRow = ({ item }) => {
    const id = getItemId(item);
    const isAdded = selectedIdSet.has(id);
    const isBusy = pendingAddId === id || pendingRemoveId === id;

    return (
      <View style={styles.itemRow}>
        <View style={styles.itemLeft}>
          <View style={styles.itemIconWrap}>
            {getItemIcon ? (
              typeof getItemIcon(item) === 'string' && getItemIcon(item).startsWith('ios-') ? (
                <Ionicons name={getItemIcon(item)} size={14} color={COLORS.accent2} />
              ) : (
                <Text style={styles.emojiText}>{getItemIcon(item)}</Text>
              )
            ) : (
              <Ionicons name="cube-outline" size={14} color={COLORS.accent2} />
            )}
          </View>

          <View style={styles.itemTextWrap}>
            <Text style={styles.itemTitle}>{getItemTitle(item)}</Text>
            <Text style={styles.itemMeta}>{getItemSubtitle(item)}</Text>
          </View>
        </View>

        {isAdded ? (
          <TouchableOpacity
            style={[styles.rowButton, styles.removeButton, isBusy && styles.rowButtonDisabled]}
            disabled={isBusy}
            activeOpacity={0.9}
            onPress={() => onRemove(id)}
          >
            <Text style={styles.removeButtonText}>{isBusy ? '...' : 'Remove'}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.rowButton, styles.addButton, isBusy && styles.rowButtonDisabled]}
            disabled={isBusy}
            activeOpacity={0.9}
            onPress={() => onAdd(id)}
          >
            <Ionicons name="add" size={14} color={COLORS.bg} />
            <Text style={styles.addButtonText}>{isBusy ? 'Adding' : 'Add'}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

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
    fontSize: 36,
    fontWeight: '700',
    lineHeight: 38,
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
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.18)',
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  itemIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(90,209,232,0.13)',
    borderWidth: 1,
    borderColor: 'rgba(90,209,232,0.28)',
  },
  emojiText: {
    fontSize: 15,
  },
  itemTextWrap: {
    flex: 1,
  },
  itemTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  itemMeta: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 2,
  },
  rowButton: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 76,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  addButton: {
    backgroundColor: COLORS.accent,
  },
  removeButton: {
    borderWidth: 1,
    borderColor: 'rgba(255,124,123,0.45)',
    backgroundColor: 'rgba(255,124,123,0.16)',
  },
  rowButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    color: COLORS.bg,
    fontSize: 12,
    fontWeight: '700',
  },
  removeButtonText: {
    color: '#FF9C92',
    fontSize: 12,
    fontWeight: '700',
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
