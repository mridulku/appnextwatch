import { ActivityIndicator, Alert, Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';

import { useAuth } from '../../../context/AuthContext';
import { getOrCreateAppUser } from '../../../core/api/foodInventoryDb';
import { addUserMachine, removeUserMachine } from '../../../core/api/gymMachinesDb';
import { listMachineExerciseMappings } from '../../../core/api/musclesDb';
import { ITEM_PLACEHOLDER_IMAGE } from '../../../core/placeholders';
import COLORS from '../../../theme/colors';
import UI_TOKENS from '../../../ui/tokens';
import { formatScore } from './muscles/scoreBand';

function MachineDetailScreen({ route, navigation }) {
  const { user } = useAuth();
  const { itemId, item } = route.params || {};
  const [isMutating, setIsMutating] = useState(false);
  const [isAdded, setIsAdded] = useState(route.params?.isAdded ?? true);
  const [inlineError, setInlineError] = useState('');
  const [loadingMappings, setLoadingMappings] = useState(true);
  const [exerciseMatches, setExerciseMatches] = useState([]);
  const fromCatalog = Boolean(route.params?.fromCatalog);

  const machineName = item?.name || route.params?.machineName || 'Machine';
  const subtitle = `${item?.zone || 'Gym Zone'} • ${Array.isArray(item?.primary_muscles) && item.primary_muscles.length ? item.primary_muscles.join(', ') : 'Strength'}`;

  useEffect(() => {
    let isActive = true;

    async function hydrateMappings() {
      if (!itemId) {
        setLoadingMappings(false);
        return;
      }
      try {
        setLoadingMappings(true);
        const exercises = await listMachineExerciseMappings(itemId);
        if (!isActive) return;
        setExerciseMatches(exercises || []);
      } catch (error) {
        if (!isActive) return;
        setInlineError(error?.message || 'Could not load machine mappings');
      } finally {
        if (isActive) setLoadingMappings(false);
      }
    }

    hydrateMappings();
    return () => {
      isActive = false;
    };
  }, [itemId]);

  const onToggleSaved = () => {
    if (!itemId || isMutating) return;

    const actionLabel = isAdded ? 'Remove' : 'Add';
    const actionMessage = isAdded
      ? 'This machine will be removed from your liked list.'
      : 'This machine will be marked as liked.';

    Alert.alert(`${actionLabel} machine?`, actionMessage, [
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
            if (isAdded) {
              await removeUserMachine(appUser.id, itemId);
              setIsAdded(false);
            } else {
              await addUserMachine(appUser.id, itemId);
              setIsAdded(true);
            }
          } catch (error) {
            setInlineError(error?.message || `Could not ${isAdded ? 'remove' : 'add'} machine`);
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
            <Text style={styles.heroTitle}>{machineName}</Text>
            <Text style={styles.heroSubtitle}>{subtitle}</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Exercises you can do on this machine</Text>
          {loadingMappings ? (
            <View style={styles.loadingInline}>
              <ActivityIndicator color={COLORS.accent} />
              <Text style={styles.loadingInlineText}>Loading exercises...</Text>
            </View>
          ) : exerciseMatches.length ? (
            exerciseMatches.map((row) => (
              <TouchableOpacity
                key={row.id}
                style={styles.linkRow}
                activeOpacity={0.9}
                onPress={() =>
                  navigation.navigate('ExerciseDetail', {
                    itemId: row.exercise_id,
                    item: row.catalog_exercise,
                    exerciseName: row.catalog_exercise?.name,
                    fromCatalog: true,
                    isAdded: false,
                  })
                }
              >
                <View style={styles.metricTextWrap}>
                  <Text style={styles.metricTitle}>{row.catalog_exercise?.name || 'Exercise'}</Text>
                  <Text style={styles.metricMeta}>
                    {row.catalog_exercise?.primary_muscle_group || 'Workout'} • {row.catalog_exercise?.equipment || 'Bodyweight'}
                  </Text>
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
            <Text style={styles.emptyText}>No exercise matches yet.</Text>
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

export default MachineDetailScreen;
