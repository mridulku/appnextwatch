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

import COLORS from '../theme/colors';
import { fetchDirectorById, fetchDirectorCredits } from '../core/supabaseApi';

function groupCreditsByYear(credits) {
  return credits.reduce((acc, credit) => {
    const year = credit.movie?.year || 'Unknown';
    if (!acc[year]) acc[year] = [];
    acc[year].push(credit);
    return acc;
  }, {});
}

function DirectorDetailScreen({ route, navigation }) {
  const directorId = route.params?.directorId;
  const [director, setDirector] = useState(null);
  const [credits, setCredits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadDirector = async () => {
      setIsLoading(true);
      const [
        { data: directorData, error: directorError },
        { data: creditsData, error: creditsError },
      ] = await Promise.all([
        fetchDirectorById(directorId),
        fetchDirectorCredits(directorId),
      ]);

      if (!isMounted) return;

      if (directorError) {
        console.warn('Failed to load director.', directorError.message);
      }
      if (creditsError) {
        console.warn('Failed to load credits.', creditsError.message);
      }

      setDirector(directorData || null);
      setCredits(creditsData || []);
      setIsLoading(false);
    };

    if (directorId) {
      loadDirector();
    }

    return () => {
      isMounted = false;
    };
  }, [directorId]);

  const grouped = useMemo(() => groupCreditsByYear(credits), [credits]);
  const years = useMemo(
    () =>
      Object.keys(grouped)
        .sort((a, b) => Number(b) - Number(a)),
    [grouped],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={COLORS.accent} />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        ) : null}

        {!isLoading && !director ? (
          <Text style={styles.emptyText}>Director not found.</Text>
        ) : null}

        {director ? (
          <>
            <Text style={styles.title}>{director.name}</Text>
            {director.bio ? <Text style={styles.bio}>{director.bio}</Text> : null}

            <Text style={styles.sectionTitle}>Filmography</Text>
            {years.length === 0 ? (
              <Text style={styles.emptyText}>No credits yet.</Text>
            ) : null}
            {years.map((year) => (
              <View key={year} style={styles.yearGroup}>
                <Text style={styles.yearLabel}>{year}</Text>
                {grouped[year].map((credit, index) => (
                  <TouchableOpacity
                    key={`${credit.movie?.id || 'movie'}-${index}`}
                    style={styles.creditCard}
                    onPress={() =>
                      credit.movie
                        ? navigation.navigate('Movie', { movie: credit.movie })
                        : null
                    }
                  >
                    <Text style={styles.creditTitle}>{credit.movie?.title || 'Unknown'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </>
        ) : null}
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
    padding: 20,
    paddingBottom: 120,
    backgroundColor: COLORS.bg,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
  title: {
    color: COLORS.text,
    fontSize: 26,
    marginBottom: 8,
    fontFamily: Platform.select({ ios: 'Palatino', android: 'serif' }),
  },
  bio: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    marginBottom: 10,
    fontFamily: Platform.select({ ios: 'Palatino', android: 'serif' }),
  },
  yearGroup: {
    marginBottom: 16,
  },
  yearLabel: {
    color: COLORS.accent2,
    fontSize: 12,
    marginBottom: 8,
    letterSpacing: 1,
  },
  creditCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  creditTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontFamily: Platform.select({ ios: 'Palatino', android: 'serif' }),
  },
});

export default DirectorDetailScreen;
