import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { FOOD_RECIPES } from '../data/foodRecipes';
import { TODAY_COOKING_MEAL_OPTIONS } from '../data/sessionSeeds';
import { createSessionHistoryId } from '../core/sessionHistoryStorage';
import COLORS from '../theme/colors';

function toSessionRecipeFromMeal(meal) {
  return {
    id: `session_meal_${meal.id}`,
    name: meal.dishName,
    emoji: meal.emoji,
    imageColors: meal.imageColors,
    totalTimeMinutes: meal.estimatedMinutes,
    servings: 2,
    difficulty: meal.difficulty,
    tags: ['Session'],
    ingredients: meal.ingredients,
    steps: meal.steps,
  };
}

function CookingSessionSetupScreen({ navigation }) {
  const [selectedMealId, setSelectedMealId] = useState('dinner');
  const [selectedRecipeId, setSelectedRecipeId] = useState(null);
  const [recipeChooserOpen, setRecipeChooserOpen] = useState(false);

  const selectedMeal = useMemo(
    () => TODAY_COOKING_MEAL_OPTIONS.find((item) => item.id === selectedMealId) ?? TODAY_COOKING_MEAL_OPTIONS[0],
    [selectedMealId],
  );

  const selectedRecipe = useMemo(
    () => FOOD_RECIPES.find((item) => item.id === selectedRecipeId) ?? null,
    [selectedRecipeId],
  );

  const startCooking = () => {
    const sessionId = createSessionHistoryId('cooking');
    const startedAt = new Date().toISOString();

    if (selectedRecipe) {
      navigation.navigate('CookingSessionRun', {
        sessionId,
        sessionMode: true,
        startedAt,
        recipeId: selectedRecipe.id,
        recipeName: selectedRecipe.name,
        sessionTitle: `Cooked: ${selectedRecipe.name}`,
      });
      return;
    }

    navigation.navigate('CookingSessionRun', {
      sessionId,
      sessionMode: true,
      startedAt,
      recipeName: selectedMeal.dishName,
      sessionTitle: `Cooked: ${selectedMeal.dishName}`,
      sessionRecipe: toSessionRecipeFromMeal(selectedMeal),
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Cooking Session Setup</Text>
        <Text style={styles.subtitle}>Pick today&apos;s meal or choose a recipe for guided cooking.</Text>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Today&apos;s meals</Text>
          {TODAY_COOKING_MEAL_OPTIONS.map((meal) => {
            const active = !selectedRecipeId && meal.id === selectedMealId;
            return (
              <TouchableOpacity
                key={meal.id}
                style={[styles.mealCard, active && styles.mealCardActive]}
                activeOpacity={0.92}
                onPress={() => {
                  setSelectedMealId(meal.id);
                  setSelectedRecipeId(null);
                }}
              >
                <View style={styles.mealTopRow}>
                  <Text style={styles.mealTitle}>{meal.title}</Text>
                  <Text style={styles.mealEmoji}>{meal.emoji}</Text>
                </View>
                <Text style={styles.mealDish}>{meal.dishName}</Text>
                <Text style={styles.mealMeta}>{meal.estimatedMinutes} min • {meal.difficulty}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.recipesToggleRow}
            activeOpacity={0.9}
            onPress={() => setRecipeChooserOpen((prev) => !prev)}
          >
            <Text style={styles.sectionTitle}>Or pick from Recipes</Text>
            <Ionicons name={recipeChooserOpen ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.muted} />
          </TouchableOpacity>

          {recipeChooserOpen ? (
            <View style={styles.recipeListWrap}>
              {FOOD_RECIPES.map((recipe) => {
                const active = selectedRecipeId === recipe.id;
                return (
                  <TouchableOpacity
                    key={recipe.id}
                    style={[styles.recipeRow, active && styles.recipeRowActive]}
                    activeOpacity={0.9}
                    onPress={() => setSelectedRecipeId(recipe.id)}
                  >
                    <View style={styles.recipeLeft}>
                      <Text style={styles.recipeEmoji}>{recipe.emoji}</Text>
                      <View>
                        <Text style={styles.recipeName}>{recipe.name}</Text>
                        <Text style={styles.recipeMeta}>{recipe.totalTimeMinutes} min • {recipe.difficulty}</Text>
                      </View>
                    </View>
                    {active ? <Ionicons name="checkmark-circle" size={18} color={COLORS.accent} /> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}
        </View>

        <View style={styles.selectionCard}>
          <Text style={styles.selectionLabel}>Selected</Text>
          <Text style={styles.selectionValue}>
            {selectedRecipe ? selectedRecipe.name : selectedMeal.dishName}
          </Text>
        </View>

        <TouchableOpacity style={styles.startButton} activeOpacity={0.92} onPress={startCooking}>
          <Ionicons name="flame" size={15} color={COLORS.bg} />
          <Text style={styles.startButtonText}>Start cooking</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 26,
  },
  title: {
    color: COLORS.text,
    fontSize: 29,
    fontWeight: '700',
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 12,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.card,
    padding: 12,
    marginBottom: 10,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  mealCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: COLORS.cardSoft,
    padding: 10,
    marginBottom: 8,
  },
  mealCardActive: {
    borderColor: 'rgba(245,201,106,0.5)',
    backgroundColor: 'rgba(245,201,106,0.12)',
  },
  mealTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealTitle: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  mealEmoji: {
    fontSize: 20,
  },
  mealDish: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
  },
  mealMeta: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 3,
  },
  recipesToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recipeListWrap: {
    marginTop: 4,
    gap: 8,
  },
  recipeRow: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  recipeRowActive: {
    borderColor: 'rgba(245,201,106,0.5)',
    backgroundColor: 'rgba(245,201,106,0.12)',
  },
  recipeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  recipeEmoji: {
    fontSize: 18,
  },
  recipeName: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  recipeMeta: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 2,
  },
  selectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(90,209,232,0.25)',
    backgroundColor: 'rgba(90,209,232,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  selectionLabel: {
    color: COLORS.accent2,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.35,
  },
  selectionValue: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
  },
  startButton: {
    marginTop: 2,
    borderRadius: 14,
    minHeight: 46,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  startButtonText: {
    color: COLORS.bg,
    fontSize: 14,
    fontWeight: '700',
  },
});

export default CookingSessionSetupScreen;
