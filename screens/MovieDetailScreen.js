import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
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

function MovieDetailScreen({ route }) {
  const movie = route.params?.movie ?? MOVIES[0];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.screen}>
        <LinearGradient colors={movie.color} style={styles.detailHero}>
          <Text style={styles.detailTitle}>{movie.title}</Text>
          <Text style={styles.detailMeta}>
            {movie.year} • {movie.genre} • {movie.minutes}
          </Text>
          <View style={styles.detailRating}>
            <Text style={styles.detailRatingValue}>{movie.rating}</Text>
            <Text style={styles.detailRatingLabel}>IMDb rating</Text>
          </View>
        </LinearGradient>
        <Text style={styles.detailSectionTitle}>Overview</Text>
        <Text style={styles.detailBody}>
          Two men form an unlikely bond inside Shawshank State Penitentiary. Years turn into
          decades as they hold on to dignity, redemption, and the quiet power of hope.
        </Text>
        <Text style={styles.detailSectionTitle}>Why critics love it</Text>
        <View style={styles.detailListItem}>
          <Text style={styles.detailBullet}>•</Text>
          <Text style={styles.detailListText}>A story about resilience without cliches.</Text>
        </View>
        <View style={styles.detailListItem}>
          <Text style={styles.detailBullet}>•</Text>
          <Text style={styles.detailListText}>A masterclass in quiet character work.</Text>
        </View>
        <View style={styles.detailListItem}>
          <Text style={styles.detailBullet}>•</Text>
          <Text style={styles.detailListText}>Every frame feels deliberate and humane.</Text>
        </View>
        <TouchableOpacity style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Add to taste shelf</Text>
        </TouchableOpacity>
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
  detailHero: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
  },
  detailTitle: {
    color: COLORS.text,
    fontSize: 24,
    fontFamily: Platform.select({ ios: 'Palatino', android: 'serif' }),
  },
  detailMeta: {
    color: COLORS.muted,
    marginTop: 6,
  },
  detailRating: {
    marginTop: 14,
    backgroundColor: 'rgba(245,201,106,0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  detailRatingValue: {
    color: COLORS.accent,
    fontSize: 18,
    fontWeight: '600',
  },
  detailRatingLabel: {
    color: COLORS.muted,
    fontSize: 11,
  },
  detailSectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    marginTop: 16,
    marginBottom: 8,
    fontFamily: Platform.select({ ios: 'Palatino', android: 'serif' }),
  },
  detailBody: {
    color: COLORS.muted,
    lineHeight: 22,
  },
  detailListItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  detailBullet: {
    color: COLORS.accent2,
    marginRight: 8,
  },
  detailListText: {
    color: COLORS.muted,
    flex: 1,
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

export default MovieDetailScreen;
