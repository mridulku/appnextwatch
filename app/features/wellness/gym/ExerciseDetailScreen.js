import { ActivityIndicator, Alert, Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '../../../context/AuthContext';
import { getOrCreateAppUser } from '../../../core/api/foodInventoryDb';
import { addUserSelection, removeUserSelection } from '../../../core/api/catalogSelectionDb';
import { listExerciseMachineMappings, listExerciseMuscleScores } from '../../../core/api/musclesDb';
import { ITEM_PLACEHOLDER_IMAGE } from '../../../core/placeholders';
import COLORS from '../../../theme/colors';
import UI_TOKENS from '../../../ui/tokens';
import { formatScore, getScoreBand } from './muscles/scoreBand';

function ExerciseDetailScreen({ route, navigation }) {
  const { user } = useAuth();
  const { itemId, item } = route.params || {};
  const [isMutating, setIsMutating] = useState(false);
  const [isAdded, setIsAdded] = useState(route.params?.isAdded ?? true);
  const [inlineError, setInlineError] = useState('');
  const [loadingMappings, setLoadingMappings] = useState(true);
  const [muscleScores, setMuscleScores] = useState([]);
  const [machineMatches, setMachineMatches] = useState([]);
  const fromCatalog = Boolean(route.params?.fromCatalog);

  const name = item?.name || route.params?.exerciseName || 'Exercise';
  const subtitle = `${item?.primary_muscle_group || 'Workout'} • ${item?.type || 'exercise'} • ${item?.equipment || 'bodyweight'}`;

  useEffect(() => {
    let isActive = true;

    async function hydrateMappings() {
      if (!itemId) {
        setLoadingMappings(false);
        return;
      }
      try {
        setLoadingMappings(true);
        const [muscles, machines] = await Promise.all([
          listExerciseMuscleScores(itemId),
          listExerciseMachineMappings(itemId),
        ]);
        if (!isActive) return;
        setMuscleScores(muscles || []);
        setMachineMatches(machines || []);
      } catch (error) {
        if (!isActive) return;
        setInlineError(error?.message || 'Could not load exercise mappings');
      } finally {
        if (isActive) setLoadingMappings(false);
      }
    }

    hydrateMappings();
    return () => {
      isActive = false;
    };
  }, [itemId]);

  const rankedMuscles = useMemo(
    () => (muscleScores || []).slice().sort((a, b) => (b.target_score || 0) - (a.target_score || 0)),
    [muscleScores],
  );
  const practicalMachineMatches = useMemo(() => {
    const exerciseName = String(name || '').toLowerCase();

    function isPractical(machineName, relevanceScore) {
      const label = String(machineName || '').toLowerCase();
      if (!label || (Number(relevanceScore) || 0) < 55) return false;

      if (exerciseName.includes('bench press')) {
        return (
          label.includes('bench') ||
          label.includes('press station') ||
          label.includes('smith')
        );
      }

      if (exerciseName.includes('incline')) return label.includes('incline') || label.includes('bench') || label.includes('smith');
      if (exerciseName.includes('decline')) return label.includes('decline') || label.includes('bench') || label.includes('smith');
      if (exerciseName.includes('lat pulldown')) return label.includes('pulldown') || label.includes('pull-up') || label.includes('cable');
      if (exerciseName.includes('row')) return label.includes('row') || label.includes('cable');
      if (exerciseName.includes('curl')) return label.includes('curl') || label.includes('cable');
      if (exerciseName.includes('triceps')) return label.includes('cable') || label.includes('dip') || label.includes('press');
      if (exerciseName.includes('squat')) return label.includes('squat') || label.includes('smith') || label.includes('leg press');
      if (exerciseName.includes('leg press')) return label.includes('leg press') || label.includes('hack squat');

      const equipment = String(item?.equipment || '').toLowerCase();
      if (equipment.includes('cable')) return label.includes('cable') || label.includes('pulley') || label.includes('tower');
      if (equipment.includes('machine')) return label.includes('machine');
      return true;
    }

    const filtered = (machineMatches || []).filter((row) =>
      isPractical(row?.catalog_machine?.name, row?.relevance_score),
    );

    return filtered.length ? filtered : machineMatches;
  }, [item?.equipment, machineMatches, name]);

  const onToggleSaved = () => {
    if (!itemId || isMutating) return;

    const actionLabel = isAdded ? 'Remove' : 'Add';
    const actionMessage = isAdded
      ? 'This exercise will be removed from your liked list.'
      : 'This exercise will be marked as liked.';

    Alert.alert(`${actionLabel} exercise?`, actionMessage, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: actionLabel,
        style: isAdded ? 'destructive' : 'default',
        onPress: async () => {
          try {
            setIsMutating(true);
            setInlineError('');
            const appUser = await getOrCreateAppUser({
              username: user?.username || 'demo user',
              name: user?.name || 'Demo User',
            });
            await (isAdded
              ? removeUserSelection({
                table: 'user_exercises',
                userId: appUser.id,
                fkColumn: 'exercise_id',
                fkValue: itemId,
              })
              : addUserSelection({
                table: 'user_exercises',
                userId: appUser.id,
                fkColumn: 'exercise_id',
                fkValue: itemId,
              }));
            setIsAdded(!isAdded);
          } catch (error) {
            setInlineError(error?.message || `Could not ${isAdded ? 'remove' : 'add'} exercise`);
          } finally {
            setIsMutating(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Image source={ITEM_PLACEHOLDER_IMAGE} style={styles.heroImage} resizeMode="cover" />
          <View style={styles.heroTextWrap}>
            <Text style={styles.heroTitle}>{name}</Text>
            <Text style={styles.heroSubtitle}>{subtitle}</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Target muscles</Text>
          {loadingMappings ? (
            <View style={styles.loadingInline}>
              <ActivityIndicator color={COLORS.accent} />
              <Text style={styles.loadingInlineText}>Loading scores...</Text>
            </View>
          ) : rankedMuscles.length ? (
            rankedMuscles.map((row) => (
              <View key={row.id} style={styles.metricRow}>
                <View style={styles.metricTextWrap}>
                  <Text style={styles.metricTitle}>{row.muscle_subgroup?.name || 'Muscle'}</Text>
                  <Text style={styles.metricMeta}>{row.muscle_subgroup?.muscle?.name || 'Group'}</Text>
                </View>
                <View style={styles.metricBadges}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{formatScore(row.target_score)}</Text>
                  </View>
                  <View style={[styles.badge, getScoreBand(row.target_score) === 'Primary' && styles.badgeWarn]}>
                    <Text style={[styles.badgeText, getScoreBand(row.target_score) === 'Primary' && styles.badgeWarnText]}>
                      {getScoreBand(row.target_score)}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No scored mappings yet.</Text>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Best machines for this exercise</Text>
          {loadingMappings ? (
            <View style={styles.loadingInline}>
              <ActivityIndicator color={COLORS.accent} />
              <Text style={styles.loadingInlineText}>Loading machines...</Text>
            </View>
          ) : practicalMachineMatches.length ? (
            practicalMachineMatches.map((row) => (
              <TouchableOpacity
                key={row.id}
                style={styles.linkRow}
                activeOpacity={0.9}
                onPress={() =>
                  navigation.navigate('MachineDetail', {
                    itemId: row.machine_id,
                    item: row.catalog_machine,
                    machineName: row.catalog_machine?.name,
                    fromCatalog: true,
                    isAdded: false,
                  })
                }
              >
                <View style={styles.metricTextWrap}>
                  <Text style={styles.metricTitle}>{row.catalog_machine?.name || 'Machine'}</Text>
                  <Text style={styles.metricMeta}>{row.catalog_machine?.zone || 'Gym Zone'}</Text>
                </View>
                <View style={styles.linkRight}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{formatScore(row.relevance_score)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>No machine recommendations yet.</Text>
          )}
        </View>

        {inlineError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{inlineError}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={[styles.removeButton, !isAdded && styles.addButton, isMutating && styles.buttonDisabled]}
          activeOpacity={0.9}
          onPress={onToggleSaved}
          disabled={isMutating}
        >
          {isMutating ? (
            <ActivityIndicator size="small" color={isAdded ? '#FFB4A8' : COLORS.bg} />
          ) : (
            <>
              <Ionicons
                name={isAdded ? 'trash-outline' : 'add-circle-outline'}
                size={16}
                color={isAdded ? '#FFB4A8' : COLORS.bg}
              />
              <Text style={[styles.removeText, !isAdded && styles.addText]}>
                {isAdded ? 'Remove thumbs-up' : '👍 Mark as liked'}
              </Text>
            </>
          )}
        </TouchableOpacity>
        {fromCatalog ? (
          <TouchableOpacity style={styles.backButton} activeOpacity={0.9} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>Back to Catalog</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  content: {
    padding: UI_TOKENS.spacing.md,
    paddingBottom: UI_TOKENS.modal.footerHeight + UI_TOKENS.spacing.lg,
    gap: UI_TOKENS.spacing.sm,
  },
  heroCard: {
    borderRadius: UI_TOKENS.radius.lg,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: UI_TOKENS.spacing.sm,
  },
  heroImage: {
    width: 96,
    height: 96,
    borderRadius: UI_TOKENS.card.imageRadius,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
  },
  heroTextWrap: { flex: 1 },
  heroTitle: { color: COLORS.text, fontSize: 24, fontWeight: '700' },
  heroSubtitle: { color: COLORS.muted, fontSize: UI_TOKENS.typography.subtitle, marginTop: 4 },
  sectionCard: {
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.md,
    gap: UI_TOKENS.spacing.xs,
  },
  sectionTitle: { color: COLORS.text, fontSize: UI_TOKENS.typography.subtitle + 1, fontWeight: '700' },
  loadingInline: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: UI_TOKENS.spacing.sm,
  },
  loadingInlineText: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
  metricRow: {
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: UI_TOKENS.spacing.sm,
    paddingVertical: UI_TOKENS.spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: UI_TOKENS.spacing.sm,
  },
  linkRow: {
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: UI_TOKENS.spacing.sm,
    paddingVertical: UI_TOKENS.spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: UI_TOKENS.spacing.sm,
  },
  metricTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  metricTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle,
    fontWeight: '700',
  },
  metricMeta: {
    marginTop: 2,
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
  metricBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: UI_TOKENS.spacing.xs,
  },
  linkRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: UI_TOKENS.spacing.xs,
  },
  badge: {
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.3)',
    backgroundColor: 'rgba(162,167,179,0.12)',
    paddingHorizontal: UI_TOKENS.spacing.xs,
    paddingVertical: 2,
  },
  badgeWarn: {
    borderColor: 'rgba(255,164,116,0.45)',
    backgroundColor: 'rgba(255,164,116,0.16)',
  },
  badgeText: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
  badgeWarnText: {
    color: '#FFB98F',
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
  errorCard: {
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,124,123,0.4)',
    backgroundColor: 'rgba(255,124,123,0.12)',
    padding: UI_TOKENS.spacing.sm,
  },
  errorText: { color: '#FFB4A8', fontSize: UI_TOKENS.typography.meta },
  bottomActions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: UI_TOKENS.spacing.md,
    borderTopWidth: UI_TOKENS.border.hairline,
    borderTopColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.bg,
  },
  removeButton: {
    minHeight: 44,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(255,145,107,0.45)',
    backgroundColor: 'rgba(255,145,107,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: UI_TOKENS.spacing.xs,
  },
  removeText: { color: '#FFB4A8', fontSize: UI_TOKENS.typography.subtitle, fontWeight: '700' },
  addButton: {
    borderColor: 'rgba(245,201,106,0.45)',
    backgroundColor: COLORS.accent,
  },
  addText: {
    color: COLORS.bg,
  },
  backButton: {
    marginTop: UI_TOKENS.spacing.xs,
    minHeight: 40,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.35)',
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.meta + 1,
    fontWeight: '700',
  },
  buttonDisabled: { opacity: 0.6 },
});

export default ExerciseDetailScreen;
