import { StatusBar } from 'expo-status-bar';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useEffect, useState } from 'react';

import COLORS from '../theme/colors';
import { fetchAwards } from '../core/supabaseApi';

function AwardsScreen() {
  const [awards, setAwards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadAwards = async () => {
      setIsLoading(true);
      const { data, error } = await fetchAwards();

      if (!isMounted) return;

      if (error) {
        console.warn('Failed to load awards from Supabase.', error.message);
        setIsLoading(false);
        return;
      }

      setAwards(data ?? []);
      setIsLoading(false);
    };

    loadAwards();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Awards</Text>
        <Text style={styles.body}>
          Track Oscar winners, nominees, and every spotlight category you care about.
        </Text>

        {isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={COLORS.accent} />
            <Text style={styles.loadingText}>Loading awards...</Text>
          </View>
        ) : null}

        {awards.length === 0 && !isLoading ? (
          <Text style={styles.emptyText}>No awards yet. Add your first entry in Supabase.</Text>
        ) : null}

        {awards.map((award) => (
          <View key={award.id} style={styles.card}>
            <Text style={styles.cardTitle}>
              {award.year} • {award.category}
            </Text>
            <Text style={styles.cardWinner}>
              Winner: {award.winner}
              {award.movie?.title ? ` (${award.movie.title})` : ''}
            </Text>
          </View>
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
    marginBottom: 12,
    fontFamily: Platform.select({ ios: 'Palatino', android: 'serif' }),
  },
  body: {
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
    marginTop: 8,
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
  cardWinner: {
    color: COLORS.muted,
    fontSize: 13,
  },
});

export default AwardsScreen;
