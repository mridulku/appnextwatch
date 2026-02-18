import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef } from 'react';
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
import CategoryChipsRow from '../../../ui/components/CategoryChipsRow';
import { useAuth } from '../../../context/AuthContext';
import useCatalogSelection from '../../../hooks/useCatalogSelection';
import COLORS from '../../../theme/colors';
import UI_TOKENS from '../../../ui/tokens';

const CATEGORY_ORDER = ['Pans', 'Knives', 'Appliances', 'Containers', 'Tools'];
const FOOTER_HEIGHT = 74;

function normalizeCategory(row) {
  return String(row?.category || '').trim() || 'Tools';
}

function AddUtensilsScreen({ navigation }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const listRef = useRef(null);

  const selection = useCatalogSelection({
    user,
    config: {
      catalogTable: 'catalog_utensils',
      catalogSelect: 'id,name,category,note',
      userTable: 'user_utensils',
      userSelect: 'id,user_id,utensil_id,catalog_utensil:catalog_utensils(id,name,category,note)',
      userFkColumn: 'utensil_id',
      joinKey: 'catalog_utensil',
      categoryOrder: CATEGORY_ORDER,
      getCatalogCategory: normalizeCategory,
      getCatalogSearchText: (row) =>
        [row?.name, row?.category, row?.note].filter(Boolean).join(' ').toLowerCase(),
      insertPayload: { count: 1 },
    },
  });

  useEffect(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset?.({ offset: 0, animated: false });
    });
  }, [selection.selectedCategory, selection.searchInput]);

  const selectedIds = selection.selectedCatalogIdSet;
  const footerText = useMemo(() => `${selectedIds.size} selected`, [selectedIds]);

  const renderHeader = () => (
    <View style={styles.headerContent}>
      <Text style={styles.title}>Add utensils</Text>
      <Text style={styles.subtitle}>Pick from catalog utensils available in your kitchen.</Text>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color={COLORS.muted} />
        <TextInput
          value={selection.searchInput}
          onChangeText={selection.setSearchInput}
          style={styles.searchInput}
          placeholder="Search utensils"
          placeholderTextColor={COLORS.muted}
        />
      </View>

      <CategoryChipsRow
        categories={selection.categoryFilters}
        selectedCategory={selection.selectedCategory}
        onSelectCategory={selection.setSelectedCategory}
      />

      {selection.error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{selection.error}</Text>
          <TouchableOpacity style={styles.retryButton} activeOpacity={0.9} onPress={selection.hydrate}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.headerSpacer} />
    </View>
  );

  const renderRow = ({ item }) => {
    const id = item.id;
    const isAdded = selectedIds.has(id);
    const isBusy = selection.pendingAddId === id;

    return (
      <CatalogCardRow
        title={item.name}
        subtitle={`${normalizeCategory(item)}${item?.note ? ` • ${item.note}` : ''}`}
        selected={isAdded}
        actionLabel={isBusy ? '...' : isAdded ? 'ADDED' : 'ADD'}
        actionVariant={isAdded ? 'success' : 'accent'}
        actionDisabled={isAdded || isBusy}
        onAction={() => selection.addCatalogItem(id)}
        onPress={isAdded ? undefined : () => selection.addCatalogItem(id)}
      />
    );
  };

  const renderEmpty = () => {
    if (selection.loading) {
      return (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading utensils...</Text>
        </View>
      );
    }

    return <Text style={styles.emptyText}>No utensils match this filter.</Text>;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <FlatList
          ref={listRef}
          data={selection.loading ? [] : selection.filteredCatalogRows}
          keyExtractor={(item) => item.id}
          renderItem={renderRow}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          ItemSeparatorComponent={() => <View style={styles.rowSeparator} />}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: FOOTER_HEIGHT + Math.max(insets.bottom, UI_TOKENS.spacing.sm) + UI_TOKENS.spacing.sm },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />

        <View style={[styles.footerBar, { paddingBottom: Math.max(insets.bottom, UI_TOKENS.spacing.xs) }]}>
          <Text style={styles.footerHint}>{footerText}</Text>
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
    minHeight: FOOTER_HEIGHT,
    paddingHorizontal: UI_TOKENS.spacing.md,
    paddingTop: UI_TOKENS.spacing.xs,
    borderTopWidth: UI_TOKENS.border.hairline,
    borderTopColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.bg,
  },
  footerHint: {
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

export default AddUtensilsScreen;
