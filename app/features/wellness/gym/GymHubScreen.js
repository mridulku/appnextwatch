import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { FITNESS_EXERCISES } from '../../../data/wellness/fitnessExercises';
import { GYM_MACHINES } from '../../../data/wellness/gymMachines';
import ExercisesHomeScreen from './ExercisesHomeScreen';
import GymHomeScreen from './GymHomeScreen';
import GymMyStatsScreen from './GymMyStatsScreen';
import COLORS from '../../../theme/colors';

const SEGMENTS = ['Machines', 'Exercises', 'My Stats'];

function GymHubScreen({ navigation, route }) {
  const initialSegment = route.params?.initialSegment;
  const [segment, setSegment] = useState(initialSegment === 'Exercises' ? 'Exercises' : initialSegment === 'My Stats' ? 'My Stats' : 'Machines');

  useEffect(() => {
    if (route.params?.initialSegment === 'Exercises') {
      setSegment('Exercises');
      return;
    }
    if (route.params?.initialSegment === 'My Stats') {
      setSegment('My Stats');
      return;
    }
    if (route.params?.initialSegment === 'Machines') {
      setSegment('Machines');
    }
  }, [route.params?.initialSegment]);

  const summary = useMemo(
    () => ({
      machines: GYM_MACHINES.length,
      exercises: FITNESS_EXERCISES.length,
      active: segment,
    }),
    [segment],
  );

  const renderContent = () => {
    if (segment === 'Exercises') {
      return <ExercisesHomeScreen navigation={navigation} embedded showHeader={false} />;
    }

    if (segment === 'My Stats') {
      return <GymMyStatsScreen />;
    }

    return <GymHomeScreen navigation={navigation} embedded showHeader={false} />;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.topCard}>
          <View style={styles.topTitleRow}>
            <View>
              <Text style={styles.title}>Gym</Text>
              <Text style={styles.subtitle}>Machines, exercises, and your body stats in one hub.</Text>
            </View>
            <View style={styles.badgePill}>
              <Ionicons name="barbell-outline" size={13} color={COLORS.accent2} />
              <Text style={styles.badgeText}>{summary.active}</Text>
            </View>
          </View>

          <View style={styles.quickStatsRow}>
            <View style={styles.quickStatCard}>
              <Text style={styles.quickStatValue}>{summary.machines}</Text>
              <Text style={styles.quickStatLabel}>machines</Text>
            </View>
            <View style={styles.quickStatCard}>
              <Text style={styles.quickStatValue}>{summary.exercises}</Text>
              <Text style={styles.quickStatLabel}>exercises</Text>
            </View>
          </View>

          <View style={styles.segmentWrap}>
            {SEGMENTS.map((item) => {
              const active = segment === item;
              return (
                <TouchableOpacity
                  key={item}
                  style={[styles.segmentButton, active && styles.segmentButtonActive]}
                  activeOpacity={0.9}
                  onPress={() => setSegment(item)}
                >
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{item}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.contentWrap}>{renderContent()}</View>
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
  },
  topCard: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(162,167,179,0.12)',
    backgroundColor: COLORS.bg,
  },
  topTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  title: {
    color: COLORS.text,
    fontSize: 29,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: 3,
    color: COLORS.muted,
    fontSize: 12,
    maxWidth: 270,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(90,209,232,0.4)',
    backgroundColor: 'rgba(90,209,232,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    color: COLORS.accent2,
    fontSize: 11,
    fontWeight: '700',
  },
  quickStatsRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
  },
  quickStatCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.18)',
    backgroundColor: COLORS.card,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  quickStatValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  quickStatLabel: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  segmentWrap: {
    marginTop: 10,
    borderRadius: 999,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: COLORS.card,
    flexDirection: 'row',
    gap: 6,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 8,
    alignItems: 'center',
  },
  segmentButtonActive: {
    backgroundColor: 'rgba(245,201,106,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(245,201,106,0.48)',
  },
  segmentText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: COLORS.accent,
  },
  contentWrap: {
    flex: 1,
  },
});

export default GymHubScreen;
