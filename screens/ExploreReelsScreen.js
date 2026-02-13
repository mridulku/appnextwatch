import { StatusBar } from 'expo-status-bar';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Platform,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useEffect, useMemo, useState } from 'react';

import COLORS from '../theme/colors';
import { fetchMovies } from '../core/supabaseApi';
import { MOVIES } from '../data/catalog';

function formatTeaser(movie) {
  if (!movie?.overview) return 'A story that demands to be uncovered. Tap to reveal.';
  return movie.overview;
}

function ExploreReelsScreen({ navigation }) {
  const { height } = useWindowDimensions();
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
            : ['#1C2234', '#0D0F16'],
      }));

      setMovies(normalized);
      setIsLoading(false);
    };

    loadMovies();

    return () => {
      isMounted = false;
    };
  }, []);

  const itemHeight = useMemo(() => Math.max(height - 110, 520), [height]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading reels...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <FlatList
        data={movies}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={itemHeight}
        snapToAlignment="start"
        renderItem={({ item }) => (
          <View style={[styles.card, { height: itemHeight }]}>
            <View style={styles.mysteryBadge}>
              <Text style={styles.mysteryText}>Mystery Pick</Text>
            </View>
            <Text style={styles.headline}>Can you guess the movie?</Text>
            <Text style={styles.teaser} numberOfLines={10}>
              {formatTeaser(item)}
            </Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaPill}>{item.genre || 'Film'}</Text>
              {item.year ? <Text style={styles.metaPill}>{item.year}</Text> : null}
            </View>
            <TouchableOpacity
              style={styles.cta}
              onPress={() => navigation.navigate('Movie', { movie: item })}
              activeOpacity={0.9}
            >
              <Text style={styles.ctaText}>See movie in detail</Text>
            </TouchableOpacity>
            <Text style={styles.hint}>Swipe up for the next story.</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 10,
  },
  card: {
    padding: 28,
    justifyContent: 'center',
  },
  mysteryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#1E2435',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 18,
  },
  mysteryText: {
    color: COLORS.accent,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  headline: {
    color: COLORS.text,
    fontSize: 28,
    marginBottom: 16,
    fontFamily: Platform.select({ ios: 'Palatino', android: 'serif' }),
  },
  teaser: {
    color: COLORS.muted,
    fontSize: 16,
    lineHeight: 24,
  },
  metaRow: {
    flexDirection: 'row',
    marginTop: 16,
  },
  metaPill: {
    color: COLORS.text,
    fontSize: 12,
    backgroundColor: '#1C2234',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginRight: 10,
  },
  cta: {
    marginTop: 24,
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  ctaText: {
    color: COLORS.bg,
    fontWeight: '600',
    fontSize: 16,
  },
  hint: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 16,
    textAlign: 'center',
  },
});

export default ExploreReelsScreen;
