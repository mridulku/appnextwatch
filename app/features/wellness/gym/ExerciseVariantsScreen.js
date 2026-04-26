import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useEffect, useMemo, useState } from 'react';

import CatalogItemCard from '../../../ui/components/CatalogItemCard';
import { getExerciseMovementDetail } from '../../../core/api/exerciseMovementsDb';
import COLORS from '../../../theme/colors';
import UI_TOKENS from '../../../ui/tokens';

function ExerciseVariantsScreen({ route, navigation }) {
  const {
    movementId: routeMovementId,
    exerciseId: routeExerciseId,
    movement: routeMovement,
    movementName,
    selectedCatalogIds,
  } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [inlineError, setInlineError] = useState('');
  const [movement, setMovement] = useState(routeMovement || null);
  const [variants, setVariants] = useState(routeMovement?.variants || []);

  useEffect(() => {
    let isActive = true;

    async function hydrateDetail() {
      try {
        setLoading(true);
        setInlineError('');
        const detail = await getExerciseMovementDetail({
          movementId: routeMovementId || null,
          exerciseId: routeExerciseId || null,
        });
        if (!isActive) return;
        setMovement(detail?.movement || routeMovement || null);
        setVariants(detail?.variants || routeMovement?.variants || []);
      } catch (error) {
        if (!isActive) return;
        setInlineError(error?.message || 'Could not load exercise variants');
      } finally {
        if (isActive) setLoading(false);
      }
    }

    hydrateDetail();
    return () => {
      isActive = false;
    };
  }, [routeExerciseId, routeMovement, routeMovementId]);

  const favorites = useMemo(() => new Set(selectedCatalogIds || []), [selectedCatalogIds]);
  const title = movement?.name || movementName || route.params?.exerciseName || 'Exercise';

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading exercise variants...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerCard}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>Choose the exact variant you want to inspect.</Text>
        </View>

        {inlineError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{inlineError}</Text>
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Variants</Text>
          {variants.length ? (
            variants.map((variant) => {
              const favorite = favorites.has(variant.id);
              const variantLabel = variant?.variant_label || variant?.equipment || 'Variant';
              return (
                <CatalogItemCard
                  key={variant.id}
                  title={variant?.name || 'Variant'}
                  subtitle={`${variantLabel} • ${variant?.primary_muscle_group || movement?.primary_muscle_group || 'Muscle'} • ${variant?.equipment || 'Equipment'}`}
                  imageUrl={variant?.image_url || movement?.image_url || null}
                  badges={favorite ? [{ label: '★ Favorite', tone: 'warn' }] : []}
                  actionLabel="View"
                  actionVariant="muted"
                  onAction={() =>
                    navigation.navigate('ExerciseDetail', {
                      movementId: movement?.id || routeMovementId,
                      exerciseId: variant.id,
                      selectedVariantId: variant.id,
                      exerciseName: variant?.name || movement?.name || title,
                      movementName: movement?.name || title,
                      item: variant,
                      movement,
                      fromCatalog: true,
                      isAdded: favorite,
                    })
                  }
                  onPress={() =>
                    navigation.navigate('ExerciseDetail', {
                      movementId: movement?.id || routeMovementId,
                      exerciseId: variant.id,
                      selectedVariantId: variant.id,
                      exerciseName: variant?.name || movement?.name || title,
                      movementName: movement?.name || title,
                      item: variant,
                      movement,
                      fromCatalog: true,
                      isAdded: favorite,
                    })
                  }
                />
              );
            })
          ) : (
            <Text style={styles.emptyText}>No variants found for this movement.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  content: {
    padding: UI_TOKENS.spacing.md,
    gap: UI_TOKENS.spacing.sm,
    paddingBottom: UI_TOKENS.spacing.xl,
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
  headerCard: {
    borderRadius: UI_TOKENS.radius.lg,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.md,
  },
  title: { color: COLORS.text, fontSize: 24, fontWeight: '700' },
  subtitle: { color: COLORS.muted, fontSize: UI_TOKENS.typography.subtitle, marginTop: 6 },
  sectionCard: {
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.md,
    gap: UI_TOKENS.spacing.xs,
  },
  sectionTitle: { color: COLORS.text, fontSize: UI_TOKENS.typography.subtitle + 1, fontWeight: '700' },
  emptyText: { color: COLORS.muted, fontSize: UI_TOKENS.typography.meta },
  errorCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,124,123,0.4)',
    backgroundColor: 'rgba(255,124,123,0.12)',
    padding: 12,
  },
  errorText: {
    color: '#FFB4A8',
    fontSize: 14,
  },
});

export default ExerciseVariantsScreen;
