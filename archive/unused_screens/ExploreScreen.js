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
  ActivityIndicator,
} from 'react-native';

import COLORS from '../theme/colors';
import { fetchActors, fetchDirectors } from '../core/supabaseApi';

import { useEffect, useState } from 'react';

function ExploreScreen({ navigation }) {
  const [actors, setActors] = useState([]);
  const [actresses, setActresses] = useState([]);
  const [directors, setDirectors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadTalent = async () => {
      setIsLoading(true);
      const [actorsRes, actressesRes, directorsRes] = await Promise.all([
        fetchActors({ roleType: 'actor', limit: 4 }),
        fetchActors({ roleType: 'actress', limit: 4 }),
        fetchDirectors(4),
      ]);

      if (!isMounted) return;

      if (actorsRes.error) {
        console.warn('Failed to load actors.', actorsRes.error.message);
      }
      if (actressesRes.error) {
        console.warn('Failed to load actresses.', actressesRes.error.message);
      }
      if (directorsRes.error) {
        console.warn('Failed to load directors.', directorsRes.error.message);
      }

      setActors(actorsRes.data ?? []);
      setActresses(actressesRes.data ?? []);
      setDirectors(directorsRes.data ?? []);
      setIsLoading(false);
    };

    loadTalent();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.screen}>
        <View style={styles.hero}>
          <LinearGradient
            colors={['#23283A', '#0E0F14']}
            style={styles.heroGradient}
          />
          <Text style={styles.heroEyebrow}>APPREEPE TALENT RADAR</Text>
          <Text style={styles.heroTitle}>Explore the people shaping cinema.</Text>
          <Text style={styles.heroSubtitle}>
            Discover actors, actresses, directors, and screenwriters in one place.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={COLORS.accent} />
            <Text style={styles.loadingText}>Loading talent...</Text>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Actors</Text>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('ActorList', { title: 'Actors', roleType: 'actor' })
            }
          >
            <Text style={styles.sectionAction}>Browse all</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.talentRow}>
          {actors.map((person) => (
            <TouchableOpacity
              key={person.id}
              style={styles.talentCard}
              onPress={() => navigation.navigate('ActorDetail', { actorId: person.id })}
            >
              <Text style={styles.talentName}>{person.name}</Text>
              <Text style={styles.talentMeta}>Actor</Text>
            </TouchableOpacity>
          ))}
          {!isLoading && actors.length === 0 ? (
            <Text style={styles.emptyText}>No actors yet.</Text>
          ) : null}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Actresses</Text>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('ActorList', { title: 'Actresses', roleType: 'actress' })
            }
          >
            <Text style={styles.sectionAction}>Browse all</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.talentRow}>
          {actresses.map((person) => (
            <TouchableOpacity
              key={person.id}
              style={styles.talentCard}
              onPress={() => navigation.navigate('ActorDetail', { actorId: person.id })}
            >
              <Text style={styles.talentName}>{person.name}</Text>
              <Text style={styles.talentMeta}>Actress</Text>
            </TouchableOpacity>
          ))}
          {!isLoading && actresses.length === 0 ? (
            <Text style={styles.emptyText}>No actresses yet.</Text>
          ) : null}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Directors</Text>
          <TouchableOpacity onPress={() => navigation.navigate('DirectorList')}>
            <Text style={styles.sectionAction}>Browse all</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.talentRow}>
          {directors.map((person) => (
            <TouchableOpacity
              key={person.id}
              style={styles.talentCard}
              onPress={() => navigation.navigate('DirectorDetail', { directorId: person.id })}
            >
              <Text style={styles.talentName}>{person.name}</Text>
              <Text style={styles.talentMeta}>Director</Text>
            </TouchableOpacity>
          ))}
          {!isLoading && directors.length === 0 ? (
            <Text style={styles.emptyText}>No directors yet.</Text>
          ) : null}
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
  talentRow: {
    marginBottom: 16,
  },
  talentCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
  },
  talentName: {
    color: COLORS.text,
    fontSize: 16,
    marginBottom: 6,
    fontFamily: Platform.select({ ios: 'Palatino', android: 'serif' }),
  },
  talentMeta: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 12,
  },
});

export default ExploreScreen;
