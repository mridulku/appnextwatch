import { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import SelectedCatalogItemCard from '../../../components/cards/SelectedCatalogItemCard';
import CollapsibleSection from '../../../components/CollapsibleSection';
import { useAuth } from '../../../context/AuthContext';
import useCatalogSelection from '../../../hooks/useCatalogSelection';
import COLORS from '../../../theme/colors';

const CATEGORY_ORDER = ['Pans', 'Knives', 'Appliances', 'Containers', 'Tools'];
const CATEGORY_ICONS = {
  Pans: '🍳',
  Knives: '🔪',
  Appliances: '⚙️',
  Containers: '🫙',
  Tools: '🥄',
};

function normalizeCategory(row) {
  return String(row?.category || '').trim() || 'Tools';
}

function FoodUtensilsScreen({ navigation, embedded = false, showHero = true }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

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

  const sections = useMemo(() => {
    const grouped = selection.catalogRows.reduce((acc, row) => {
      const category = normalizeCategory(row);
      if (!acc[category]) acc[category] = [];
      acc[category].push(row);
      return acc;
    }, {});

    return CATEGORY_ORDER.filter((category) => grouped[category]?.length).map((category) => ({
      title: category,
      itemCount: grouped[category].length,
      data: selection.expandedCategories[category] ? grouped[category] : [],
    }));
  }, [selection.catalogRows, selection.expandedCategories]);

  const visibleItemCount = useMemo(
    () => sections.reduce((sum, section) => sum + section.itemCount, 0),
    [sections],
  );

  useFocusEffect(
    useCallback(() => {
      selection.hydrate();
    }, [selection.hydrate]),
  );

  const RootContainer = embedded ? View : SafeAreaView;

  if (selection.loading) {
    return (
      <RootContainer style={styles.safeArea}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading utensils...</Text>
        </View>
      </RootContainer>
    );
  }

  return (
    <RootContainer style={styles.safeArea}>
      <View style={[styles.container, embedded && styles.containerEmbedded]}>
        <View style={styles.headerWrap}>
          {showHero ? (
            <>
              <Text style={styles.title}>Utensils</Text>
              <Text style={styles.subtitle}>Browse the full utensil catalog by category.</Text>
            </>
          ) : null}
        </View>

        {selection.error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{selection.error}</Text>
          </View>
        ) : null}

        {visibleItemCount === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>No utensils available</Text>
            <Text style={styles.emptySubtitle}>Utensil catalog rows will appear here once available.</Text>
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => String(item.id)}
            stickySectionHeadersEnabled={false}
            contentContainerStyle={[styles.listContent, { paddingBottom: 24 + insets.bottom }]}
            showsVerticalScrollIndicator={false}
            renderSectionHeader={({ section }) => (
              <CollapsibleSection
                title={section.title}
                subtitle="Utensil catalog"
                icon={CATEGORY_ICONS[section.title] || '🍽️'}
                iconIsEmoji
                expanded={Boolean(selection.expandedCategories[section.title])}
                onToggle={() => selection.toggleCategory(section.title)}
                countLabel={`${section.itemCount}`}
                style={styles.groupSection}
              />
            )}
            renderItem={({ item }) => (
              <SelectedCatalogItemCard
                title={item?.name || 'Utensil'}
                subtitle={`${normalizeCategory(item)}${item?.note ? ` • ${item.note}` : ''}`}
                onPress={() =>
                  navigation?.navigate('UtensilDetail', {
                    itemId: item.id,
                    item,
                    readOnly: true,
                    fromCatalog: true,
                  })
                }
                topAction={{
                  iconName: 'open-outline',
                  onPress: () =>
                    navigation?.navigate('UtensilDetail', {
                      itemId: item.id,
                      item,
                      readOnly: true,
                      fromCatalog: true,
                    }),
                }}
              />
            )}
          />
        )}
      </View>
    </RootContainer>
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
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  containerEmbedded: {
    paddingTop: 6,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    color: COLORS.muted,
    fontSize: 13,
  },
  headerWrap: {
    marginBottom: 8,
    gap: 10,
  },
  title: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: '700',
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 2,
  },
  errorCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,124,123,0.4)',
    backgroundColor: 'rgba(255,124,123,0.12)',
    padding: 12,
    marginBottom: 10,
  },
  errorText: {
    color: '#FFB4A8',
    fontSize: 14,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 36,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    color: COLORS.muted,
    fontSize: 20,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 25,
  },
  listContent: {
    paddingBottom: 28,
  },
  groupSection: {
    marginBottom: 8,
  },
});

export default FoodUtensilsScreen;
