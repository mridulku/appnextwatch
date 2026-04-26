import { useMemo, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

import COLORS from '../../../theme/colors';
import UI_TOKENS from '../../../ui/tokens';
import SegmentedControl from '../../../ui/components/SegmentedControl';
import FoodInventoryScreen from '../../wellness/food/FoodInventoryScreen';
import FoodUtensilsScreen from '../../wellness/food/FoodUtensilsScreen';
import CookHomeScreen from '../../wellness/food/CookHomeScreen';

const FOOD_TABS = [
  { key: 'inventory', label: 'Inventory', icon: '🥕' },
  { key: 'dishes', label: 'Dishes', icon: '🍲' },
  { key: 'utensils', label: 'Utensils', icon: '🍽️' },
];

function normalizeFoodSegment(value) {
  if (value === 'utensils' || value === 'Utensils') return 'utensils';
  if (value === 'dishes' || value === 'Dishes') return 'dishes';
  return 'inventory';
}

export default function FoodSettingsScreen({ navigation, route }) {
  const [segment, setSegment] = useState(normalizeFoodSegment(route.params?.initialSubsegment));

  const content = useMemo(() => {
    if (segment === 'utensils') {
      return <FoodUtensilsScreen navigation={navigation} embedded showHero={false} />;
    }
    if (segment === 'dishes') {
      return <CookHomeScreen navigation={navigation} embedded showHeader={false} />;
    }
    return <FoodInventoryScreen navigation={navigation} embedded showHero={false} />;
  }, [segment, navigation]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.topCard}>
          <Text style={styles.title}>Food settings</Text>
          <SegmentedControl
            items={FOOD_TABS}
            selectedIndex={FOOD_TABS.findIndex((item) => item.key === segment)}
            onChange={(_, item) => setSegment(item.key)}
          />
        </View>
        <View style={styles.contentWrap}>{content}</View>
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
});
