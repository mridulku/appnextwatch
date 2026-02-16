import { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';

import COLORS from '../../../theme/colors';
import { fetchAwardCategoriesForYear } from '../../../core/api/supabaseApi';

const CATEGORY_ORDER = [
  'Best Picture',
  'Best Director',
  'Best Actor',
  'Best Actress',
  'Best Supporting Actor',
  'Best Supporting Actress',
];

function AwardCategoriesScreen({ navigation, route }) {
  const year = route.params?.year;
  const show = route.params?.show;
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadCategories = async () => {
      setIsLoading(true);
      const { data, error } = await fetchAwardCategoriesForYear(year?.id);

      if (!isMounted) return;

      if (error) {
        console.warn('Failed to load award categories.', error.message);
        setIsLoading(false);
        return;
      }

      const flattened = (data ?? [])
        .map((row) => row.award_category)
        .filter(Boolean);
      const unique = new Map(flattened.map((item) => [item.id, item]));
      setCategories(Array.from(unique.values()));
      setIsLoading(false);
    };

    if (year?.id) {
      loadCategories();
    }

    return () => {
      isMounted = false;
    };
  }, [year?.id]);

  const sortedCategories = useMemo(() => {
    if (!categories.length) return [];
    return [...categories].sort((a, b) => {
      const aIndex = CATEGORY_ORDER.indexOf(a.name);
      const bIndex = CATEGORY_ORDER.indexOf(b.name);
      if (aIndex === -1 && bIndex === -1) {
        return a.name.localeCompare(b.name);
      }
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  }, [categories]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>
          {show?.name || 'Awards'} {year?.year ? `• ${year.year}` : ''}
        </Text>
        <Text style={styles.subtitle}>Select a category to view nominees.</Text>

        {isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={COLORS.accent} />
            <Text style={styles.loadingText}>Loading categories...</Text>
          </View>
        ) : null}

        {!isLoading && sortedCategories.length === 0 ? (
          <Text style={styles.emptyText}>No categories found yet.</Text>
        ) : null}

        {sortedCategories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={styles.card}
            onPress={() =>
              navigation.navigate('AwardNominees', { show, year, category })
            }
          >
            <Text style={styles.cardTitle}>{category.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    padding: 24,
    backgroundColor: COLORS.bg,
    flexGrow: 1,
  },
  title: {
    color: COLORS.text,
    fontSize: 24,
    marginBottom: 8,
    fontFamily: Platform.select({ ios: 'Palatino', android: 'serif' }),
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingText: {
    color: COLORS.muted,
    fontSize: 12,
    marginLeft: 10,
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 13,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontFamily: Platform.select({ ios: 'Palatino', android: 'serif' }),
  },
});

export default AwardCategoriesScreen;
