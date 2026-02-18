import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';

import CatalogCardRow from '../../../components/cards/CatalogCardRow';
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
const FOOTER_BASE_HEIGHT = 88;

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

function getAddDefaultQuantity(unitType) {
  if (unitType === 'g' || unitType === 'ml') return 100;
  return 1;
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
  const [addingId, setAddingId] = useState(null);

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

  useFocusEffect(
    useCallback(() => {
      hydrate();
    }, [user?.username, user?.name]),
  );

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
      return selectedCategory === 'All' || category === selectedCategory;
    });
  }, [catalogItems, selectedCategory]);

  const addItemDirectly = async (catalogItem) => {
    if (!catalogItem?.id || !appUserId || addingId || selectedIds.has(catalogItem.id)) return;

    try {
      setAddingId(catalogItem.id);
      setInlineError('');
      await upsertUserIngredient({
        userId: appUserId,
        ingredientId: catalogItem.id,
        quantity: getAddDefaultQuantity(catalogItem.unit_type || 'pcs'),
      });

      const rows = await listUserIngredients(appUserId);
      setUserRows(rows);
    } catch (error) {
      setInlineError(error?.message || 'Could not add ingredient');
    } finally {
      setAddingId(null);
    }
  };

  const renderHeader = () => (
    <View style={styles.headerContent}>
      <Text style={styles.title}>Add items</Text>
      <Text style={styles.subtitle}>Pick from catalog. Items are added directly to inventory.</Text>

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
    const alreadyAdded = selectedIds.has(id);
    const isAdding = addingId === id;

    return (
      <CatalogCardRow
        title={item.name}
        subtitle={`${normalizeCategory(item.category)} • ${item.unit_type || 'pcs'}`}
        selected={alreadyAdded}
        actionLabel={isAdding ? 'ADDING' : alreadyAdded ? 'ADDED' : 'ADD'}
        actionVariant={alreadyAdded ? 'success' : 'accent'}
        actionDisabled={alreadyAdded || isAdding}
        onAction={() => addItemDirectly(item)}
        onPress={() =>
          navigation.navigate('FoodInventoryItemDetail', {
            fromCatalog: true,
            isAdded: alreadyAdded,
            ingredientId: id,
            itemId: id,
            name: item.name,
            category: normalizeCategory(item.category),
            unitType: item.unit_type || 'pcs',
            quantity: getAddDefaultQuantity(item.unit_type || 'pcs'),
          })
        }
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
                FOOTER_BASE_HEIGHT + Math.max(insets.bottom, UI_TOKENS.spacing.sm) + UI_TOKENS.spacing.sm,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />

        <View style={[styles.footerBar, { paddingBottom: Math.max(insets.bottom, UI_TOKENS.spacing.xs) }]}>
          <Text style={styles.footerMeta}>{selectedIds.size} added</Text>
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
  footerMeta: {
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
