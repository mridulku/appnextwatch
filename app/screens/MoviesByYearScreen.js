import { StatusBar } from 'expo-status-bar';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Platform,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useEffect, useState } from 'react';

import COLORS from '../theme/colors';
import { fetchMovies } from '../core/supabaseApi';
import { MOVIES } from '../data/catalog';

function MoviesByYearScreen({ navigation }) {
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
          console.warn('Failed to load movies from Supabase.', error.message);
        }
        setMovies(MOVIES);
        setIsLoading(false);
        return;
      }

      const normalized = data.map((movie) => ({
        ...movie,
        rating: movie.rating ? String(movie.rating) : '',
        color:
          Array.isArray(movie.color) && movie.color.length > 0
            ? movie.color
            : ['#23283A', '#0E0F14'],
      }));

      setMovies(normalized);
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
        <Text style={styles.title}>Movies</Text>
        <Text style={styles.body}>
          Browse every film from your database. Tap a title to see the full profile.
        </Text>

        {isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={COLORS.accent} />
            <Text style={styles.loadingText}>Loading movies...</Text>
          </View>
        ) : null}

        {movies.length === 0 && !isLoading ? (
          <Text style={styles.emptyText}>No movies yet. Add some in Supabase.</Text>
        ) : null}

        {movies.map((movie) => (
          <TouchableOpacity
            key={movie.id}
            style={styles.card}
            onPress={() => navigation.navigate('Movie', { movie })}
            activeOpacity={0.9}
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
            {movie.overview ? (
              <Text style={styles.cardOverview} numberOfLines={2}>
                {movie.overview}
              </Text>
            ) : null}
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
  cardOverview: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 10,
    lineHeight: 18,
  },
});

export default MoviesByYearScreen;
