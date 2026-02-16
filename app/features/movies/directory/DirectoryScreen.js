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
  ImageBackground,
} from 'react-native';
import { useEffect, useState } from 'react';

import COLORS from '../../../theme/colors';
import {
  fetchActors,
  fetchAwardShows,
  fetchDirectors,
  fetchMovies,
  updateActorWikiImage,
  updateDirectorWikiImage,
  updateMovieWikiImage,
} from '../../../core/api/supabaseApi';
import { MOVIES } from '../../../data/movies/catalog';
import { extractWikiImage, fetchWikiSummary, getWikiTitleFromUrl } from '../../../core/api/wikiApi';

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

function DirectoryScreen({ navigation }) {
  const [movies, setMovies] = useState([]);
  const [actors, setActors] = useState([]);
  const [actresses, setActresses] = useState([]);
  const [directors, setDirectors] = useState([]);
  const [awardShows, setAwardShows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [imageCache, setImageCache] = useState({});

  useEffect(() => {
    let isMounted = true;

    const loadDirectory = async () => {
      setIsLoading(true);
      const [moviesRes, actorsRes, actressesRes, directorsRes, showsRes] =
        await Promise.all([
          fetchMovies(),
          fetchActors({ roleType: 'actor', limit: 4 }),
          fetchActors({ roleType: 'actress', limit: 4 }),
          fetchDirectors(4),
          fetchAwardShows(),
        ]);

      if (!isMounted) return;

      if (moviesRes.error || !moviesRes.data?.length) {
        if (moviesRes.error) {
          console.warn('Failed to load movies.', moviesRes.error.message);
        }
        setMovies(normalizeMovies(MOVIES).slice(0, 4));
      } else {
        setMovies(normalizeMovies(moviesRes.data).slice(0, 4));
      }

      if (actorsRes.error) {
        console.warn('Failed to load actors.', actorsRes.error.message);
      }
      if (actressesRes.error) {
        console.warn('Failed to load actresses.', actressesRes.error.message);
      }
      if (directorsRes.error) {
        console.warn('Failed to load directors.', directorsRes.error.message);
      }
      if (showsRes.error) {
        console.warn('Failed to load award shows.', showsRes.error.message);
      }

      setActors(actorsRes.data ?? []);
      setActresses(actressesRes.data ?? []);
      setDirectors(directorsRes.data ?? []);
      setAwardShows(showsRes.data ?? []);
      setIsLoading(false);
    };

    loadDirectory();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const hydrateImages = async () => {
      const tasks = [];

      const queueEntity = (entity, type) => {
        if (!entity?.id) return;
        if (entity.wiki_image_url) return;
        if (imageCache[`${type}:${entity.id}`]) return;
        const title =
          entity.wiki_title ||
          getWikiTitleFromUrl(entity.wiki_url) ||
          entity.name ||
          entity.title;
        if (!title) return;

        tasks.push(
          (async () => {
            const summary = await fetchWikiSummary(title);
            if (!isMounted || !summary) return;
            const imageUrl = extractWikiImage(summary);
            if (!imageUrl) return;
            const key = `${type}:${entity.id}`;
            setImageCache((prev) => ({ ...prev, [key]: imageUrl }));
            const payload = {
              wiki_image_url: imageUrl,
              wiki_page_id: summary.pageid ?? null,
            };
            if (type === 'movie') await updateMovieWikiImage(entity.id, payload);
            if (type === 'actor') await updateActorWikiImage(entity.id, payload);
            if (type === 'director') await updateDirectorWikiImage(entity.id, payload);
          })(),
        );
      };

      movies.forEach((item) => queueEntity(item, 'movie'));
      actors.forEach((item) => queueEntity(item, 'actor'));
      actresses.forEach((item) => queueEntity(item, 'actor'));
      directors.forEach((item) => queueEntity(item, 'director'));

      if (tasks.length) {
        await Promise.all(tasks);
      }
    };

    hydrateImages();

    return () => {
      isMounted = false;
    };
  }, [movies, actors, actresses, directors, imageCache]);

  const resolveImage = (type, item) =>
    item?.wiki_image_url || imageCache[`${type}:${item.id}`];

  const renderMediaCard = ({ title, subtitle, imageUrl, gradient, onPress }) => (
    <TouchableOpacity style={styles.mediaCard} onPress={onPress} activeOpacity={0.9}>
      {imageUrl ? (
        <ImageBackground source={{ uri: imageUrl }} style={styles.mediaImage}>
          <LinearGradient
            colors={['rgba(14,15,20,0.1)', 'rgba(14,15,20,0.9)']}
            style={styles.mediaOverlay}
          />
          <View style={styles.mediaContent}>
            <Text style={styles.mediaTitle} numberOfLines={2}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.mediaSubtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </ImageBackground>
      ) : (
        <LinearGradient colors={gradient} style={styles.mediaImage}>
          <View style={styles.mediaContent}>
            <Text style={styles.mediaTitle} numberOfLines={2}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.mediaSubtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </LinearGradient>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.screen}>
        <View style={styles.hero}>
          <LinearGradient colors={['#222A3D', '#0E0F14']} style={styles.heroGradient} />
          <Text style={styles.heroEyebrow}>DIRECTORY</Text>
          <Text style={styles.heroTitle}>Everything in one place.</Text>
          <Text style={styles.heroSubtitle}>
            Jump into movies, talent, and award winners with one tap.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={COLORS.accent} />
            <Text style={styles.loadingText}>Loading directory...</Text>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Movies</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Movies')}>
            <Text style={styles.sectionAction}>Browse all</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.mediaRow}
        >
          {movies.map((movie) =>
            renderMediaCard({
              title: movie.title,
              subtitle: `${movie.year} • ${movie.genre}`,
              imageUrl: resolveImage('movie', movie),
              gradient: movie.color ?? ['#23283A', '#0E0F14'],
              onPress: () => navigation.navigate('Movie', { movie }),
            }),
          )}
          {!isLoading && movies.length === 0 ? (
            <Text style={styles.emptyText}>No movies yet.</Text>
          ) : null}
        </ScrollView>

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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.mediaRow}
        >
          {actors.map((person) =>
            renderMediaCard({
              title: person.name,
              subtitle: 'Actor',
              imageUrl: resolveImage('actor', person),
              gradient: ['#23283A', '#0E0F14'],
              onPress: () => navigation.navigate('ActorDetail', { actorId: person.id }),
            }),
          )}
          {!isLoading && actors.length === 0 ? (
            <Text style={styles.emptyText}>No actors yet.</Text>
          ) : null}
        </ScrollView>

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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.mediaRow}
        >
          {actresses.map((person) =>
            renderMediaCard({
              title: person.name,
              subtitle: 'Actress',
              imageUrl: resolveImage('actor', person),
              gradient: ['#23283A', '#0E0F14'],
              onPress: () => navigation.navigate('ActorDetail', { actorId: person.id }),
            }),
          )}
          {!isLoading && actresses.length === 0 ? (
            <Text style={styles.emptyText}>No actresses yet.</Text>
          ) : null}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Directors</Text>
          <TouchableOpacity onPress={() => navigation.navigate('DirectorList')}>
            <Text style={styles.sectionAction}>Browse all</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.mediaRow}
        >
          {directors.map((person) =>
            renderMediaCard({
              title: person.name,
              subtitle: 'Director',
              imageUrl: resolveImage('director', person),
              gradient: ['#23283A', '#0E0F14'],
              onPress: () =>
                navigation.navigate('DirectorDetail', { directorId: person.id }),
            }),
          )}
          {!isLoading && directors.length === 0 ? (
            <Text style={styles.emptyText}>No directors yet.</Text>
          ) : null}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Awards</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AwardsHome')}>
            <Text style={styles.sectionAction}>Browse all</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cardStack}>
          {awardShows.map((show) => (
            <TouchableOpacity
              key={show.id}
              style={styles.card}
              onPress={() => navigation.navigate('AwardYears', { show })}
            >
              <Text style={styles.cardTitle}>{show.name}</Text>
              <Text style={styles.cardMeta}>Browse years and winners</Text>
            </TouchableOpacity>
          ))}
          {!isLoading && awardShows.length === 0 ? (
            <Text style={styles.emptyText}>No award shows yet.</Text>
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
  mediaRow: {
    paddingBottom: 8,
  },
  mediaCard: {
    width: 200,
    height: 140,
    borderRadius: 18,
    overflow: 'hidden',
    marginRight: 12,
  },
  mediaImage: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  mediaOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  mediaContent: {
    padding: 12,
  },
  mediaTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontFamily: Platform.select({ ios: 'Palatino', android: 'serif' }),
  },
  mediaSubtitle: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 4,
  },
  cardStack: {
    marginBottom: 16,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 16,
    marginBottom: 6,
    fontFamily: Platform.select({ ios: 'Palatino', android: 'serif' }),
  },
  cardMeta: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 12,
  },
});

export default DirectoryScreen;
