import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { getExerciseById } from '../data/fitnessExercises';
import { getGymMachinesByIds } from '../data/gymMachines';
import COLORS from '../theme/colors';

function getRiskLevel(exercise) {
  if (exercise.intensity >= 5) return 'High';
  if (exercise.intensity >= 3) return 'Medium';
  return 'Low';
}

function BulletList({ items }) {
  if (!items?.length) {
    return <Text style={styles.emptyText}>No details added yet.</Text>;
  }

  return items.map((item) => (
    <View key={item} style={styles.bulletRow}>
      <View style={styles.bulletDot} />
      <Text style={styles.bulletText}>{item}</Text>
    </View>
  ));
}

function StatPill({ label, value, icon }) {
  return (
    <View style={styles.statPill}>
      <Ionicons name={icon} size={13} color={COLORS.accent2} />
      <Text style={styles.statPillLabel}>{label}</Text>
      <Text style={styles.statPillValue}>{value}</Text>
    </View>
  );
}

function ExerciseDetailScreen({ route, navigation }) {
  const exercise = useMemo(
    () => getExerciseById(route.params?.exerciseId),
    [route.params?.exerciseId],
  );

  const relatedMachines = useMemo(
    () => getGymMachinesByIds(exercise?.relatedMachineIds ?? []),
    [exercise?.relatedMachineIds],
  );

  const [isFavorite, setIsFavorite] = useState(false);

  if (!exercise) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.notFoundWrap}>
          <Text style={styles.notFoundTitle}>Exercise not found</Text>
          <Text style={styles.notFoundSubtle}>This exercise entry is missing from local data.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const riskLevel = getRiskLevel(exercise);

  const openMachine = (machine) => {
    const currentRoutes = navigation.getState?.()?.routeNames ?? [];
    if (currentRoutes.includes('GymMachineDetail')) {
      navigation.navigate('GymMachineDetail', {
        machineId: machine.id,
        machineName: machine.name,
      });
      return;
    }

    const parent = navigation.getParent();
    if (!parent) {
      Alert.alert('Navigation unavailable', 'Unable to open Gym tab from this screen.');
      return;
    }

    const parentRoutes = parent.getState?.()?.routeNames ?? [];
    if (parentRoutes.includes('Library')) {
      parent.navigate('Library', {
        screen: 'GymMachineDetail',
        params: {
          machineId: machine.id,
          machineName: machine.name,
        },
      });
      return;
    }

    if (parentRoutes.includes('Gym')) {
      parent.navigate('Gym', {
        screen: 'GymMachineDetail',
        params: {
          machineId: machine.id,
          machineName: machine.name,
        },
      });
      return;
    }

    Alert.alert('Navigation unavailable', 'Unable to open machine details from this screen.');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={exercise.imageColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{exercise.type}</Text>
            </View>
            <TouchableOpacity
              style={[styles.favoriteButton, isFavorite && styles.favoriteButtonActive]}
              activeOpacity={0.9}
              onPress={() => setIsFavorite((prev) => !prev)}
            >
              <Ionicons
                name={isFavorite ? 'star' : 'star-outline'}
                size={15}
                color={isFavorite ? COLORS.bg : COLORS.text}
              />
              <Text style={[styles.favoriteText, isFavorite && styles.favoriteTextActive]}>
                {isFavorite ? 'Favorited' : 'Favorite'}
              </Text>
            </TouchableOpacity>
          </View>

          <View>
            <Text style={styles.heroTitle}>{exercise.name}</Text>
            <Text style={styles.heroSubtitle}>{exercise.primaryMuscles.join(' • ')}</Text>
          </View>
        </LinearGradient>

        <View style={styles.statsCard}>
          <View style={styles.statsGrid}>
            <StatPill label="Intensity" value={`${exercise.intensity}/5`} icon="speedometer-outline" />
            <StatPill label="Equipment" value={exercise.equipment} icon="barbell-outline" />
            <StatPill
              label="Primary"
              value={exercise.primaryMuscles.slice(0, 2).join(' / ')}
              icon="fitness-outline"
            />
            <StatPill label="Risk" value={riskLevel} icon="shield-checkmark-outline" />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Setup</Text>
          <Text style={styles.sectionParagraph}>{exercise.instructions}</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Execution cues</Text>
          <BulletList items={exercise.cues} />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Common mistakes</Text>
          <BulletList items={exercise.mistakes} />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Progressions / regressions</Text>
          <Text style={styles.microHeading}>Progressions</Text>
          <BulletList items={exercise.progressions} />
          <Text style={[styles.microHeading, styles.microHeadingGap]}>Regressions</Text>
          <BulletList items={exercise.regressions} />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Related machines</Text>
          {relatedMachines.length === 0 ? (
            <Text style={styles.emptyText}>No linked machines for this movement.</Text>
          ) : (
            relatedMachines.map((machine) => (
              <TouchableOpacity
                key={machine.id}
                style={styles.relatedRow}
                activeOpacity={0.9}
                onPress={() => openMachine(machine)}
              >
                <View style={styles.relatedInfo}>
                  <Text style={styles.relatedName}>{machine.name}</Text>
                  <Text style={styles.relatedMeta}>{machine.zone} Zone • {machine.busyLevel}</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color={COLORS.muted} />
              </TouchableOpacity>
            ))
          )}
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
  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 26,
  },
  hero: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 170,
    justifyContent: 'space-between',
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.32,
    shadowRadius: 12,
    elevation: 6,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(245,246,248,0.32)',
    backgroundColor: 'rgba(14,15,20,0.34)',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  typeBadgeText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  favoriteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(245,246,248,0.26)',
    backgroundColor: 'rgba(14,15,20,0.34)',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  favoriteButtonActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  favoriteText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '700',
  },
  favoriteTextActive: {
    color: COLORS.bg,
  },
  heroTitle: {
    color: COLORS.text,
    fontSize: 27,
    fontWeight: '700',
  },
  heroSubtitle: {
    color: 'rgba(245,246,248,0.9)',
    fontSize: 13,
    marginTop: 4,
  },
  statsCard: {
    marginTop: 12,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statPill: {
    width: '48.8%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(90,209,232,0.28)',
    backgroundColor: 'rgba(90,209,232,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  statPillLabel: {
    color: '#9DCEE0',
    fontSize: 10,
    marginTop: 5,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statPillValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  sectionCard: {
    marginTop: 12,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionParagraph: {
    color: COLORS.text,
    opacity: 0.9,
    fontSize: 13,
    lineHeight: 20,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 7,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    marginTop: 6,
    backgroundColor: COLORS.accent,
  },
  bulletText: {
    color: COLORS.text,
    opacity: 0.9,
    fontSize: 13,
    flex: 1,
    lineHeight: 19,
  },
  microHeading: {
    color: COLORS.accent2,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  microHeadingGap: {
    marginTop: 8,
  },
  relatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 8,
  },
  relatedInfo: {
    flex: 1,
    paddingRight: 8,
  },
  relatedName: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  relatedMeta: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 3,
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 12,
  },
  notFoundWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  notFoundTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
  },
  notFoundSubtle: {
    marginTop: 6,
    color: COLORS.muted,
    fontSize: 13,
    textAlign: 'center',
  },
});

export default ExerciseDetailScreen;
