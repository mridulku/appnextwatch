import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  computeDishNutrition,
  computeIngredientContribution,
  getCatalogDishById,
  getDefaultAmountForIngredient,
  getUnitOptions,
  listDishIngredientsCatalog,
  updateDishDefinition,
} from '../../../core/api/foodDishesDb';
import COLORS from '../../../theme/colors';
import UI_TOKENS from '../../../ui/tokens';
import SegmentedControl from '../../../ui/components/SegmentedControl';
import { getDishImageSourceByName } from './dishImages';

const MEAL_TYPES = [
  { key: 'Breakfast', label: 'Breakfast' },
  { key: 'Lunch / Dinner', label: 'Lunch / Dinner' },
  { key: 'Snacks', label: 'Snacks' },
  { key: 'Other', label: 'Other' },
];

function formatMacroLine(item) {
  return `${item.contribution.calories} kcal • ${item.contribution.protein}p • ${item.contribution.carbs}c • ${item.contribution.fat}f`;
}

function formatBasisHint(item) {
  return `${item.caloriesPerBasis || 0} kcal / ${item.nutritionBasisAmount || 0} ${item.nutritionBasisUnit || item.unit}`;
}

function getStepSizeForUnit(unit) {
  switch (String(unit || '').toLowerCase()) {
    case 'kg':
    case 'litre':
      return 0.1;
    case 'g':
    case 'ml':
      return 10;
    case 'pcs':
      return 1;
    case 'bunch':
      return 0.5;
    default:
      return 1;
  }
}

function formatAmount(amount, unit) {
  const numeric = Number(amount || 0);
  if (!Number.isFinite(numeric)) return `0 ${unit}`;
  const formatted = Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(1);
  return `${formatted} ${unit}`;
}

function MacroTile({ label, value, accent = false }) {
  return (
    <View style={[styles.macroTile, accent ? styles.macroTileAccent : null]}>
      <Text style={styles.macroTileLabel}>{label}</Text>
      <Text style={styles.macroTileValue}>{value}</Text>
    </View>
  );
}

function IngredientRow({ item, isEditing, onAmountChange, onUnitChange, onRemove }) {
  return (
    <View style={styles.ingredientCard}>
      <View style={styles.ingredientHeader}>
        <View style={styles.ingredientCopy}>
          <Text style={styles.ingredientName}>{item.name}</Text>
          <Text style={styles.ingredientMeta}>{item.category}</Text>
        </View>
        {isEditing ? (
          <TouchableOpacity style={styles.iconActionDanger} activeOpacity={0.9} onPress={onRemove}>
            <Ionicons name="trash-outline" size={16} color="#FFB4A8" />
          </TouchableOpacity>
        ) : null}
      </View>

      {isEditing ? (
        <View style={styles.editorRow}>
          <TouchableOpacity style={styles.stepperButton} activeOpacity={0.9} onPress={() => onAmountChange(-getStepSizeForUnit(item.unit))}>
            <Ionicons name="remove" size={16} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.stepperValueWrap}>
            <Text style={styles.stepperValue}>{formatAmount(item.amount, item.unit)}</Text>
            <Text style={styles.stepperMeta}>amount</Text>
          </View>
          <TouchableOpacity style={styles.stepperButton} activeOpacity={0.9} onPress={() => onAmountChange(getStepSizeForUnit(item.unit))}>
            <Ionicons name="add" size={16} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.unitButton} activeOpacity={0.9} onPress={onUnitChange}>
            <Text style={styles.unitButtonText}>{item.unit}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.amountLine}>{formatAmount(item.amount, item.unit)}</Text>
      )}

      <Text style={styles.contributionLine}>
        {item.contribution.computable ? formatMacroLine(item) : 'Nutrition data missing for this ingredient'}
      </Text>
      <Text style={styles.basisLine}>{formatBasisHint(item)}</Text>
    </View>
  );
}

export default function FoodDishDetailScreen({ route, navigation }) {
  const dishId = route.params?.dishId || route.params?.recipeId;
  const [dish, setDish] = useState(null);
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogIngredients, setCatalogIngredients] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);

  const hydrate = useCallback(async () => {
    if (!dishId) return;
    try {
      setLoading(true);
      setError('');
      const nextDish = await getCatalogDishById(dishId);
      setDish(nextDish);
      setDraft(nextDish);
    } catch (nextError) {
      setError(nextError?.message || 'Could not load dish right now.');
    } finally {
      setLoading(false);
    }
  }, [dishId]);

  useFocusEffect(
    useCallback(() => {
      hydrate();
    }, [hydrate]),
  );

  const loadIngredientCatalog = useCallback(async (search = '') => {
    try {
      setCatalogLoading(true);
      const rows = await listDishIngredientsCatalog({ search });
      setCatalogIngredients(rows);
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  const openPicker = useCallback(() => {
    setPickerVisible(true);
    loadIngredientCatalog(catalogSearch);
  }, [catalogSearch, loadIngredientCatalog]);

  const activeMealTypeIndex = useMemo(
    () => MEAL_TYPES.findIndex((item) => item.key === (draft?.mealType || 'Other')),
    [draft?.mealType],
  );

  const computedDraft = useMemo(() => {
    if (!draft) return null;
    const computedIngredients = (draft.ingredients || []).map((item) => ({
      ...item,
      contribution: computeIngredientContribution(item),
    }));
    const totals = computeDishNutrition(computedIngredients, draft.servings);
    return {
      ...draft,
      ingredients: computedIngredients,
      ...totals,
    };
  }, [draft]);
  const dishImageSource = useMemo(
    () => getDishImageSourceByName(computedDraft?.name),
    [computedDraft?.name]
  );

  const updateIngredient = useCallback((ingredientId, updater) => {
    setDraft((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((ingredient) => (
        ingredient.ingredientId === ingredientId ? updater(ingredient) : ingredient
      )),
    }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!computedDraft) return;
    try {
      setSaving(true);
      setError('');
      const saved = await updateDishDefinition({
        dishId: computedDraft.id,
        name: computedDraft.name,
        mealType: computedDraft.mealType,
        servings: computedDraft.servings,
        ingredients: computedDraft.ingredients,
      });
      setDish(saved);
      setDraft(saved);
      setIsEditing(false);
    } catch (nextError) {
      setError(nextError?.message || 'Could not save dish.');
    } finally {
      setSaving(false);
    }
  }, [computedDraft]);

  const handleCancel = useCallback(() => {
    setDraft(dish);
    setIsEditing(false);
    setError('');
  }, [dish]);

  if (loading || !draft || !computedDraft) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={COLORS.accent} />
        <Text style={styles.loadingText}>Loading dish...</Text>
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topCard}>
          <View style={styles.topCardHeader}>
            {dishImageSource ? (
              <Image source={dishImageSource} style={styles.heroImage} resizeMode="cover" />
            ) : null}
            <View style={styles.topCardCopy}>
              <Text style={styles.sectionLabel}>Dish</Text>
              {isEditing ? (
                <TextInput
                  value={draft.name}
                  onChangeText={(value) => setDraft((prev) => ({ ...prev, name: value }))}
                  style={styles.nameInput}
                  placeholder="Dish name"
                  placeholderTextColor={COLORS.muted}
                />
              ) : (
                <Text style={styles.dishName}>{computedDraft.name}</Text>
              )}
            </View>
            <TouchableOpacity
              style={[styles.iconAction, isEditing ? styles.iconActionActive : null]}
              activeOpacity={0.9}
              onPress={isEditing ? handleCancel : () => setIsEditing(true)}
            >
              <Ionicons name={isEditing ? 'close-outline' : 'create-outline'} size={18} color={COLORS.accent2} />
            </TouchableOpacity>
          </View>

          <View style={styles.rowMeta}>
            <View style={styles.servingStepper}>
              {isEditing ? (
                <>
                  <TouchableOpacity
                    style={styles.stepperButton}
                    activeOpacity={0.9}
                    onPress={() => setDraft((prev) => ({ ...prev, servings: Math.max(1, prev.servings - 1) }))}
                  >
                    <Ionicons name="remove" size={16} color={COLORS.text} />
                  </TouchableOpacity>
                  <View style={styles.stepperValueWrap}>
                    <Text style={styles.stepperValue}>{computedDraft.servings}</Text>
                    <Text style={styles.stepperMeta}>servings</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.stepperButton}
                    activeOpacity={0.9}
                    onPress={() => setDraft((prev) => ({ ...prev, servings: prev.servings + 1 }))}
                  >
                    <Ionicons name="add" size={16} color={COLORS.text} />
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={styles.servingsText}>{computedDraft.servings} servings</Text>
              )}
            </View>
          </View>

          <SegmentedControl
            items={MEAL_TYPES}
            selectedIndex={Math.max(activeMealTypeIndex, 0)}
            onChange={(_, item) => {
              if (!isEditing) return;
              setDraft((prev) => ({ ...prev, mealType: item.key }));
            }}
            variant="secondary"
            style={!isEditing ? styles.segmentedDisabled : null}
          />

          <View style={styles.macroGrid}>
            <MacroTile label="Calories" value={computedDraft.totalCalories} accent />
            <MacroTile label="Protein" value={`${computedDraft.totalProtein} g`} />
            <MacroTile label="Carbs" value={`${computedDraft.totalCarbs} g`} />
            <MacroTile label="Fat" value={`${computedDraft.totalFat} g`} />
          </View>
          <Text style={styles.perServingLine}>
            Per serving: {computedDraft.caloriesPerServing} kcal • {computedDraft.proteinPerServing}p • {computedDraft.carbsPerServing}c • {computedDraft.fatPerServing}f
          </Text>

          {error ? <Text style={styles.inlineError}>{error}</Text> : null}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ingredients</Text>
          {isEditing ? (
            <TouchableOpacity style={styles.addButton} activeOpacity={0.92} onPress={openPicker}>
              <Ionicons name="add" size={15} color={COLORS.bg} />
              <Text style={styles.addButtonText}>Add ingredient</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {computedDraft.ingredients.length ? computedDraft.ingredients.map((item) => (
          <IngredientRow
            key={item.ingredientId}
            item={item}
            isEditing={isEditing}
            onAmountChange={(delta) =>
              updateIngredient(item.ingredientId, (ingredient) => ({
                ...ingredient,
                amount: Math.max(getStepSizeForUnit(ingredient.unit), Number((ingredient.amount + delta).toFixed(2))),
              }))
            }
            onUnitChange={() =>
              updateIngredient(item.ingredientId, (ingredient) => {
                const unitOptions = getUnitOptions(ingredient.unitType);
                const currentIndex = unitOptions.indexOf(ingredient.unit);
                return {
                  ...ingredient,
                  unit: unitOptions[(currentIndex + 1) % unitOptions.length],
                };
              })
            }
            onRemove={() =>
              setDraft((prev) => ({
                ...prev,
                ingredients: prev.ingredients.filter((ingredient) => ingredient.ingredientId !== item.ingredientId),
              }))
            }
          />
        )) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No ingredients yet</Text>
            <Text style={styles.emptySubtitle}>
              {isEditing ? 'Add ingredients to define this dish.' : 'This dish does not have any ingredients yet.'}
            </Text>
          </View>
        )}
      </ScrollView>

      {isEditing ? (
        <View style={styles.footerBar}>
          <View>
            <Text style={styles.footerTitle}>{computedDraft.ingredients.length} ingredient{computedDraft.ingredients.length === 1 ? '' : 's'}</Text>
            <Text style={styles.footerSubtitle}>{computedDraft.totalCalories} kcal total</Text>
          </View>
          <TouchableOpacity
            style={[styles.saveButton, saving ? styles.saveButtonDisabled : null]}
            activeOpacity={0.92}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save changes'}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <Modal visible={pickerVisible} transparent animationType="fade" onRequestClose={() => setPickerVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Add ingredient</Text>
            <TextInput
              value={catalogSearch}
              onChangeText={(value) => {
                setCatalogSearch(value);
                loadIngredientCatalog(value);
              }}
              style={styles.searchInput}
              placeholder="Search ingredient"
              placeholderTextColor={COLORS.muted}
            />
            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              {catalogLoading ? (
                <View style={styles.modalEmptyWrap}>
                  <ActivityIndicator color={COLORS.accent} />
                </View>
              ) : catalogIngredients.map((ingredient) => (
                <TouchableOpacity
                  key={ingredient.id}
                  style={styles.modalRow}
                  activeOpacity={0.9}
                  onPress={() => {
                    setDraft((prev) => ({
                      ...prev,
                      ingredients: [
                        ...prev.ingredients.filter((entry) => entry.ingredientId !== ingredient.id),
                        {
                          ...ingredient,
                          ingredientId: ingredient.id,
                          amount: getDefaultAmountForIngredient(ingredient),
                          unit: ingredient.nutritionBasisUnit || ingredient.unitType || 'g',
                        },
                      ],
                    }));
                    setPickerVisible(false);
                  }}
                >
                  <View style={styles.modalRowCopy}>
                    <Text style={styles.modalRowTitle}>{ingredient.name}</Text>
                    <Text style={styles.modalRowMeta}>{ingredient.category} • {formatBasisHint(ingredient)}</Text>
                  </View>
                  <Ionicons name="add-circle-outline" size={18} color={COLORS.accent} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    padding: 16,
    paddingBottom: 110,
    gap: 12,
  },
  loadingWrap: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    color: COLORS.muted,
    fontSize: 13,
  },
  topCard: {
    borderRadius: UI_TOKENS.radius.lg,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.18)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.sm,
    gap: UI_TOKENS.spacing.sm,
  },
  topCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  heroImage: {
    width: 88,
    height: 88,
    borderRadius: UI_TOKENS.radius.lg,
    backgroundColor: COLORS.cardSoft,
  },
  topCardCopy: {
    flex: 1,
  },
  sectionLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dishName: {
    marginTop: 6,
    color: COLORS.text,
    fontSize: 30,
    fontWeight: '700',
  },
  nameInput: {
    marginTop: 6,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.25)',
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
  },
  iconAction: {
    width: 42,
    height: 42,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(90,209,232,0.35)',
    backgroundColor: 'rgba(90,209,232,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconActionActive: {
    backgroundColor: 'rgba(245,201,106,0.14)',
    borderColor: 'rgba(245,201,106,0.3)',
  },
  iconActionDanger: {
    width: 38,
    height: 38,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(255,124,123,0.35)',
    backgroundColor: 'rgba(255,124,123,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  servingStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepperButton: {
    width: 40,
    height: 40,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValueWrap: {
    minWidth: 72,
    alignItems: 'center',
    gap: 2,
  },
  stepperValue: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '700',
  },
  stepperMeta: {
    color: COLORS.muted,
    fontSize: 12,
  },
  servingsText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
  segmentedDisabled: {
    opacity: 0.6,
  },
  macroGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  macroTile: {
    flex: 1,
    minHeight: 66,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.18)',
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  macroTileAccent: {
    borderColor: 'rgba(245,201,106,0.35)',
    backgroundColor: 'rgba(245,201,106,0.08)',
  },
  macroTileLabel: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  macroTileValue: {
    marginTop: 4,
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
  },
  perServingLine: {
    color: COLORS.muted,
    fontSize: 13,
  },
  inlineError: {
    color: '#FFB4A8',
    fontSize: 13,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
  },
  addButton: {
    height: 44,
    borderRadius: UI_TOKENS.radius.lg,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  addButtonText: {
    color: COLORS.bg,
    fontWeight: '700',
    fontSize: 15,
  },
  ingredientCard: {
    borderRadius: UI_TOKENS.radius.lg,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.18)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.sm,
    gap: 10,
  },
  ingredientHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  emptyCard: {
    borderRadius: UI_TOKENS.radius.lg,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.18)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.md,
    gap: UI_TOKENS.spacing.xs,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  ingredientCopy: {
    flex: 1,
  },
  ingredientName: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
  },
  ingredientMeta: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  editorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  unitButton: {
    minWidth: 68,
    height: 40,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(245,201,106,0.35)',
    backgroundColor: 'rgba(245,201,106,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  unitButtonText: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  amountLine: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
  contributionLine: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  basisLine: {
    color: COLORS.muted,
    fontSize: 12,
  },
  footerBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15,18,26,0.96)',
    borderTopWidth: UI_TOKENS.border.hairline,
    borderTopColor: 'rgba(162,167,179,0.16)',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  footerSubtitle: {
    color: COLORS.muted,
    marginTop: 3,
    fontSize: 13,
  },
  saveButton: {
    minWidth: 170,
    height: 54,
    borderRadius: UI_TOKENS.radius.lg,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: COLORS.bg,
    fontSize: 16,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(8,10,16,0.7)',
    padding: 20,
    justifyContent: 'center',
  },
  modalCard: {
    borderRadius: UI_TOKENS.radius.xl,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.18)',
    backgroundColor: COLORS.card,
    padding: 16,
    maxHeight: '70%',
    gap: 12,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '700',
  },
  searchInput: {
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 15,
  },
  modalList: {
    maxHeight: 420,
  },
  modalRow: {
    paddingVertical: 12,
    borderBottomWidth: UI_TOKENS.border.hairline,
    borderBottomColor: 'rgba(162,167,179,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalRowCopy: {
    flex: 1,
  },
  modalRowTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  modalRowMeta: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 3,
  },
  modalEmptyWrap: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
