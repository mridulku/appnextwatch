import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import CatalogItemCard from '../../../../ui/components/CatalogItemCard';
import COLORS from '../../../../theme/colors';
import UI_TOKENS from '../../../../ui/tokens';
import useMuscleExplorer from './useMuscleExplorer';

function ChevronAction() {
  return (
    <View style={styles.chevronAction}>
      <Ionicons name="chevron-forward" size={16} color={COLORS.text} />
    </View>
  );
}

function MuscleGroupScreen({ navigation, route }) {
  const groupKey = route.params?.groupKey;
  const { loading, error, muscles, subgroups, exerciseMaps, machineMaps, refresh } = useMuscleExplorer();
  const group = useMemo(
    () => muscles.find((muscle) => muscle.name_key === groupKey) || null,
    [muscles, groupKey],
  );

  const subgroupRows = useMemo(() => {
    if (!group) return [];
    return subgroups
      .filter((subgroup) => subgroup.muscle_id === group.id)
      .map((subgroup) => ({
        id: subgroup.id,
        key: subgroup.name_key,
        label: subgroup.name,
        exerciseCount: new Set(
          exerciseMaps
            .filter((map) => map.muscle_subgroup_id === subgroup.id)
            .map((map) => map.exercise_id),
        ).size,
        machineCount: new Set(
          machineMaps
            .filter((map) => map.muscle_subgroup_id === subgroup.id)
            .map((map) => map.machine_id),
        ).size,
      }));
  }, [group, subgroups, exerciseMaps, machineMaps]);

  if (!group) {
    return (
      <View style={styles.safeArea}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Group not found</Text>
          <TouchableOpacity style={styles.backButton} activeOpacity={0.9} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.safeArea}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading sub-groups...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <FlatList
        data={subgroupRows}
        keyExtractor={(item) => item.key}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <View style={styles.headerWrap}>
              <Text style={styles.title}>{group.name}</Text>
              <Text style={styles.subtitle}>Choose a sub-group to inspect mapped exercises.</Text>
            </View>
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
        renderItem={({ item }) => (
          <CatalogItemCard
            title={item.label}
            subtitle={`${item.exerciseCount} exercises • ${item.machineCount} machines`}
            actionLabel="View"
            actionVariant="muted"
            onPress={() =>
              navigation.navigate('MuscleDetail', {
                groupKey: group.name_key,
                subKey: item.key,
                subLabel: item.label,
              })
            }
            rightAction={<ChevronAction />}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
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
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: UI_TOKENS.spacing.lg,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.title,
    fontWeight: '700',
  },
  backButton: {
    marginTop: UI_TOKENS.spacing.md,
    minHeight: 42,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.35)',
    backgroundColor: COLORS.card,
    paddingHorizontal: UI_TOKENS.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle,
    fontWeight: '700',
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

export default MuscleGroupScreen;
