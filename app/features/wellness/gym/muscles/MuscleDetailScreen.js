import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
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
import { filterExercisesForMuscle, filterMachinesForMuscle } from './muscleMapping';
import { getMuscleGroupByKey, getMuscleSubgroupByKey } from './muscleTaxonomy';
import useMuscleCatalog from './useMuscleCatalog';

const VIEW_TABS = ['Exercises', 'Machines'];

function ChevronAction() {
  return (
    <View style={styles.chevronAction}>
      <Ionicons name="chevron-forward" size={16} color={COLORS.text} />
    </View>
  );
}

function MuscleDetailScreen({ navigation, route }) {
  const [activeTab, setActiveTab] = useState('Exercises');
  const groupKey = route.params?.groupKey;
  const subKey = route.params?.subKey;
  const group = getMuscleGroupByKey(groupKey);
  const subgroup = getMuscleSubgroupByKey(groupKey, subKey);
  const { loading, error, exercises, machines } = useMuscleCatalog();

  const exerciseRows = useMemo(
    () =>
      filterExercisesForMuscle(groupKey, subKey, exercises).sort((a, b) =>
        String(a.name || '').localeCompare(String(b.name || '')),
      ),
    [groupKey, subKey, exercises],
  );

  const machineRows = useMemo(
    () =>
      filterMachinesForMuscle(groupKey, subKey, machines).sort((a, b) =>
        String(a.name || '').localeCompare(String(b.name || '')),
      ),
    [groupKey, subKey, machines],
  );

  const data = activeTab === 'Exercises' ? exerciseRows : machineRows;

  if (!group || !subgroup) {
    return (
      <View style={styles.safeArea}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Muscle view unavailable</Text>
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
          <Text style={styles.loadingText}>Loading mapped movements...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <View style={styles.heroCard}>
              <Text style={styles.heroTitle}>Target: {subgroup.label}</Text>
              <Text style={styles.heroSubtitle}>
                {group.label} muscle explorer
              </Text>

              <View style={styles.segmentWrap}>
                {VIEW_TABS.map((tab) => {
                  const active = tab === activeTab;
                  const count = tab === 'Exercises' ? exerciseRows.length : machineRows.length;
                  return (
                    <TouchableOpacity
                      key={tab}
                      style={[styles.segmentButton, active && styles.segmentButtonActive]}
                      activeOpacity={0.9}
                      onPress={() => setActiveTab(tab)}
                    >
                      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                        {tab} · {count}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {error ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </>
        }
        renderItem={({ item }) => (
          <CatalogItemCard
            title={item.name || (activeTab === 'Exercises' ? 'Exercise' : 'Machine')}
            subtitle={
              activeTab === 'Exercises'
                ? `${item.primary_muscle_group || group.label} • ${item.type || 'exercise'} • ${item.equipment || 'bodyweight'}`
                : `${item.zone || group.label} • ${Array.isArray(item.primary_muscles) ? item.primary_muscles.join(', ') : 'machine'}`
            }
            actionLabel="View"
            actionVariant="muted"
            onPress={() => {
              if (activeTab === 'Exercises') {
                navigation.navigate('ExerciseDetail', {
                  itemId: item.id,
                  item,
                  exerciseName: item.name,
                  fromCatalog: true,
                  isAdded: false,
                });
                return;
              }

              navigation.navigate('MachineDetail', {
                itemId: item.id,
                item,
                machineName: item.name,
                fromCatalog: true,
                isAdded: false,
              });
            }}
            rightAction={<ChevronAction />}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyCardTitle}>
              {activeTab === 'Exercises'
                ? 'No exercises mapped yet for this muscle.'
                : 'No machines mapped yet for this muscle.'}
            </Text>
            <TouchableOpacity
              style={styles.emptyCardCta}
              activeOpacity={0.9}
              onPress={() =>
                navigation.navigate('GymHome', {
                  initialSegment: activeTab === 'Exercises' ? 'Exercises' : 'Machines',
                })
              }
            >
              <Text style={styles.emptyCardCtaText}>
                {activeTab === 'Exercises' ? 'Add exercises to catalog' : 'Add machines to catalog'}
              </Text>
            </TouchableOpacity>
          </View>
        }
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
    paddingBottom: UI_TOKENS.spacing.xl + 14,
  },
  heroCard: {
    borderRadius: UI_TOKENS.radius.lg,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.md,
    marginBottom: UI_TOKENS.spacing.sm,
  },
  heroTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.title + 2,
    fontWeight: '700',
  },
  heroSubtitle: {
    marginTop: 3,
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.subtitle,
  },
  segmentWrap: {
    marginTop: UI_TOKENS.spacing.sm,
    borderRadius: 999,
    padding: 4,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.cardSoft,
    flexDirection: 'row',
    gap: UI_TOKENS.spacing.xs,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 999,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonActive: {
    backgroundColor: 'rgba(245,201,106,0.2)',
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(245,201,106,0.52)',
  },
  segmentText: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: COLORS.accent,
  },
  separator: {
    height: UI_TOKENS.spacing.sm,
  },
  emptyCard: {
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.md,
    marginTop: UI_TOKENS.spacing.xs,
  },
  emptyCardTitle: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.subtitle,
  },
  emptyCardCta: {
    marginTop: UI_TOKENS.spacing.sm,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(245,201,106,0.45)',
    backgroundColor: 'rgba(245,201,106,0.16)',
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: UI_TOKENS.spacing.sm,
  },
  emptyCardCtaText: {
    color: COLORS.accent,
    fontSize: UI_TOKENS.typography.meta + 1,
    fontWeight: '700',
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
});

export default MuscleDetailScreen;
