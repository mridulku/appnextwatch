import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { getExercisesByIds } from '../data/fitnessExercises';
import { getGymMachineById } from '../data/gymMachines';
import COLORS from '../theme/colors';

function Chip({ label, icon }) {
  return (
    <View style={styles.chip}>
      {icon ? <Ionicons name={icon} size={12} color={COLORS.accent2} /> : null}
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

function BulletList({ items }) {
  return (
    <View style={styles.sectionBody}>
      {items.map((item) => (
        <View key={item} style={styles.bulletRow}>
          <View style={styles.bulletDot} />
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function GymMachineDetailScreen({ route, navigation }) {
  const machine = useMemo(
    () => getGymMachineById(route.params?.machineId),
    [route.params?.machineId],
  );

  const relatedExercises = useMemo(
    () => getExercisesByIds(machine?.variantsExerciseIds ?? []),
    [machine?.variantsExerciseIds],
  );

  const [notes, setNotes] = useState(machine?.notes ?? '');

  if (!machine) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.notFoundWrap}>
          <Text style={styles.notFoundTitle}>Machine not found</Text>
          <Text style={styles.notFoundSubtle}>This machine entry is missing from local data.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const openExercise = (exercise) => {
    const currentRoutes = navigation.getState?.()?.routeNames ?? [];
    if (currentRoutes.includes('ExerciseDetail')) {
      navigation.navigate('ExerciseDetail', {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
      });
      return;
    }

    const parent = navigation.getParent();
    if (!parent) {
      Alert.alert('Navigation unavailable', 'Unable to open Exercises tab from this screen.');
      return;
    }

    const parentRoutes = parent.getState?.()?.routeNames ?? [];
    if (parentRoutes.includes('Library')) {
      parent.navigate('Library', {
        screen: 'ExerciseDetail',
        params: {
          exerciseId: exercise.id,
          exerciseName: exercise.name,
        },
      });
      return;
    }

    if (parentRoutes.includes('Exercises')) {
      parent.navigate('Exercises', {
        screen: 'ExerciseDetail',
        params: {
          exerciseId: exercise.id,
          exerciseName: exercise.name,
        },
      });
      return;
    }

    Alert.alert('Navigation unavailable', 'Unable to open exercise details from this screen.');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={machine.imageColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.zoneBadge}>
              <Ionicons name="map-outline" size={14} color={COLORS.text} />
              <Text style={styles.zoneBadgeText}>{machine.zone} Zone</Text>
            </View>
            <Text style={styles.busyText}>{machine.busyLevel}</Text>
          </View>

          <View>
            <Text style={styles.heroTitle}>{machine.name}</Text>
            <Text style={styles.heroSubtitle}>{machine.primaryMuscles.join(' • ')}</Text>
          </View>
        </LinearGradient>

        <View style={styles.summaryWrap}>
          <Chip label={machine.primaryMuscles.join(' / ')} icon="fitness-outline" />
          <Chip label={machine.zone} icon="grid-outline" />
          <Chip label={`${machine.difficulty} setup`} icon="flash-outline" />
          <Chip label={`${machine.riskLevel} risk`} icon="shield-checkmark-outline" />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>How to use</Text>
          <BulletList items={machine.howTo} />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Common mistakes</Text>
          <BulletList items={machine.mistakes} />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>My cues</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            multiline
            placeholder="Write your personal setup cue, tempo, or focus points..."
            placeholderTextColor={COLORS.muted}
            textAlignVertical="top"
          />
          <Text style={styles.notesHint}>Notes are local to this session.</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Exercise variants</Text>
          {relatedExercises.length === 0 ? (
            <Text style={styles.emptyText}>No linked exercises yet.</Text>
          ) : (
            relatedExercises.map((exercise) => (
              <TouchableOpacity
                key={exercise.id}
                style={styles.relatedRow}
                activeOpacity={0.9}
                onPress={() => openExercise(exercise)}
              >
                <View style={styles.relatedInfo}>
                  <Text style={styles.relatedName}>{exercise.name}</Text>
                  <Text style={styles.relatedMeta}>
                    {exercise.type} • intensity {exercise.intensity}/5
                  </Text>
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
    paddingBottom: 24,
  },
  hero: {
    borderRadius: 20,
    padding: 14,
    minHeight: 168,
    justifyContent: 'space-between',
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  zoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(14,15,20,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(245,246,248,0.28)',
  },
  zoneBadgeText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '600',
  },
  busyText: {
    color: '#D9F3FF',
    fontSize: 11,
    fontWeight: '600',
  },
  heroTitle: {
    color: COLORS.text,
    fontSize: 27,
    fontWeight: '700',
  },
  heroSubtitle: {
    color: 'rgba(245,246,248,0.88)',
    fontSize: 13,
    marginTop: 4,
  },
  summaryWrap: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: 'rgba(90,209,232,0.28)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: {
    color: '#BDE5EF',
    fontSize: 11,
    fontWeight: '600',
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
  sectionBody: {
    gap: 7,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
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
  notesInput: {
    minHeight: 88,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.cardSoft,
    color: COLORS.text,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 13,
  },
  notesHint: {
    marginTop: 6,
    color: COLORS.muted,
    fontSize: 11,
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
    textTransform: 'capitalize',
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

export default GymMachineDetailScreen;
