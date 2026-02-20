import { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import CookHomeScreen from './CookHomeScreen';
import FoodInventoryScreen from './FoodInventoryScreen';
import FoodMyStatsScreen from './FoodMyStatsScreen';
import FoodUtensilsScreen from './FoodUtensilsScreen';
import COLORS from '../../../theme/colors';

const SEGMENTS = ['Inventory', 'Recipes', 'Utensils', 'My Stats'];
const SEGMENT_EMOJI = {
  Inventory: '🥕',
  Recipes: '🍳',
  Utensils: '🍽️',
  'My Stats': '📊',
};

function normalizeSegment(value) {
  if (value === 'Recipes') return 'Recipes';
  if (value === 'Utensils') return 'Utensils';
  if (value === 'My Stats') return 'My Stats';
  return 'Inventory';
}

function FoodHubScreen({ navigation, route }) {
  const [segment, setSegment] = useState(normalizeSegment(route.params?.initialSegment));

  useEffect(() => {
    setSegment(normalizeSegment(route.params?.initialSegment));
  }, [route.params?.initialSegment]);

  const renderContent = () => {
    if (segment === 'Recipes') {
      return <CookHomeScreen navigation={navigation} embedded showHeader={false} />;
    }

    if (segment === 'Utensils') {
      return <FoodUtensilsScreen navigation={navigation} embedded showHero={false} />;
    }

    if (segment === 'My Stats') {
      return <FoodMyStatsScreen navigation={navigation} />;
    }

    return <FoodInventoryScreen navigation={navigation} embedded showHero={false} />;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.topCard}>
          <Text style={styles.title}>Food</Text>

          <View style={styles.segmentWrap}>
            {SEGMENTS.map((item) => {
              const active = segment === item;
              return (
                <TouchableOpacity
                  key={item}
                  style={[styles.segmentButton, active && styles.segmentButtonActive]}
                  activeOpacity={0.9}
                  onPress={() => setSegment(item)}
                >
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                    {SEGMENT_EMOJI[item]} {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
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
    paddingTop: 8,
    paddingBottom: 10,
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
  segmentWrap: {
    marginTop: 10,
    borderRadius: 999,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: COLORS.card,
    flexDirection: 'row',
    gap: 6,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 8,
    alignItems: 'center',
  },
  segmentButtonActive: {
    backgroundColor: 'rgba(245,201,106,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(245,201,106,0.48)',
  },
  segmentText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: COLORS.accent,
  },
  contentWrap: {
    flex: 1,
  },
});

export default FoodHubScreen;
