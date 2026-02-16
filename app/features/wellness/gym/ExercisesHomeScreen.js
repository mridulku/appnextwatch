import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import {
  FlatList,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import CollapsibleSection from '../../../components/CollapsibleSection';
import { FITNESS_EXERCISES } from '../../../data/wellness/fitnessExercises';
import COLORS from '../../../theme/colors';

const TYPE_FILTERS = ['All', 'Compound', 'Isolation', 'Cardio', 'Mobility'];
const MUSCLE_FILTERS = ['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'];
const EQUIPMENT_FILTERS = ['All', 'Dumbbell', 'Barbell', 'Cable', 'Machine', 'Bodyweight'];
const MUSCLE_GROUP_ORDER = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio / Mobility', 'Other'];

const EQUIPMENT_ICONS = {
  dumbbell: 'barbell-outline',
  barbell: 'barbell',
  cable: 'git-branch-outline',
  machine: 'apps-outline',
  bodyweight: 'body-outline',
};

const MUSCLE_GROUP_META = {
  Chest: { icon: 'heart-outline', note: 'Press and fly movement patterns.' },
  Back: { icon: 'body-outline', note: 'Rows, pulls, and posterior-chain back work.' },
  Legs: { icon: 'walk-outline', note: 'Squat, hinge, and lower body drive patterns.' },
  Shoulders: { icon: 'fitness-outline', note: 'Deltoid-focused presses and raises.' },
  Arms: { icon: 'barbell-outline', note: 'Biceps, triceps, and forearm isolation.' },
  Core: { icon: 'shield-outline', note: 'Bracing, anti-rotation, and trunk control.' },
  'Cardio / Mobility': { icon: 'pulse-outline', note: 'Conditioning and mobility-focused work.' },
  Other: { icon: 'albums-outline', note: 'Mixed and uncategorized movements.' },
};

function getIntensityTone(intensity) {
  if (intensity >= 4) {
    return {
      bg: 'rgba(255, 133, 117, 0.2)',
      border: 'rgba(255, 133, 117, 0.34)',
      text: '#FFB6AA',
    };
  }

  if (intensity <= 2) {
    return {
      bg: 'rgba(113, 228, 179, 0.18)',
      border: 'rgba(113, 228, 179, 0.34)',
      text: '#88E9C5',
    };
  }

  return {
    bg: 'rgba(245, 201, 106, 0.18)',
    border: 'rgba(245, 201, 106, 0.34)',
    text: COLORS.accent,
  };
}

function normalizeMuscleToken(token) {
  return String(token ?? '').trim().toLowerCase();
}

function resolvePrimaryMuscleGroup(exercise) {
  const type = String(exercise?.type ?? '').toLowerCase();
  const tokens = [
    ...(Array.isArray(exercise?.primaryMuscles) ? exercise.primaryMuscles : []),
    ...(Array.isArray(exercise?.secondaryMuscles) ? exercise.secondaryMuscles : []),
  ].map(normalizeMuscleToken);

  const hasToken = (parts) => tokens.some((token) => parts.some((part) => token.includes(part)));

  if (type === 'cardio' || type === 'mobility' || hasToken(['cardio', 'mobility'])) return 'Cardio / Mobility';
  if (hasToken(['chest', 'pec'])) return 'Chest';
  if (hasToken(['back', 'lat', 'trap', 'rhomboid'])) return 'Back';
  if (hasToken(['leg', 'quad', 'hamstring', 'glute', 'calf'])) return 'Legs';
  if (hasToken(['shoulder', 'delt'])) return 'Shoulders';
  if (hasToken(['arm', 'bicep', 'tricep', 'forearm'])) return 'Arms';
  if (hasToken(['core', 'ab', 'oblique'])) return 'Core';

  return 'Other';
}

function ExercisesHomeScreen({ navigation, embedded = false, showHeader = true }) {
  const [searchText, setSearchText] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedMuscle, setSelectedMuscle] = useState('All');
  const [selectedEquipment, setSelectedEquipment] = useState('All');
  const [expandedGroups, setExpandedGroups] = useState({});

  const filteredExercises = useMemo(() => {
    const needle = searchText.trim().toLowerCase();

    return FITNESS_EXERCISES.filter((exercise) => {
      const matchesSearch =
        !needle ||
        exercise.name.toLowerCase().includes(needle) ||
        exercise.primaryMuscles.some((muscle) => muscle.toLowerCase().includes(needle)) ||
        exercise.secondaryMuscles.some((muscle) => muscle.toLowerCase().includes(needle));

      const matchesType =
        selectedType === 'All' || exercise.type.toLowerCase() === selectedType.toLowerCase();
      const matchesMuscle =
        selectedMuscle === 'All' ||
        exercise.primaryMuscles.some((muscle) => muscle.toLowerCase() === selectedMuscle.toLowerCase()) ||
        exercise.secondaryMuscles.some((muscle) => muscle.toLowerCase() === selectedMuscle.toLowerCase());
      const matchesEquipment =
        selectedEquipment === 'All' ||
        exercise.equipment.toLowerCase() === selectedEquipment.toLowerCase();

      return matchesSearch && matchesType && matchesMuscle && matchesEquipment;
    });
  }, [searchText, selectedType, selectedMuscle, selectedEquipment]);

  const hasSearchQuery = searchText.trim().length > 0;

  const groupedExercises = useMemo(() => {
    if (hasSearchQuery) return [];

    const grouped = filteredExercises.reduce((acc, exercise) => {
      const group = resolvePrimaryMuscleGroup(exercise);
      if (!acc[group]) acc[group] = [];
      acc[group].push(exercise);
      return acc;
    }, {});

    return MUSCLE_GROUP_ORDER.filter((group) => grouped[group]?.length > 0).map((group) => ({
      group,
      icon: MUSCLE_GROUP_META[group]?.icon ?? MUSCLE_GROUP_META.Other.icon,
      note: MUSCLE_GROUP_META[group]?.note ?? MUSCLE_GROUP_META.Other.note,
      exercises: grouped[group].slice().sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }, [filteredExercises, hasSearchQuery]);

  const openExercise = (exercise) => {
    navigation.navigate('ExerciseDetail', {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
    });
  };

  const toggleGroup = (group) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [group]: !prev[group],
    }));
  };

  const renderExerciseCard = (exercise) => {
    const intensityTone = getIntensityTone(exercise.intensity);

    return (
      <TouchableOpacity
        style={styles.exerciseCard}
        activeOpacity={0.9}
        onPress={() => openExercise(exercise)}
      >
        <LinearGradient
          colors={exercise.imageColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.exerciseHero}
        >
          <View style={styles.heroTopRow}>
            <View
              style={[
                styles.intensityChip,
                { backgroundColor: intensityTone.bg, borderColor: intensityTone.border },
              ]}
            >
              <Text style={[styles.intensityText, { color: intensityTone.text }]}>Intensity {exercise.intensity}/5</Text>
            </View>
            <Text style={styles.heroEmoji}>{exercise.emoji}</Text>
          </View>

          <View style={styles.heroBottomRow}>
            <View style={styles.typeChip}>
              <Text style={styles.typeChipText}>{exercise.type}</Text>
            </View>
            <View style={styles.equipmentChip}>
              <Ionicons
                name={EQUIPMENT_ICONS[exercise.equipment] ?? 'fitness-outline'}
                size={13}
                color={COLORS.text}
              />
              <Text style={styles.equipmentChipText}>{exercise.equipment}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.exerciseBody}>
          <View style={styles.titleRow}>
            <Text style={styles.exerciseName}>{exercise.name}</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
          </View>
          <Text style={styles.muscleLine}>
            {exercise.primaryMuscles.join(' • ')}
            {exercise.secondaryMuscles.length ? `  ·  ${exercise.secondaryMuscles.slice(0, 2).join(' • ')}` : ''}
          </Text>
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
              <Text style={styles.title}>Exercises</Text>
              <Text style={styles.subtitle}>Your library - form cues, intensity, and variants.</Text>
            </>
          ) : null}

          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={16} color={COLORS.muted} />
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              style={styles.searchInput}
              placeholder="Search exercise, muscle, or movement"
              placeholderTextColor={COLORS.muted}
            />
            {searchText.trim() ? (
              <TouchableOpacity
                onPress={() => setSearchText('')}
                activeOpacity={0.8}
                style={styles.clearButton}
              >
                <Ionicons name="close" size={14} color={COLORS.text} />
              </TouchableOpacity>
            ) : null}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {TYPE_FILTERS.map((filter) => {
              const active = selectedType === filter;
              return (
                <TouchableOpacity
                  key={filter}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  activeOpacity={0.9}
                  onPress={() => setSelectedType(filter)}
                >
                  <Text style={[styles.filterText, active && styles.filterTextActive]}>{filter}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRowSecondary}
          >
            {MUSCLE_FILTERS.map((filter) => {
              const active = selectedMuscle === filter;
              return (
                <TouchableOpacity
                  key={filter}
                  style={[styles.secondaryChip, active && styles.secondaryChipActive]}
                  activeOpacity={0.9}
                  onPress={() => setSelectedMuscle(filter)}
                >
                  <Text style={[styles.secondaryText, active && styles.secondaryTextActive]}>{filter}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRowSecondary}
          >
            {EQUIPMENT_FILTERS.map((filter) => {
              const active = selectedEquipment === filter;
              return (
                <TouchableOpacity
                  key={filter}
                  style={[styles.equipmentFilterChip, active && styles.equipmentFilterChipActive]}
                  activeOpacity={0.9}
                  onPress={() => setSelectedEquipment(filter)}
                >
                  <Text style={[styles.equipmentFilterText, active && styles.equipmentFilterTextActive]}>{filter}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {hasSearchQuery ? (
          <FlatList
            style={styles.groupsScroll}
            data={filteredExercises}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => renderExerciseCard(item)}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyTitle}>No exercises found</Text>
                <Text style={styles.emptySubtle}>Adjust search text or reset one of the filters.</Text>
              </View>
            }
          />
        ) : (
          <ScrollView
            style={styles.groupsScroll}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {groupedExercises.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyTitle}>No exercises in this filter</Text>
                <Text style={styles.emptySubtle}>Try updating type, muscle, or equipment filters.</Text>
              </View>
            ) : (
              groupedExercises.map((group) => (
                <CollapsibleSection
                  key={group.group}
                  title={group.group}
                  subtitle={group.note}
                  icon={group.icon}
                  iconIsEmoji={false}
                  expanded={Boolean(expandedGroups[group.group])}
                  onToggle={() => toggleGroup(group.group)}
                  countLabel={`${group.exercises.length} ${group.exercises.length === 1 ? 'exercise' : 'exercises'}`}
                  style={styles.groupSection}
                  contentStyle={styles.groupContent}
                >
                  {group.exercises.map((exercise) => (
                    <View key={exercise.id}>{renderExerciseCard(exercise)}</View>
                  ))}
                </CollapsibleSection>
              ))
            )}
          </ScrollView>
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
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.26)',
    backgroundColor: COLORS.card,
    paddingHorizontal: 10,
    minHeight: 44,
    marginBottom: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
  },
  clearButton: {
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: 'rgba(162,167,179,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    gap: 8,
    paddingBottom: 2,
  },
  filterRowSecondary: {
    gap: 8,
    paddingBottom: 2,
    marginTop: 8,
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
  secondaryChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(90,209,232,0.28)',
    backgroundColor: 'rgba(90,209,232,0.08)',
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  secondaryChipActive: {
    borderColor: 'rgba(90,209,232,0.56)',
    backgroundColor: 'rgba(90,209,232,0.2)',
  },
  secondaryText: {
    color: '#9DCEE0',
    fontSize: 11,
    fontWeight: '600',
  },
  secondaryTextActive: {
    color: COLORS.accent2,
  },
  equipmentFilterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.28)',
    backgroundColor: 'rgba(162,167,179,0.08)',
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  equipmentFilterChipActive: {
    borderColor: 'rgba(245,246,248,0.42)',
    backgroundColor: 'rgba(245,246,248,0.14)',
  },
  equipmentFilterText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  equipmentFilterTextActive: {
    color: COLORS.text,
  },
  groupsScroll: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
  },
  groupSection: {
    marginTop: 0,
  },
  groupContent: {
    paddingTop: 8,
  },
  exerciseCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.18)',
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.24,
    shadowRadius: 10,
    elevation: 4,
  },
  exerciseHero: {
    height: 104,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'space-between',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  intensityChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  intensityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  heroEmoji: {
    fontSize: 23,
  },
  heroBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  typeChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(14,15,20,0.34)',
    borderWidth: 1,
    borderColor: 'rgba(245,246,248,0.24)',
  },
  typeChipText: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  equipmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(14,15,20,0.34)',
    borderWidth: 1,
    borderColor: 'rgba(245,246,248,0.24)',
  },
  equipmentChipText: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  exerciseBody: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  exerciseName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  muscleLine: {
    color: COLORS.text,
    opacity: 0.9,
    fontSize: 12,
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

export default ExercisesHomeScreen;
