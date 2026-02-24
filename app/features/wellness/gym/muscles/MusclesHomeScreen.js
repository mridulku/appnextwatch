import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import CatalogItemCard from '../../../../ui/components/CatalogItemCard';
import CollapsibleSection from '../../../../components/CollapsibleSection';
import COLORS from '../../../../theme/colors';
import UI_TOKENS from '../../../../ui/tokens';
import useMuscleExplorer from './useMuscleExplorer';
import { DAY_CATEGORY_ORDER, classifyMuscleForDay } from '../dayCategory';

const GROUP_ICONS = {
  Push: 'fitness-outline',
  Pull: 'body-outline',
  Legs: 'walk-outline',
  General: 'albums-outline',
};

function ChevronAction() {
  return (
    <View style={styles.chevronAction}>
      <Ionicons name="chevron-forward" size={16} color={COLORS.text} />
    </View>
  );
}

function MusclesHomeScreen({ navigation, embedded = false, showHeader = true }) {
  const { loading, error, muscles, subgroups, exerciseMaps, refresh } = useMuscleExplorer();
  const [expandedGroups, setExpandedGroups] = useState({});

  const subgroupRows = useMemo(() => {
    const muscleById = Object.fromEntries(muscles.map((muscle) => [muscle.id, muscle]));
    return subgroups.map((subgroup) => {
      const parentMuscle = muscleById[subgroup.muscle_id];
      const mappedExerciseIds = new Set(
        exerciseMaps
          .filter((map) => map.muscle_subgroup_id === subgroup.id)
          .map((map) => map.exercise_id),
      );
      return {
        id: subgroup.id,
        subgroupKey: subgroup.name_key,
        subgroupLabel: subgroup.name,
        groupKey: parentMuscle?.name_key || '',
        groupLabel: parentMuscle?.name || 'Muscle',
        category: classifyMuscleForDay(parentMuscle),
        exerciseCount: mappedExerciseIds.size,
      };
    });
  }, [muscles, subgroups, exerciseMaps]);

  const sections = useMemo(() => {
    const grouped = subgroupRows.reduce((acc, row) => {
      if (!acc[row.category]) acc[row.category] = [];
      acc[row.category].push(row);
      return acc;
    }, {});

    return DAY_CATEGORY_ORDER.filter((category) => grouped[category]?.length).map((category) => ({
      title: category,
      itemCount: grouped[category].length,
      data: expandedGroups[category]
        ? grouped[category].slice().sort((a, b) => a.subgroupLabel.localeCompare(b.subgroupLabel))
        : [],
    }));
  }, [expandedGroups, subgroupRows]);

  const toggleGroup = (title) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const RootContainer = embedded ? View : SafeAreaView;

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
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id || `${item.groupKey}_${item.subgroupKey}`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {showHeader ? (
              <View style={styles.headerWrap}>
                <Text style={styles.title}>Muscles</Text>
                <Text style={styles.subtitle}>Explore exercises by muscle group</Text>
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
          </>
        }
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <CollapsibleSection
            title={section.title}
            subtitle="Muscle groups"
            icon={GROUP_ICONS[section.title] || 'barbell-outline'}
            expanded={Boolean(expandedGroups[section.title])}
            onToggle={() => toggleGroup(section.title)}
            countLabel={`${section.itemCount}`}
            style={styles.groupSection}
          />
        )}
        renderItem={({ item }) => (
          <CatalogItemCard
            title={item.subgroupLabel}
            subtitle={`${item.groupLabel} • ${item.exerciseCount} exercises`}
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
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </RootContainer>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  listContent: {
    paddingHorizontal: UI_TOKENS.spacing.md,
    paddingTop: UI_TOKENS.spacing.sm,
    paddingBottom: UI_TOKENS.spacing.xl + 10,
  },
  groupSection: {
    marginTop: 4,
  },
  headerWrap: {
    marginBottom: UI_TOKENS.spacing.sm,
  },
  title: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 4,
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.subtitle,
  },
  separator: {
    height: UI_TOKENS.spacing.sm,
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
});

export default MusclesHomeScreen;
