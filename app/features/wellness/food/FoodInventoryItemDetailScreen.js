import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import QuantityStepper from '../../../components/controls/QuantityStepper';
import { useAuth } from '../../../context/AuthContext';
import { ITEM_PLACEHOLDER_IMAGE } from '../../../core/placeholders';
import {
  deleteUserIngredient,
  getOrCreateAppUser,
  upsertUserIngredient,
  updateUserIngredientQuantity,
} from '../../../core/api/foodInventoryDb';
import COLORS from '../../../theme/colors';
import UI_TOKENS from '../../../ui/tokens';

function getStep(unitType) {
  if (unitType === 'kg' || unitType === 'litre') return 0.25;
  if (unitType === 'g' || unitType === 'ml') return 50;
  return 1;
}

function getDefaultQuantity(unitType) {
  if (unitType === 'g' || unitType === 'ml') return 100;
  return 1;
}

function formatUnit(unit, quantity) {
  const absolute = Math.abs(Number(quantity));
  if (unit === 'bottle') return absolute === 1 ? 'bottle' : 'bottles';
  if (unit === 'litre') return absolute === 1 ? 'litre' : 'litres';
  if (unit === 'pcs') return 'pcs';
  return unit;
}

function formatQuantity(quantity, unitType) {
  const value = Number(quantity) || 0;

  if (unitType === 'pcs' || unitType === 'bottle') {
    const rounded = Math.round(value);
    return `${rounded} ${formatUnit(unitType, rounded)}`;
  }

  const needsPrecision = unitType === 'kg' || unitType === 'litre';
  const normalized = needsPrecision
    ? Number(value.toFixed(2)).toString()
    : Number(value.toFixed(0)).toString();
  return `${normalized} ${formatUnit(unitType, value)}`;
}

function FoodInventoryItemDetailScreen({ route, navigation }) {
  const { user } = useAuth();
  const params = route?.params || {};
  const isCatalogMode = Boolean(params.fromCatalog);

  const rowId = isCatalogMode ? null : params.itemId;
  const ingredientId = params.ingredientId || (isCatalogMode ? params.itemId : null);
  const unitType = params.unitType || 'pcs';
  const [isAdded, setIsAdded] = useState(params?.isAdded ?? !isCatalogMode);

  const [quantity, setQuantity] = useState(
    Number(params.quantity) > 0 ? Number(params.quantity) : getDefaultQuantity(unitType),
  );
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [inlineError, setInlineError] = useState('');

  const originalQuantity = Number(params.quantity) || 0;
  const isDirty = useMemo(
    () => (isCatalogMode
      ? true
      : Number(quantity.toFixed(3)) !== Number(originalQuantity.toFixed(3))),
    [isCatalogMode, originalQuantity, quantity],
  );

  const onSave = async () => {
    if (saving) return;

    try {
      setSaving(true);
      setInlineError('');
      if (isCatalogMode) {
        if (!ingredientId) return;
        const appUser = await getOrCreateAppUser({
          username: user?.username || 'demo user',
          name: user?.name || 'Demo User',
        });
        await upsertUserIngredient({
          userId: appUser.id,
          ingredientId,
          quantity: Math.max(0, Number(quantity) || 0),
        });
        setIsAdded(true);
      } else {
        if (!rowId) return;
        await updateUserIngredientQuantity({
          rowId,
          quantity: Math.max(0, Number(quantity) || 0),
        });
        navigation.goBack();
      }
    } catch (error) {
      setInlineError(error?.message || (isCatalogMode ? 'Could not add item' : 'Could not update quantity'));
    } finally {
      setSaving(false);
    }
  };

  const onRemove = async () => {
    if (!ingredientId || removing || (!isCatalogMode && !isAdded)) return;

    Alert.alert('Remove from inventory?', 'This item will be removed from your pantry.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            setRemoving(true);
            setInlineError('');
            const appUser = await getOrCreateAppUser({
              username: user?.username || 'demo user',
              name: user?.name || 'Demo User',
            });
            await deleteUserIngredient({
              userId: appUser.id,
              ingredientId,
            });
            if (isCatalogMode) {
              setIsAdded(false);
            } else {
              navigation.goBack();
            }
          } catch (error) {
            setInlineError(error?.message || 'Could not remove item');
          } finally {
            setRemoving(false);
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
          <Text style={styles.name}>{params.name || 'Ingredient'}</Text>
          <Text style={styles.meta}>{params.category || 'Inventory'} • {unitType}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Nutrition Profile</Text>
          <View style={styles.nutrientGrid}>
            <View style={styles.nutrientCell}>
              <Text style={styles.nutrientLabel}>Calories</Text>
              <Text style={styles.nutrientValue}>—</Text>
            </View>
            <View style={styles.nutrientCell}>
              <Text style={styles.nutrientLabel}>Protein</Text>
              <Text style={styles.nutrientValue}>—</Text>
            </View>
            <View style={styles.nutrientCell}>
              <Text style={styles.nutrientLabel}>Carbs</Text>
              <Text style={styles.nutrientValue}>—</Text>
            </View>
            <View style={styles.nutrientCell}>
              <Text style={styles.nutrientLabel}>Fat</Text>
              <Text style={styles.nutrientValue}>—</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Quantity</Text>
          <QuantityStepper
            valueLabel={formatQuantity(quantity, unitType)}
            onDecrement={() => {
              const step = getStep(unitType);
              setQuantity((prev) => Math.max(0, Number((prev - step).toFixed(3))));
            }}
            onIncrement={() => {
              const step = getStep(unitType);
              setQuantity((prev) => Number((prev + step).toFixed(3)));
            }}
          />
          <Text style={styles.quantityHint}>Adjust stock here. Inventory list stays read-only.</Text>
        </View>

        {inlineError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{inlineError}</Text>
          </View>
        ) : null}

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[
              styles.saveButton,
              isCatalogMode && isAdded && styles.buttonDisabledAlt,
              (!isDirty || saving || (isCatalogMode && isAdded)) && styles.buttonDisabled,
            ]}
            activeOpacity={0.9}
            onPress={onSave}
            disabled={!isDirty || saving || (isCatalogMode && isAdded)}
          >
            {saving ? (
              <ActivityIndicator color={COLORS.bg} size="small" />
            ) : (
              <Text style={styles.saveText}>
                {isCatalogMode ? (isAdded ? 'Added' : 'Add to inventory') : 'Update'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.removeButton,
              (!isAdded && isCatalogMode) && styles.buttonDisabled,
              removing && styles.buttonDisabled,
            ]}
            activeOpacity={0.9}
            onPress={onRemove}
            disabled={removing || (!isAdded && isCatalogMode)}
          >
            {removing ? (
              <ActivityIndicator color="#FFB4A8" size="small" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={16} color="#FFB4A8" />
                <Text style={styles.removeText}>Remove from inventory</Text>
              </>
            )}
          </TouchableOpacity>

          {isCatalogMode ? (
            <TouchableOpacity
              style={styles.backButton}
              activeOpacity={0.9}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backText}>Back to Catalog</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    padding: UI_TOKENS.spacing.md,
    paddingBottom: UI_TOKENS.spacing.xl,
    gap: UI_TOKENS.spacing.sm,
  },
  heroCard: {
    borderRadius: UI_TOKENS.radius.lg,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.md,
    alignItems: 'center',
  },
  heroImage: {
    width: 160,
    height: 160,
    borderRadius: UI_TOKENS.radius.lg,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.2)',
    marginBottom: UI_TOKENS.spacing.sm,
  },
  name: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.title + 8,
    fontWeight: '700',
    textAlign: 'center',
  },
  meta: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.subtitle,
    marginTop: UI_TOKENS.spacing.xs,
  },
  infoCard: {
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.md,
    gap: UI_TOKENS.spacing.sm,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 1,
    fontWeight: '700',
  },
  nutrientGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: UI_TOKENS.spacing.sm,
  },
  nutrientCell: {
    width: '47%',
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: 'rgba(162,167,179,0.08)',
    paddingHorizontal: UI_TOKENS.spacing.sm,
    paddingVertical: UI_TOKENS.spacing.xs,
  },
  nutrientLabel: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
  nutrientValue: {
    marginTop: 2,
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle,
    fontWeight: '700',
  },
  quantityHint: {
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
  errorText: {
    color: '#FFB4A8',
    fontSize: UI_TOKENS.typography.meta,
  },
  actionRow: {
    gap: UI_TOKENS.spacing.sm,
  },
  saveButton: {
    borderRadius: UI_TOKENS.radius.md,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  saveText: {
    color: COLORS.bg,
    fontSize: UI_TOKENS.typography.subtitle,
    fontWeight: '700',
  },
  buttonDisabledAlt: {
    backgroundColor: 'rgba(162,167,179,0.2)',
  },
  removeButton: {
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(255,145,107,0.45)',
    backgroundColor: 'rgba(255,145,107,0.12)',
    flexDirection: 'row',
    gap: UI_TOKENS.spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  removeText: {
    color: '#FFB4A8',
    fontSize: UI_TOKENS.typography.subtitle,
    fontWeight: '700',
  },
  backButton: {
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.35)',
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  backText: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.meta + 1,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default FoodInventoryItemDetailScreen;
