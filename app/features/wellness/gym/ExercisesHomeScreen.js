import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../../context/AuthContext';
import { updateUserSelectionSortOrder } from '../../../core/api/catalogSelectionDb';
import { listExerciseMovements } from '../../../core/api/exerciseMovementsDb';
import { listMuscles } from '../../../core/api/musclesDb';
import useCatalogSelection from '../../../hooks/useCatalogSelection';
import COLORS from '../../../theme/colors';
import GroupByPills from './components/GroupByPills';
import ExerciseGroupSection from './components/ExerciseGroupSection';
import { classifyExerciseDay, DAY_ORDER, GROUP_BY_MODES, GROUP_BY_OPTIONS, MUSCLE_GROUP_ORDER, groupExercises } from './exerciseGrouping';
import LibrarySearchBar from './library/components/LibrarySearchBar';
import SelectedCatalogItemCard from '../../../components/cards/SelectedCatalogItemCard';

function navigateToFavoriteVariant(navigation, favoriteRow) {
  const variant = favoriteRow?.catalog_exercise || null;
  if (!variant?.id) return;
  navigation.navigate('ExerciseDetail', {
    exerciseId: variant.id,
    selectedVariantId: variant.id,
    exerciseName: variant.name,
    item: variant,
    fromCatalog: true,
    isAdded: true,
  });
}

function getFavoriteMuscleGroup(row) {
  const primary = String(row?.catalog_exercise?.primary_muscle_group || '').trim().toLowerCase();
  if (primary === 'chest') return 'Chest';
  if (primary === 'back') return 'Back';
  if (primary === 'shoulders') return 'Shoulders';
  if (primary === 'legs') return 'Legs';
  if (primary === 'arms') return 'Arms';
  if (primary === 'core') return 'Core';
  return 'General';
}

function groupFavoriteRows(rows, mode) {
  const favoriteRows = rows || [];

  if (mode === GROUP_BY_MODES.NONE) {
    return [{ type: 'flat', title: 'All favorites', items: favoriteRows }];
  }

  if (mode === GROUP_BY_MODES.MUSCLE) {
    return MUSCLE_GROUP_ORDER
      .map((title) => ({
        type: 'section',
        title,
        items: favoriteRows.filter((row) => getFavoriteMuscleGroup(row) === title),
      }))
      .filter((section) => section.items.length);
  }

  if (mode === GROUP_BY_MODES.DAY) {
    return DAY_ORDER
      .map((title) => ({
        type: 'section',
        title,
        items: favoriteRows.filter((row) => classifyExerciseDay(row?.catalog_exercise) === title),
      }))
      .filter((section) => section.items.length);
  }

  return DAY_ORDER
    .map((title) => {
      const dayRows = favoriteRows.filter((row) => classifyExerciseDay(row?.catalog_exercise) === title);
      const groups = MUSCLE_GROUP_ORDER
        .map((muscleTitle) => ({
          title: muscleTitle,
          items: dayRows.filter((row) => getFavoriteMuscleGroup(row) === muscleTitle),
        }))
        .filter((group) => group.items.length);
      return {
        type: 'nested',
        title,
        groups,
      };
    })
    .filter((section) => section.groups.length);
}

function ExercisesHomeScreen({ navigation, embedded = false, showHeader = true, explorer }) {
  const { user } = useAuth();
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [groupBy, setGroupBy] = useState(GROUP_BY_MODES.DAY_MUSCLE);
  const [favoritesExpanded, setFavoritesExpanded] = useState(false);
  const [favoriteGroupExpanded, setFavoriteGroupExpanded] = useState({});
  const [allExercisesExpanded, setAllExercisesExpanded] = useState(true);
  const [expansionState, setExpansionState] = useState(() => ({
    'section:Push': true,
    'subsection:Push:Chest': true,
  }));
  const [muscles, setMuscles] = useState([]);
  const [movements, setMovements] = useState([]);
  const [movementLoading, setMovementLoading] = useState(true);
  const [movementError, setMovementError] = useState('');
  const scrollViewRef = useRef(null);
  const scrollOffsetRef = useRef(0);
  const shouldRestoreScrollRef = useRef(false);

  const selection = useCatalogSelection({
    user,
    config: {
      catalogTable: 'catalog_exercises',
      catalogSelect: 'id,name,type,primary_muscle_group,equipment,image_url,image_source,image_status',
      userTable: 'user_exercises',
      userSelect: 'id,user_id,exercise_id,sort_order,catalog_exercise:catalog_exercises(id,name,type,primary_muscle_group,equipment,image_url,image_source,image_status)',
      userOrderBy: 'sort_order',
      userFkColumn: 'exercise_id',
      joinKey: 'catalog_exercise',
      categoryOrder: [],
      getCatalogCategory: () => 'All',
      getCatalogSearchText: (row) =>
        [row?.name, row?.type, row?.primary_muscle_group, row?.equipment]
          .filter(Boolean)
          .join(' ')
          .toLowerCase(),
      buildInsertPayload: ({ currentUserRows }) => ({
        sort_order: (currentUserRows || []).reduce((max, row) => Math.max(max, Number(row?.sort_order || 0)), 0) + 1,
      }),
      },
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(String(queryInput || '').trim().toLowerCase());
    }, 280);
    return () => clearTimeout(timer);
  }, [queryInput]);

  useFocusEffect(
    useCallback(() => {
      if (scrollOffsetRef.current > 0) {
        shouldRestoreScrollRef.current = true;
      }
      selection.hydrate();
      let active = true;
      setMovementLoading(true);
      setMovementError('');
      listExerciseMovements()
        .then((rows) => {
          if (!active) return;
          setMovements(rows || []);
        })
        .catch((error) => {
          if (!active) return;
          setMovementError(error?.message || 'Could not load exercise movements');
        })
        .finally(() => {
          if (active) setMovementLoading(false);
        });
      return () => {
        active = false;
      };
    }, [selection.hydrate]),
  );

  useEffect(() => {
    let active = true;
    async function hydrateReferenceData() {
      try {
        const [muscleRows, movementRows] = await Promise.all([listMuscles(), listExerciseMovements()]);
        if (!active) return;
        setMuscles(muscleRows || []);
        setMovements(movementRows || []);
        setMovementError('');
      } catch (error) {
        if (!active) return;
        setMuscles([]);
        setMovements([]);
        setMovementError(error?.message || 'Could not load exercise movements');
      } finally {
        if (active) setMovementLoading(false);
      }
    }
    setMovementLoading(true);
    hydrateReferenceData();
    return () => {
      active = false;
    };
  }, []);

  const groupedRows = useMemo(() => groupExercises(movements, groupBy, query), [movements, groupBy, query]);
  const favoriteRows = useMemo(() => {
    const loweredQuery = query.trim();
    return (selection.userRows || []).filter((row) => {
      const variant = row?.catalog_exercise;
      if (!variant) return false;
      if (!loweredQuery) return true;
      const haystack = [variant?.name, variant?.type, variant?.primary_muscle_group, variant?.equipment]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(loweredQuery);
    });
  }, [query, selection.userRows]);
  const favoriteSections = useMemo(() => groupFavoriteRows(favoriteRows, groupBy), [favoriteRows, groupBy]);
  const reorderFavoriteWithinSection = useCallback(async (sectionRows, rowId, direction) => {
    const currentIndex = sectionRows.findIndex((row) => row.id === rowId);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= sectionRows.length) return;

    const reorderedSection = [...sectionRows];
    const [moved] = reorderedSection.splice(currentIndex, 1);
    reorderedSection.splice(targetIndex, 0, moved);
    const reorderedSectionIds = reorderedSection.map((row) => row.id);
    let sectionCursor = 0;
    const globallyReorderedFavorites = favoriteRows.map((row) => {
      if (!sectionRows.some((sectionRow) => sectionRow.id === row.id)) return row;
      const replacement = reorderedSection.find((sectionRow) => sectionRow.id === reorderedSectionIds[sectionCursor]);
      sectionCursor += 1;
      return replacement || row;
    });

    const nextFavoriteRows = globallyReorderedFavorites.map((row, index) => ({
      ...row,
      sort_order: index + 1,
    }));
    const nextUserRows = (selection.userRows || []).map((row) => {
      const match = nextFavoriteRows.find((favoriteRow) => favoriteRow.id === row.id);
      return match ? { ...row, sort_order: match.sort_order } : row;
    }).sort((a, b) => Number(a?.sort_order || 0) - Number(b?.sort_order || 0));

    selection.setUserRows(nextUserRows);

    try {
      await Promise.all(
        nextFavoriteRows.map((row) =>
          updateUserSelectionSortOrder({
            table: 'user_exercises',
            rowId: row.id,
            sortOrder: row.sort_order,
          })),
      );
    } catch (error) {
      selection.hydrate();
      selection.setError(error?.message || 'Could not reorder favorites');
    }
  }, [favoriteRows, selection]);
  const toggleFavoriteGroup = useCallback((groupKey) => {
    setFavoriteGroupExpanded((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  }, []);

  useEffect(() => {
    if (selection.loading || movementLoading || !shouldRestoreScrollRef.current) return;

    const offset = scrollOffsetRef.current;
    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: offset, animated: false });
      shouldRestoreScrollRef.current = false;
    }, 0);

    return () => clearTimeout(timer);
  }, [groupedRows, movementLoading, selection.loading]);
  const onToggleExpansion = useCallback((key) => {
    setExpansionState((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);
  const onScroll = useCallback((event) => {
    scrollOffsetRef.current = event?.nativeEvent?.contentOffset?.y || 0;
  }, []);
  const muscleImageByName = useMemo(
    () => Object.fromEntries((muscles || []).map((row) => [String(row.name || ''), row.image_url || null])),
    [muscles],
  );

  const getSectionMeta = useCallback(
    ({ title, parentTitle }) => {
      const pushImage = muscleImageByName.Chest || null;
      const pullImage = muscleImageByName.Back || null;
      const legsImage = muscleImageByName.Legs || null;
      const generalImage = muscleImageByName.Core || muscleImageByName.Back || null;

      if (title === 'Push') return { imageUrl: pushImage, subtitle: 'Pressing-focused day' };
      if (title === 'Pull') return { imageUrl: pullImage, subtitle: 'Row and pull-focused day' };
      if (title === 'Legs') return { imageUrl: legsImage, subtitle: 'Lower-body day' };
      if (title === 'General') return { imageUrl: generalImage, subtitle: 'Cardio, core, and mixed work' };

      if (title === 'Chest') return { imageUrl: muscleImageByName.Chest || pushImage, subtitle: parentTitle || 'Muscle group' };
      if (title === 'Back') return { imageUrl: muscleImageByName.Back || pullImage, subtitle: parentTitle || 'Muscle group' };
      if (title === 'Shoulders') return { imageUrl: muscleImageByName.Shoulders || pushImage, subtitle: parentTitle || 'Muscle group' };
      if (title === 'Legs') return { imageUrl: muscleImageByName.Legs || legsImage, subtitle: parentTitle || 'Muscle group' };
      if (title === 'Arms') return { imageUrl: muscleImageByName.Arms || pullImage, subtitle: parentTitle || 'Muscle group' };
      if (title === 'Core') return { imageUrl: muscleImageByName.Core || generalImage, subtitle: parentTitle || 'Muscle group' };

      return { imageUrl: generalImage, subtitle: parentTitle || 'Exercise group' };
    },
    [muscleImageByName],
  );
  const renderFavoriteCards = useCallback((rows) => (
    <View style={styles.favoriteDayList}>
      {rows.map((row) => {
        const variant = row.catalog_exercise;
        const rowIndex = rows.findIndex((item) => item.id === row.id);
        return (
          <View key={row.id || variant.id} style={styles.favoriteCardWrap}>
            <SelectedCatalogItemCard
              title={variant?.name || 'Favorite'}
              subtitle={`${variant?.primary_muscle_group || 'Exercise'} • ${variant?.equipment || variant?.type || 'Variant'}`}
              imageUrl={variant?.image_url || null}
              onPress={() => navigateToFavoriteVariant(navigation, row)}
              rightAction={(
                <View style={styles.favoriteActions}>
                  <View style={styles.favoriteReorderColumn}>
                    <TouchableOpacity
                      style={[styles.favoriteReorderButton, rowIndex === 0 && styles.favoriteReorderButtonDisabled]}
                      activeOpacity={0.85}
                      disabled={rowIndex === 0}
                      onPress={() => reorderFavoriteWithinSection(rows, row.id, -1)}
                    >
                      <Ionicons name="chevron-up" size={14} color={rowIndex === 0 ? COLORS.muted : COLORS.text} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.favoriteReorderButton,
                        rowIndex === rows.length - 1 && styles.favoriteReorderButtonDisabled,
                      ]}
                      activeOpacity={0.85}
                      disabled={rowIndex === rows.length - 1}
                      onPress={() => reorderFavoriteWithinSection(rows, row.id, 1)}
                    >
                      <Ionicons
                        name="chevron-down"
                        size={14}
                        color={rowIndex === rows.length - 1 ? COLORS.muted : COLORS.text}
                      />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={styles.favoriteOpenButton}
                    activeOpacity={0.85}
                    onPress={() => navigateToFavoriteVariant(navigation, row)}
                  >
                    <Ionicons name="chevron-forward" size={15} color={COLORS.text} />
                  </TouchableOpacity>
                </View>
              )}
            />
          </View>
        );
      })}
    </View>
  ), [navigation, reorderFavoriteWithinSection]);

  const RootContainer = embedded ? View : SafeAreaView;

  if (selection.loading || movementLoading) {
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
              <Text style={styles.subtitle}>Browse your exercise catalog by search or grouping.</Text>
            </>
          ) : null}
          <View style={styles.searchRow}>
            <View style={styles.searchWrap}>
              <LibrarySearchBar
                value={queryInput}
                onChangeText={setQueryInput}
                showFilterButton={false}
                placeholder="Search exercises"
              />
            </View>
            <View style={styles.groupSelectorWrap}>
              <GroupByPills value={groupBy} onChange={setGroupBy} options={GROUP_BY_OPTIONS} title="Group exercises" />
            </View>
          </View>
        </View>

        {selection.error || movementError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{selection.error || movementError}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              activeOpacity={0.9}
              onPress={() => {
                selection.hydrate();
                setMovementLoading(true);
                setMovementError('');
                listExerciseMovements()
                  .then((rows) => setMovements(rows || []))
                  .catch((error) => setMovementError(error?.message || 'Could not load exercise movements'))
                  .finally(() => setMovementLoading(false));
              }}
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {movements.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>No exercise movements available</Text>
            <Text style={styles.emptySubtitle}>Seed catalog movement data and retry.</Text>
          </View>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
          >
            {favoriteRows.length ? (
              <View style={styles.favoritesSection}>
                <TouchableOpacity
                  style={styles.favoritesHeader}
                  activeOpacity={0.9}
                  onPress={() => setFavoritesExpanded((prev) => !prev)}
                >
                  <View style={styles.topSectionIconWrapFavorites}>
                    <Ionicons name="star" size={16} color={COLORS.accent} />
                  </View>
                  <View style={styles.favoritesHeaderTextWrap}>
                    <Text style={styles.favoritesTitle}>Favorites</Text>
                    <Text style={styles.favoritesSubtitle}>
                      Your quick picks • {favoriteRows.length} variant{favoriteRows.length === 1 ? '' : 's'}
                    </Text>
                  </View>
                  <View style={styles.favoritesChevronWrap}>
                    <Text style={styles.favoritesChevron}>{favoritesExpanded ? '▾' : '▸'}</Text>
                  </View>
                </TouchableOpacity>
                {favoritesExpanded ? (
                  <View style={styles.favoritesList}>
                    {favoriteSections.map((section) => {
                      if (section.type === 'flat') {
                        return (
                          <View key="favorites_flat" style={styles.favoriteDaySection}>
                            {renderFavoriteCards(section.items)}
                          </View>
                        );
                      }

                      if (section.type === 'section') {
                        const sectionKey = `favorite_section:${section.title}`;
                        return (
                          <View key={section.title} style={styles.favoriteDaySection}>
                            <TouchableOpacity
                              style={styles.favoriteDayHeader}
                              activeOpacity={0.9}
                              onPress={() => toggleFavoriteGroup(sectionKey)}
                            >
                              <View style={styles.favoriteDayMarker} />
                              <View style={styles.favoriteDayHeaderTextWrap}>
                                <Text style={styles.favoriteDayTitle}>{section.title}</Text>
                                <Text style={styles.favoriteDayMeta}>
                                  {section.items.length} favorite{section.items.length === 1 ? '' : 's'}
                                </Text>
                              </View>
                              <Text style={styles.favoriteDayChevron}>
                                {favoriteGroupExpanded[sectionKey] ? '▾' : '▸'}
                              </Text>
                            </TouchableOpacity>
                            {favoriteGroupExpanded[sectionKey] ? renderFavoriteCards(section.items) : null}
                          </View>
                        );
                      }

                      const sectionKey = `favorite_section:${section.title}`;
                      return (
                        <View key={section.title} style={styles.favoriteDaySection}>
                          <TouchableOpacity
                            style={styles.favoriteDayHeader}
                            activeOpacity={0.9}
                            onPress={() => toggleFavoriteGroup(sectionKey)}
                          >
                            <View style={styles.favoriteDayMarker} />
                            <View style={styles.favoriteDayHeaderTextWrap}>
                              <Text style={styles.favoriteDayTitle}>{section.title}</Text>
                              <Text style={styles.favoriteDayMeta}>
                                {section.groups.reduce((sum, group) => sum + group.items.length, 0)} favorite{section.groups.reduce((sum, group) => sum + group.items.length, 0) === 1 ? '' : 's'}
                              </Text>
                            </View>
                            <Text style={styles.favoriteDayChevron}>
                              {favoriteGroupExpanded[sectionKey] ? '▾' : '▸'}
                            </Text>
                          </TouchableOpacity>
                          {favoriteGroupExpanded[sectionKey] ? (
                            <View style={styles.favoriteNestedList}>
                              {section.groups.map((group) => {
                                const groupKey = `favorite_subsection:${section.title}:${group.title}`;
                                return (
                                  <View key={`${section.title}_${group.title}`} style={styles.favoriteNestedGroupWrap}>
                                    <TouchableOpacity
                                      style={styles.favoriteNestedHeader}
                                      activeOpacity={0.9}
                                      onPress={() => toggleFavoriteGroup(groupKey)}
                                    >
                                      <View style={styles.favoriteNestedMarker} />
                                      <View style={styles.favoriteDayHeaderTextWrap}>
                                        <Text style={styles.favoriteNestedTitle}>{group.title}</Text>
                                        <Text style={styles.favoriteNestedMeta}>
                                          {group.items.length} favorite{group.items.length === 1 ? '' : 's'}
                                        </Text>
                                      </View>
                                      <Text style={styles.favoriteDayChevron}>
                                        {favoriteGroupExpanded[groupKey] ? '▾' : '▸'}
                                      </Text>
                                    </TouchableOpacity>
                                    {favoriteGroupExpanded[groupKey] ? renderFavoriteCards(group.items) : null}
                                  </View>
                                );
                              })}
                            </View>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            ) : null}
            <View style={styles.allExercisesSection}>
              <TouchableOpacity
                style={styles.allExercisesHeader}
                activeOpacity={0.9}
                onPress={() => setAllExercisesExpanded((prev) => !prev)}
              >
                <View style={styles.topSectionIconWrapAll}>
                  <Ionicons name="library-outline" size={17} color={COLORS.text} />
                </View>
                <View style={styles.favoritesHeaderTextWrap}>
                  <Text style={styles.favoritesTitle}>All exercises</Text>
                  <Text style={styles.favoritesSubtitle}>
                    Full library • {movements.length} movement{movements.length === 1 ? '' : 's'}
                  </Text>
                </View>
                <View style={styles.favoritesChevronWrap}>
                  <Text style={styles.favoritesChevron}>{allExercisesExpanded ? '▾' : '▸'}</Text>
                </View>
              </TouchableOpacity>
              {allExercisesExpanded ? (
                groupedRows.length && groupedRows.some((section) => (section.items?.length || section.groups?.length)) ? (
                  <View style={styles.allExercisesList}>
                    {groupedRows.map((section, index) => (
                      <ExerciseGroupSection
                        key={`${section.type}_${section.title || 'flat'}_${index}`}
                        section={section}
                        navigation={navigation}
                        selectedCatalogIdSet={selection.selectedCatalogIdSet}
                        getSectionMeta={getSectionMeta}
                        expansionState={expansionState}
                        onToggleExpansion={onToggleExpansion}
                      />
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyCardTitle}>No exercises match this search</Text>
                    <Text style={styles.emptyCardText}>Try a different term or switch grouping.</Text>
                    <TouchableOpacity style={styles.retryButton} activeOpacity={0.9} onPress={() => setQueryInput('')}>
                      <Text style={styles.retryText}>Clear search</Text>
                    </TouchableOpacity>
                  </View>
                )
              ) : null}
            </View>
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  searchWrap: {
    flex: 1,
  },
  groupSelectorWrap: {
    width: 138,
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
  favoritesSection: {
    marginBottom: 12,
  },
  allExercisesSection: {
    marginBottom: 12,
  },
  favoritesHeader: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(245,201,106,0.26)',
    backgroundColor: 'rgba(245,201,106,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  favoritesHeaderTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  topSectionIconWrapFavorites: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245,201,106,0.32)',
    backgroundColor: 'rgba(245,201,106,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  topSectionIconWrapAll: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: 'rgba(162,167,179,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  favoritesTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
  },
  favoritesSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 4,
  },
  favoritesChevronWrap: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoritesChevron: {
    color: COLORS.muted,
    fontSize: 16,
    fontWeight: '700',
  },
  favoritesList: {
    gap: 10,
    marginTop: 10,
  },
  favoriteDaySection: {
    marginBottom: 6,
  },
  favoriteDayHeader: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.18)',
    backgroundColor: 'rgba(162,167,179,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  favoriteDayMarker: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(162,167,179,0.9)',
    flexShrink: 0,
  },
  favoriteDayHeaderTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  favoriteDayTitle: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  favoriteDayMeta: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 3,
  },
  favoriteDayChevron: {
    color: COLORS.muted,
    fontSize: 15,
    fontWeight: '700',
  },
  favoriteDayList: {
    gap: 10,
    marginLeft: 14,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(162,167,179,0.18)',
  },
  favoriteNestedList: {
    marginLeft: 14,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(162,167,179,0.18)',
    gap: 8,
  },
  favoriteNestedGroupWrap: {
    marginTop: 2,
  },
  favoriteNestedHeader: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.18)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  favoriteNestedMarker: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(162,167,179,0.72)',
    flexShrink: 0,
  },
  favoriteNestedTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  favoriteNestedMeta: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 3,
  },
  favoriteCardWrap: {
    marginBottom: 0,
    marginLeft: 4,
  },
  favoriteActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  favoriteReorderColumn: {
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteReorderButton: {
    width: 30,
    height: 26,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: 'rgba(162,167,179,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteReorderButtonDisabled: {
    opacity: 0.45,
  },
  favoriteOpenButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,145,107,0.42)',
    backgroundColor: 'rgba(255,145,107,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  allExercisesHeader: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  allExercisesList: {
    marginTop: 10,
  },
  emptyCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.card,
    padding: 12,
    marginTop: 8,
    alignItems: 'flex-start',
    gap: 8,
  },
  emptyCardText: {
    color: COLORS.muted,
    fontSize: 13,
  },
  emptyCardTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
});

export default ExercisesHomeScreen;
