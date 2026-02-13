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

function ListsHomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <LinearGradient
            colors={['#23283A', '#0E0F14']}
            style={styles.heroGradient}
          />
          <Text style={styles.heroEyebrow}>LISTS</Text>
          <Text style={styles.heroTitle}>Curated tunnels into cinema.</Text>
          <Text style={styles.heroSubtitle}>
            Hand-made mixes that spark specific moods, questions, and cravings.
          </Text>
        </View>

        {LIST_COLLECTIONS.map((list) => (
          <TouchableOpacity
            key={list.id}
            style={styles.card}
            onPress={() =>
              navigation.navigate('ListDetail', {
                listId: list.id,
                title: list.title,
              })
            }
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={list.colors ?? ['#1F2431', '#0E0F14']}
              style={styles.cardGlow}
            />
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{list.title}</Text>
              <Text style={styles.cardBody} numberOfLines={2}>
                {list.description}
              </Text>
              <View style={styles.cardMetaRow}>
                <Text style={styles.cardMeta}>{list.movieIds.length} films</Text>
                <Text style={styles.cardMeta}>Curated</Text>
              </View>
            </View>
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
  card: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.card,
  },
  cardGlow: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.9,
  },
  cardContent: {
    position: 'relative',
    zIndex: 1,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 17,
    marginBottom: 6,
    fontFamily: Platform.select({ ios: 'Palatino', android: 'serif' }),
  },
  cardBody: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  cardMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  cardMeta: {
    color: COLORS.muted,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});

export default ListsHomeScreen;
