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

import COLORS from '../../../theme/colors';
import { fetchAwardEntries } from '../../../core/api/supabaseApi';

function AwardNomineesScreen({ navigation, route }) {
  const year = route.params?.year;
  const category = route.params?.category;
  const show = route.params?.show;
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadEntries = async () => {
      setIsLoading(true);
      const { data, error } = await fetchAwardEntries(year?.id, category?.id);

      if (!isMounted) return;

      if (error) {
        console.warn('Failed to load award entries.', error.message);
        setIsLoading(false);
        return;
      }

      setEntries(data ?? []);
      setIsLoading(false);
    };

    if (year?.id && category?.id) {
      loadEntries();
    }

    return () => {
      isMounted = false;
    };
  }, [year?.id, category?.id]);

  const handleNavigatePerson = (entry) => {
    if (entry.actor) {
      navigation.navigate('Actors', {
        screen: 'ActorDetail',
        params: { actorId: entry.actor.id },
      });
      return;
    }
    if (entry.director) {
      navigation.navigate('Actors', {
        screen: 'DirectorDetail',
        params: { directorId: entry.director.id },
      });
    }
  };

  const handleNavigateMovie = (entry) => {
    if (entry.movie) {
      navigation.navigate('Movie', { movie: entry.movie });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{category?.name || 'Category'}</Text>
        <Text style={styles.subtitle}>
          {show?.name || 'Awards'}
          {year?.year ? ` • ${year.year}` : ''}
        </Text>

        {isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={COLORS.accent} />
            <Text style={styles.loadingText}>Loading nominees...</Text>
          </View>
        ) : null}

        {!isLoading && entries.length === 0 ? (
          <Text style={styles.emptyText}>No nominees found yet.</Text>
        ) : null}

        {entries.map((entry) => {
          const subtitleParts = [];
          if (entry.movie?.year) subtitleParts.push(`Film • ${entry.movie.year}`);
          if (entry.role_name) subtitleParts.push(`Role • ${entry.role_name}`);
          const subtitle = subtitleParts.length ? subtitleParts.join(' · ') : null;

          const personLabel = entry.director?.name || entry.actor?.name || null;
          const movieLabel = entry.movie?.title || null;

          return (
            <View
              key={entry.id}
              style={[styles.card, entry.is_winner && styles.winnerCard]}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{entry.is_winner ? 'Winner' : 'Nominee'}</Text>
                {entry.is_winner ? <Text style={styles.winnerBadge}>Winner</Text> : null}
              </View>

              {personLabel ? (
                <TouchableOpacity
                  style={styles.pill}
                  onPress={() => handleNavigatePerson(entry)}
                  disabled={!entry.actor && !entry.director}
                >
                  <Text style={styles.pillLabel}>
                    {entry.director ? 'Director' : 'Actor'}
                  </Text>
                  <Text style={styles.pillValue}>{personLabel}</Text>
                </TouchableOpacity>
              ) : null}

              {movieLabel ? (
                <TouchableOpacity
                  style={styles.pill}
                  onPress={() => handleNavigateMovie(entry)}
                  disabled={!entry.movie}
                >
                  <Text style={styles.pillLabel}>Movie</Text>
                  <Text style={styles.pillValue}>{movieLabel}</Text>
                </TouchableOpacity>
              ) : null}

              {subtitle ? <Text style={styles.cardMeta}>{subtitle}</Text> : null}
            </View>
          );
        })}
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
    marginBottom: 4,
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
  winnerCard: {
    borderWidth: 1,
    borderColor: 'rgba(245,201,106,0.4)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 14,
    flex: 1,
    marginRight: 12,
    fontFamily: Platform.select({ ios: 'Palatino', android: 'serif' }),
  },
  winnerBadge: {
    color: COLORS.accent,
    fontSize: 11,
    letterSpacing: 1,
  },
  cardMeta: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 6,
  },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
  },
  pillLabel: {
    color: COLORS.muted,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  pillValue: {
    color: COLORS.text,
    fontSize: 14,
    marginTop: 4,
    fontFamily: Platform.select({ ios: 'Palatino', android: 'serif' }),
  },
});

export default AwardNomineesScreen;
