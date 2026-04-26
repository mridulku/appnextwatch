import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  SafeAreaView,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CollapsibleSection from '../../../components/CollapsibleSection';
import SelectedCatalogItemCard from '../../../components/cards/SelectedCatalogItemCard';
import { useAuth } from '../../../context/AuthContext';
import {
  getOrCreateAppUser,
  listUserIngredients,
} from '../../../core/api/foodInventoryDb';
import COLORS from '../../../theme/colors';

const CATEGORY_META = {
  Vegetables: { emoji: '🥕', note: 'Fresh produce and herbs' },
  'Spices & Masalas': { emoji: '🌶️', note: 'Daily spice base' },
  Staples: { emoji: '🍚', note: 'Core grains and pulses' },
  'Oils & Sauces': { emoji: '🫒', note: 'Cooking oils and flavor boosters' },
  'Dairy & Eggs': { emoji: '🥚', note: 'Fridge essentials' },
  Snacks: { emoji: '🍿', note: 'Quick bites and munchies' },
};

const CATEGORY_ORDER = [
  'Vegetables',
  'Spices & Masalas',
  'Staples',
  'Oils & Sauces',
  'Dairy & Eggs',
  'Snacks',
];

function normalizeCategory(rawCategory) {
  const source = String(rawCategory || '').trim().toLowerCase();
  if (!source) return 'Snacks';
  if (source.includes('vegetable') || source.includes('veggie')) return 'Vegetables';
  if (source.includes('spice') || source.includes('masala')) return 'Spices & Masalas';
  if (source.includes('staple') || source.includes('grain') || source.includes('dal')) return 'Staples';
  if (source.includes('oil') || source.includes('sauce')) return 'Oils & Sauces';
  if (
    source.includes('dairy') ||
    source.includes('egg') ||
    source.includes('protein')
  ) {
    return 'Dairy & Eggs';
  }
  if (source.includes('snack')) return 'Snacks';
  return 'Snacks';
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

function FoodInventoryScreen({ navigation, embedded = false, showHero = true }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [inventory, setInventory] = useState([]);
  const [appUserId, setAppUserId] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [inlineError, setInlineError] = useState('');
  const [expandedCategories, setExpandedCategories] = useState({});

  const [snackbarMessage, setSnackbarMessage] = useState('');
  const snackbarAnim = useRef(new Animated.Value(0)).current;
  const snackbarTimeoutRef = useRef(null);

  const mapInventoryRows = (rows) =>
    rows
      .map((row) => {
        const catalog = row.catalog_ingredient;
        const itemName = catalog?.name || row.custom_name;
        if (!itemName) return null;

        const normalizedCategory = normalizeCategory(catalog?.category);
        return {
          id: row.id,
          name: itemName,
          category: normalizedCategory,
          unitType: catalog?.unit_type || row.unit_type || 'pcs',
          quantity: Number(row.quantity) || 0,
          lowStockThreshold: Number(row.low_stock_threshold) || 1,
          icon: CATEGORY_META[normalizedCategory]?.emoji || '🧺',
          ingredientId: row.ingredient_id,
        };
      })
      .filter(Boolean);

  const refreshInventory = async (resolvedAppUserId) => {
    const rows = await listUserIngredients(resolvedAppUserId);
    setInventory(mapInventoryRows(rows));
  };

  useFocusEffect(
    useCallback(() => {
      if (!appUserId) return undefined;
      refreshInventory(appUserId).catch((error) => {
        setInlineError(error?.message || 'Could not refresh inventory.');
      });
      return undefined;
    }, [appUserId]),
  );

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      try {
        setLoading(true);
        setInlineError('');
        const appUser = await getOrCreateAppUser({
          username: user?.username || 'demo user',
          name: user?.name || 'Demo User',
        });
        if (cancelled) return;

        setAppUserId(appUser.id);
        const rows = await listUserIngredients(appUser.id);
        if (cancelled) return;
        setInventory(mapInventoryRows(rows));
      } catch (error) {
        if (!cancelled) {
          setInlineError(error?.message || 'Could not load inventory right now.');
        }
      } finally {
        if (!cancelled) {
          setHydrated(true);
          setLoading(false);
        }
      }
    };

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [user?.name, user?.username]);

  useEffect(
    () => () => {
      if (snackbarTimeoutRef.current) clearTimeout(snackbarTimeoutRef.current);
    },
    [],
  );

  const totalItems = inventory.length;
  const lowStockItems = useMemo(
    () => inventory.filter((item) => item.quantity <= item.lowStockThreshold).length,
    [inventory],
  );

  const sections = useMemo(() => {
    const grouped = inventory.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {});

    const sortedCategories = [
      ...CATEGORY_ORDER,
      ...Object.keys(grouped).filter((category) => !CATEGORY_ORDER.includes(category)),
    ].filter((category) => grouped[category]?.length);

    return sortedCategories.map((category) => ({
      title: category,
      itemCount: grouped[category].length,
      data: grouped[category]
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name)),
      meta: CATEGORY_META[category] ?? { emoji: '🧺', note: 'Kitchen inventory' },
    }));
  }, [inventory]);

  const visibleSections = useMemo(
    () =>
      sections.map((section) => ({
        ...section,
        data: expandedCategories[section.title] ? section.data : [],
      })),
    [expandedCategories, sections],
  );

  const showSnackbar = (message) => {
    setSnackbarMessage(message);
    Animated.timing(snackbarAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();

    if (snackbarTimeoutRef.current) clearTimeout(snackbarTimeoutRef.current);
    snackbarTimeoutRef.current = setTimeout(() => {
      Animated.timing(snackbarAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }, 2400);
  };

  const openAddItemModal = () => {
    navigation?.navigate('AddFoodItems');
  };

  const openItemDetail = useCallback((item) => {
    navigation?.navigate('FoodInventoryItemDetail', {
      itemId: item.id,
      ingredientId: item.ingredientId,
      name: item.name,
      category: item.category,
      unitType: item.unitType,
      quantity: item.quantity,
      icon: item.icon,
    });
  }, [navigation]);

  const toggleCategory = (title) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const renderSectionHeader = ({ section }) => (
    <CollapsibleSection
      title={section.title}
      subtitle={section.meta.note}
      icon={section.meta.emoji}
      iconIsEmoji
      expanded={Boolean(expandedCategories[section.title])}
      onToggle={() => toggleCategory(section.title)}
      countLabel={`${section.itemCount} items`}
      style={styles.sectionCardWrap}
    />
  );

  const renderItem = useCallback(({ item }) => {
    const low = item.quantity <= item.lowStockThreshold;

    return (
      <SelectedCatalogItemCard
        title={item.name}
        subtitle={`${item.category} • ${formatQuantity(item.quantity, item.unitType)}`}
        badges={low ? [{ label: 'Low stock', tone: 'warn' }] : []}
        onPress={() => openItemDetail(item)}
        layout="leftThumb"
        topAction={{
          iconName: 'create-outline',
          iconColor: COLORS.text,
          onPress: () => openItemDetail(item),
        }}
      />
    );
  }, [openItemDetail]);

  const RootContainer = embedded ? View : SafeAreaView;

  if (!hydrated || loading) {
    return (
      <RootContainer style={styles.safeArea}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading pantry...</Text>
        </View>
      </RootContainer>
    );
  }

  const snackbarTranslate = snackbarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [28, 0],
  });

  return (
    <RootContainer style={styles.safeArea}>
      <View style={[styles.root, embedded && styles.rootEmbedded]}>
        {showHero ? (
          <View style={styles.heroCard}>
            <View>
              <Text style={styles.heroTitle}>Inventory</Text>
              <Text style={styles.heroSubtitle}>Track pantry stock and keep kitchen basics current.</Text>
            </View>
            <View style={styles.heroStatsRow}>
              <View style={styles.heroStatPill}>
                <Text style={styles.heroStatValue}>{totalItems}</Text>
                <Text style={styles.heroStatLabel}>items</Text>
              </View>
              <View style={[styles.heroStatPill, lowStockItems > 0 && styles.heroStatWarn]}>
                <Text style={[styles.heroStatValue, lowStockItems > 0 && styles.heroStatWarnText]}>
                  {lowStockItems}
                </Text>
                <Text style={[styles.heroStatLabel, lowStockItems > 0 && styles.heroStatWarnText]}>
                  low
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        <SectionList
          sections={visibleSections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={renderSectionHeader}
          renderItem={renderItem}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={[
            styles.listContent,
            {
              paddingBottom: 130 + insets.bottom,
            },
          ]}
          ListEmptyComponent={
            inventory.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyTitle}>No pantry items yet</Text>
                <Text style={styles.emptySubtle}>Add items from the catalog to start tracking stock.</Text>
                <TouchableOpacity style={styles.emptyCta} activeOpacity={0.9} onPress={openAddItemModal}>
                  <Ionicons name="add-circle-outline" size={16} color={COLORS.bg} />
                  <Text style={styles.emptyCtaText}>Add items</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
          showsVerticalScrollIndicator={false}
        />

        {inlineError ? (
          <View style={styles.inlineErrorWrap}>
            <Text style={styles.inlineErrorText}>{inlineError}</Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.bottomBar, { bottom: Math.max(insets.bottom, 10) }]}>
        <TouchableOpacity style={styles.addButton} activeOpacity={0.9} onPress={openAddItemModal}>
          <Ionicons name="add-circle-outline" size={16} color={COLORS.text} />
          <Text style={styles.addButtonText}>Add Item</Text>
        </TouchableOpacity>
      </View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.snackbar,
          {
            bottom: 92 + insets.bottom,
            opacity: snackbarAnim,
            transform: [{ translateY: snackbarTranslate }],
          },
        ]}
      >
        <Text style={styles.snackbarText}>{snackbarMessage}</Text>
      </Animated.View>

    </RootContainer>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  rootEmbedded: {
    paddingTop: 6,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: COLORS.muted,
    fontSize: 13,
  },
  heroCard: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(245,201,106,0.18)',
  },
  heroTitle: {
    color: COLORS.text,
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '700',
  },
  heroSubtitle: {
    color: COLORS.muted,
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
  },
  heroStatsRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 8,
  },
  heroStatPill: {
    borderRadius: 999,
    backgroundColor: COLORS.cardSoft,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.22)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroStatWarn: {
    borderColor: 'rgba(255,145,107,0.5)',
    backgroundColor: 'rgba(255,145,107,0.12)',
  },
  heroStatValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  heroStatLabel: {
    color: COLORS.muted,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  heroStatWarnText: {
    color: '#FFA674',
  },
  listContent: {
    paddingBottom: 18,
  },
  sectionCardWrap: {
    marginTop: 10,
    marginBottom: 8,
  },
  sectionHeader: {
    marginTop: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardSoft,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(90,209,232,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sectionEmoji: {
    fontSize: 20,
    marginRight: 10,
  },
  sectionTextWrap: {
    flex: 1,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  sectionSubtle: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 2,
  },
  sectionCountPill: {
    backgroundColor: 'rgba(245,201,106,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(245,201,106,0.34)',
    borderRadius: 999,
    minWidth: 34,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  sectionCountText: {
    color: COLORS.accent,
    fontWeight: '700',
    fontSize: 12,
  },
  itemCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.16)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10,
  },
  itemIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(90,209,232,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  itemIcon: {
    fontSize: 17,
  },
  itemTextWrap: {
    flex: 1,
  },
  itemName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  itemMetaRow: {
    marginTop: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemQty: {
    color: COLORS.muted,
    fontSize: 12,
  },
  lowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFA674',
  },
  lowText: {
    color: '#FFA674',
    fontSize: 11,
    fontWeight: '600',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepperWrap: {
    alignItems: 'flex-end',
    gap: 6,
  },
  removeIconButton: {
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(255,145,107,0.4)',
    backgroundColor: 'rgba(255,145,107,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePromptWrap: {
    alignItems: 'flex-end',
    gap: 6,
  },
  removePromptText: {
    color: '#FFA674',
    fontSize: 11,
    fontWeight: '600',
  },
  removePromptActions: {
    flexDirection: 'row',
    gap: 6,
  },
  removeCancelChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.34)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: COLORS.cardSoft,
  },
  removeCancelText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '600',
  },
  removeConfirmChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,145,107,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(255,145,107,0.16)',
  },
  removeConfirmText: {
    color: '#FFA674',
    fontSize: 11,
    fontWeight: '700',
  },
  stepperButton: {
    width: 30,
    height: 30,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.28)',
    backgroundColor: COLORS.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonAccent: {
    borderColor: 'rgba(245,201,106,0.4)',
    backgroundColor: COLORS.accent,
  },
  emptyWrap: {
    marginTop: 28,
    alignItems: 'center',
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtle: {
    color: COLORS.muted,
    marginTop: 4,
    fontSize: 13,
  },
  emptyCta: {
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    minHeight: 40,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyCtaText: {
    color: COLORS.bg,
    fontSize: 13,
    fontWeight: '700',
  },
  inlineErrorWrap: {
    marginTop: 6,
    marginBottom: 4,
    backgroundColor: 'rgba(255,145,107,0.12)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,145,107,0.35)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  inlineErrorText: {
    color: '#FFA674',
    fontSize: 11,
  },
  bottomBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: 'rgba(14,15,20,0.96)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.24)',
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  voiceButton: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: COLORS.accent,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  voiceButtonText: {
    color: COLORS.bg,
    fontSize: 14,
    fontWeight: '700',
  },
  addButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.35)',
    backgroundColor: COLORS.card,
    minHeight: 46,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addButtonText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  snackbar: {
    position: 'absolute',
    left: 24,
    right: 24,
    borderRadius: 12,
    backgroundColor: '#131722',
    borderWidth: 1,
    borderColor: 'rgba(90,209,232,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  snackbarText: {
    color: COLORS.text,
    fontSize: 12,
    textAlign: 'center',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  voiceSheet: {
    backgroundColor: '#11151F',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 8,
    maxHeight: '92%',
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.24)',
  },
  addSheet: {
    backgroundColor: '#11151F',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 8,
    maxHeight: '88%',
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.24)',
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(162,167,179,0.42)',
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
  },
  sheetSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 3,
    marginBottom: 14,
  },
  listenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(90,209,232,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  listenOrb: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245,201,106,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(245,201,106,0.4)',
  },
  listenTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  listenHint: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 2,
  },
  fieldLabel: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  commandInput: {
    minHeight: 74,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.25)',
    color: COLORS.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
    fontSize: 14,
    marginBottom: 10,
  },
  singleInput: {
    height: 46,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.25)',
    color: COLORS.text,
    paddingHorizontal: 12,
    marginBottom: 10,
    fontSize: 14,
  },
  categoryChipsRow: {
    gap: 8,
    paddingBottom: 10,
  },
  categoryFilterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.32)',
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  categoryFilterChipActive: {
    borderColor: 'rgba(245,201,106,0.56)',
    backgroundColor: 'rgba(245,201,106,0.17)',
  },
  categoryFilterText: {
    color: COLORS.muted,
    fontSize: 12,
  },
  categoryFilterTextActive: {
    color: COLORS.accent,
    fontWeight: '700',
  },
  interpretButton: {
    backgroundColor: COLORS.cardSoft,
    borderWidth: 1,
    borderColor: 'rgba(245,201,106,0.4)',
    borderRadius: 12,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  interpretButtonText: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  previewCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.22)',
    padding: 12,
    marginBottom: 14,
  },
  previewTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  previewEmpty: {
    color: COLORS.muted,
    fontSize: 12,
  },
  previewRow: {
    marginBottom: 8,
  },
  previewRowText: {
    color: COLORS.text,
    fontSize: 12,
    lineHeight: 18,
  },
  previewHint: {
    color: COLORS.accent2,
    fontSize: 11,
    marginTop: 2,
  },
  warningWrap: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(162,167,179,0.24)',
    paddingTop: 8,
  },
  warningText: {
    color: '#FFA674',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 3,
  },
  catalogPickerWrap: {
    maxHeight: 220,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.25)',
    backgroundColor: COLORS.card,
    marginBottom: 12,
  },
  catalogRow: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(162,167,179,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  catalogRowActive: {
    backgroundColor: 'rgba(245,201,106,0.13)',
  },
  catalogRowText: {
    flex: 1,
    paddingRight: 8,
  },
  catalogName: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  catalogMeta: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 2,
  },
  catalogEmpty: {
    color: COLORS.muted,
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  catalogFooterCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.card,
    padding: 12,
    gap: 10,
  },
  catalogFooterTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  catalogFooterHint: {
    color: COLORS.muted,
    fontSize: 11,
  },
  catalogFooterAction: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catalogFooterActionText: {
    color: COLORS.bg,
    fontSize: 13,
    fontWeight: '700',
  },
  catalogFooterEmpty: {
    color: COLORS.muted,
    fontSize: 12,
    paddingHorizontal: 2,
  },
  quantityCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.25)',
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  quantityValueWrap: {
    flex: 1,
    minHeight: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.cardSoft,
  },
  quantityValueText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  quantityHint: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 8,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
  },
  cancelButtonText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
  },
  confirmButtonDisabled: {
    opacity: 0.45,
  },
  confirmButtonText: {
    color: COLORS.bg,
    fontSize: 13,
    fontWeight: '700',
  },
});

export default FoodInventoryScreen;
