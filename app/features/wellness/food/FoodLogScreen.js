import DateTimePicker from '@react-native-community/datetimepicker';
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
  getDefaultAmountForIngredient,
  getUnitOptions,
  listDishIngredientsCatalog,
} from '../../../core/api/foodDishesDb';
import { useAuth } from '../../../context/AuthContext';
import useFoodLogs from '../../../hooks/useFoodLogs';
import COLORS from '../../../theme/colors';
import UI_TOKENS from '../../../ui/tokens';
import { getDishImageSourceByName } from './dishImages';

const MEAL_SLOTS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Other'];

function normalizeMealSlot(value) {
  const normalized = String(value || '').trim();
  if (normalized === 'Lunch / Dinner' || normalized === 'Lunch') return 'Lunch';
  if (normalized === 'Dinner') return 'Dinner';
  if (normalized === 'Breakfast' || normalized === 'Snacks' || normalized === 'Other') return normalized;
  return 'Other';
}

function formatReadableDate(dateISO) {
  const date = new Date(`${dateISO}T12:00:00`);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatShortDate(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function toDateISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatMacroLine(item) {
  return `${item.totalCalories} kcal • ${item.totalProtein}p • ${item.totalCarbs}c • ${item.totalFat}f`;
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

function computeDishItemFromIngredients(baseItem) {
  const safeServings = Math.max(0.5, Number(baseItem.servings || 1));
  const ingredients = (baseItem.ingredients || []).map((ingredient) => ({
    ...ingredient,
    contribution: computeIngredientContribution(ingredient),
    unitOptions: ingredient.unitOptions || getUnitOptions(ingredient.unit),
  }));
  const computed = computeDishNutrition(ingredients, safeServings);
  return {
    ...baseItem,
    servings: safeServings,
    ingredients,
    caloriesPerServing: computed.caloriesPerServing,
    proteinPerServing: computed.proteinPerServing,
    carbsPerServing: computed.carbsPerServing,
    fatPerServing: computed.fatPerServing,
    totalCalories: computed.totalCalories,
    totalProtein: computed.totalProtein,
    totalCarbs: computed.totalCarbs,
    totalFat: computed.totalFat,
  };
}

function MacroStat({ label, value, accent = false }) {
  return (
    <View style={[styles.macroStat, accent ? styles.macroStatAccent : null]}>
      <Text style={styles.macroStatLabel}>{label}</Text>
      <Text style={styles.macroStatValue}>{value}</Text>
    </View>
  );
}

function DishCard({
  item,
  isEditing,
  onDecrease,
  onIncrease,
  onMealSlotPress,
  onEditIngredients,
  onRemove,
}) {
  const imageSource = getDishImageSourceByName(item.name);
  return (
    <View style={styles.dishCard}>
      <View style={styles.dishHeaderTop}>
        <View style={styles.dishHeaderMain}>
          <View style={styles.dishIconWrap}>
            {imageSource ? (
              <Image source={imageSource} style={styles.dishImage} resizeMode="cover" />
            ) : (
              <Ionicons name="restaurant-outline" size={18} color={COLORS.accent} />
            )}
          </View>
          <View style={styles.dishCopy}>
            <Text style={styles.dishTitle} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.dishNutrition} numberOfLines={1}>
              {formatMacroLine(item)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.dishControlsRow}>
        <View style={styles.dishControlsLeft}>
          <TouchableOpacity style={styles.historyButton} activeOpacity={0.9} onPress={onEditIngredients}>
            <Ionicons name="list-outline" size={13} color={COLORS.accent2} />
            <Text style={styles.historyButtonText}>Ingredients</Text>
          </TouchableOpacity>
          {isEditing ? (
            <TouchableOpacity style={styles.mealSlotButton} activeOpacity={0.9} onPress={onMealSlotPress}>
              <Text style={styles.mealSlotButtonText}>{item.mealType}</Text>
              <Ionicons name="chevron-down-outline" size={12} color={COLORS.accent} />
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={styles.dishControlsRight}>
          {isEditing ? (
            <>
              <View style={styles.servingCompact}>
                <TouchableOpacity style={styles.servingCompactButton} activeOpacity={0.9} onPress={onDecrease}>
                  <Ionicons name="remove" size={14} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.servingCompactValue}>{item.servings}</Text>
                <TouchableOpacity style={styles.servingCompactButton} activeOpacity={0.9} onPress={onIncrease}>
                  <Ionicons name="add" size={14} color={COLORS.text} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.iconActionDangerSmall} activeOpacity={0.9} onPress={onRemove}>
                <Ionicons name="trash-outline" size={15} color="#FFB4A8" />
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export default function FoodLogScreen({ route, navigation }) {
  const { user } = useAuth();
  const { getLogForDate, saveLogForDate, availableDishes, loading, saving, error, hydrate } = useFoodLogs(user);
  const initialDateISO = route?.params?.dateISO;

  const [items, setItems] = useState([]);
  const [screenLoading, setScreenLoading] = useState(true);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateISO, setDateISO] = useState(initialDateISO);
  const [draftDate, setDraftDate] = useState(new Date(`${initialDateISO}T12:00:00`));
  const [originalDateISO, setOriginalDateISO] = useState(initialDateISO);
  const [originalItems, setOriginalItems] = useState([]);
  const [inlineError, setInlineError] = useState('');
  const [ingredientEditorItemId, setIngredientEditorItemId] = useState(null);
  const [ingredientCatalogSearch, setIngredientCatalogSearch] = useState('');
  const [ingredientCatalog, setIngredientCatalog] = useState([]);
  const [ingredientCatalogLoading, setIngredientCatalogLoading] = useState(false);
  const [ingredientPickerVisible, setIngredientPickerVisible] = useState(false);
  const [pickerMealSlot, setPickerMealSlot] = useState('Lunch');

  const hydrateLog = useCallback(async () => {
    if (!dateISO) return;
    try {
      setScreenLoading(true);
      setInlineError('');
      const log = await getLogForDate(dateISO);
      const nextItems = log?.items || [];
      setItems(nextItems);
      setOriginalItems(nextItems);
      setOriginalDateISO(dateISO);
      setDraftDate(new Date(`${dateISO}T12:00:00`));
      setIsEditing(!nextItems.length);
    } finally {
      setScreenLoading(false);
    }
  }, [dateISO, getLogForDate]);

  useFocusEffect(
    useCallback(() => {
      hydrateLog();
    }, [hydrateLog]),
  );

  const totals = useMemo(() => items.reduce(
    (acc, item) => ({
      calories: acc.calories + (item.totalCalories || 0),
      protein: Number((acc.protein + (item.totalProtein || 0)).toFixed(1)),
      carbs: Number((acc.carbs + (item.totalCarbs || 0)).toFixed(1)),
      fat: Number((acc.fat + (item.totalFat || 0)).toFixed(1)),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  ), [items]);

  const groupedItems = useMemo(
    () =>
      MEAL_SLOTS.map((slot) => ({
        slot,
        items: items.filter((item) => normalizeMealSlot(item.mealType) === slot),
      })).filter((section) => section.items.length),
    [items],
  );

  const selectableRecipes = useMemo(
    () => availableDishes.filter((recipe) => !items.some((item) => item.recipeId === recipe.recipeId)),
    [availableDishes, items],
  );

  const addRecipe = useCallback((recipe) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.recipeId === recipe.recipeId);
      if (existingIndex >= 0) {
        return prev.map((item, index) => {
          if (index !== existingIndex) return item;
          const servings = Number((item.servings + 1).toFixed(1));
          return computeDishItemFromIngredients({
            ...item,
            servings,
          });
        });
      }

      return [
        ...prev,
        computeDishItemFromIngredients({
          id: `draft_${recipe.recipeId}`,
          recipeId: recipe.recipeId,
          name: recipe.name,
          mealType: pickerMealSlot,
          totalMinutes: recipe.totalMinutes,
          difficulty: recipe.difficulty,
          servings: 1,
          caloriesPerServing: recipe.caloriesPerServing,
          proteinPerServing: recipe.proteinPerServing || 0,
          carbsPerServing: recipe.carbsPerServing || 0,
          fatPerServing: recipe.fatPerServing || 0,
          totalCalories: recipe.caloriesPerServing,
          totalProtein: Number((recipe.proteinPerServing || 0).toFixed(1)),
          totalCarbs: Number((recipe.carbsPerServing || 0).toFixed(1)),
          totalFat: Number((recipe.fatPerServing || 0).toFixed(1)),
          ingredients: (recipe.ingredients || []).map((ingredient) => ({
            ...ingredient,
            contribution: computeIngredientContribution(ingredient),
            unitOptions: ingredient.unitOptions || getUnitOptions(ingredient.unit),
          })),
        }),
      ];
    });
    setPickerVisible(false);
  }, [pickerMealSlot]);

  const updateServings = useCallback((recipeId, delta) => {
    setItems((prev) => prev.map((item) => {
      if (item.recipeId !== recipeId) return item;
      const nextServings = Math.max(0.5, Math.round((item.servings + delta) * 2) / 2);
      return computeDishItemFromIngredients({
        ...item,
        servings: nextServings,
      });
    }));
  }, []);

  const removeRecipe = useCallback((recipeId) => {
    setItems((prev) => prev.filter((item) => item.recipeId !== recipeId));
  }, []);

  const updateItemIngredients = useCallback((itemId, updater) => {
    setItems((prev) => prev.map((item) => (
      item.id === itemId ? computeDishItemFromIngredients(updater(item)) : item
    )));
  }, []);

  const updateMealSlot = useCallback((itemId, slot) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              mealType: slot,
            }
          : item,
      ),
    );
  }, []);

  const openMealSlotPicker = useCallback((itemId, currentSlot) => {
    Alert.alert(
      'Meal category',
      'Choose where this dish belongs for this day.',
      [
        ...MEAL_SLOTS.map((slot) => ({
          text: slot,
          onPress: () => updateMealSlot(itemId, slot),
          style: slot === currentSlot ? 'default' : 'default',
        })),
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  }, [updateMealSlot]);

  const activeIngredientEditorItem = useMemo(
    () => items.find((item) => item.id === ingredientEditorItemId) || null,
    [ingredientEditorItemId, items],
  );

  const loadIngredientCatalog = useCallback(async (search = '') => {
    try {
      setIngredientCatalogLoading(true);
      const rows = await listDishIngredientsCatalog({ search });
      setIngredientCatalog(rows);
    } finally {
      setIngredientCatalogLoading(false);
    }
  }, []);

  const handleDelete = useCallback(() => {
    Alert.alert('Delete log', 'Remove this food log for the selected date?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await saveLogForDate(originalDateISO, []);
            await hydrate();
            navigation.goBack();
          } catch (nextError) {
            Alert.alert('Delete failed', nextError?.message || 'Could not delete this food log.');
          }
        },
      },
    ]);
  }, [hydrate, navigation, originalDateISO, saveLogForDate]);

  const handleStartEdit = useCallback(() => {
    setInlineError('');
    setIsEditing(true);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setItems(originalItems);
    setDateISO(originalDateISO);
    setDraftDate(new Date(`${originalDateISO}T12:00:00`));
    setInlineError('');
    setIsEditing(false);
    setShowDatePicker(false);
  }, [originalDateISO, originalItems]);

  const handleSave = useCallback(async () => {
    const nextDateISO = toDateISO(draftDate);
    try {
      setInlineError('');
      if (nextDateISO !== originalDateISO) {
        const existingLog = await getLogForDate(nextDateISO);
        if (existingLog) {
          setInlineError('A food log already exists on that date. Choose another date.');
          return;
        }
      }

      if (originalDateISO !== nextDateISO) {
        await saveLogForDate(originalDateISO, []);
      }
      await saveLogForDate(nextDateISO, items);
      setDateISO(nextDateISO);
      setOriginalDateISO(nextDateISO);
      setOriginalItems(items);
      await hydrate();
      setIsEditing(false);
    } catch (nextError) {
      Alert.alert('Save failed', nextError?.message || 'Could not save food log right now.');
    }
  }, [draftDate, getLogForDate, hydrate, items, originalDateISO, saveLogForDate]);

  const openIngredientCatalogPicker = useCallback(() => {
    if (!activeIngredientEditorItem) return;
    setIngredientCatalogSearch('');
    loadIngredientCatalog('');
    setIngredientPickerVisible(true);
  }, [activeIngredientEditorItem, ingredientCatalogSearch, loadIngredientCatalog]);

  const closeIngredientEditor = useCallback(() => {
    setIngredientPickerVisible(false);
    setIngredientCatalogSearch('');
    setIngredientCatalog([]);
    setIngredientEditorItemId(null);
  }, []);

  if (loading || screenLoading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={COLORS.accent} />
        <Text style={styles.loadingText}>Loading food log...</Text>
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topCard}>
          <View style={styles.topCardHeader}>
            <View style={styles.topCardCopy} />
            <View style={styles.topActions}>
              <TouchableOpacity
                style={[styles.iconAction, isEditing ? styles.iconActionActive : null]}
                activeOpacity={0.9}
                onPress={isEditing ? handleCancelEdit : handleStartEdit}
              >
                <Ionicons name={isEditing ? 'close-outline' : 'create-outline'} size={18} color={COLORS.accent2} />
              </TouchableOpacity>
              {!!originalItems.length ? (
                <TouchableOpacity style={styles.iconActionDanger} activeOpacity={0.9} onPress={handleDelete}>
                  <Ionicons name="trash-outline" size={18} color="#FFB4A8" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.dateButton, !isEditing ? styles.dateButtonDisabled : null]}
            activeOpacity={0.92}
            disabled={!isEditing}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateButtonText}>{formatShortDate(draftDate)}</Text>
            <Ionicons name="calendar-outline" size={16} color={COLORS.accent} />
          </TouchableOpacity>

          <View style={styles.macroGrid}>
            <MacroStat label="Calories" value={totals.calories} accent />
            <MacroStat label="Protein" value={`${totals.protein} g`} />
            <MacroStat label="Carbs" value={`${totals.carbs} g`} />
            <MacroStat label="Fat" value={`${totals.fat} g`} />
          </View>

          {inlineError ? <Text style={styles.inlineError}>{inlineError}</Text> : null}
          {error ? <Text style={styles.inlineError}>{error}</Text> : null}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Dishes</Text>
          {isEditing ? (
            <TouchableOpacity style={styles.addButton} activeOpacity={0.92} onPress={() => setPickerVisible(true)}>
              <Ionicons name="add" size={15} color={COLORS.bg} />
              <Text style={styles.addButtonText}>Add dish</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {!items.length ? (
          <View style={styles.emptyCard}>
            <Ionicons name="restaurant-outline" size={20} color={COLORS.accent} />
            <Text style={styles.emptyTitle}>Nothing logged so far</Text>
            <Text style={styles.emptySubtitle}>
              {isEditing ? 'Add dishes from Food settings to start this log.' : 'Tap edit to start adding dishes for this date.'}
            </Text>
          </View>
        ) : (
          groupedItems.map((section) => (
            <View key={section.slot} style={styles.mealSection}>
              <Text style={styles.mealSectionTitle}>{section.slot}</Text>
              <View style={styles.mealSectionList}>
                {section.items.map((item) => (
                  <DishCard
                    key={item.id}
                    item={item}
                    isEditing={isEditing}
                    onDecrease={() => updateServings(item.recipeId, -0.5)}
                    onIncrease={() => updateServings(item.recipeId, 0.5)}
                    onMealSlotPress={() => openMealSlotPicker(item.id, item.mealType)}
                    onEditIngredients={() => setIngredientEditorItemId(item.id)}
                    onRemove={() => removeRecipe(item.recipeId)}
                  />
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {isEditing ? (
        <View style={styles.footerBar}>
          <View>
            <Text style={styles.footerTitle}>{items.length} dish{items.length === 1 ? '' : 'es'}</Text>
            <Text style={styles.footerSubtitle}>{totals.calories} kcal total</Text>
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
            <Text style={styles.modalTitle}>Add dish</Text>
            <Text style={styles.modalSubtitle}>Select from your dish definitions.</Text>
            <View style={styles.pickerMealSlotRow}>
              {MEAL_SLOTS.map((slot) => {
                const selected = pickerMealSlot === slot;
                return (
                  <TouchableOpacity
                    key={`picker_${slot}`}
                    style={[styles.pickerMealSlotChip, selected ? styles.pickerMealSlotChipActive : null]}
                    activeOpacity={0.9}
                    onPress={() => setPickerMealSlot(slot)}
                  >
                    <Text
                      style={[
                        styles.pickerMealSlotChipText,
                        selected ? styles.pickerMealSlotChipTextActive : null,
                      ]}
                    >
                      {slot}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              {selectableRecipes.length ? selectableRecipes.map((recipe) => (
                <TouchableOpacity
                  key={recipe.recipeId}
                  style={styles.modalRow}
                  activeOpacity={0.9}
                  onPress={() => addRecipe(recipe)}
                >
                  <View style={styles.modalRowCopy}>
                    <Text style={styles.modalRowTitle}>{recipe.name}</Text>
                    <Text style={styles.modalRowMeta}>
                      {recipe.mealType} • {recipe.caloriesPerServing} kcal • {recipe.proteinPerServing || 0}p • {recipe.carbsPerServing || 0}c • {recipe.fatPerServing || 0}f
                    </Text>
                  </View>
                  <Ionicons name="add-circle-outline" size={18} color={COLORS.accent} />
                </TouchableOpacity>
              )) : (
                <View style={styles.modalEmptyWrap}>
                  <Text style={styles.modalEmptyText}>No more dishes to add.</Text>
                </View>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showDatePicker} transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowDatePicker(false)}>
          <Pressable style={styles.dateModalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Pick date</Text>
            <DateTimePicker
              value={draftDate}
              mode="date"
              display="inline"
              onChange={(_, selected) => {
                if (selected) setDraftDate(selected);
              }}
              maximumDate={new Date(2100, 11, 31)}
            />
            <View style={styles.dateModalActions}>
              <TouchableOpacity style={styles.dateModalButtonGhost} activeOpacity={0.9} onPress={() => setShowDatePicker(false)}>
                <Text style={styles.dateModalButtonGhostText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dateModalButton} activeOpacity={0.9} onPress={() => {
                setDateISO(toDateISO(draftDate));
                setShowDatePicker(false);
              }}>
                <Text style={styles.dateModalButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={!!activeIngredientEditorItem} transparent animationType="fade" onRequestClose={closeIngredientEditor}>
        <Pressable style={styles.modalBackdrop} onPress={closeIngredientEditor}>
          <Pressable style={styles.ingredientModalCard} onPress={() => {}}>
            {activeIngredientEditorItem ? (
              <>
                <View style={styles.ingredientModalHeader}>
                  <View style={styles.modalHeaderCopy}>
                    <Text style={styles.modalTitle}>{activeIngredientEditorItem.name}</Text>
                    <Text style={styles.modalSubtitle}>These ingredient changes apply only to this day.</Text>
                  </View>
                  <View style={styles.ingredientModalActions}>
                    {isEditing ? (
                      <TouchableOpacity
                        style={styles.addIngredientMiniButton}
                        activeOpacity={0.9}
                        onPress={openIngredientCatalogPicker}
                      >
                        <Ionicons name="add" size={16} color={COLORS.bg} />
                        <Text style={styles.addIngredientMiniText}>Add</Text>
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity style={styles.iconAction} activeOpacity={0.9} onPress={closeIngredientEditor}>
                      <Ionicons name="close-outline" size={18} color={COLORS.accent2} />
                    </TouchableOpacity>
                  </View>
                </View>

                <ScrollView style={styles.ingredientModalList} showsVerticalScrollIndicator={false}>
                  {activeIngredientEditorItem.ingredients.map((ingredient, index) => {
                    const contribution = ingredient.contribution || computeIngredientContribution(ingredient);
                    const amountValue = Number(ingredient.amount || 0);
                    const amountText = Number.isInteger(amountValue) ? String(amountValue) : amountValue.toFixed(1);
                    return (
                      <View key={`${activeIngredientEditorItem.id}_${ingredient.ingredientId}_${index}`} style={styles.ingredientRowCard}>
                        <View style={styles.ingredientRowHeader}>
                          <View style={styles.ingredientRowCopy}>
                            <Text style={styles.ingredientRowTitle}>{ingredient.name}</Text>
                            <Text style={styles.ingredientRowMeta}>{ingredient.category}</Text>
                          </View>
                          <View style={styles.ingredientRowRight}>
                            <Text style={styles.ingredientRowValue}>{formatAmount(ingredient.amount, ingredient.unit)}</Text>
                            {isEditing ? (
                              <TouchableOpacity
                                style={styles.iconActionDanger}
                                activeOpacity={0.9}
                                onPress={() => updateItemIngredients(activeIngredientEditorItem.id, (item) => ({
                                  ...item,
                                  ingredients: item.ingredients.filter((candidate, candidateIndex) => !(
                                    candidate.ingredientId === ingredient.ingredientId && candidateIndex === index
                                  )),
                                }))}
                              >
                                <Ionicons name="trash-outline" size={14} color="#FFB4A8" />
                              </TouchableOpacity>
                            ) : null}
                          </View>
                        </View>
                        <Text style={styles.ingredientRowContribution}>
                          {contribution.calories} kcal • {contribution.protein}p • {contribution.carbs}c • {contribution.fat}f
                        </Text>
                        {isEditing ? (
                          <View style={styles.ingredientEditorControls}>
                            <TouchableOpacity
                              style={styles.stepperButton}
                              activeOpacity={0.9}
                              onPress={() => updateItemIngredients(activeIngredientEditorItem.id, (item) => ({
                                ...item,
                                ingredients: item.ingredients.map((candidate, candidateIndex) => (
                                  candidate.ingredientId === ingredient.ingredientId && candidateIndex === index
                                    ? { ...candidate, amount: Math.max(0, Number((candidate.amount - getStepSizeForUnit(candidate.unit)).toFixed(1))) }
                                    : candidate
                                )),
                              }))}
                            >
                              <Ionicons name="remove" size={16} color={COLORS.text} />
                            </TouchableOpacity>
                            <View style={styles.ingredientAmountInline}>
                              <View style={styles.ingredientAmountWrap}>
                                <Text style={styles.ingredientAmountValue}>{amountText}</Text>
                                <Text style={styles.ingredientAmountMeta}>amount</Text>
                              </View>
                              <TouchableOpacity
                                style={styles.stepperButton}
                                activeOpacity={0.9}
                                onPress={() => updateItemIngredients(activeIngredientEditorItem.id, (item) => ({
                                  ...item,
                                  ingredients: item.ingredients.map((candidate, candidateIndex) => (
                                    candidate.ingredientId === ingredient.ingredientId && candidateIndex === index
                                      ? { ...candidate, amount: Number((candidate.amount + getStepSizeForUnit(candidate.unit)).toFixed(1)) }
                                      : candidate
                                  )),
                                }))}
                              >
                                <Ionicons name="add" size={16} color={COLORS.text} />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.unitButton}
                                activeOpacity={0.9}
                                onPress={() => updateItemIngredients(activeIngredientEditorItem.id, (item) => ({
                                  ...item,
                                  ingredients: item.ingredients.map((candidate, candidateIndex) => {
                                    if (candidate.ingredientId !== ingredient.ingredientId || candidateIndex !== index) return candidate;
                                    const options = candidate.unitOptions || getUnitOptions(candidate.unit);
                                    const currentIndex = Math.max(options.indexOf(candidate.unit), 0);
                                    const nextUnit = options[(currentIndex + 1) % options.length];
                                    return { ...candidate, unit: nextUnit };
                                  }),
                                }))}
                              >
                                <Text style={styles.unitButtonText}>{ingredient.unit}</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </ScrollView>

                <View style={styles.ingredientModalFooter}>
                  <TouchableOpacity style={styles.dateModalButtonGhost} activeOpacity={0.9} onPress={closeIngredientEditor}>
                    <Text style={styles.dateModalButtonGhostText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={ingredientPickerVisible} transparent animationType="fade" onRequestClose={() => setIngredientPickerVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setIngredientPickerVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Add ingredient</Text>
            <Text style={styles.modalSubtitle}>Select an ingredient for this day only.</Text>
            <TextInput
              value={ingredientCatalogSearch}
              onChangeText={(value) => {
                setIngredientCatalogSearch(value);
                loadIngredientCatalog(value);
              }}
              style={styles.searchInput}
              placeholder="Search ingredient"
              placeholderTextColor={COLORS.muted}
            />
            <ScrollView style={styles.modalList} nestedScrollEnabled showsVerticalScrollIndicator={false}>
              {ingredientCatalogLoading ? (
                <View style={styles.modalEmptyWrap}>
                  <ActivityIndicator color={COLORS.accent} />
                </View>
              ) : ingredientCatalog.length ? ingredientCatalog.map((ingredient) => (
                <TouchableOpacity
                  key={`ingredient_picker_${ingredient.id}`}
                  style={styles.modalRow}
                  activeOpacity={0.9}
                  onPress={() => {
                    if (!activeIngredientEditorItem) return;
                    updateItemIngredients(activeIngredientEditorItem.id, (item) => ({
                      ...item,
                      ingredients: [
                        ...item.ingredients,
                        {
                          ...ingredient,
                          ingredientId: ingredient.id,
                          amount: getDefaultAmountForIngredient(ingredient),
                          unit: ingredient.nutritionBasisUnit || ingredient.unitType || 'g',
                        },
                      ],
                    }));
                    setIngredientPickerVisible(false);
                    setIngredientCatalogSearch('');
                    setIngredientCatalog([]);
                  }}
                >
                  <View style={styles.modalRowCopy}>
                    <Text style={styles.modalRowTitle}>{ingredient.name}</Text>
                    <Text style={styles.modalRowMeta}>{ingredient.category}</Text>
                  </View>
                  <Ionicons name="add-circle-outline" size={18} color={COLORS.accent} />
                </TouchableOpacity>
              )) : (
                <View style={styles.modalEmptyWrap}>
                  <Text style={styles.modalEmptyText}>No ingredients found.</Text>
                </View>
              )}
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
    paddingBottom: 108,
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
    gap: UI_TOKENS.spacing.xs,
  },
  topCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  topCardCopy: {
    flex: 1,
  },
  topActions: {
    flexDirection: 'row',
    gap: 10,
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
    width: 42,
    height: 42,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(255,124,123,0.35)',
    backgroundColor: 'rgba(255,124,123,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateButton: {
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(245,201,106,0.26)',
    backgroundColor: 'rgba(245,201,106,0.12)',
    paddingHorizontal: UI_TOKENS.spacing.sm,
    paddingVertical: UI_TOKENS.spacing.xs + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateButtonDisabled: {
    opacity: 0.72,
  },
  dateButtonText: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle,
    fontWeight: '700',
  },
  macroGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  macroStat: {
    flex: 1,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.18)',
    backgroundColor: COLORS.cardSoft,
    minWidth: 0,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  macroStatAccent: {
    borderColor: 'rgba(245,201,106,0.24)',
    backgroundColor: 'rgba(245,201,106,0.12)',
  },
  macroStatLabel: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: '700',
  },
  macroStatValue: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 1,
  },
  inlineError: {
    color: '#FFB4A8',
    fontSize: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.accent,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  addButtonText: {
    color: COLORS.bg,
    fontSize: 14,
    fontWeight: '700',
  },
  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.18)',
    backgroundColor: COLORS.card,
    padding: 18,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  dishCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.18)',
    backgroundColor: COLORS.card,
    padding: 12,
    gap: 10,
  },
  dishHeaderTop: {
    gap: 8,
  },
  dishHeaderMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  dishIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245,201,106,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245,201,106,0.16)',
  },
  dishImage: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  dishCopy: {
    flex: 1,
    minWidth: 0,
  },
  dishControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  dishControlsLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dishControlsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(90,209,232,0.35)',
    backgroundColor: 'rgba(90,209,232,0.12)',
  },
  historyButtonText: {
    color: COLORS.accent2,
    fontSize: 11,
    fontWeight: '700',
  },
  dishTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
  },
  dishNutrition: {
    color: COLORS.accent2,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
    marginTop: 2,
  },
  servingCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  servingCompactButton: {
    width: 30,
    height: 30,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  servingCompactValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    minWidth: 14,
    textAlign: 'center',
  },
  mealSlotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(245,201,106,0.26)',
    backgroundColor: 'rgba(245,201,106,0.1)',
  },
  mealSlotButtonText: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  mealSection: {
    gap: 8,
  },
  mealSectionList: {
    gap: 10,
  },
  mealSectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  iconActionDangerSmall: {
    width: 34,
    height: 34,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(255,124,123,0.35)',
    backgroundColor: 'rgba(255,124,123,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(162,167,179,0.12)',
    backgroundColor: 'rgba(14,15,20,0.96)',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  footerSubtitle: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 2,
  },
  saveButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: COLORS.bg,
    fontSize: 15,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,12,16,0.76)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxHeight: '78%',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.18)',
    backgroundColor: COLORS.card,
    padding: 16,
  },
  pickerMealSlotRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
    marginBottom: 10,
  },
  pickerMealSlotChip: {
    borderRadius: 999,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.18)',
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pickerMealSlotChipActive: {
    borderColor: 'rgba(245,201,106,0.28)',
    backgroundColor: 'rgba(245,201,106,0.12)',
  },
  pickerMealSlotChipText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  pickerMealSlotChipTextActive: {
    color: COLORS.accent,
  },
  dateModalCard: {
    width: '100%',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.18)',
    backgroundColor: COLORS.card,
    padding: 16,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 4,
  },
  modalList: {
    marginTop: 14,
  },
  ingredientModalCard: {
    width: '100%',
    maxHeight: '78%',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.18)',
    backgroundColor: COLORS.card,
    padding: 16,
    gap: 12,
  },
  ingredientModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  ingredientModalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalHeaderCopy: {
    flex: 1,
  },
  addIngredientMiniButton: {
    height: 40,
    borderRadius: 999,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.accent,
  },
  addIngredientMiniText: {
    color: COLORS.bg,
    fontSize: 13,
    fontWeight: '700',
  },
  ingredientModalList: {
    marginTop: 4,
  },
  ingredientRowCard: {
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.18)',
    backgroundColor: COLORS.cardSoft,
    padding: 12,
    gap: 8,
    marginBottom: 10,
  },
  ingredientRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  ingredientRowCopy: {
    flex: 1,
  },
  ingredientRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ingredientRowTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  ingredientRowMeta: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 1,
  },
  ingredientRowValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  ingredientRowContribution: {
    color: COLORS.muted,
    fontSize: 12,
  },
  ingredientEditorControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ingredientAmountInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ingredientAmountWrap: {
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ingredientAmountValue: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
  },
  ingredientAmountMeta: {
    color: COLORS.muted,
    fontSize: 11,
  },
  searchInput: {
    marginTop: 12,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: COLORS.text,
    fontSize: 14,
  },
  unitButton: {
    minWidth: 60,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(245,201,106,0.22)',
    backgroundColor: 'rgba(245,201,106,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  unitButtonText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  ingredientModalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.18)',
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
  },
  modalRowCopy: {
    flex: 1,
  },
  modalRowTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  modalRowMeta: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 2,
  },
  modalEmptyWrap: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  modalEmptyText: {
    color: COLORS.muted,
    fontSize: 13,
  },
  dateModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  dateModalButtonGhost: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateModalButtonGhostText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  dateModalButton: {
    borderRadius: 16,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  dateModalButtonText: {
    color: COLORS.bg,
    fontSize: 14,
    fontWeight: '700',
  },
});
