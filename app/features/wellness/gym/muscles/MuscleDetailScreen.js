import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { ITEM_PLACEHOLDER_IMAGE } from '../../../../core/placeholders';
import { listSubgroupMovementMappings } from '../../../../core/api/exerciseMovementsDb';
import COLORS from '../../../../theme/colors';
import UI_TOKENS from '../../../../ui/tokens';
import { formatScore, getScoreBand } from './scoreBand';
import useMuscleExplorer from './useMuscleExplorer';
import ExerciseGroupSection from '../components/ExerciseGroupSection';

const SCORE_TIERS = [
  {
    key: 'primary',
    title: 'Primary movements',
    subtitle: 'These movements target this muscle directly and should be the main options for biasing it.',
    minimumScore: 80,
  },
  {
    key: 'secondary',
    title: 'Secondary movements',
    subtitle: 'These movements hit the muscle meaningfully, but it is not the main driver of the movement.',
    minimumScore: 60,
  },
  {
    key: 'assist',
    title: 'Assist movements',
    subtitle: 'These movements still involve the muscle, but more as supporting work than as the main target.',
    minimumScore: 40,
  },
];

function MuscleDetailScreen({ navigation, route }) {
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [movementRows, setMovementRows] = useState([]);
  const [movementLoading, setMovementLoading] = useState(true);
  const [movementError, setMovementError] = useState('');
  const groupKey = route.params?.groupKey;
  const subKey = route.params?.subKey;

  const { loading, error, muscles, subgroups } = useMuscleExplorer();

  const group = useMemo(
    () => muscles.find((muscle) => muscle.name_key === groupKey) || null,
    [muscles, groupKey],
  );
  const subgroup = useMemo(
    () => subgroups.find((entry) => entry.muscle_id === group?.id && entry.name_key === subKey) || null,
    [subgroups, group?.id, subKey],
  );

  useEffect(() => {
    let isActive = true;
    async function hydrateMovementRows() {
      if (!subgroup?.id) {
        setMovementRows([]);
        setMovementLoading(false);
        return;
      }

      try {
        setMovementLoading(true);
        setMovementError('');
        const rows = await listSubgroupMovementMappings({ subgroupId: subgroup.id });
        if (!isActive) return;
        setMovementRows(rows || []);
      } catch (nextError) {
        if (!isActive) return;
        setMovementError(nextError?.message || 'Could not load movement mappings');
      } finally {
        if (isActive) setMovementLoading(false);
      }
    }

    hydrateMovementRows();
    return () => {
      isActive = false;
    };
  }, [subgroup?.id]);

  const mappedMovements = useMemo(
    () =>
      (movementRows || []).map((row) => {
        const score = Number(row?.target_score || 0);
        return {
          ...(row.movement || {}),
          targetScore: score,
          scoreBand: getScoreBand(score),
          muscle: `${row.movement?.primary_muscle_group || group?.name || 'Movement'} • ${formatScore(score)} • ${getScoreBand(score)}`,
        };
      }),
    [group?.name, movementRows],
  );

  const tieredSections = useMemo(
    () =>
      SCORE_TIERS.map((tier, index) => {
        const upperBound = index === 0 ? Infinity : SCORE_TIERS[index - 1].minimumScore;
        const items = mappedMovements.filter(
          (row) => Number(row?.targetScore || 0) >= tier.minimumScore && Number(row?.targetScore || 0) < upperBound,
        );
        return {
          ...tier,
          items,
        };
      }).filter((tier) => tier.items.length),
    [mappedMovements],
  );

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

  if (loading || movementLoading) {
    return (
      <View style={styles.safeArea}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading mapped movements...</Text>
        </View>
      </View>
    );
  }

  const heroImageSource = subgroup?.image_url
    ? { uri: subgroup.image_url }
    : group?.image_url
      ? { uri: group.image_url }
      : ITEM_PLACEHOLDER_IMAGE;

  return (
    <View style={styles.safeArea}>
      <FlatList
        data={tieredSections}
        keyExtractor={(item) => item.key}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <View style={styles.heroCard}>
              <TouchableOpacity activeOpacity={0.92} onPress={() => setImageViewerVisible(true)}>
                <Image source={heroImageSource} style={styles.heroImage} resizeMode="cover" />
              </TouchableOpacity>
              <View style={styles.heroTextWrap}>
                <Text style={styles.heroTitle}>Target: {subgroup.name}</Text>
                <Text style={styles.heroSubtitle}>{group.name} muscle explorer</Text>
                <Text style={styles.heroHint}>Tap image to enlarge</Text>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEyebrow}>Exercises</Text>
              <Text style={styles.sectionTitle}>Movements that target {subgroup.name}</Text>
              <Text style={styles.sectionSubtitle}>
                Open a movement, then choose the exact variant you want to inspect.
              </Text>
            </View>

            {error || movementError ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>{error || movementError}</Text>
              </View>
            ) : null}
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.tierSection}>
            <View style={styles.tierHeader}>
              <Text style={styles.tierTitle}>{item.title}</Text>
              <Text style={styles.tierSubtitle}>{item.subtitle}</Text>
            </View>
            <ExerciseGroupSection
              section={{ type: 'flat', items: item.items }}
              navigation={navigation}
              selectedCatalogIdSet={new Set()}
            />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyCardTitle}>No movements mapped yet for this muscle.</Text>
            <Text style={styles.emptyCardText}>Run the movement rollup seed to populate muscle-to-movement mappings.</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      <Modal visible={imageViewerVisible} transparent animationType="fade" onRequestClose={() => setImageViewerVisible(false)}>
        <View style={styles.viewerRoot}>
          <Pressable style={styles.viewerBackdrop} onPress={() => setImageViewerVisible(false)} />
          <View style={styles.viewerCard}>
            <View style={styles.viewerHeader}>
              <Text style={styles.viewerTitle}>{subgroup.name}</Text>
              <TouchableOpacity
                style={styles.viewerCloseButton}
                activeOpacity={0.9}
                onPress={() => setImageViewerVisible(false)}
              >
                <Ionicons name="close" size={18} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <Image source={heroImageSource} style={styles.viewerImage} resizeMode="contain" />
          </View>
        </View>
      </Modal>
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
    borderColor: 'rgba(245,201,106,0.34)',
    backgroundColor: 'rgba(245,201,106,0.08)',
    padding: UI_TOKENS.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: UI_TOKENS.spacing.sm,
    marginBottom: UI_TOKENS.spacing.sm,
  },
  heroImage: {
    width: 72,
    height: 72,
    borderRadius: UI_TOKENS.card.imageRadius,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
  },
  heroTextWrap: {
    flex: 1,
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
  heroHint: {
    marginTop: 6,
    color: COLORS.accent,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '600',
  },
  sectionHeader: {
    marginBottom: UI_TOKENS.spacing.sm,
    paddingHorizontal: 2,
  },
  sectionEyebrow: {
    color: COLORS.accent,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.title - 2,
    fontWeight: '700',
    marginTop: 3,
  },
  sectionSubtitle: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
    marginTop: 5,
    lineHeight: 18,
  },
  tierSection: {
    marginBottom: UI_TOKENS.spacing.sm,
  },
  tierHeader: {
    marginBottom: UI_TOKENS.spacing.xs,
    paddingHorizontal: 2,
  },
  tierTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 1,
    fontWeight: '700',
  },
  tierSubtitle: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
    marginTop: 3,
    lineHeight: 18,
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
  errorCard: {
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(255,124,123,0.36)',
    backgroundColor: 'rgba(255,124,123,0.12)',
    padding: UI_TOKENS.spacing.md,
    marginBottom: UI_TOKENS.spacing.sm,
  },
  errorText: {
    color: '#FFB4A8',
    fontSize: UI_TOKENS.typography.meta,
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
    textAlign: 'center',
  },
  backButton: {
    marginTop: UI_TOKENS.spacing.md,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.card,
    paddingHorizontal: UI_TOKENS.spacing.md,
    paddingVertical: UI_TOKENS.spacing.sm,
  },
  backText: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle,
    fontWeight: '700',
  },
  emptyCard: {
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.md,
  },
  emptyCardTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 1,
    fontWeight: '700',
  },
  emptyCardText: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
    marginTop: 6,
  },
  separator: {
    height: 2,
  },
  viewerRoot: {
    flex: 1,
    backgroundColor: 'rgba(3,7,18,0.74)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: UI_TOKENS.spacing.md,
  },
  viewerBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  viewerCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: UI_TOKENS.radius.lg,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.md,
    gap: UI_TOKENS.spacing.sm,
  },
  viewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: UI_TOKENS.spacing.sm,
  },
  viewerTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 2,
    fontWeight: '700',
    flex: 1,
  },
  viewerCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerImage: {
    width: '100%',
    height: 320,
    borderRadius: UI_TOKENS.radius.md,
  },
});

export default MuscleDetailScreen;
