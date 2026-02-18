import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import CatalogPickerModal from '../../../components/catalog/CatalogPickerModal';
import SelectedCatalogItemCard from '../../../components/cards/SelectedCatalogItemCard';
import CollapsibleSection from '../../../components/CollapsibleSection';
import { useAuth } from '../../../context/AuthContext';
import useCatalogSelection from '../../../hooks/useCatalogSelection';
import { FITNESS_EXERCISES } from '../../../data/wellness/fitnessExercises';
import COLORS from '../../../theme/colors';

const GROUP_ORDER = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio', 'Mobility', 'Other'];

const GROUP_ICONS = {
  Chest: 'fitness-outline',
  Back: 'body-outline',
  Legs: 'walk-outline',
  Shoulders: 'barbell-outline',
  Arms: 'barbell-outline',
  Core: 'shield-outline',
  Cardio: 'pulse-outline',
  Mobility: 'body-outline',
  Other: 'albums-outline',
};

function normalizeExerciseCategory(row) {
  const primary = String(row?.primary_muscle_group || '').trim();
  if (primary) return primary;

  const type = String(row?.type || '').toLowerCase();
  if (type.includes('cardio')) return 'Cardio';
  if (type.includes('mobility')) return 'Mobility';

  return 'Other';
}

function findLocalExerciseIdByName(name) {
  const normalized = String(name || '').trim().toLowerCase();
  if (!normalized) return null;
  const matched = FITNESS_EXERCISES.find((entry) => entry.name.trim().toLowerCase() === normalized);
  return matched?.id ?? null;
}

function ExercisesHomeScreen({ navigation, embedded = false, showHeader = true }) {
  const { user } = useAuth();

  const selection = useCatalogSelection({
    user,
    config: {
      catalogTable: 'catalog_exercises',
      catalogSelect: 'id,name,type,primary_muscle_group,equipment',
      userTable: 'user_exercises',
      userSelect: 'id,user_id,exercise_id,catalog_exercise:catalog_exercises(id,name,type,primary_muscle_group,equipment)',
      userFkColumn: 'exercise_id',
      joinKey: 'catalog_exercise',
      categoryOrder: GROUP_ORDER,
      getCatalogCategory: normalizeExerciseCategory,
      getCatalogSearchText: (row) =>
        [row?.name, row?.type, row?.primary_muscle_group, row?.equipment]
          .filter(Boolean)
          .join(' ')
          .toLowerCase(),
    },
  });

  const sections = useMemo(
    () =>
      selection.groupedUserSections.map((section) => ({
        ...section,
        data: selection.expandedCategories[section.title] ? section.data : [],
      })),
    [selection.groupedUserSections, selection.expandedCategories],
  );

  const RootContainer = embedded ? View : SafeAreaView;

  if (selection.loading) {
    return (
      <RootContainer style={styles.safeArea}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading exercises...</Text>
        </View>
      </RootContainer>
    );
  }

  return (
    <RootContainer style={styles.safeArea}>
      <View style={[styles.container, embedded && styles.containerEmbedded]}>
        <View style={styles.headerWrap}>
          {showHeader ? (
            <>
              <Text style={styles.title}>Exercises</Text>
              <Text style={styles.subtitle}>Build your personalized exercise shortlist.</Text>
            </>
          ) : null}

          <TouchableOpacity style={styles.addButton} activeOpacity={0.9} onPress={selection.openAddModal}>
            <Ionicons name="add-circle-outline" size={16} color={COLORS.bg} />
            <Text style={styles.addButtonText}>Add exercises</Text>
          </TouchableOpacity>
        </View>

        {selection.error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{selection.error}</Text>
            <TouchableOpacity style={styles.retryButton} activeOpacity={0.9} onPress={selection.hydrate}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {selection.groupedUserSections.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>No exercises yet</Text>
            <Text style={styles.emptySubtitle}>Add exercises from the catalog to shape your workout library.</Text>
            <TouchableOpacity style={styles.emptyCta} activeOpacity={0.9} onPress={selection.openAddModal}>
              <Ionicons name="add-circle-outline" size={16} color={COLORS.bg} />
              <Text style={styles.emptyCtaText}>Add exercises</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            stickySectionHeadersEnabled={false}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderSectionHeader={({ section }) => (
              <CollapsibleSection
                title={section.title}
                subtitle="Selected exercises"
                icon={GROUP_ICONS[section.title] || 'barbell-outline'}
                expanded={Boolean(selection.expandedCategories[section.title])}
                onToggle={() => selection.toggleCategory(section.title)}
                countLabel={`${section.itemCount}`}
                style={styles.groupSection}
              />
            )}
            renderItem={({ item }) => {
              const catalog = item.catalog_exercise;
              const localExerciseId = findLocalExerciseIdByName(catalog?.name);

              return (
                <SelectedCatalogItemCard
                  title={catalog?.name || 'Exercise'}
                  subtitle={`${normalizeExerciseCategory(catalog)} • ${catalog?.type || 'exercise'} • ${catalog?.equipment || 'bodyweight'}`}
                  badges={[
                    { label: GROUP_ICONS[normalizeExerciseCategory(catalog)] ? '🏋️' : '•', tone: 'default' },
                  ]}
                  onPress={
                    localExerciseId
                      ? () =>
                          navigation.navigate('ExerciseDetail', {
                            exerciseId: localExerciseId,
                            exerciseName: catalog?.name,
                          })
                      : undefined
                  }
                  removeDisabled={selection.pendingRemoveId === item.exercise_id}
                  onRemove={() => selection.removeCatalogItem(item.exercise_id)}
                />
              );
            }}
          />
        )}
      </View>

      <CatalogPickerModal
        visible={selection.modalVisible}
        title="Add exercises"
        subtitle="Pick from catalog exercises to personalize your gym hub."
        searchPlaceholder="Search exercises"
        searchValue={selection.searchInput}
        onSearchChange={selection.setSearchInput}
        categories={selection.categoryFilters}
        selectedCategory={selection.selectedCategory}
        onSelectCategory={selection.setSelectedCategory}
        items={selection.filteredCatalogRows}
        selectedIdSet={selection.selectedCatalogIdSet}
        pendingAddId={selection.pendingAddId}
        pendingRemoveId={selection.pendingRemoveId}
        getItemId={(item) => item.id}
        getItemTitle={(item) => item.name}
        getItemSubtitle={(item) => `${normalizeExerciseCategory(item)} • ${item.type || 'exercise'} • ${item.equipment || 'bodyweight'}`}
        getItemBadges={() => [{ label: '🏋️', tone: 'default' }]}
        onAdd={selection.addCatalogItem}
        onClose={selection.closeAddModal}
        emptyText="No exercises match this filter."
      />
    </RootContainer>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  containerEmbedded: {
    paddingTop: 6,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    color: COLORS.muted,
    fontSize: 13,
  },
  headerWrap: {
    marginBottom: 8,
    gap: 10,
  },
  title: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: '700',
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 2,
  },
  addButton: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addButtonText: {
    color: COLORS.bg,
    fontSize: 15,
    fontWeight: '700',
  },
  errorCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,124,123,0.4)',
    backgroundColor: 'rgba(255,124,123,0.12)',
    padding: 12,
    marginBottom: 10,
  },
  errorText: {
    color: '#FFB4A8',
    fontSize: 14,
  },
  retryButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,124,123,0.45)',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  retryText: {
    color: '#FFB4A8',
    fontWeight: '700',
    fontSize: 12,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 36,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    color: COLORS.muted,
    fontSize: 24,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 29,
  },
  emptyCta: {
    marginTop: 16,
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyCtaText: {
    color: COLORS.bg,
    fontSize: 15,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 28,
  },
  groupSection: {
    marginTop: 4,
  },
  itemRow: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.18)',
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
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
    borderWidth: 1,
    borderColor: 'rgba(90,209,232,0.3)',
    backgroundColor: 'rgba(90,209,232,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
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
    textTransform: 'capitalize',
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chevron: {
    marginRight: -2,
  },
  removeButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,124,123,0.45)',
    backgroundColor: 'rgba(255,124,123,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  removeButtonText: {
    color: '#FF9C92',
    fontSize: 12,
    fontWeight: '700',
  },
});

export default ExercisesHomeScreen;
