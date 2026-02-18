import { ActivityIndicator, Alert, Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

import { useAuth } from '../../../context/AuthContext';
import { getOrCreateAppUser } from '../../../core/api/foodInventoryDb';
import { addUserSelection, removeUserSelection } from '../../../core/api/catalogSelectionDb';
import { ITEM_PLACEHOLDER_IMAGE } from '../../../core/placeholders';
import COLORS from '../../../theme/colors';
import UI_TOKENS from '../../../ui/tokens';

function UtensilDetailScreen({ route, navigation }) {
  const { user } = useAuth();
  const { itemId, item } = route.params || {};
  const [isMutating, setIsMutating] = useState(false);
  const [isAdded, setIsAdded] = useState(route.params?.isAdded ?? true);
  const [inlineError, setInlineError] = useState('');
  const fromCatalog = Boolean(route.params?.fromCatalog);

  const name = item?.name || 'Utensil';
  const subtitle = `${item?.category || 'Kitchen tool'}${item?.note ? ` • ${item.note}` : ''}`;

  const onToggleSaved = () => {
    if (!itemId || isMutating) return;

    const actionLabel = isAdded ? 'Remove' : 'Add';
    const actionMessage = isAdded
      ? 'This utensil will be removed from your list.'
      : 'This utensil will be added to your list.';

    Alert.alert(`${actionLabel} utensil?`, actionMessage, [
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
            await (isAdded ? removeUserSelection({
              table: 'user_utensils',
              userId: appUser.id,
              fkColumn: 'utensil_id',
              fkValue: itemId,
            }) : addUserSelection({
              table: 'user_utensils',
              userId: appUser.id,
              fkColumn: 'utensil_id',
              fkValue: itemId,
              payload: { count: 1 },
            }));
            setIsAdded(!isAdded);
          } catch (error) {
            setInlineError(error?.message || `Could not ${isAdded ? 'remove' : 'add'} utensil`);
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
          <Text style={styles.sectionTitle}>Details</Text>
          <Text style={styles.sectionBody}>Description (placeholder)</Text>
          <Text style={styles.sectionBody}>Metadata (placeholder)</Text>
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
                {isAdded ? 'Remove from Utensils' : 'Add to Utensils'}
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
  sectionBody: { color: COLORS.muted, fontSize: UI_TOKENS.typography.subtitle },
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

export default UtensilDetailScreen;
