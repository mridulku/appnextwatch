import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';

import COLORS from '../theme/colors';
import LIST_COLLECTIONS from '../data/lists';
import { MOVIES } from '../data/catalog';

function ListDetailScreen({ route, navigation }) {
  const listId = route.params?.listId;
  const list =
    LIST_COLLECTIONS.find((item) => item.id === listId) ?? LIST_COLLECTIONS[0];
  const movies = (list.movieIds || [])
    .map((id) => MOVIES.find((movie) => movie.id === id))
    .filter(Boolean);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <LinearGradient
            colors={list.colors ?? ['#23283A', '#0E0F14']}
            style={styles.heroGradient}
          />
          <Text style={styles.heroEyebrow}>LIST</Text>
          <Text style={styles.heroTitle}>{list.title}</Text>
          <Text style={styles.heroSubtitle}>{list.description}</Text>
          <Text style={styles.heroMeta}>{movies.length} films</Text>
        </View>

        {movies.map((movie) => (
          <TouchableOpacity
            key={movie.id}
            style={styles.card}
            onPress={() => navigation.navigate('Movie', { movie })}
            activeOpacity={0.9}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{movie.title}</Text>
              <View style={styles.cardPill}>
                <Text style={styles.cardPillText}>{movie.year}</Text>
              </View>
            </View>
            <Text style={styles.cardMeta}>
              {movie.genre} • {movie.minutes}
            </Text>
            {movie.overview ? (
              <Text style={styles.cardBody} numberOfLines={2}>
                {movie.overview}
              </Text>
            ) : null}
          </TouchableOpacity>
        ))}

        {movies.length === 0 ? (
          <Text style={styles.emptyText}>No movies added to this list yet.</Text>
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
  hero: {
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden',
    marginBottom: 20,
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  heroEyebrow: {
    color: COLORS.accent2,
    letterSpacing: 2,
    fontSize: 11,
    fontFamily: Platform.select({ ios: 'Palatino', android: 'serif' }),
  },
  heroTitle: {
    color: COLORS.text,
    fontSize: 24,
    marginTop: 8,
    fontFamily: Platform.select({ ios: 'Palatino', android: 'serif' }),
  },
  heroSubtitle: {
    color: COLORS.muted,
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
  },
  heroMeta: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
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
  cardPill: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cardPillText: {
    color: COLORS.text,
    fontSize: 11,
  },
  cardMeta: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 8,
  },
  cardBody: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 10,
    lineHeight: 18,
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 12,
  },
});

export default ListDetailScreen;
