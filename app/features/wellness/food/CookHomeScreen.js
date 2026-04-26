import { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import SelectedCatalogItemCard from '../../../components/cards/SelectedCatalogItemCard';
import CollapsibleSection from '../../../components/CollapsibleSection';
import { useAuth } from '../../../context/AuthContext';
import useCatalogSelection from '../../../hooks/useCatalogSelection';
import COLORS from '../../../theme/colors';
import { getDishImageSourceByName } from './dishImages';

const CATEGORY_ORDER = ['Breakfast', 'Lunch / Dinner', 'Snacks', 'Other'];
const CATEGORY_ICONS = {
  Breakfast: '🌅',
  'Lunch / Dinner': '🍛',
  Snacks: '🍿',
  Other: '🍽️',
};

function normalizeMealType(row) {
  const value = String(row?.meal_type || '').trim();
  if (!value) return 'Other';
  if (value === 'Lunch' || value === 'Dinner') return 'Lunch / Dinner';
  if (CATEGORY_ORDER.includes(value)) return value;
  return 'Other';
}

function CookHomeScreen({ navigation, embedded = false, showHeader = true }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

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

  const sections = useMemo(() => {
    const grouped = selection.catalogRows.reduce((acc, row) => {
      const category = normalizeMealType(row);
      if (!acc[category]) acc[category] = [];
      acc[category].push(row);
      return acc;
    }, {});

    return CATEGORY_ORDER.filter((category) => grouped[category]?.length).map((category) => ({
      title: category,
      itemCount: grouped[category].length,
      data: selection.expandedCategories[category] ? grouped[category] : [],
    }));
  }, [selection.catalogRows, selection.expandedCategories]);

  const visibleItemCount = useMemo(
    () => sections.reduce((sum, section) => sum + section.itemCount, 0),
    [sections],
  );

  useFocusEffect(
    useCallback(() => {
      selection.hydrate();
    }, [selection.hydrate]),
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
              <Text style={styles.title}>Dishes</Text>
              <Text style={styles.subtitle}>Browse the full dish catalog by meal type.</Text>
            </>
          ) : null}
        </View>

        {selection.error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{selection.error}</Text>
          </View>
        ) : null}

        {visibleItemCount === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>No dishes available</Text>
            <Text style={styles.emptySubtitle}>Recipe catalog rows will appear here once available.</Text>
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => String(item.id)}
            stickySectionHeadersEnabled={false}
            contentContainerStyle={[styles.listContent, { paddingBottom: 24 + insets.bottom }]}
            showsVerticalScrollIndicator={false}
            renderSectionHeader={({ section }) => (
              <CollapsibleSection
                title={section.title}
                subtitle="Recipe catalog"
                icon={CATEGORY_ICONS[section.title] || '🍽️'}
                iconIsEmoji
                expanded={Boolean(selection.expandedCategories[section.title])}
                onToggle={() => selection.toggleCategory(section.title)}
                countLabel={`${section.itemCount}`}
                style={styles.groupSection}
              />
            )}
            renderItem={({ item }) => {
              return (
                <SelectedCatalogItemCard
                  title={item?.name || 'Recipe'}
                  subtitle={`${normalizeMealType(item)} • ${item?.total_minutes || '--'} min • ${item?.difficulty || 'Easy'}`}
                  imageSource={getDishImageSourceByName(item?.name)}
                  onPress={() =>
                    navigation.navigate('FoodDishDetail', {
                      dishId: item.id,
                      recipeId: item.id,
                      dishName: item?.name,
                    })
                  }
                  topAction={{
                    iconName: 'open-outline',
                    onPress: () =>
                      navigation.navigate('FoodDishDetail', {
                        dishId: item.id,
                        recipeId: item.id,
                        dishName: item?.name,
                      }),
                  }}
                />
              );
            }}
          />
        )}
      </View>
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
    fontSize: 20,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 25,
  },
  listContent: {
    paddingBottom: 28,
  },
  groupSection: {
    marginBottom: 8,
  },
});

export default CookHomeScreen;
