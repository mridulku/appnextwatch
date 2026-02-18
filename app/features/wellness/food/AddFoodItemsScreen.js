import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CatalogCardRow from '../../../components/cards/CatalogCardRow';
import QuantityStepper from '../../../components/controls/QuantityStepper';
import CategoryChipsRow from '../../../ui/components/CategoryChipsRow';
import { useAuth } from '../../../context/AuthContext';
import {
  fetchCatalogIngredients,
  getOrCreateAppUser,
  listCatalogIngredients,
  listUserIngredients,
  upsertUserIngredient,
} from '../../../core/api/foodInventoryDb';
import COLORS from '../../../theme/colors';
import UI_TOKENS from '../../../ui/tokens';

const CATEGORY_ORDER = [
  'Vegetables',
  'Spices & Masalas',
  'Staples',
  'Oils & Sauces',
  'Dairy & Eggs',
  'Snacks',
];
const FOOTER_BASE_HEIGHT = 84;

function normalizeCategory(rawCategory) {
  const source = String(rawCategory || '').trim().toLowerCase();
  if (!source) return 'Snacks';
  if (source.includes('vegetable') || source.includes('veggie')) return 'Vegetables';
  if (source.includes('spice') || source.includes('masala')) return 'Spices & Masalas';
  if (source.includes('staple') || source.includes('grain') || source.includes('dal')) return 'Staples';
  if (source.includes('oil') || source.includes('sauce')) return 'Oils & Sauces';
  if (source.includes('dairy') || source.includes('egg') || source.includes('protein')) return 'Dairy & Eggs';
  if (source.includes('snack')) return 'Snacks';
  return 'Snacks';
}

function getQuantityStep(unitType) {
  if (unitType === 'kg' || unitType === 'litre') return 0.25;
  if (unitType === 'g' || unitType === 'ml') return 50;
  return 1;
}

function getAddDefaultQuantity(unitType) {
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

function AddFoodItemsScreen({ navigation }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const listRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [inlineError, setInlineError] = useState('');
  const [appUserId, setAppUserId] = useState(null);
  const [catalogItems, setCatalogItems] = useState([]);
  const [userRows, setUserRows] = useState([]);

  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedCatalogItem, setSelectedCatalogItem] = useState(null);
  const [pickerQuantity, setPickerQuantity] = useState(1);
  const [addPending, setAddPending] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, 280);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const hydrate = async () => {
    try {
      setLoading(true);
      setInlineError('');
      const appUser = await getOrCreateAppUser({
        username: user?.username || 'demo user',
        name: user?.name || 'Demo User',
      });

      setAppUserId(appUser.id);
      const [catalog, rows] = await Promise.all([
        fetchCatalogIngredients(),
        listUserIngredients(appUser.id),
      ]);
      setCatalogItems(catalog);
      setUserRows(rows);
    } catch (error) {
      setInlineError(error?.message || 'Could not load ingredient catalog.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    hydrate();
  }, [user?.username, user?.name]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!appUserId) return;
      try {
        const rows = await listCatalogIngredients({ search: searchQuery });
        if (!cancelled) {
          setCatalogItems(rows);
        }
      } catch (error) {
        if (!cancelled) {
          setInlineError(error?.message || 'Could not filter catalog.');
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [searchQuery, appUserId]);

  useEffect(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset?.({ offset: 0, animated: false });
    });
  }, [selectedCategory, searchInput]);

  const userRowsByIngredientId = useMemo(() => {
    const next = new Map();
    userRows.forEach((row) => {
      next.set(row.ingredient_id, row);
    });
    return next;
  }, [userRows]);

  const selectedIds = useMemo(
    () => new Set(userRows.map((row) => row.ingredient_id).filter(Boolean)),
    [userRows],
  );

  const categoryFilters = useMemo(() => {
    const categories = Array.from(new Set(catalogItems.map((item) => normalizeCategory(item.category))));
    const ordered = CATEGORY_ORDER.filter((category) => categories.includes(category));
    const remainder = categories.filter((category) => !ordered.includes(category)).sort((a, b) => a.localeCompare(b));
    return ['All', ...ordered, ...remainder];
  }, [catalogItems]);

  const filteredCatalogItems = useMemo(() => {
    return catalogItems.filter((item) => {
      const category = normalizeCategory(item.category);
      const matchesCategory = selectedCategory === 'All' || category === selectedCategory;
      return matchesCategory;
    });
  }, [catalogItems, selectedCategory]);

  const selectedExistingInventoryItem = useMemo(
    () => (selectedCatalogItem ? userRowsByIngredientId.get(selectedCatalogItem.id) : null),
    [selectedCatalogItem, userRowsByIngredientId],
  );

  useEffect(() => {
    if (!selectedCatalogItem) return;
    if (selectedExistingInventoryItem) {
      setPickerQuantity(Number(selectedExistingInventoryItem.quantity) || 1);
      return;
    }
    setPickerQuantity(getAddDefaultQuantity(selectedCatalogItem.unit_type || 'pcs'));
  }, [selectedCatalogItem, selectedExistingInventoryItem]);

  const selectItem = (item) => {
    setSelectedCatalogItem(item);
  };

  const submitAddItem = async () => {
    if (!selectedCatalogItem || !appUserId || addPending) return;

    const quantity = Math.max(0, Number(pickerQuantity) || 0);
    if (quantity <= 0) {
      setInlineError('Quantity should be greater than 0');
      return;
    }

    try {
      setAddPending(true);
      setInlineError('');
      await upsertUserIngredient({
        userId: appUserId,
        ingredientId: selectedCatalogItem.id,
        quantity,
      });

      const rows = await listUserIngredients(appUserId);
      setUserRows(rows);
    } catch (error) {
      setInlineError(error?.message || 'Could not save ingredient');
    } finally {
      setAddPending(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.headerContent}>
      <Text style={styles.title}>Add items</Text>
      <Text style={styles.subtitle}>Pick from catalog and set quantity.</Text>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color={COLORS.muted} />
        <TextInput
          value={searchInput}
          onChangeText={setSearchInput}
          style={styles.searchInput}
          placeholder="Search ingredient"
          placeholderTextColor={COLORS.muted}
        />
      </View>

      <CategoryChipsRow
        categories={categoryFilters}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {inlineError ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{inlineError}</Text>
          <TouchableOpacity style={styles.retryButton} activeOpacity={0.9} onPress={hydrate}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.headerSpacer} />
    </View>
  );

  const renderRow = ({ item }) => {
    const id = item.id;
    const selected = selectedCatalogItem?.id === id;
    const alreadyAdded = selectedIds.has(id);

    return (
      <CatalogCardRow
        title={item.name}
        subtitle={`${normalizeCategory(item.category)} • ${item.unit_type || 'pcs'}`}
        selected={selected || alreadyAdded}
        actionLabel={selected ? 'SELECTED' : alreadyAdded ? 'ADDED' : 'ADD'}
        actionVariant={selected || alreadyAdded ? 'success' : 'accent'}
        actionDisabled={selected}
        onAction={() => selectItem(item)}
        onPress={() => selectItem(item)}
      />
    );
  };

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading ingredient catalog...</Text>
        </View>
      );
    }

    return <Text style={styles.emptyText}>No catalog items match your search.</Text>;
  };

  const dynamicFooterHeight = selectedCatalogItem ? 220 : FOOTER_BASE_HEIGHT;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <FlatList
          ref={listRef}
          data={loading ? [] : filteredCatalogItems}
          keyExtractor={(item) => item.id}
          renderItem={renderRow}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          ItemSeparatorComponent={() => <View style={styles.rowSeparator} />}
          contentContainerStyle={[
            styles.listContent,
            {
              paddingBottom:
                dynamicFooterHeight + Math.max(insets.bottom, UI_TOKENS.spacing.sm) + UI_TOKENS.spacing.sm,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />

        <View style={[styles.footerBar, { paddingBottom: Math.max(insets.bottom, UI_TOKENS.spacing.xs) }]}>
          {selectedCatalogItem ? (
            <View style={styles.footerCard}>
              <Text style={styles.footerTitle}>Quantity</Text>
              <QuantityStepper
                valueLabel={formatQuantity(pickerQuantity, selectedCatalogItem.unit_type || 'pcs')}
                onDecrement={() => {
                  const step = getQuantityStep(selectedCatalogItem.unit_type || 'pcs');
                  setPickerQuantity((prev) => Math.max(0, Number((prev - step).toFixed(3))));
                }}
                onIncrement={() => {
                  const step = getQuantityStep(selectedCatalogItem.unit_type || 'pcs');
                  setPickerQuantity((prev) => Number((prev + step).toFixed(3)));
                }}
              />
              <Text style={styles.footerHint}>Unit: {selectedCatalogItem.unit_type || 'pcs'} (from catalog)</Text>
              <TouchableOpacity
                style={[styles.footerAction, addPending && styles.footerActionDisabled]}
                activeOpacity={0.9}
                onPress={submitAddItem}
                disabled={addPending}
              >
                {addPending ? (
                  <ActivityIndicator color={COLORS.bg} size="small" />
                ) : (
                  <Text style={styles.footerActionText}>{selectedExistingInventoryItem ? 'Update' : 'Add'}</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.footerEmpty}>Select an ingredient to set quantity.</Text>
          )}

          <TouchableOpacity style={styles.doneButton} activeOpacity={0.9} onPress={() => navigation.goBack()}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  listContent: {
    paddingHorizontal: UI_TOKENS.spacing.md,
    paddingTop: UI_TOKENS.spacing.sm,
  },
  headerContent: {
    paddingBottom: UI_TOKENS.spacing.xs,
  },
  title: {
    color: COLORS.text,
    fontSize: 34,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: UI_TOKENS.spacing.xs,
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.subtitle + 1,
  },
  searchWrap: {
    marginTop: UI_TOKENS.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.3)',
    backgroundColor: COLORS.card,
    paddingHorizontal: UI_TOKENS.spacing.sm,
    height: 46,
  },
  searchInput: {
    marginLeft: UI_TOKENS.spacing.xs,
    flex: 1,
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle,
  },
  errorCard: {
    marginTop: UI_TOKENS.spacing.sm,
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
  retryButton: {
    marginTop: UI_TOKENS.spacing.xs,
    alignSelf: 'flex-start',
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(255,124,123,0.45)',
    paddingHorizontal: UI_TOKENS.spacing.sm,
    paddingVertical: UI_TOKENS.spacing.xs,
  },
  retryText: {
    color: '#FFB4A8',
    fontWeight: '700',
    fontSize: UI_TOKENS.typography.meta,
  },
  headerSpacer: {
    height: UI_TOKENS.spacing.xs,
  },
  rowSeparator: {
    height: UI_TOKENS.spacing.sm,
  },
  loadingWrap: {
    marginTop: UI_TOKENS.spacing.lg,
    alignItems: 'center',
    gap: UI_TOKENS.spacing.sm,
  },
  loadingText: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.subtitle,
  },
  emptyText: {
    marginTop: UI_TOKENS.spacing.lg,
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.subtitle,
    textAlign: 'center',
  },
  footerBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: UI_TOKENS.spacing.md,
    paddingTop: UI_TOKENS.spacing.xs,
    borderTopWidth: UI_TOKENS.border.hairline,
    borderTopColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.bg,
  },
  footerCard: {
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.sm,
    gap: UI_TOKENS.spacing.xs,
  },
  footerTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle,
    fontWeight: '700',
  },
  footerHint: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
  footerAction: {
    marginTop: UI_TOKENS.spacing.xs,
    borderRadius: UI_TOKENS.radius.md,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    paddingVertical: 10,
  },
  footerActionDisabled: {
    opacity: 0.7,
  },
  footerActionText: {
    color: COLORS.bg,
    fontSize: UI_TOKENS.typography.subtitle,
    fontWeight: '700',
  },
  footerEmpty: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
  doneButton: {
    marginTop: UI_TOKENS.spacing.xs,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.3)',
    backgroundColor: COLORS.card,
    alignItems: 'center',
    paddingVertical: 12,
  },
  doneButtonText: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 1,
    fontWeight: '700',
  },
});

export default AddFoodItemsScreen;
