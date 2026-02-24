import { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import SelectedCatalogItemCard from '../../../components/cards/SelectedCatalogItemCard';
import CollapsibleSection from '../../../components/CollapsibleSection';
import { useAuth } from '../../../context/AuthContext';
import useCatalogSelection from '../../../hooks/useCatalogSelection';
import COLORS from '../../../theme/colors';
import { DAY_CATEGORY_ORDER, classifyExerciseForDay } from './dayCategory';

const GROUP_ORDER = DAY_CATEGORY_ORDER;

const GROUP_ICONS = {
  Push: 'fitness-outline',
  Pull: 'body-outline',
  Legs: 'walk-outline',
  General: 'albums-outline',
};

function ExercisesHomeScreen({ navigation, embedded = false, showHeader = true }) {
  const { user } = useAuth();

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
      getCatalogCategory: classifyExerciseForDay,
      getCatalogSearchText: (row) =>
        [row?.name, row?.type, row?.primary_muscle_group, row?.equipment]
          .filter(Boolean)
          .join(' ')
          .toLowerCase(),
    },
  });

  const sections = useMemo(
    () => {
      const grouped = selection.catalogRows.reduce((acc, row) => {
        const category = classifyExerciseForDay(row);
        if (!acc[category]) acc[category] = [];
        acc[category].push(row);
        return acc;
      }, {});

      return GROUP_ORDER.filter((category) => grouped[category]?.length).map((category) => ({
        title: category,
        itemCount: grouped[category].length,
        data: selection.expandedCategories[category]
          ? grouped[category].slice().sort((a, b) => (a?.name || '').localeCompare(b?.name || ''))
          : [],
      }));
    },
    [selection.catalogRows, selection.expandedCategories],
  );

  useFocusEffect(
    useCallback(() => {
      selection.hydrate();
    }, [selection.hydrate]),
  );

  const RootContainer = embedded ? View : SafeAreaView;

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

        {selection.catalogRows.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>No exercises available</Text>
            <Text style={styles.emptySubtitle}>Catalog is empty. Seed catalog data and retry.</Text>
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            stickySectionHeadersEnabled={false}
            contentContainerStyle={styles.listContent}
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
              const catalog = item;
              const isAdded = selection.selectedCatalogIdSet.has(item.id);

              return (
                <SelectedCatalogItemCard
                  title={catalog?.name || 'Exercise'}
                  subtitle={`${classifyExerciseForDay(catalog)} • ${catalog?.type || 'exercise'} • ${catalog?.equipment || 'bodyweight'}`}
                  badges={isAdded ? [{ label: '👍 Liked', tone: 'warn' }] : []}
                  onPress={() =>
                    navigation.navigate('ExerciseDetail', {
                      itemId: item.id,
                      exerciseName: catalog?.name,
                      item: catalog,
                      fromCatalog: true,
                      isAdded,
                    })
                  }
                  topAction={{
                    iconName: 'create-outline',
                    onPress: () =>
                      navigation.navigate('ExerciseDetail', {
                        itemId: item.id,
                        exerciseName: catalog?.name,
                        item: catalog,
                        fromCatalog: true,
                        isAdded,
                      }),
                  }}
                />
              );
            }}
          />
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
  listContent: {
    paddingBottom: 20,
  },
  groupSection: {
    marginTop: 4,
  },
});

export default ExercisesHomeScreen;
