import { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

import CookHomeScreen from './CookHomeScreen';
import FoodChatScreen from './FoodChatScreen';
import FoodInventoryScreen from './FoodInventoryScreen';
import FoodMyStatsScreen from './FoodMyStatsScreen';
import FoodUtensilsScreen from './FoodUtensilsScreen';
import SegmentedControl from '../../../ui/components/SegmentedControl';
import COLORS from '../../../theme/colors';
import UI_TOKENS from '../../../ui/tokens';

const PRIMARY_TABS = [
  { key: 'chat', label: 'Chat', icon: '💬' },
  { key: 'recipes', label: 'Sessions', icon: '🍳' },
  { key: 'plan', label: 'Plan', icon: '📊' },
  { key: 'library', label: 'Library', icon: '📚' },
];

const LIBRARY_TABS = [
  { key: 'inventory', label: 'Inventory', icon: '🥕' },
  { key: 'utensils', label: 'Utensils', icon: '🍽️' },
];

function normalizePrimarySegment(value) {
  if (value === 'chat' || value === 'Chat') return 'chat';
  if (value === 'recipes' || value === 'Recipes') return 'recipes';
  if (value === 'plan' || value === 'Plan' || value === 'my_stats' || value === 'My Stats') return 'plan';
  if (value === 'library' || value === 'Library' || value === 'Inventory' || value === 'Utensils') return 'library';
  return 'chat';
}

function normalizeLibrarySegment(value) {
  if (value === 'utensils' || value === 'Utensils') return 'utensils';
  return 'inventory';
}

function FoodHubScreen({ navigation, route }) {
  const [segment, setSegment] = useState(normalizePrimarySegment(route.params?.initialSegment));
  const [librarySegment, setLibrarySegment] = useState(normalizeLibrarySegment(route.params?.initialSegment));

  useEffect(() => {
    const incoming = route.params?.initialSegment;
    setSegment(normalizePrimarySegment(incoming));
    if (incoming) setLibrarySegment(normalizeLibrarySegment(incoming));
  }, [route.params?.initialSegment]);

  const libraryContent = useMemo(() => {
    if (librarySegment === 'utensils') {
      return <FoodUtensilsScreen navigation={navigation} embedded showHero={false} />;
    }
    return <FoodInventoryScreen navigation={navigation} embedded showHero={false} />;
  }, [librarySegment, navigation]);

  const renderContent = () => {
    if (segment === 'chat') {
      return <FoodChatScreen />;
    }

    if (segment === 'recipes') {
      return <CookHomeScreen navigation={navigation} embedded showHeader={false} />;
    }

    if (segment === 'plan') {
      return <FoodMyStatsScreen navigation={navigation} />;
    }

    return (
      <View style={styles.libraryWrap}>
        <View style={styles.libraryTabsWrap}>
          <SegmentedControl
            items={LIBRARY_TABS}
            selectedIndex={LIBRARY_TABS.findIndex((item) => item.key === librarySegment)}
            onChange={(_, item) => setLibrarySegment(item.key)}
            variant="secondary"
          />
        </View>
        <View style={styles.libraryContentWrap}>{libraryContent}</View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.topCard}>
          <Text style={styles.title}>Food</Text>

          <SegmentedControl
            items={PRIMARY_TABS}
            selectedIndex={PRIMARY_TABS.findIndex((item) => item.key === segment)}
            onChange={(_, item) => setSegment(item.key)}
          />
        </View>

        <View style={styles.contentWrap}>{renderContent()}</View>
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
  topCard: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(162,167,179,0.12)',
    backgroundColor: COLORS.bg,
  },
  title: {
    color: COLORS.text,
    fontSize: 29,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  contentWrap: {
    flex: 1,
    paddingBottom: UI_TOKENS.spacing.xs,
  },
  libraryWrap: {
    flex: 1,
  },
  libraryTabsWrap: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 2,
    backgroundColor: COLORS.bg,
  },
  libraryContentWrap: {
    flex: 1,
  },
});

export default FoodHubScreen;
