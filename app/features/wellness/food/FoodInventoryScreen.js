import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  SafeAreaView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  applyVoiceActions,
  getRandomSampleVoicePhrase,
  parseVoiceCommand,
} from '../../../core/foodVoiceParser';
import CollapsibleSection from '../../../components/CollapsibleSection';
import { useAuth } from '../../../context/AuthContext';
import {
  fetchCatalogIngredients,
  fetchUserInventoryRows,
  getOrCreateAppUser,
  updateUserIngredientQuantity,
  upsertUserIngredient,
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

const ADD_ITEM_UNITS = ['pcs', 'g', 'kg', 'ml', 'litre', 'bottle'];

function getQuantityStep(unitType) {
  if (unitType === 'kg' || unitType === 'litre') return 0.25;
  if (unitType === 'g' || unitType === 'ml') return 50;
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

function convertAmount(amount, fromUnit, toUnit) {
  if (!fromUnit || !toUnit || fromUnit === toUnit) return amount;
  if (fromUnit === 'g' && toUnit === 'kg') return amount / 1000;
  if (fromUnit === 'kg' && toUnit === 'g') return amount * 1000;
  if (fromUnit === 'ml' && toUnit === 'litre') return amount / 1000;
  if (fromUnit === 'litre' && toUnit === 'ml') return amount * 1000;
  return amount;
}

function getPreviewWarnings(actions, inventoryItems) {
  const warnings = [];

  actions.forEach((action) => {
    if (action.action !== 'remove' || action.isNewItem) return;
    const item = inventoryItems.find((entry) => entry.id === action.itemId);
    if (!item) return;

    const amount = convertAmount(
      action.amount,
      action.inputUnit || item.unitType,
      item.unitType,
    );

    if (amount > item.quantity) {
      warnings.push(
        `${item.name}: remove amount exceeds stock. Quantity will be clamped to 0.`,
      );
    }
  });

  return warnings;
}

function FoodInventoryScreen({ embedded = false, showHero = true }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [inventory, setInventory] = useState([]);
  const [catalogItems, setCatalogItems] = useState([]);
  const [appUserId, setAppUserId] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [inlineError, setInlineError] = useState('');
  const [addPending, setAddPending] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [voiceVisible, setVoiceVisible] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [interpretation, setInterpretation] = useState({ actions: [], warnings: [] });

  const [addItemVisible, setAddItemVisible] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedCatalogItem, setSelectedCatalogItem] = useState(null);
  const [manualUnit, setManualUnit] = useState('');
  const [manualQuantity, setManualQuantity] = useState('1');

  const [snackbarMessage, setSnackbarMessage] = useState('');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const snackbarAnim = useRef(new Animated.Value(0)).current;
  const listenTimeoutRef = useRef(null);
  const autoInterpretTimeoutRef = useRef(null);
  const snackbarTimeoutRef = useRef(null);

  const refreshInventory = async (resolvedAppUserId) => {
    const rows = await fetchUserInventoryRows(resolvedAppUserId);
    const mapped = rows
      .map((row) => {
        const catalog = row.catalog_ingredient;
        const itemName = catalog?.name || row.custom_name;
        if (!itemName) return null;

        return {
          id: row.id,
          name: itemName,
          category: normalizeCategory(catalog?.category),
          unitType: row.unit_type || catalog?.unit_type || 'pcs',
          quantity: Number(row.quantity) || 0,
          lowStockThreshold: Number(row.low_stock_threshold) || 1,
          icon: CATEGORY_META[normalizeCategory(catalog?.category)]?.emoji || '🧺',
          ingredientId: row.ingredient_id,
        };
      })
      .filter(Boolean);

    setInventory(mapped);
  };

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
        const [catalog, rows] = await Promise.all([
          fetchCatalogIngredients(),
          fetchUserInventoryRows(appUser.id),
        ]);
        if (cancelled) return;

        setCatalogItems(catalog);
        const mappedRows = rows
          .map((row) => {
            const catalogItem = row.catalog_ingredient;
            const itemName = catalogItem?.name || row.custom_name;
            if (!itemName) return null;
            return {
              id: row.id,
              name: itemName,
              category: normalizeCategory(catalogItem?.category),
              unitType: row.unit_type || catalogItem?.unit_type || 'pcs',
              quantity: Number(row.quantity) || 0,
              lowStockThreshold: Number(row.low_stock_threshold) || 1,
              icon: CATEGORY_META[normalizeCategory(catalogItem?.category)]?.emoji || '🧺',
              ingredientId: row.ingredient_id,
            };
          })
          .filter(Boolean);
        setInventory(mappedRows);
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
      if (listenTimeoutRef.current) clearTimeout(listenTimeoutRef.current);
      if (autoInterpretTimeoutRef.current) clearTimeout(autoInterpretTimeoutRef.current);
      if (snackbarTimeoutRef.current) clearTimeout(snackbarTimeoutRef.current);
    },
    [],
  );

  useEffect(() => {
    if (!voiceVisible) return undefined;

    pulseAnim.setValue(1);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.12,
          duration: 520,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 520,
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => {
      loop.stop();
      pulseAnim.setValue(1);
    };
  }, [voiceVisible, pulseAnim]);

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

  const filteredCatalogItems = useMemo(() => {
    const query = catalogSearch.trim().toLowerCase();
    if (!query) return catalogItems;
    return catalogItems.filter((item) => {
      const name = String(item.name || '').toLowerCase();
      const category = String(item.category || '').toLowerCase();
      return name.includes(query) || category.includes(query);
    });
  }, [catalogItems, catalogSearch]);

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

  const interpretCommand = (text) => {
    const command = text.trim();
    if (!command) {
      setInterpretation({
        actions: [],
        warnings: ['No recognized text yet. Try speaking again or type a command.'],
      });
      return;
    }

    const parsed = parseVoiceCommand(command, inventory);
    const actionWarnings = parsed.actions.flatMap((action) => action.warnings ?? []);
    const previewWarnings = getPreviewWarnings(parsed.actions, inventory);

    setInterpretation({
      actions: parsed.actions,
      warnings: [...parsed.warnings, ...actionWarnings, ...previewWarnings],
    });
  };

  const openVoiceModal = () => {
    if (listenTimeoutRef.current) clearTimeout(listenTimeoutRef.current);
    if (autoInterpretTimeoutRef.current) clearTimeout(autoInterpretTimeoutRef.current);

    const phrase = getRandomSampleVoicePhrase();
    setVoiceVisible(true);
    setIsListening(true);
    setRecognizedText(phrase);
    setInterpretation({ actions: [], warnings: [] });

    listenTimeoutRef.current = setTimeout(() => {
      setIsListening(false);
    }, 1150);

    autoInterpretTimeoutRef.current = setTimeout(() => {
      interpretCommand(phrase);
    }, 1300);
  };

  const closeVoiceModal = () => {
    if (listenTimeoutRef.current) clearTimeout(listenTimeoutRef.current);
    if (autoInterpretTimeoutRef.current) clearTimeout(autoInterpretTimeoutRef.current);

    setVoiceVisible(false);
    setIsListening(false);
  };

  const confirmVoiceActions = async () => {
    if (interpretation.actions.length === 0) return;

    const { nextInventory, warnings } = applyVoiceActions(inventory, interpretation.actions);
    setInventory(nextInventory);
    closeVoiceModal();

    const existingRowsById = new Map(inventory.map((item) => [item.id, item]));
    const updates = nextInventory
      .filter((item) => existingRowsById.has(item.id))
      .map(async (item) => {
        const previous = existingRowsById.get(item.id);
        if (Number(previous.quantity) === Number(item.quantity)) return null;
        return updateUserIngredientQuantity({ rowId: item.id, quantity: item.quantity });
      });

    try {
      await Promise.all(updates);
      if (warnings.length > 0) {
        showSnackbar(`Inventory updated. ${warnings[0]}`);
      } else {
        showSnackbar('Inventory updated');
      }
    } catch (error) {
      showSnackbar(error?.message || 'Inventory synced with partial errors');
    }
  };

  const adjustQuantity = async (itemId, direction) => {
    const item = inventory.find((entry) => entry.id === itemId);
    if (!item) return;

    const step = getQuantityStep(item.unitType);
    const nextValue = Number(Math.max(0, item.quantity + step * direction).toFixed(3));

    setInventory((prev) =>
      prev.map((entry) => (entry.id === itemId ? { ...entry, quantity: nextValue } : entry)),
    );

    try {
      await updateUserIngredientQuantity({ rowId: itemId, quantity: nextValue });
    } catch (error) {
      setInventory((prev) =>
        prev.map((entry) => (entry.id === itemId ? { ...entry, quantity: item.quantity } : entry)),
      );
      showSnackbar(error?.message || 'Could not update quantity');
    }
  };

  const openAddItemModal = () => {
    setCatalogSearch('');
    setSelectedCatalogItem(null);
    setManualUnit('');
    setManualQuantity('1');
    setAddItemVisible(true);
  };

  const closeAddItemModal = () => {
    setAddItemVisible(false);
  };

  const submitAddItem = async () => {
    if (!selectedCatalogItem || !appUserId) {
      showSnackbar('Select an item first');
      return;
    }

    const unit = manualUnit || selectedCatalogItem.unit_type || 'pcs';
    const quantity = Math.max(0, Number(manualQuantity) || 0);

    if (quantity <= 0) {
      showSnackbar('Quantity should be greater than 0');
      return;
    }

    try {
      setAddPending(true);
      const result = await upsertUserIngredient({
        appUserId,
        ingredient: selectedCatalogItem,
        amount: quantity,
        unitType: unit,
      });
      await refreshInventory(appUserId);
      closeAddItemModal();
      showSnackbar(result.mode === 'increment' ? 'Quantity updated' : 'Item added');
    } catch (error) {
      showSnackbar(error?.message || 'Could not add item');
    } finally {
      setAddPending(false);
    }
  };

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

  const renderItem = ({ item }) => {
    const low = item.quantity <= item.lowStockThreshold;

    return (
      <View style={styles.itemCard}>
        <View style={styles.itemLeft}>
          <View style={styles.itemIconWrap}>
            <Text style={styles.itemIcon}>{item.icon || '🧺'}</Text>
          </View>
          <View style={styles.itemTextWrap}>
            <Text style={styles.itemName}>{item.name}</Text>
            <View style={styles.itemMetaRow}>
              <Text style={styles.itemQty}>{formatQuantity(item.quantity, item.unitType)}</Text>
              {low ? <View style={styles.lowDot} /> : null}
              {low ? <Text style={styles.lowText}>Low stock</Text> : null}
            </View>
          </View>
        </View>

        <View style={styles.stepper}>
          <TouchableOpacity
            style={styles.stepperButton}
            activeOpacity={0.85}
            onPress={() => adjustQuantity(item.id, -1)}
          >
            <Ionicons name="remove" size={16} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.stepperButton, styles.stepperButtonAccent]}
            activeOpacity={0.85}
            onPress={() => adjustQuantity(item.id, 1)}
          >
            <Ionicons name="add" size={16} color={COLORS.bg} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

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
              <Text style={styles.heroSubtitle}>Track pantry stock and update hands-free.</Text>
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
        <TouchableOpacity style={styles.voiceButton} activeOpacity={0.92} onPress={openVoiceModal}>
          <Ionicons name="mic" size={18} color={COLORS.bg} />
          <Text style={styles.voiceButtonText}>Voice Command</Text>
        </TouchableOpacity>

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

      <Modal visible={voiceVisible} transparent animationType="fade" onRequestClose={closeVoiceModal}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={closeVoiceModal} />
          <View style={[styles.voiceSheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Voice Command</Text>
            <Text style={styles.sheetSubtitle}>Speak naturally. We will confirm before applying.</Text>

            <View style={styles.listenRow}>
              <Animated.View style={[styles.listenOrb, { transform: [{ scale: pulseAnim }] }]}>
                <Ionicons name="mic" size={18} color={COLORS.accent} />
              </Animated.View>
              <View>
                <Text style={styles.listenTitle}>{isListening ? 'Listening...' : 'Ready to interpret'}</Text>
                <Text style={styles.listenHint}>
                  {isListening ? 'Capturing your command' : 'Edit text if needed before confirm'}
                </Text>
              </View>
            </View>

            <Text style={styles.fieldLabel}>Recognized text</Text>
            <TextInput
              style={styles.commandInput}
              multiline
              value={recognizedText}
              onChangeText={setRecognizedText}
              placeholder="e.g. add 3 tomatoes"
              placeholderTextColor={COLORS.muted}
              autoCapitalize="none"
            />

            <TouchableOpacity
              style={styles.interpretButton}
              activeOpacity={0.9}
              onPress={() => interpretCommand(recognizedText)}
            >
              <Text style={styles.interpretButtonText}>Interpret</Text>
            </TouchableOpacity>

            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>Interpretation Preview</Text>
              {interpretation.actions.length === 0 ? (
                <Text style={styles.previewEmpty}>No interpreted actions yet.</Text>
              ) : (
                interpretation.actions.map((action, index) => {
                  const unit = action.inputUnit || action.itemUnitType;
                  const commandText = `Will ${action.action.toUpperCase()} ${formatQuantity(
                    action.amount,
                    unit,
                  )} ${action.itemName}`;
                  return (
                    <View key={`${action.itemName}_${index}`} style={styles.previewRow}>
                      <Text style={styles.previewRowText}>{commandText}</Text>
                      {action.isNewItem ? (
                        <Text style={styles.previewHint}>Create new item if missing</Text>
                      ) : null}
                    </View>
                  );
                })
              )}

              {interpretation.warnings.length > 0 ? (
                <View style={styles.warningWrap}>
                  {interpretation.warnings.map((warning, idx) => (
                    <Text key={`${warning}_${idx}`} style={styles.warningText}>
                      • {warning}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>

            <View style={styles.sheetActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                activeOpacity={0.9}
                onPress={closeVoiceModal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  interpretation.actions.length === 0 && styles.confirmButtonDisabled,
                ]}
                activeOpacity={0.9}
                onPress={confirmVoiceActions}
                disabled={interpretation.actions.length === 0}
              >
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={addItemVisible} transparent animationType="fade" onRequestClose={closeAddItemModal}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={closeAddItemModal} />
          <View style={[styles.addSheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Add Item</Text>
            <Text style={styles.sheetSubtitle}>Pick from catalog and set quantity.</Text>

            <Text style={styles.fieldLabel}>Search ingredient</Text>
            <TextInput
              style={styles.singleInput}
              value={catalogSearch}
              onChangeText={setCatalogSearch}
              placeholder="Type ingredient name"
              placeholderTextColor={COLORS.muted}
            />

            <View style={styles.catalogPickerWrap}>
              <SectionList
                sections={[
                  {
                    title: 'Catalog',
                    data: filteredCatalogItems.slice(0, 40),
                  },
                ]}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  const selected = selectedCatalogItem?.id === item.id;
                  return (
                    <TouchableOpacity
                      style={[styles.catalogRow, selected && styles.catalogRowActive]}
                      activeOpacity={0.9}
                      onPress={() => {
                        setSelectedCatalogItem(item);
                        setManualUnit(item.unit_type || 'pcs');
                      }}
                    >
                      <View style={styles.catalogRowText}>
                        <Text style={styles.catalogName}>{item.name}</Text>
                        <Text style={styles.catalogMeta}>
                          {normalizeCategory(item.category)} · {item.unit_type || 'pcs'}
                        </Text>
                      </View>
                      {selected ? <Ionicons name="checkmark-circle" size={18} color={COLORS.accent} /> : null}
                    </TouchableOpacity>
                  );
                }}
                renderSectionHeader={() => null}
                stickySectionHeadersEnabled={false}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <Text style={styles.catalogEmpty}>No catalog items match your search.</Text>
                }
              />
            </View>

            <Text style={styles.fieldLabel}>Quantity</Text>
            <TextInput
              style={styles.singleInput}
              value={manualQuantity}
              onChangeText={setManualQuantity}
              keyboardType="numeric"
              placeholder="1"
              placeholderTextColor={COLORS.muted}
            />

            <Text style={styles.fieldLabel}>Unit</Text>
            <View style={styles.choiceWrap}>
              {ADD_ITEM_UNITS.map((unit) => (
                <TouchableOpacity
                  key={unit}
                  style={[styles.choiceChip, manualUnit === unit && styles.choiceChipActive]}
                  activeOpacity={0.9}
                  onPress={() => setManualUnit(unit)}
                >
                  <Text
                    style={[styles.choiceChipText, manualUnit === unit && styles.choiceChipTextActive]}
                  >
                    {unit}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.sheetActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                activeOpacity={0.9}
                onPress={closeAddItemModal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, addPending && styles.confirmButtonDisabled]}
                activeOpacity={0.9}
                onPress={submitAddItem}
                disabled={addPending}
              >
                <Text style={styles.confirmButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    alignItems: 'center',
    gap: 10,
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
  choiceWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  choiceChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.32)',
    backgroundColor: COLORS.card,
  },
  choiceChipActive: {
    borderColor: 'rgba(245,201,106,0.54)',
    backgroundColor: 'rgba(245,201,106,0.15)',
  },
  choiceChipText: {
    color: COLORS.muted,
    fontSize: 12,
  },
  choiceChipTextActive: {
    color: COLORS.accent,
    fontWeight: '700',
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
