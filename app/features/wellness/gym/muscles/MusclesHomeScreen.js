import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import CatalogItemCard from '../../../../ui/components/CatalogItemCard';
import COLORS from '../../../../theme/colors';
import UI_TOKENS from '../../../../ui/tokens';
import GroupByPills from '../components/GroupByPills';
import CatalogGroupSection from '../components/CatalogGroupSection';
import LibrarySearchBar from '../library/components/LibrarySearchBar';
import useMuscleExplorer from './useMuscleExplorer';
import { groupMuscles, MUSCLE_GROUP_BY_MODES, MUSCLE_GROUP_BY_OPTIONS } from './muscleGrouping';

function ChevronAction() {
  return (
    <View style={styles.chevronAction}>
      <Ionicons name="chevron-forward" size={16} color={COLORS.text} />
    </View>
  );
}

function MuscleCard({ item, navigation }) {
  return (
    <CatalogItemCard
      title={item.subgroupLabel}
      subtitle={`${item.groupLabel} • ${item.exerciseCount || 0} exercises • ${item.machineCount || 0} machines`}
      imageUrl={item.image_url}
      actionLabel="View"
      actionVariant="muted"
      onPress={() =>
        navigation.navigate('MuscleDetail', {
          groupKey: item.groupKey,
          subKey: item.subgroupKey,
          groupLabel: item.groupLabel,
          subLabel: item.subgroupLabel,
        })
      }
      rightAction={<ChevronAction />}
    />
  );
}

function MusclesHomeScreen({ navigation, embedded = false, showHeader = true }) {
  const active = useMuscleExplorer();
  const { loading, error, warning, refresh, muscles = [], subgroups = [], exerciseMaps = [], machineMaps = [] } = active;
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [groupBy, setGroupBy] = useState(MUSCLE_GROUP_BY_MODES.DAY);
  const [expandedKeys, setExpandedKeys] = useState(() => new Set(['section:Push']));

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(String(queryInput || '').trim().toLowerCase());
    }, 280);
    return () => clearTimeout(timer);
  }, [queryInput]);

  const rows = useMemo(() => {
    const muscleById = Object.fromEntries((muscles || []).map((muscle) => [muscle.id, muscle]));
    return (subgroups || []).map((subgroup) => {
      const parentMuscle = muscleById[subgroup.muscle_id];
      const mappedExerciseIds = new Set((exerciseMaps || []).filter((map) => map.muscle_subgroup_id === subgroup.id).map((map) => map.exercise_id));
      const mappedMachineIds = new Set((machineMaps || []).filter((map) => map.muscle_subgroup_id === subgroup.id).map((map) => map.machine_id));
      return {
        id: subgroup.id,
        subgroupKey: subgroup.name_key,
        subgroupLabel: subgroup.name,
        groupKey: parentMuscle?.name_key || '',
        groupLabel: parentMuscle?.name || 'Muscle',
        image_url: subgroup.image_url || parentMuscle?.image_url || null,
        exerciseCount: mappedExerciseIds.size,
        machineCount: mappedMachineIds.size,
      };
    });
  }, [exerciseMaps, machineMaps, muscles, subgroups]);

  const groupedRows = useMemo(() => groupMuscles(rows, groupBy, query), [rows, groupBy, query]);
  const topMuscleImageByName = useMemo(
    () => Object.fromEntries((muscles || []).map((row) => [String(row.name || ''), row.image_url || null])),
    [muscles],
  );

  const getSectionMeta = useMemo(() => {
    const pushImage = topMuscleImageByName.Chest || null;
    const pullImage = topMuscleImageByName.Back || null;
    const legsImage = topMuscleImageByName.Legs || null;
    const generalImage = topMuscleImageByName.Core || topMuscleImageByName.Back || null;

    return ({ title }) => {
      if (title === 'Push') return { imageUrl: pushImage, subtitle: 'Chest, shoulders, and triceps' };
      if (title === 'Pull') return { imageUrl: pullImage, subtitle: 'Back and biceps' };
      if (title === 'Legs') return { imageUrl: legsImage, subtitle: 'Leg and glute muscles' };
      if (title === 'General') return { imageUrl: generalImage, subtitle: 'Core and mixed support muscles' };
      return { imageUrl: generalImage, subtitle: 'Muscle group' };
    };
  }, [topMuscleImageByName]);

  const RootContainer = embedded ? View : SafeAreaView;

  function toggleExpandedKey(key) {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (loading) {
    return (
      <RootContainer style={styles.safeArea}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading muscles...</Text>
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
              <Text style={styles.title}>Muscles</Text>
              <Text style={styles.subtitle}>Browse muscle groups by day or as a flat anatomy map.</Text>
            </>
          ) : null}
          <View style={styles.searchRow}>
            <View style={styles.searchWrap}>
              <LibrarySearchBar
                value={queryInput}
                onChangeText={setQueryInput}
                showFilterButton={false}
                placeholder="Search muscles"
              />
            </View>
            <View style={styles.groupSelectorWrap}>
              <GroupByPills value={groupBy} onChange={setGroupBy} options={MUSCLE_GROUP_BY_OPTIONS} title="Group muscles" />
            </View>
          </View>
        </View>

        {warning ? (
          <View style={styles.warningCard}>
            <Text style={styles.warningText}>{warning}</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} activeOpacity={0.9} onPress={refresh}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {rows.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardTitle}>No muscles available</Text>
              <Text style={styles.emptyCardText}>Muscle explorer data is empty. Retry after seeding data.</Text>
              <TouchableOpacity style={styles.retryButton} activeOpacity={0.9} onPress={refresh}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : groupedRows.length && groupedRows.some((section) => (section.items?.length || section.groups?.length)) ? (
            groupedRows.map((section, index) => (
              <CatalogGroupSection
                key={`${section.type}_${section.title || 'flat'}_${index}`}
                section={section}
                getSectionMeta={getSectionMeta}
                countLabel="muscle"
                expandedKeys={expandedKeys}
                onToggleKey={toggleExpandedKey}
                renderItem={(item) => (
                  <View key={item.id} style={styles.cardWrap}>
                    <MuscleCard item={item} navigation={navigation} />
                  </View>
                )}
              />
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardTitle}>No muscles match this search</Text>
              <Text style={styles.emptyCardText}>Try a different term or switch grouping.</Text>
              <TouchableOpacity style={styles.retryButton} activeOpacity={0.9} onPress={() => setQueryInput('')}>
                <Text style={styles.retryText}>Clear search</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
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
  listContent: {
    paddingBottom: UI_TOKENS.spacing.xl + 10,
  },
  cardWrap: {
    marginBottom: UI_TOKENS.spacing.sm,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: UI_TOKENS.spacing.sm,
  },
  loadingText: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.subtitle,
  },
  warningCard: {
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(245,201,106,0.42)',
    backgroundColor: 'rgba(245,201,106,0.12)',
    padding: UI_TOKENS.spacing.sm,
    marginBottom: UI_TOKENS.spacing.sm,
  },
  warningText: {
    color: COLORS.accent,
    fontSize: UI_TOKENS.typography.meta,
  },
  errorCard: {
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(255,124,123,0.42)',
    backgroundColor: 'rgba(255,124,123,0.12)',
    padding: UI_TOKENS.spacing.sm,
    marginBottom: UI_TOKENS.spacing.sm,
  },
  errorText: {
    color: '#FFB4A8',
    fontSize: UI_TOKENS.typography.meta,
  },
  retryButton: {
    marginTop: UI_TOKENS.spacing.xs,
    alignSelf: 'flex-start',
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(255,124,123,0.5)',
    paddingHorizontal: UI_TOKENS.spacing.sm,
    paddingVertical: 6,
  },
  retryText: {
    color: '#FFB4A8',
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
  emptyCard: {
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.md,
    marginTop: UI_TOKENS.spacing.sm,
    alignItems: 'flex-start',
    gap: UI_TOKENS.spacing.xs,
  },
  emptyCardTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle,
    fontWeight: '700',
  },
  emptyCardText: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.subtitle,
  },
  chevronAction: {
    width: UI_TOKENS.control.iconButton,
    height: UI_TOKENS.control.iconButton,
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.32)',
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default MusclesHomeScreen;
