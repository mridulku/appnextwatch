import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import CollapsibleSection from '../../../components/CollapsibleSection';
import { FOOD_RECIPE_FILTERS, FOOD_RECIPES } from '../../../data/wellness/foodRecipes';
import COLORS from '../../../theme/colors';

const MEAL_CATEGORY_ORDER = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];
const MEAL_CATEGORY_META = {
  Breakfast: { icon: '🌅', note: 'Start light and balanced.' },
  Lunch: { icon: '🍛', note: 'Midday meals and bowls.' },
  Dinner: { icon: '🌙', note: 'Evening plates and warm comfort food.' },
  Snacks: { icon: '🍿', note: 'Quick bites and fillers.' },
};

function formatDifficultyTone(difficulty) {
  if (difficulty === 'Easy') {
    return {
      bg: 'rgba(79, 209, 126, 0.16)',
      border: 'rgba(79, 209, 126, 0.35)',
      text: '#6EE7A5',
    };
  }

  return {
    bg: 'rgba(245, 201, 106, 0.16)',
    border: 'rgba(245, 201, 106, 0.35)',
    text: COLORS.accent,
  };
}

function CookHomeScreen({ navigation, embedded = false, showHeader = true }) {
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [expandedCategories, setExpandedCategories] = useState({});

  const filteredRecipes = useMemo(() => {
    if (selectedFilter === 'All') return FOOD_RECIPES;
    return FOOD_RECIPES.filter((recipe) =>
      recipe.tags.some((tag) => tag.toLowerCase() === selectedFilter.toLowerCase()),
    );
  }, [selectedFilter]);

  const quickCount = useMemo(
    () => FOOD_RECIPES.filter((recipe) => recipe.totalTimeMinutes <= 20).length,
    [],
  );

  const groupedRecipes = useMemo(() => {
    return MEAL_CATEGORY_ORDER.map((category) => ({
      title: category,
      meta: MEAL_CATEGORY_META[category],
      recipes: filteredRecipes.filter(
        (recipe) => (recipe.mealCategory ?? 'Dinner') === category,
      ),
    })).filter((group) => group.recipes.length > 0);
  }, [filteredRecipes]);

  const openRecipe = (recipe) => {
    navigation.navigate('CookRecipe', { recipeId: recipe.id, recipeName: recipe.name });
  };

  const toggleCategory = (category) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const renderRecipeCard = ({ item }) => {
    const difficultyTone = formatDifficultyTone(item.difficulty);

    return (
      <TouchableOpacity
        style={styles.recipeCard}
        activeOpacity={0.9}
        onPress={() => openRecipe(item)}
      >
        <LinearGradient
          colors={item.imageColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.recipeHero}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.timeChip}>
              <Ionicons name="time-outline" size={13} color={COLORS.text} />
              <Text style={styles.timeChipText}>{item.totalTimeMinutes} min</Text>
            </View>
            <Text style={styles.heroEmoji}>{item.emoji}</Text>
          </View>
          <View style={styles.heroBottomRow}>
            <Text style={styles.heroHint}>Guided cook mode</Text>
          </View>
        </LinearGradient>

        <View style={styles.recipeBody}>
          <View style={styles.nameRow}>
            <Text style={styles.recipeName}>{item.name}</Text>
            <Ionicons name="arrow-forward" size={16} color={COLORS.muted} />
          </View>

          <View style={styles.cardMetaRow}>
            <View style={[styles.difficultyChip, { backgroundColor: difficultyTone.bg, borderColor: difficultyTone.border }]}>
              <Text style={[styles.difficultyText, { color: difficultyTone.text }]}>{item.difficulty}</Text>
            </View>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.metaText}>{item.servings} servings</Text>
          </View>

          <View style={styles.tagsRow}>
            {item.tags.map((tag) => (
              <View key={`${item.id}_${tag}`} style={styles.tagChip}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const RootContainer = embedded ? View : SafeAreaView;

  return (
    <RootContainer style={styles.safeArea}>
      <View style={[styles.container, embedded && styles.containerEmbedded]}>
        <View style={[styles.headerWrap, !showHeader && styles.headerWrapCompact]}>
          {showHeader ? (
            <>
              <Text style={styles.title}>Cook</Text>
              <Text style={styles.subtitle}>Guided recipes, step by step.</Text>

              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{FOOD_RECIPES.length}</Text>
                  <Text style={styles.statLabel}>recipes</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{quickCount}</Text>
                  <Text style={styles.statLabel}>quick picks</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>Chef</Text>
                  <Text style={styles.statLabel}>assistant mode</Text>
                </View>
              </View>
            </>
          ) : null}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersRow}
          >
            {FOOD_RECIPE_FILTERS.map((filter) => {
              const active = selectedFilter === filter;
              return (
                <TouchableOpacity
                  key={filter}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  activeOpacity={0.9}
                  onPress={() => setSelectedFilter(filter)}
                >
                  <Text style={[styles.filterText, active && styles.filterTextActive]}>{filter}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <ScrollView
          style={styles.groupsScroll}
          contentContainerStyle={styles.groupsContent}
          showsVerticalScrollIndicator={false}
        >
          {groupedRecipes.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No recipes in this filter</Text>
              <Text style={styles.emptySubtle}>Try another category to continue cooking.</Text>
            </View>
          ) : (
            groupedRecipes.map((group) => (
              <CollapsibleSection
                key={group.title}
                title={group.title}
                subtitle={group.meta.note}
                icon={group.meta.icon}
                iconIsEmoji
                expanded={Boolean(expandedCategories[group.title])}
                onToggle={() => toggleCategory(group.title)}
                countLabel={`${group.recipes.length} recipes`}
                style={styles.groupSection}
                contentStyle={styles.groupContent}
              >
                {group.recipes.map((recipe) => (
                  <View key={recipe.id}>{renderRecipeCard({ item: recipe })}</View>
                ))}
              </CollapsibleSection>
            ))
          )}
        </ScrollView>
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
    paddingTop: 10,
  },
  containerEmbedded: {
    paddingTop: 6,
  },
  headerWrap: {
    marginBottom: 10,
  },
  headerWrapCompact: {
    marginBottom: 8,
  },
  title: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 3,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  statValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  statLabel: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  filtersRow: {
    gap: 8,
    paddingBottom: 2,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.3)',
    backgroundColor: COLORS.card,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterChipActive: {
    borderColor: 'rgba(245,201,106,0.5)',
    backgroundColor: 'rgba(245,201,106,0.16)',
  },
  filterText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  filterTextActive: {
    color: COLORS.accent,
  },
  groupsScroll: {
    flex: 1,
  },
  groupsContent: {
    paddingBottom: 24,
  },
  groupSection: {
    marginTop: 0,
  },
  groupContent: {
    paddingTop: 8,
  },
  recipeCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.18)',
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  },
  recipeHero: {
    height: 124,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'space-between',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(8,10,16,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  timeChipText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '600',
  },
  heroEmoji: {
    fontSize: 32,
  },
  heroBottomRow: {
    alignItems: 'flex-start',
  },
  heroHint: {
    color: 'rgba(245,246,248,0.92)',
    fontSize: 12,
    fontWeight: '600',
  },
  recipeBody: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recipeName: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  cardMetaRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  difficultyChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metaDot: {
    color: COLORS.muted,
    marginHorizontal: 8,
  },
  metaText: {
    color: COLORS.muted,
    fontSize: 12,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  tagChip: {
    borderRadius: 999,
    backgroundColor: COLORS.cardSoft,
    borderWidth: 1,
    borderColor: 'rgba(90,209,232,0.24)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagText: {
    color: COLORS.accent2,
    fontSize: 10,
    fontWeight: '600',
  },
  emptyWrap: {
    marginTop: 28,
    alignItems: 'center',
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  emptySubtle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 4,
  },
});

export default CookHomeScreen;
