import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import COLORS from '../../../../../theme/colors';
import UI_TOKENS from '../../../../../ui/tokens';

function FilterSection({
  title,
  options = [],
  selectedIds = [],
  onToggle,
  query,
}) {
  const filteredOptions = useMemo(() => {
    if (!query) return options;
    const normalized = String(query).toLowerCase();
    return options.filter((option) => String(option.label || '').toLowerCase().includes(normalized));
  }, [options, query]);

  return (
    <View style={styles.sectionWrap}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {filteredOptions.length ? (
        filteredOptions.map((option) => {
          const selected = selectedIds.includes(option.id);
          return (
            <TouchableOpacity key={option.id} style={[styles.optionRow, selected ? styles.optionRowSelected : null]} activeOpacity={0.9} onPress={() => onToggle?.(option.id)}>
              <Text style={[styles.optionText, selected ? styles.optionTextSelected : null]} numberOfLines={1}>
                {option.label}
              </Text>
              {selected ? <Ionicons name="checkmark" size={14} color={COLORS.accent} /> : null}
            </TouchableOpacity>
          );
        })
      ) : (
        <Text style={styles.emptyText}>No matches.</Text>
      )}
    </View>
  );
}

function LibraryFilterSheet({
  visible,
  onClose,
  explorer,
}) {
  const [sheetQuery, setSheetQuery] = useState('');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Filter Library</Text>
            <TouchableOpacity style={styles.closeButton} activeOpacity={0.9} onPress={onClose}>
              <Ionicons name="close" size={18} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={15} color={COLORS.muted} />
            <TextInput
              value={sheetQuery}
              onChangeText={setSheetQuery}
              placeholder="Search filter options"
              placeholderTextColor={COLORS.muted}
              style={styles.searchInput}
              autoCapitalize="none"
            />
          </View>

          <ScrollView style={styles.sections} contentContainerStyle={styles.sectionsContent} showsVerticalScrollIndicator={false}>
            <FilterSection
              title="Muscles"
              options={explorer?.muscleOptions || []}
              selectedIds={explorer?.selectedMuscleIds || []}
              onToggle={explorer?.toggleMuscleFilter}
              query={sheetQuery}
            />
            <FilterSection
              title="Exercises"
              options={explorer?.exerciseOptions || []}
              selectedIds={explorer?.selectedExerciseIds || []}
              onToggle={explorer?.toggleExerciseFilter}
              query={sheetQuery}
            />
            <FilterSection
              title="Machines"
              options={explorer?.machineOptions || []}
              selectedIds={explorer?.selectedMachineIds || []}
              onToggle={explorer?.toggleMachineFilter}
              query={sheetQuery}
            />
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.clearButton} activeOpacity={0.9} onPress={explorer?.clearAllFilters}>
              <Text style={styles.clearButtonText}>Clear all</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.doneButton} activeOpacity={0.9} onPress={onClose}>
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5,8,16,0.72)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '86%',
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: UI_TOKENS.radius.lg,
    borderTopRightRadius: UI_TOKENS.radius.lg,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.25)',
    paddingHorizontal: UI_TOKENS.spacing.md,
    paddingTop: UI_TOKENS.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.title,
    fontWeight: '700',
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    marginTop: UI_TOKENS.spacing.sm,
    minHeight: 40,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.28)',
    backgroundColor: COLORS.card,
    paddingHorizontal: UI_TOKENS.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: UI_TOKENS.spacing.xs,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle,
    paddingVertical: 8,
  },
  sections: {
    marginTop: UI_TOKENS.spacing.sm,
  },
  sectionsContent: {
    paddingBottom: UI_TOKENS.spacing.lg,
    gap: UI_TOKENS.spacing.sm,
  },
  sectionWrap: {
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.sm,
    gap: UI_TOKENS.spacing.xs,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle,
    fontWeight: '700',
    marginBottom: 2,
  },
  optionRow: {
    minHeight: 34,
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: UI_TOKENS.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: UI_TOKENS.spacing.xs,
  },
  optionRowSelected: {
    borderColor: 'rgba(245,201,106,0.5)',
    backgroundColor: 'rgba(245,201,106,0.12)',
  },
  optionText: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta + 1,
    flexShrink: 1,
  },
  optionTextSelected: {
    color: COLORS.text,
    fontWeight: '700',
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
  footer: {
    flexDirection: 'row',
    gap: UI_TOKENS.spacing.xs,
    paddingBottom: UI_TOKENS.spacing.md,
    paddingTop: UI_TOKENS.spacing.xs,
  },
  clearButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.35)',
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.subtitle,
    fontWeight: '700',
  },
  doneButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: UI_TOKENS.radius.md,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: {
    color: COLORS.bg,
    fontSize: UI_TOKENS.typography.subtitle,
    fontWeight: '700',
  },
});

export default LibraryFilterSheet;
