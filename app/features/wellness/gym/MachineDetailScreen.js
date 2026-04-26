import { ActivityIndicator, Alert, Image, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';

import { useAuth } from '../../../context/AuthContext';
import { listMachineMovementMappings } from '../../../core/api/exerciseMovementsDb';
import { getOrCreateAppUser } from '../../../core/api/foodInventoryDb';
import { addUserMachine, removeUserMachine } from '../../../core/api/gymMachinesDb';
import { ITEM_PLACEHOLDER_IMAGE } from '../../../core/placeholders';
import COLORS from '../../../theme/colors';
import UI_TOKENS from '../../../ui/tokens';
import { formatScore } from './detail/useGymDetailData';
import ExerciseGroupSection from './components/ExerciseGroupSection';

function MachineDetailScreen({ route, navigation }) {
  const { user } = useAuth();
  const { itemId, item } = route.params || {};
  const [isMutating, setIsMutating] = useState(false);
  const [isAdded, setIsAdded] = useState(route.params?.isAdded ?? true);
  const [inlineError, setInlineError] = useState('');
  const [loadingMappings, setLoadingMappings] = useState(true);
  const [movementMatches, setMovementMatches] = useState([]);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const fromCatalog = Boolean(route.params?.fromCatalog);

  useEffect(() => {
    let isActive = true;

    async function hydrateMappings() {
      if (!itemId) {
        setLoadingMappings(false);
        return;
      }
      try {
        setLoadingMappings(true);
        const movements = await listMachineMovementMappings({ machineId: itemId });
        if (!isActive) return;
        setMovementMatches(movements || []);
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
  const machineName = item?.name || route.params?.machineName || 'Machine';
  const subtitle = [item?.zone, item?.primary_muscles].filter(Boolean).join(' • ') || 'Gym machine';
  const heroImageSource = item?.image_url ? { uri: item.image_url } : ITEM_PLACEHOLDER_IMAGE;
  const movementRows = (movementMatches || []).map((row) => ({
    ...(row.movement || {}),
    muscle: `${row.movement?.primary_muscle_group || 'Movement'} • ${formatScore(row.relevance_score)}`,
  }));

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
          <TouchableOpacity activeOpacity={0.92} onPress={() => setImageViewerVisible(true)}>
            <Image source={heroImageSource} style={styles.heroImage} resizeMode="cover" />
          </TouchableOpacity>
          <View style={styles.heroTextWrap}>
            <Text style={styles.heroTitle}>{machineName}</Text>
            <Text style={styles.heroSubtitle}>{subtitle}</Text>
            <Text style={styles.heroHint}>Tap image to enlarge</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Movements you can do on this machine</Text>
          <Text style={styles.sectionSubtitle}>Open a movement, then choose the exact variant you want to inspect.</Text>
          {loadingMappings ? (
            <View style={styles.loadingInline}>
              <ActivityIndicator color={COLORS.accent} />
              <Text style={styles.loadingInlineText}>Loading movements...</Text>
            </View>
          ) : movementRows.length ? (
            <ExerciseGroupSection
              section={{ type: 'flat', items: movementRows }}
              navigation={navigation}
              selectedCatalogIdSet={new Set()}
            />
          ) : (
            <Text style={styles.emptyText}>No curated movements mapped yet for this machine.</Text>
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

      <Modal visible={imageViewerVisible} transparent animationType="fade" onRequestClose={() => setImageViewerVisible(false)}>
        <View style={styles.viewerRoot}>
          <Pressable style={styles.viewerBackdrop} onPress={() => setImageViewerVisible(false)} />
          <View style={styles.viewerCard}>
            <View style={styles.viewerHeader}>
              <Text style={styles.viewerTitle}>{machineName}</Text>
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
  heroHint: { color: COLORS.accent, fontSize: UI_TOKENS.typography.meta, marginTop: 6, fontWeight: '600' },
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
  viewerRoot: {
    flex: 1,
    justifyContent: 'center',
    padding: UI_TOKENS.spacing.md,
  },
  viewerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 7, 16, 0.82)',
  },
  viewerCard: {
    borderRadius: UI_TOKENS.radius.lg,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.card,
    overflow: 'hidden',
  },
  viewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: UI_TOKENS.spacing.md,
    paddingTop: UI_TOKENS.spacing.md,
    paddingBottom: UI_TOKENS.spacing.xs,
    gap: UI_TOKENS.spacing.sm,
  },
  viewerTitle: {
    flex: 1,
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 2,
    fontWeight: '700',
  },
  viewerCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(162,167,179,0.12)',
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
  },
  viewerImage: {
    width: '100%',
    height: 420,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  buttonDisabled: { opacity: 0.6 },
});

export default MachineDetailScreen;
