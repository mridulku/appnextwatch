import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Image,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import COLORS from '../theme/colors';
import { fetchMovies } from '../core/supabaseApi';
import { MOVIES } from '../data/catalog';
import YouTubeEmbed from '../components/YouTubeEmbed';

const BASE_BG = '#0F0F12';
const EDGE_PADDING = 16;

function formatTeaser(movie) {
  if (!movie?.overview) return 'A story that demands to be uncovered. Tap to reveal.';
  return movie.overview;
}

function extractIframeSource(value) {
  if (!value || typeof value !== 'string') return '';
  const srcMatch = value.match(/src=["']([^"']+)["']/i);
  if (srcMatch?.[1]) return srcMatch[1];
  return value;
}

function parseYoutubeId(value) {
  if (!value || typeof value !== 'string') return null;
  const candidate = extractIframeSource(value);
  const directMatch = candidate.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|shorts\/|watch\?v=|v\/))([A-Za-z0-9_-]{11})/,
  );
  if (directMatch?.[1]) return directMatch[1];

  try {
    const parsed = new URL(candidate);
    const idFromQuery = parsed.searchParams.get('v');
    if (idFromQuery) return idFromQuery.slice(0, 11);
  } catch {
    return null;
  }

  return null;
}

function getPrimaryYoutubeId(movie) {
  if (Array.isArray(movie?.clips) && movie.clips.length > 0) {
    const trailerClip = movie.clips.find(
      (clip) => clip?.type === 'trailer' && clip?.youtubeId,
    );
    if (trailerClip?.youtubeId) return trailerClip.youtubeId;
    const firstPlayable = movie.clips.find((clip) => clip?.youtubeId);
    if (firstPlayable?.youtubeId) return firstPlayable.youtubeId;
  }

  return parseYoutubeId(movie?.trailer_iframe) || parseYoutubeId(movie?.trailer_url);
}

function buildTasteTags(movie) {
  const tags = [];
  if (movie?.genre) tags.push(movie.genre);
  if (movie?.minutes) tags.push(movie.minutes);
  if (movie?.rating) tags.push(`IMDb ${movie.rating}`);
  return tags.slice(0, 3);
}

function ReelActionButton({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={styles.actionWrap} onPress={onPress} activeOpacity={0.88}>
      <View style={styles.actionButton}>
        <Ionicons name={icon} size={22} color={COLORS.text} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function ExploreReelsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [viewportHeight, setViewportHeight] = useState(windowHeight);
  const [movies, setMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [reasonMovieId, setReasonMovieId] = useState(null);
  const reasonAnim = useRef(new Animated.Value(0)).current;
  const reasonTimeoutRef = useRef(null);
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 70,
    minimumViewTime: 120,
  }).current;

  useEffect(() => {
    setViewportHeight(windowHeight);
  }, [windowHeight]);

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

  const hideReason = useCallback(
    (immediate = false) => {
      if (reasonTimeoutRef.current) {
        clearTimeout(reasonTimeoutRef.current);
        reasonTimeoutRef.current = null;
      }

      if (immediate) {
        reasonAnim.stopAnimation();
        reasonAnim.setValue(0);
        setReasonMovieId(null);
        return;
      }

      Animated.timing(reasonAnim, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setReasonMovieId(null);
      });
    },
    [reasonAnim],
  );

  const revealReason = useCallback(
    (movie) => {
      if (!movie?.id) return;
      if (reasonTimeoutRef.current) {
        clearTimeout(reasonTimeoutRef.current);
      }

      setReasonMovieId(movie.id);
      reasonAnim.stopAnimation();
      reasonAnim.setValue(0);
      Animated.timing(reasonAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();

      reasonTimeoutRef.current = setTimeout(() => {
        hideReason();
      }, 2600);
    },
    [hideReason, reasonAnim],
  );

  useEffect(
    () => () => {
      if (reasonTimeoutRef.current) {
        clearTimeout(reasonTimeoutRef.current);
      }
    },
    [],
  );

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    const firstVisible = viewableItems.find(
      (entry) => entry.isViewable && typeof entry.index === 'number',
    );
    if (!firstVisible || typeof firstVisible.index !== 'number') return;
    setActiveIndex((prev) => (prev === firstVisible.index ? prev : firstVisible.index));
  }).current;

  const onShareMovie = useCallback(async (movie) => {
    try {
      const shareTitle = movie?.title ?? 'Movie';
      const shareYear = movie?.year ? ` (${movie.year})` : '';
      await Share.share({
        message: `${shareTitle}${shareYear}\nDiscover more in AppNextwatch.`,
      });
    } catch (error) {
      console.warn('Failed to open share sheet.', error?.message ?? error);
    }
  }, []);

  const onSaveMovie = useCallback(() => {
    navigation.navigate('Lists');
  }, [navigation]);

  const onLikeMovie = useCallback(
    (movie) => {
      navigation.navigate('Movie', { movie });
    },
    [navigation],
  );

  const reasonTranslateY = useMemo(
    () =>
      reasonAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [10, 0],
      }),
    [reasonAnim],
  );

  if (isLoading) {
    return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading reels...</Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={styles.root}
      onLayout={(event) => {
        const nextHeight = Math.round(event.nativeEvent.layout.height);
        if (nextHeight > 0 && nextHeight !== viewportHeight) {
          setViewportHeight(nextHeight);
        }
      }}
    >
      <StatusBar style="light" />
      <FlatList
        data={movies}
        keyExtractor={(item) => item.id}
        pagingEnabled
        decelerationRate="fast"
        disableIntervalMomentum
        showsVerticalScrollIndicator={false}
        snapToInterval={viewportHeight}
        snapToAlignment="start"
        initialNumToRender={2}
        maxToRenderPerBatch={3}
        windowSize={4}
        removeClippedSubviews
        onMomentumScrollBegin={() => hideReason(true)}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: viewportHeight,
          offset: viewportHeight * index,
          index,
        })}
        renderItem={({ item, index }) => {
          const isActive = index === activeIndex;
          const youtubeId = getPrimaryYoutubeId(item);
          const tagItems = buildTasteTags(item);
          const gradientColors =
            Array.isArray(item.color) && item.color.length > 0
              ? item.color
              : ['#1C2234', '#0D0F16'];
          const reasonVisible = reasonMovieId === item.id;

          return (
            <View style={[styles.reelItem, { height: viewportHeight }]}>
              <View style={styles.mediaLayer}>
                {youtubeId ? (
                  <YouTubeEmbed
                    youtubeId={youtubeId}
                    title={item.title}
                    forcePlay={isActive}
                    autoPlay={isActive}
                    rounded={false}
                    fill
                    pressToPlay={false}
                    showPlayBadge={false}
                    showControls={false}
                  />
                ) : item.wiki_image_url ? (
                  <Image
                    source={{ uri: item.wiki_image_url }}
                    style={styles.posterImage}
                    resizeMode="cover"
                  />
                ) : (
                  <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />
                )}
                <LinearGradient
                  colors={['rgba(15,15,18,0.2)', 'rgba(15,15,18,0.52)']}
                  style={styles.mediaTint}
                />
              </View>

              <LinearGradient
                pointerEvents="none"
                colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0)']}
                style={styles.topGradient}
              />
              <LinearGradient
                pointerEvents="none"
                colors={['rgba(0,0,0,0)', 'rgba(8,8,11,0.9)']}
                style={styles.bottomGradient}
              />

              <Pressable
                style={styles.tapLayer}
                onPress={() => {
                  hideReason(true);
                  navigation.navigate('Movie', { movie: item });
                }}
                onLongPress={() => revealReason(item)}
                delayLongPress={280}
              />

              <View
                style={[
                  styles.overlay,
                  {
                    paddingTop: insets.top + EDGE_PADDING,
                    paddingBottom: insets.bottom + EDGE_PADDING,
                  },
                ]}
                pointerEvents="box-none"
              >
                <View style={styles.bottomDock} pointerEvents="box-none">
                  <View style={styles.metaColumn} pointerEvents="none">
                    {reasonVisible ? (
                      <Animated.View
                        style={[
                          styles.reasonCard,
                          {
                            opacity: reasonAnim,
                            transform: [{ translateY: reasonTranslateY }],
                          },
                        ]}
                      >
                        <Text style={styles.reasonLabel}>Why this recommendation?</Text>
                        <Text style={styles.reasonText} numberOfLines={4}>
                          {formatTeaser(item)}
                        </Text>
                      </Animated.View>
                    ) : null}
                    <Text style={styles.movieTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={styles.movieMeta} numberOfLines={1}>
                      {[item.year, item.genre].filter(Boolean).join(' • ') || 'Film'}
                    </Text>
                    <View style={styles.tagRow}>
                      {tagItems.map((tag) => (
                        <View key={`${item.id}-${tag}`} style={styles.tagPill}>
                          <Text style={styles.tagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  <View style={styles.actionStack}>
                    <ReelActionButton
                      icon="heart-outline"
                      label="Like"
                      onPress={() => onLikeMovie(item)}
                    />
                    <ReelActionButton
                      icon="bookmark-outline"
                      label="Save"
                      onPress={onSaveMovie}
                    />
                    <ReelActionButton
                      icon="share-social-outline"
                      label="Share"
                      onPress={() => onShareMovie(item)}
                    />
                  </View>
                </View>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BASE_BG,
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
  reelItem: {
    width: '100%',
    backgroundColor: BASE_BG,
  },
  mediaLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BASE_BG,
  },
  posterImage: {
    ...StyleSheet.absoluteFillObject,
  },
  mediaTint: {
    ...StyleSheet.absoluteFillObject,
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 176,
    zIndex: 1,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 320,
    zIndex: 1,
  },
  tapLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 3,
    paddingHorizontal: EDGE_PADDING,
    justifyContent: 'flex-end',
  },
  bottomDock: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  metaColumn: {
    flex: 1,
    marginRight: 14,
  },
  reasonCard: {
    borderRadius: 14,
    backgroundColor: 'rgba(15,15,18,0.72)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  reasonLabel: {
    color: COLORS.accent,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 6,
    fontWeight: '600',
  },
  reasonText: {
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 18,
  },
  movieTitle: {
    color: COLORS.text,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
  },
  movieMeta: {
    color: 'rgba(245,246,248,0.9)',
    fontSize: 14,
    marginTop: 5,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  tagPill: {
    backgroundColor: 'rgba(15,15,18,0.56)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '500',
  },
  actionStack: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  actionWrap: {
    alignItems: 'center',
    marginBottom: 12,
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,15,18,0.55)',
  },
  actionLabel: {
    marginTop: 6,
    color: 'rgba(245,246,248,0.86)',
    fontSize: 11,
    fontWeight: '500',
  },
});

export default ExploreReelsScreen;
