import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import COLORS from '../theme/colors';

const WEEK_DATA = [52, 66, 38, 74, 90, 63, 81];

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
  const [meals, setMeals] = useState([
    { id: 'breakfast', name: 'Breakfast', status: 'done' },
    { id: 'lunch', name: 'Lunch', status: 'planned' },
    { id: 'dinner', name: 'Dinner', status: 'planned' },
  ]);
  const [workoutDone, setWorkoutDone] = useState(false);

  const completedMeals = useMemo(
    () => meals.filter((meal) => meal.status === 'done').length,
    [meals],
  );

  const switchTab = (tabName, params) => {
    const parent = navigation.getParent();
    if (!parent) return;
    parent.navigate(tabName, params);
  };

  const toggleMealStatus = (mealId) => {
    setMeals((prev) =>
      prev.map((meal) =>
        meal.id === mealId
          ? { ...meal, status: meal.status === 'done' ? 'planned' : 'done' }
          : meal,
      ),
    );
  };

  const quickActions = [
    {
      id: 'start_workout',
      label: 'Start Workout',
      icon: 'barbell-outline',
      onPress: () => switchTab('ExerciseSession'),
    },
    {
      id: 'start_cooking',
      label: 'Start Cooking',
      icon: 'flame-outline',
      onPress: () => switchTab('CookingSession'),
    },
    {
      id: 'add_inventory',
      label: 'Add Inventory Item',
      icon: 'basket-outline',
      onPress: () => switchTab('Food', { screen: 'FoodHome', params: { initialSegment: 'Inventory' } }),
    },
    {
      id: 'meal_log',
      label: 'Add Meal Log',
      icon: 'restaurant-outline',
      onPress: () => switchTab('Food', { screen: 'FoodHome', params: { initialSegment: 'Recipes' } }),
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroWrap}>
          <Text style={styles.dateText}>{formatDateText()}</Text>
          <Text style={styles.greetingText}>{getGreeting()}, Mridul</Text>

          <LinearGradient
            colors={['#3A2F1E', '#1D212B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.streakCard}
          >
            <View>
              <Text style={styles.streakTitle}>Consistency streak</Text>
              <Text style={styles.streakValue}>7 days</Text>
              <Text style={styles.streakSubtle}>You are building momentum. Keep the rhythm.</Text>
            </View>
            <View style={styles.streakBadge}>
              <Ionicons name="sparkles" size={16} color={COLORS.bg} />
              <Text style={styles.streakBadgeText}>+12%</Text>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Today's meals</Text>
          {meals.map((meal) => {
            const done = meal.status === 'done';
            return (
              <TouchableOpacity
                key={meal.id}
                style={styles.rowItem}
                activeOpacity={0.9}
                onPress={() => toggleMealStatus(meal.id)}
              >
                <View style={styles.rowLeft}>
                  <Text style={styles.rowTitle}>{meal.name}</Text>
                  <Text style={styles.rowSubtle}>{done ? 'Completed' : 'Planned'}</Text>
                </View>
                <View style={[styles.statusPill, done ? styles.statusDone : styles.statusPlanned]}>
                  <Text style={[styles.statusText, done ? styles.statusDoneText : styles.statusPlannedText]}>
                    {done ? 'Done' : 'Planned'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
          <Text style={styles.inlineHint}>{completedMeals}/3 meal blocks completed</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Today's workout</Text>
          <View style={styles.rowItem}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Push Day</Text>
              <Text style={styles.rowSubtle}>Bench, shoulder press, triceps</Text>
            </View>
            <TouchableOpacity
              style={[styles.statusPill, workoutDone ? styles.statusDone : styles.statusPlanned]}
              activeOpacity={0.9}
              onPress={() => setWorkoutDone((prev) => !prev)}
            >
              <Text style={[styles.statusText, workoutDone ? styles.statusDoneText : styles.statusPlannedText]}>
                {workoutDone ? 'Done' : 'Planned'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Week strip</Text>
          <View style={styles.weekRow}>
            {WEEK_DATA.map((value, index) => (
              <View key={`bar_${index}`} style={styles.weekBarWrap}>
                <View style={[styles.weekBar, { height: `${Math.max(18, value)}%` }]} />
                <Text style={styles.weekBarLabel}>{['S', 'M', 'T', 'W', 'T', 'F', 'S'][index]}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Quick actions</Text>
          <View style={styles.actionGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.actionCard}
                activeOpacity={0.9}
                onPress={action.onPress}
              >
                <View style={styles.actionIconWrap}>
                  <Ionicons name={action.icon} size={16} color={COLORS.accent2} />
                </View>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
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
    paddingBottom: 34,
  },
  heroWrap: {
    marginBottom: 12,
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
    marginBottom: 10,
  },
  streakCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(245,201,106,0.35)',
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  streakTitle: {
    color: '#EACB90',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontWeight: '700',
  },
  streakValue: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: '700',
    marginTop: 3,
  },
  streakSubtle: {
    color: 'rgba(245,246,248,0.8)',
    fontSize: 12,
    marginTop: 4,
    maxWidth: 230,
  },
  streakBadge: {
    borderRadius: 999,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streakBadgeText: {
    color: COLORS.bg,
    fontSize: 11,
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  rowItem: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  rowLeft: {
    flex: 1,
  },
  rowTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  rowSubtle: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 3,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  statusDone: {
    backgroundColor: 'rgba(109, 225, 176, 0.18)',
    borderColor: 'rgba(109, 225, 176, 0.4)',
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
  inlineHint: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 2,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 112,
    paddingHorizontal: 2,
  },
  weekBarWrap: {
    alignItems: 'center',
    gap: 6,
    width: 28,
  },
  weekBar: {
    width: 18,
    borderRadius: 8,
    backgroundColor: 'rgba(90,209,232,0.75)',
  },
  weekBarLabel: {
    color: COLORS.muted,
    fontSize: 10,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionCard: {
    width: '48.8%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: 10,
    paddingVertical: 11,
    minHeight: 80,
  },
  actionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: 'rgba(90,209,232,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
});

export default WellnessHomeScreen;
