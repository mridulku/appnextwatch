import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import COLORS from '../../../theme/colors';

const MEAL_BLUEPRINT = [
  {
    id: 'breakfast',
    title: 'Breakfast',
    primary: 'Bread omelette & tea',
    options: ['Poha', 'Oats bowl', 'Idli'],
    icon: '🍳',
    imageColors: ['#E6B85A', '#8A5328'],
  },
  {
    id: 'lunch',
    title: 'Lunch',
    primary: 'Rice, vegetables & chicken',
    options: ['Dal-chawal', 'Rajma rice', 'Curd rice'],
    icon: '🍛',
    imageColors: ['#E58A4E', '#7A382A'],
  },
  {
    id: 'dinner',
    title: 'Dinner',
    primary: 'Roti & sabzi',
    options: ['Egg bhurji', 'Paneer + salad', 'Soup + toast'],
    icon: '🥘',
    imageColors: ['#6FA7E8', '#345A90'],
  },
];

const WORKOUT_PLAN = {
  title: 'Push Day',
  duration: '45 min',
  highlights: ['Bench press', 'Incline DB press', 'Shoulder press', 'Triceps pushdown', 'Plank'],
};

function formatDateText() {
  const date = new Date();
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function WellnessHomeScreen({ navigation }) {
  const [mealStatus, setMealStatus] = useState({
    breakfast: 'done',
    lunch: 'planned',
    dinner: 'planned',
  });

  const completedMeals = useMemo(
    () => Object.values(mealStatus).filter((value) => value === 'done').length,
    [mealStatus],
  );

  const switchTab = (tabName, params) => {
    const parent = navigation.getParent();
    if (!parent) return;
    parent.navigate(tabName, params);
  };

  const toggleMealStatus = (mealId) => {
    setMealStatus((prev) => ({
      ...prev,
      [mealId]: prev[mealId] === 'done' ? 'planned' : 'done',
    }));
  };

  const startWorkout = () => {
    switchTab('Sessions', { screen: 'WorkoutSessionSetup' });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroWrap}>
          <Text style={styles.dateText}>{formatDateText()}</Text>
          <Text style={styles.greetingText}>{getGreeting()}, Mridul</Text>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today&apos;s Meals</Text>
            <Text style={styles.sectionPill}>{completedMeals}/3 done</Text>
          </View>

          {MEAL_BLUEPRINT.map((meal) => {
            const done = mealStatus[meal.id] === 'done';
            return (
              <View key={meal.id} style={styles.mealCard}>
                <View style={styles.mealBody}>
                  <Text style={styles.mealTitle}>{meal.title}</Text>
                  <Text style={styles.mealPrimary}>{meal.primary}</Text>

                  <View style={styles.mealOptionsRow}>
                    {meal.options.map((option) => (
                      <View key={`${meal.id}_${option}`} style={styles.mealOptionChip}>
                        <Text style={styles.mealOptionText}>{option}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.mealActionsRow}>
                    <TouchableOpacity style={styles.swapButton} activeOpacity={0.9}>
                      <Ionicons name="swap-horizontal-outline" size={14} color={COLORS.accent2} />
                      <Text style={styles.swapButtonText}>Swap</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.statusPill, done ? styles.statusDone : styles.statusPlanned]}
                      activeOpacity={0.9}
                      onPress={() => toggleMealStatus(meal.id)}
                    >
                      <Text style={[styles.statusText, done ? styles.statusDoneText : styles.statusPlannedText]}>
                        {done ? 'Done' : 'Planned'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <LinearGradient
                  colors={meal.imageColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.mealVisual}
                >
                  <Text style={styles.mealEmoji}>{meal.icon}</Text>
                  <Text style={styles.mealVisualHint}>Change</Text>
                </LinearGradient>
              </View>
            );
          })}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today&apos;s Workout</Text>
            <Text style={styles.sectionPill}>{WORKOUT_PLAN.duration}</Text>
          </View>

          <View style={styles.workoutCard}>
            <View style={styles.workoutTopRow}>
              <View style={styles.workoutTextWrap}>
                <Text style={styles.workoutName}>{WORKOUT_PLAN.title}</Text>
                <Text style={styles.workoutMeta}>Estimated time {WORKOUT_PLAN.duration}</Text>
              </View>
              <View style={styles.workoutIconWrap}>
                <Ionicons name="barbell-outline" size={20} color={COLORS.accent2} />
              </View>
            </View>

            <View style={styles.workoutChipsRow}>
              {WORKOUT_PLAN.highlights.map((item) => (
                <View key={item} style={styles.workoutChip}>
                  <Text style={styles.workoutChipText}>{item}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.startButton} activeOpacity={0.92} onPress={startWorkout}>
              <Ionicons name="play" size={14} color={COLORS.bg} />
              <Text style={styles.startButtonText}>Start</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 30,
  },
  heroWrap: {
    marginBottom: 10,
  },
  dateText: {
    color: COLORS.muted,
    fontSize: 12,
  },
  greetingText: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
  },
  sectionPill: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: 'rgba(245,201,106,0.4)',
    backgroundColor: 'rgba(245,201,106,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  mealCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.cardSoft,
    padding: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
  },
  mealBody: {
    flex: 1,
  },
  mealTitle: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  mealPrimary: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    marginTop: 4,
  },
  mealOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  mealOptionChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.card,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  mealOptionText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  mealActionsRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  swapButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(90,209,232,0.36)',
    backgroundColor: 'rgba(90,209,232,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  swapButtonText: {
    color: COLORS.accent2,
    fontSize: 11,
    fontWeight: '700',
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  statusDone: {
    backgroundColor: 'rgba(109,225,176,0.18)',
    borderColor: 'rgba(109,225,176,0.4)',
  },
  statusPlanned: {
    backgroundColor: 'rgba(245,201,106,0.16)',
    borderColor: 'rgba(245,201,106,0.4)',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusDoneText: {
    color: '#7DE7BF',
  },
  statusPlannedText: {
    color: COLORS.accent,
  },
  mealVisual: {
    width: 84,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  mealEmoji: {
    fontSize: 30,
  },
  mealVisualHint: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '700',
    opacity: 0.92,
  },
  workoutCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  workoutTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  workoutTextWrap: {
    flex: 1,
  },
  workoutName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  workoutMeta: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 3,
  },
  workoutIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: 'rgba(90,209,232,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutChipsRow: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  workoutChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.card,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  workoutChipText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  startButton: {
    marginTop: 12,
    borderRadius: 12,
    minHeight: 42,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  startButtonText: {
    color: COLORS.bg,
    fontSize: 14,
    fontWeight: '700',
  },
});

export default WellnessHomeScreen;
