import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import SelectedCatalogItemCard from '../../../components/cards/SelectedCatalogItemCard';
import CollapsibleSection from '../../../components/CollapsibleSection';
import { useAuth } from '../../../context/AuthContext';
import useCatalogSelection from '../../../hooks/useCatalogSelection';
import COLORS from '../../../theme/colors';

const GROUP_ORDER = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio', 'Mobility', 'Other'];

const GROUP_ICONS = {
  Chest: 'fitness-outline',
  Back: 'body-outline',
  Legs: 'walk-outline',
  Shoulders: 'barbell-outline',
  Arms: 'barbell-outline',
  Core: 'shield-outline',
  Cardio: 'pulse-outline',
  Mobility: 'body-outline',
  Other: 'albums-outline',
};

function normalizeExerciseCategory(row) {
  const primary = String(row?.primary_muscle_group || '').trim();
  if (primary) return primary;

  const type = String(row?.type || '').toLowerCase();
  if (type.includes('cardio')) return 'Cardio';
  if (type.includes('mobility')) return 'Mobility';

  return 'Other';
}

function ExercisesHomeScreen({ navigation, embedded = false, showHeader = true }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const selection = useCatalogSelection({
    user,
    config: {
      catalogTable: 'catalog_exercises',
      catalogSelect: 'id,name,type,primary_muscle_group,equipment',
      userTable: 'user_exercises',
      userSelect: 'id,user_id,exercise_id,catalog_exercise:catalog_exercises(id,name,type,primary_muscle_group,equipment)',
      userFkColumn: 'exercise_id',
      joinKey: 'catalog_exercise',
      categoryOrder: GROUP_ORDER,
      getCatalogCategory: normalizeExerciseCategory,
      getCatalogSearchText: (row) =>
        [row?.name, row?.type, row?.primary_muscle_group, row?.equipment]
          .filter(Boolean)
          .join(' ')
          .toLowerCase(),
    },
  });

  const sections = useMemo(
    () =>
      selection.groupedUserSections.map((section) => ({
        ...section,
        data: selection.expandedCategories[section.title] ? section.data : [],
      })),
    [selection.groupedUserSections, selection.expandedCategories],
  );

  useFocusEffect(
    useCallback(() => {
      selection.hydrate();
    }, [selection.hydrate]),
  );

  const RootContainer = embedded ? View : SafeAreaView;
  const openAddScreen = () => navigation?.navigate('AddExercises');
  const openVoiceCommand = () =>
    Alert.alert('Voice Command', 'Exercise voice command is coming soon.');

  if (selection.loading) {
    return (
      <RootContainer style={styles.safeArea}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading exercises...</Text>
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
              <Text style={styles.title}>Exercises</Text>
              <Text style={styles.subtitle}>Build your personalized exercise shortlist.</Text>
            </>
          ) : null}

        </View>

        {selection.error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{selection.error}</Text>
            <TouchableOpacity style={styles.retryButton} activeOpacity={0.9} onPress={selection.hydrate}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {selection.groupedUserSections.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>No exercises yet</Text>
            <Text style={styles.emptySubtitle}>Add exercises from the catalog to shape your workout library.</Text>
            <TouchableOpacity style={styles.emptyCta} activeOpacity={0.9} onPress={openAddScreen}>
              <Ionicons name="add-circle-outline" size={16} color={COLORS.bg} />
              <Text style={styles.emptyCtaText}>Add exercises</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            stickySectionHeadersEnabled={false}
            contentContainerStyle={[styles.listContent, { paddingBottom: 130 + insets.bottom }]}
            showsVerticalScrollIndicator={false}
            renderSectionHeader={({ section }) => (
              <CollapsibleSection
                title={section.title}
                subtitle="Selected exercises"
                icon={GROUP_ICONS[section.title] || 'barbell-outline'}
                expanded={Boolean(selection.expandedCategories[section.title])}
                onToggle={() => selection.toggleCategory(section.title)}
                countLabel={`${section.itemCount}`}
                style={styles.groupSection}
              />
            )}
            renderItem={({ item }) => {
              const catalog = item.catalog_exercise;

              return (
                <SelectedCatalogItemCard
                  title={catalog?.name || 'Exercise'}
                  subtitle={`${normalizeExerciseCategory(catalog)} • ${catalog?.type || 'exercise'} • ${catalog?.equipment || 'bodyweight'}`}
                  onPress={() =>
                    navigation.navigate('ExerciseDetail', {
                      itemId: item.exercise_id,
                      exerciseName: catalog?.name,
                      item: catalog,
                    })
                  }
                  topAction={{
                    iconName: 'create-outline',
                    onPress: () =>
                      navigation.navigate('ExerciseDetail', {
                        itemId: item.exercise_id,
                        exerciseName: catalog?.name,
                        item: catalog,
                      }),
                  }}
                />
              );
            }}
          />
        )}
      </View>
      <View style={[styles.bottomBar, { bottom: Math.max(insets.bottom, 10) }]}>
        <TouchableOpacity style={styles.voiceButton} activeOpacity={0.92} onPress={openVoiceCommand}>
          <Ionicons name="mic" size={18} color={COLORS.bg} />
          <Text style={styles.voiceButtonText}>Voice Command</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomAddButton} activeOpacity={0.9} onPress={openAddScreen}>
          <Ionicons name="add-circle-outline" size={16} color={COLORS.text} />
          <Text style={styles.bottomAddButtonText}>Add Exercise</Text>
        </TouchableOpacity>
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
  retryButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,124,123,0.45)',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  retryText: {
    color: '#FFB4A8',
    fontWeight: '700',
    fontSize: 12,
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
    fontSize: 24,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 29,
  },
  emptyCta: {
    marginTop: 16,
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyCtaText: {
    color: COLORS.bg,
    fontSize: 15,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 28,
  },
  groupSection: {
    marginTop: 4,
  },
  itemRow: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.18)',
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  itemIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(90,209,232,0.3)',
    backgroundColor: 'rgba(90,209,232,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTextWrap: {
    flex: 1,
  },
  itemTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  itemMeta: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  bottomBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: 'rgba(14,15,20,0.96)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.24)',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  voiceButton: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: COLORS.accent,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  voiceButtonText: {
    color: COLORS.bg,
    fontSize: 14,
    fontWeight: '700',
  },
  bottomAddButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.35)',
    backgroundColor: COLORS.card,
    minHeight: 46,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  bottomAddButtonText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chevron: {
    marginRight: -2,
  },
  removeButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,124,123,0.45)',
    backgroundColor: 'rgba(255,124,123,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  removeButtonText: {
    color: '#FF9C92',
    fontSize: 12,
    fontWeight: '700',
  },
});

export default ExercisesHomeScreen;
