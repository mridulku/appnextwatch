import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import { FlatList, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { FOOD_RECIPE_FILTERS, FOOD_RECIPES } from '../data/foodRecipes';
import COLORS from '../theme/colors';

function CookingSessionHomeScreen({ navigation }) {
  const [selectedFilter, setSelectedFilter] = useState('All');

  const filteredRecipes = useMemo(() => {
    if (selectedFilter === 'All') return FOOD_RECIPES;
    return FOOD_RECIPES.filter((recipe) =>
      recipe.tags.some((tag) => tag.toLowerCase() === selectedFilter.toLowerCase()),
    );
  }, [selectedFilter]);

  const startSession = (recipe) => {
    navigation.navigate('CookingSessionRun', {
      recipeId: recipe.id,
      recipeName: recipe.name,
      sessionMode: true,
    });
  };

  const renderRecipeCard = ({ item }) => {
    return (
      <TouchableOpacity
        style={styles.recipeCard}
        activeOpacity={0.92}
        onPress={() => startSession(item)}
      >
        <LinearGradient
          colors={item.imageColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.timeChip}>
              <Ionicons name="time-outline" size={13} color={COLORS.text} />
              <Text style={styles.timeChipText}>{item.totalTimeMinutes} min</Text>
            </View>
            <Text style={styles.heroEmoji}>{item.emoji}</Text>
          </View>
          <Text style={styles.heroHint}>Session mode</Text>
        </LinearGradient>

        <View style={styles.cardBody}>
          <View style={styles.nameRow}>
            <Text style={styles.recipeName}>{item.name}</Text>
            <Ionicons name="play-circle-outline" size={18} color={COLORS.accent2} />
          </View>
          <Text style={styles.cardMeta}>{item.servings} servings • {item.difficulty}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerWrap}>
          <Text style={styles.title}>Cooking Session</Text>
          <Text style={styles.subtitle}>Pick a recipe and run guided cooking with timer and chef chat.</Text>

          <View style={styles.helperCard}>
            <Ionicons name="flame-outline" size={16} color={COLORS.accent} />
            <Text style={styles.helperText}>Recipe browser remains under Food tab. This tab is for session running.</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {FOOD_RECIPE_FILTERS.map((filter) => {
              const active = selectedFilter === filter;
              return (
                <TouchableOpacity
                  key={filter}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setSelectedFilter(filter)}
                  activeOpacity={0.9}
                >
                  <Text style={[styles.filterText, active && styles.filterTextActive]}>{filter}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <FlatList
          data={filteredRecipes}
          keyExtractor={(item) => item.id}
          renderItem={renderRecipeCard}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No cook sessions in this filter</Text>
              <Text style={styles.emptySubtle}>Switch filters to view more recipes.</Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
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
  headerWrap: {
    marginBottom: 10,
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
    marginBottom: 10,
  },
  helperCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245,201,106,0.34)',
    backgroundColor: 'rgba(245,201,106,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginBottom: 10,
  },
  helperText: {
    color: '#F2D8A1',
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
  filterRow: {
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
  listContent: {
    paddingBottom: 24,
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
  hero: {
    height: 108,
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
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(245,246,248,0.3)',
    backgroundColor: 'rgba(14,15,20,0.34)',
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  timeChipText: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: '700',
  },
  heroEmoji: {
    fontSize: 23,
  },
  heroHint: {
    color: 'rgba(245,246,248,0.9)',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  cardBody: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  recipeName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  cardMeta: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 4,
  },
  emptyWrap: {
    marginTop: 30,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  emptySubtle: {
    marginTop: 6,
    color: COLORS.muted,
    fontSize: 12,
    textAlign: 'center',
  },
});

export default CookingSessionHomeScreen;
