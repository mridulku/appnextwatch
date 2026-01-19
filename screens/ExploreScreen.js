import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  SafeAreaView,
} from 'react-native';

import COLORS from '../theme/colors';
import { MOVIES } from '../data/catalog';

function ExploreScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.screen}>
        <View style={styles.hero}>
          <LinearGradient
            colors={['#23283A', '#0E0F14']}
            style={styles.heroGradient}
          />
          <Text style={styles.heroEyebrow}>MOVIE TASTE DISCOVERY</Text>
          <Text style={styles.heroTitle}>Find films that match your mood.</Text>
          <Text style={styles.heroSubtitle}>
            Curated by critics, shaped by your taste.
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top Picks</Text>
          <Text style={styles.sectionAction}>See all</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {MOVIES.map((movie) => (
            <TouchableOpacity
              key={movie.id}
              style={styles.movieCard}
              onPress={() => navigation.navigate('Movie', { movie })}
              activeOpacity={0.9}
            >
              <LinearGradient colors={movie.color} style={styles.movieGradient}>
                <View style={styles.movieBadge}>
                  <Text style={styles.movieBadgeText}>{movie.rating}</Text>
                  <Text style={styles.movieBadgeLabel}>IMDb</Text>
                </View>
                <Text style={styles.movieTitle}>{movie.title}</Text>
                <Text style={styles.movieMeta}>
                  {movie.year} • {movie.genre} • {movie.minutes}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Critic Spotlight</Text>
          <Text style={styles.sectionAction}>Listen</Text>
        </View>

        <View style={styles.spotlightCard}>
          <View style={styles.spotlightTag}>
            <Text style={styles.spotlightTagText}>NEW</Text>
          </View>
          <Text style={styles.spotlightTitle}>The Quiet Power of Shawshank</Text>
          <Text style={styles.spotlightMeta}>12 min read • by E. DuPont</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Movie', { movie: MOVIES[0] })}
          >
            <Text style={styles.primaryButtonText}>Open Review</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  screen: {
    padding: 20,
    paddingBottom: 120,
    backgroundColor: COLORS.bg,
  },
  hero: {
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden',
    marginBottom: 24,
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
    fontSize: 26,
    marginTop: 8,
    fontFamily: Platform.select({ ios: 'Palatino', android: 'serif' }),
  },
  heroSubtitle: {
    color: COLORS.muted,
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 12,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontFamily: Platform.select({ ios: 'Palatino', android: 'serif' }),
  },
  sectionAction: {
    color: COLORS.muted,
    fontSize: 13,
  },
  movieCard: {
    width: 260,
    marginRight: 16,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: COLORS.card,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  movieGradient: {
    padding: 16,
    height: 190,
    justifyContent: 'space-between',
  },
  movieBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(245,201,106,0.2)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  movieBadgeText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  movieBadgeLabel: {
    color: COLORS.muted,
    fontSize: 10,
  },
  movieTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontFamily: Platform.select({ ios: 'Palatino', android: 'serif' }),
  },
  movieMeta: {
    color: COLORS.muted,
    fontSize: 12,
  },
  spotlightCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 18,
    marginTop: 8,
  },
  spotlightTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(90,209,232,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  spotlightTagText: {
    color: COLORS.accent2,
    fontSize: 10,
  },
  spotlightTitle: {
    color: COLORS.text,
    fontSize: 18,
    marginTop: 12,
    fontFamily: Platform.select({ ios: 'Palatino', android: 'serif' }),
  },
  spotlightMeta: {
    color: COLORS.muted,
    marginTop: 6,
    fontSize: 12,
  },
  primaryButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryButtonText: {
    color: COLORS.bg,
    fontWeight: '600',
  },
});

export default ExploreScreen;
