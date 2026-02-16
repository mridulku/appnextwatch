import { StatusBar } from 'expo-status-bar';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useEffect, useState } from 'react';

import COLORS from '../theme/colors';
import { fetchMovies } from '../core/supabaseApi';
import { MOVIES } from '../data/catalog';

function normalizeMovies(list) {
  return list.map((movie) => ({
    ...movie,
    rating: movie.rating ? String(movie.rating) : '',
    color:
      Array.isArray(movie.color) && movie.color.length > 0
        ? movie.color
        : ['#23283A', '#0E0F14'],
  }));
}

function FilmsWatchedScreen({ navigation }) {
  const [movies, setMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadMovies = async () => {
      setIsLoading(true);
      const { data, error } = await fetchMovies();

      if (!isMounted) return;

      if (error || !data?.length) {
        if (error) {
          console.warn('Failed to load films watched.', error.message);
        }
        setMovies(normalizeMovies(MOVIES).slice(0, 6));
        setIsLoading(false);
        return;
      }

      setMovies(normalizeMovies(data).slice(0, 6));
      setIsLoading(false);
    };

    loadMovies();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Films Watched</Text>
        <Text style={styles.body}>
          A quick snapshot of recent watches and favorites.
        </Text>

        {isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={COLORS.accent} />
            <Text style={styles.loadingText}>Loading films...</Text>
          </View>
        ) : null}

        {movies.length === 0 && !isLoading ? (
          <Text style={styles.emptyText}>No films tracked yet.</Text>
        ) : null}

        {movies.map((movie) => (
          <TouchableOpacity
            key={movie.id}
            style={styles.card}
            onPress={() => navigation.navigate('Movie', { movie })}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{movie.title}</Text>
              <View style={styles.ratingPill}>
                <Text style={styles.ratingValue}>{movie.rating}</Text>
                <Text style={styles.ratingLabel}>IMDb</Text>
              </View>
            </View>
            <Text style={styles.cardMeta}>
              {movie.year} • {movie.genre} • {movie.minutes}
            </Text>
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
    paddingBottom: 120,
    backgroundColor: COLORS.bg,
  },
  title: {
    color: COLORS.text,
    fontSize: 26,
    marginBottom: 8,
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
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 18,
    flex: 1,
    marginRight: 12,
    fontFamily: Platform.select({ ios: 'Palatino', android: 'serif' }),
  },
  ratingPill: {
    backgroundColor: 'rgba(245,201,106,0.2)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  ratingValue: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  ratingLabel: {
    color: COLORS.muted,
    fontSize: 10,
  },
  cardMeta: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 8,
  },
});

export default FilmsWatchedScreen;
