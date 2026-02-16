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
import { fetchAwardShows } from '../core/supabaseApi';

function AwardsHomeScreen({ navigation }) {
  const [shows, setShows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadShows = async () => {
      setIsLoading(true);
      const { data, error } = await fetchAwardShows();

      if (!isMounted) return;

      if (error) {
        console.warn('Failed to load award shows.', error.message);
        setIsLoading(false);
        return;
      }

      setShows(data ?? []);
      setIsLoading(false);
    };

    loadShows();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Awards</Text>
        <Text style={styles.subtitle}>
          Explore award shows, years, and category winners.
        </Text>

        {isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={COLORS.accent} />
            <Text style={styles.loadingText}>Loading award shows...</Text>
          </View>
        ) : null}

        {!isLoading && shows.length === 0 ? (
          <Text style={styles.emptyText}>No award shows yet.</Text>
        ) : null}

        {shows.map((show) => (
          <TouchableOpacity
            key={show.id}
            style={styles.card}
            onPress={() => navigation.navigate('AwardYears', { show })}
          >
            <Text style={styles.cardTitle}>{show.name}</Text>
            <Text style={styles.cardMeta}>Browse years and categories</Text>
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
    marginBottom: 4,
    fontFamily: Platform.select({ ios: 'Palatino', android: 'serif' }),
  },
  cardMeta: {
    color: COLORS.muted,
    fontSize: 12,
  },
});

export default AwardsHomeScreen;
