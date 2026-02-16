import { useEffect, useState } from 'react';
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

import COLORS from '../theme/colors';
import { fetchAwardYears } from '../core/supabaseApi';

function AwardYearsScreen({ navigation, route }) {
  const show = route.params?.show;
  const [years, setYears] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadYears = async () => {
      setIsLoading(true);
      const { data, error } = await fetchAwardYears(show?.id);

      if (!isMounted) return;

      if (error) {
        console.warn('Failed to load award years.', error.message);
        setIsLoading(false);
        return;
      }

      setYears(data ?? []);
      setIsLoading(false);
    };

    if (show?.id) {
      loadYears();
    }

    return () => {
      isMounted = false;
    };
  }, [show?.id]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{show?.name || 'Awards'}</Text>
        <Text style={styles.subtitle}>Select a year to explore categories.</Text>

        {isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={COLORS.accent} />
            <Text style={styles.loadingText}>Loading years...</Text>
          </View>
        ) : null}

        {!isLoading && years.length === 0 ? (
          <Text style={styles.emptyText}>No years found yet.</Text>
        ) : null}

        {years.map((year) => (
          <TouchableOpacity
            key={year.id}
            style={styles.card}
            onPress={() => navigation.navigate('AwardCategories', { show, year })}
          >
            <Text style={styles.cardTitle}>{year.year}</Text>
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
    fontSize: 26,
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

export default AwardYearsScreen;
