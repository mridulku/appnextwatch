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
import CatalogItemCard from '../../../components/cards/CatalogItemCard';
import CollapsibleSection from '../../../components/CollapsibleSection';
import { useAuth } from '../../../context/AuthContext';
import useCatalogSelection from '../../../hooks/useCatalogSelection';
import { FOOD_RECIPES } from '../../../data/wellness/foodRecipes';
import COLORS from '../../../theme/colors';

const CATEGORY_ORDER = ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Other'];
const CATEGORY_ICONS = {
  Breakfast: '🌅',
  Lunch: '🍛',
  Dinner: '🌙',
  Snacks: '🍿',
  Other: '🍽️',
};

function normalizeMealType(row) {
  const value = String(row?.meal_type || '').trim();
  if (!value) return 'Other';
  if (CATEGORY_ORDER.includes(value)) return value;
  return 'Other';
}

function findLocalRecipeIdByName(name) {
  const normalized = String(name || '').trim().toLowerCase();
  if (!normalized) return null;
  const matched = FOOD_RECIPES.find((entry) => entry.name.trim().toLowerCase() === normalized);
  return matched?.id ?? null;
}

function CookHomeScreen({ navigation, embedded = false, showHeader = true }) {
  const { user } = useAuth();

  const selection = useCatalogSelection({
    user,
    config: {
      catalogTable: 'catalog_recipes',
      catalogSelect: 'id,name,meal_type,servings,total_minutes,difficulty',
      userTable: 'user_recipes',
      userSelect: 'id,user_id,recipe_id,catalog_recipe:catalog_recipes(id,name,meal_type,servings,total_minutes,difficulty)',
      userFkColumn: 'recipe_id',
      joinKey: 'catalog_recipe',
      categoryOrder: CATEGORY_ORDER,
      getCatalogCategory: normalizeMealType,
      getCatalogSearchText: (row) =>
        [row?.name, row?.meal_type, row?.difficulty]
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
          <Text style={styles.loadingText}>Loading recipes...</Text>
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
              <Text style={styles.title}>Recipes</Text>
              <Text style={styles.subtitle}>Save recipes from catalog into your personal list.</Text>
            </>
          ) : null}

          <TouchableOpacity style={styles.addButton} activeOpacity={0.9} onPress={selection.openAddModal}>
            <Ionicons name="add-circle-outline" size={16} color={COLORS.bg} />
            <Text style={styles.addButtonText}>Add recipes</Text>
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
            <Text style={styles.emptyTitle}>No saved recipes yet</Text>
            <Text style={styles.emptySubtitle}>Add recipes you actually cook to build your own short list.</Text>
            <TouchableOpacity style={styles.emptyCta} activeOpacity={0.9} onPress={selection.openAddModal}>
              <Ionicons name="add-circle-outline" size={16} color={COLORS.bg} />
              <Text style={styles.emptyCtaText}>Add recipes</Text>
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
                subtitle="Saved recipes"
                icon={CATEGORY_ICONS[section.title] || '🍽️'}
                iconIsEmoji
                expanded={Boolean(selection.expandedCategories[section.title])}
                onToggle={() => selection.toggleCategory(section.title)}
                countLabel={`${section.itemCount}`}
                style={styles.groupSection}
              />
            )}
            renderItem={({ item }) => {
              const recipe = item.catalog_recipe;
              const localRecipeId = findLocalRecipeIdByName(recipe?.name);

              return (
                <CatalogItemCard
                  title={recipe?.name || 'Recipe'}
                  subtitle={`${normalizeMealType(recipe)} • ${recipe?.total_minutes || '--'} min • ${recipe?.difficulty || 'Easy'}`}
                  badges={[{ label: CATEGORY_ICONS[normalizeMealType(recipe)] || '🍽️', tone: 'default' }]}
                  onPress={
                    localRecipeId
                      ? () =>
                          navigation.navigate('CookRecipe', {
                            recipeId: localRecipeId,
                            recipeName: recipe?.name,
                          })
                      : undefined
                  }
                  primaryActionLabel={selection.pendingRemoveId === item.recipe_id ? '...' : 'REMOVE'}
                  primaryActionVariant="danger"
                  primaryActionDisabled={selection.pendingRemoveId === item.recipe_id}
                  onPrimaryAction={() => selection.removeCatalogItem(item.recipe_id)}
                />
              );
            }}
          />
        )}
      </View>

      <CatalogPickerModal
        visible={selection.modalVisible}
        title="Add recipes"
        subtitle="Pick from catalog recipes to build your saved cooking list."
        searchPlaceholder="Search recipes"
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
        getItemSubtitle={(item) => `${normalizeMealType(item)} • ${item.total_minutes || '--'} min • ${item.difficulty || 'Easy'}`}
        getItemBadges={(item) => [{ label: CATEGORY_ICONS[normalizeMealType(item)] || '🍽️', tone: 'default' }]}
        onAdd={selection.addCatalogItem}
        onClose={selection.closeAddModal}
        emptyText="No recipes match this filter."
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
  itemEmoji: {
    fontSize: 16,
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
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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

export default CookHomeScreen;
