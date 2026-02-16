import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Animated,
  Modal,
  PanResponder,
  View,
  Pressable,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  SafeAreaView,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import COLORS from '../../../theme/colors';
import { MOVIES } from '../../../data/movies/catalog';
import MovieClipsSection from '../../../components/MovieClipsSection';
import { usePreferences } from '../../../context/PreferencesContext';
import { COUNTRIES, PLATFORM_BY_ID, MOVIE_AVAILABILITY } from '../../../data/movies/streaming';

function MovieDetailScreen({ route, navigation }) {
  const movie = route.params?.movie ?? MOVIES[0];
  const { countryCode, subscriptions } = usePreferences();
  const [ratingState, setRatingState] = useState('unwatched');
  const [watchedRating, setWatchedRating] = useState('liked');
  const [notes, setNotes] = useState('');
  const [showRatingSheet, setShowRatingSheet] = useState(false);
  const [showNoteSheet, setShowNoteSheet] = useState(false);
  const [showAllPlatforms, setShowAllPlatforms] = useState(false);
  const [trackWidth, setTrackWidth] = useState(0);
  const [activeClipId, setActiveClipId] = useState(null);
  const [clipFrame, setClipFrame] = useState(null);
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const pulse = useRef(new Animated.Value(1)).current;
  const ratingSheetAnim = useRef(new Animated.Value(0)).current;
  const noteSheetAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const scaleStart = useRef(0);
  const currentScale = useRef(0);
  const gradientColors =
    Array.isArray(movie.color) && movie.color.length > 0
      ? movie.color
      : ['#23283A', '#0E0F14'];
  const overview =
    movie.overview ??
    'Two men form an unlikely bond inside Shawshank State Penitentiary. Years turn into decades as they hold on to dignity, redemption, and the quiet power of hope.';
  const ratingThemes = useMemo(
    () => ({
      unwatched: {
        label: "Haven't watched",
        icon: 'time-outline',
        color: COLORS.muted,
        gradient: ['#2C3342', '#11141B'],
        glow: 'rgba(122,132,152,0.35)',
      },
      loved: {
        label: 'Loved it',
        icon: 'heart',
        color: '#4ADE80',
        gradient: ['#0E2D1F', '#0A1410'],
        glow: 'rgba(74,222,128,0.4)',
      },
      liked: {
        label: 'Liked it',
        icon: 'thumbs-up',
        color: '#4ADE80',
        gradient: ['#0E2D1F', '#0A1410'],
        glow: 'rgba(74,222,128,0.4)',
      },
      disliked: {
        label: 'Disliked it',
        icon: 'thumbs-down',
        color: '#FF6B6B',
        gradient: ['#3A1414', '#140A0A'],
        glow: 'rgba(255,107,107,0.4)',
      },
      hated: {
        label: 'Hated it',
        emoji: '😡',
        color: '#FF4D4D',
        gradient: ['#3B150E', '#140A08'],
        glow: 'rgba(255,77,77,0.45)',
      },
    }),
    [],
  );
  const ratingScaleOptions = useMemo(
    () => [
      { key: 'hated', label: 'Hated it', emoji: '😡', color: '#FF4D4D' },
      { key: 'disliked', label: 'Disliked it', icon: 'thumbs-down', color: '#FF6B6B' },
      { key: 'liked', label: 'Liked it', icon: 'thumbs-up', color: '#4ADE80' },
      { key: 'loved', label: 'Loved it', icon: 'heart', color: '#4ADE80' },
    ],
    [],
  );
  const currentTheme = ratingThemes[ratingState] || ratingThemes.unwatched;
  const effectiveScaleRating =
    ratingState === 'unwatched' ? watchedRating : ratingState;
  const country = COUNTRIES.find((item) => item.code === countryCode);
  const availablePlatforms =
    MOVIE_AVAILABILITY?.[movie.id]?.[countryCode] ?? [];
  const subscribedPlatforms = availablePlatforms.filter((platformId) =>
    subscriptions.includes(platformId),
  );
  const displayedPlatforms = showAllPlatforms
    ? availablePlatforms
    : subscribedPlatforms;
  const cinemaActive = Boolean(activeClipId);
  const safeHeight = windowHeight - insets.top - insets.bottom;
  const clipTop = clipFrame ? Math.max(0, clipFrame.y - insets.top) : 0;
  const clipBottom = clipFrame
    ? Math.min(safeHeight, clipFrame.y + clipFrame.height - insets.top)
    : 0;
  const clipBottomSpace = Math.max(0, safeHeight - clipBottom);
  const tabBarStyleBase = {
    backgroundColor: '#12141C',
    borderTopWidth: 0,
    height: 78,
    paddingBottom: 12,
    paddingTop: 10,
  };

  useEffect(() => {
    Animated.sequence([
      Animated.timing(pulse, {
        toValue: 1.02,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(pulse, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [ratingState, pulse]);

  useEffect(() => {
    const parent = navigation?.getParent();
    if (!parent) return;
    parent.setOptions({
      tabBarStyle: cinemaActive
        ? { ...tabBarStyleBase, backgroundColor: '#000' }
        : tabBarStyleBase,
    });
    return () => {
      parent.setOptions({ tabBarStyle: tabBarStyleBase });
    };
  }, [cinemaActive, navigation]);

  useEffect(() => {
    if (!trackWidth) return;
    const index = ratingScaleOptions.findIndex(
      (option) => option.key === effectiveScaleRating,
    );
    if (index < 0) return;
    const target = index / 3;
    currentScale.current = target;
    scaleAnim.setValue(target);
  }, [effectiveScaleRating, trackWidth, ratingScaleOptions, scaleAnim]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        scaleStart.current = currentScale.current;
      },
      onPanResponderMove: (_, gesture) => {
        const usable = Math.max(trackWidth - 32, 1);
        const next = Math.min(
          1,
          Math.max(0, scaleStart.current + gesture.dx / usable),
        );
        scaleAnim.setValue(next);
        currentScale.current = next;
        const index = Math.round(next * 3);
        const nextRating = ratingScaleOptions[index]?.key;
        if (nextRating) {
          setRatingState(nextRating);
          setWatchedRating(nextRating);
        }
      },
      onPanResponderRelease: () => {
        const index = Math.round(currentScale.current * 3);
        const target = index / 3;
        Animated.spring(scaleAnim, {
          toValue: target,
          friction: 7,
          tension: 90,
          useNativeDriver: true,
        }).start();
        currentScale.current = target;
      },
    }),
  ).current;

  const openRatingSheet = () => {
    setShowRatingSheet(true);
    Animated.timing(ratingSheetAnim, {
      toValue: 1,
      duration: 260,
      useNativeDriver: true,
    }).start();
  };

  const closeRatingSheet = () => {
    Animated.timing(ratingSheetAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setShowRatingSheet(false);
    });
  };

  const openNoteSheet = () => {
    setShowNoteSheet(true);
    Animated.timing(noteSheetAnim, {
      toValue: 1,
      duration: 260,
      useNativeDriver: true,
    }).start();
  };

  const closeNoteSheet = () => {
    Animated.timing(noteSheetAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setShowNoteSheet(false);
    });
  };

  const closeCinema = () => setActiveClipId(null);

  return (
    <SafeAreaView
      style={[styles.safeArea, cinemaActive && styles.safeAreaCinema]}
    >
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={[
          styles.screen,
          cinemaActive && styles.cinemaScreen,
        ]}
        scrollEnabled={!cinemaActive}
      >
        <View style={[styles.cinemaSection, cinemaActive && styles.cinemaDim]}>
          <View pointerEvents={cinemaActive ? 'none' : 'auto'}>
            <LinearGradient colors={gradientColors} style={styles.detailHero}>
              <Text style={styles.detailTitle}>{movie.title}</Text>
              <Text style={styles.detailMeta}>
                {movie.year} • {movie.genre} • {movie.minutes}
              </Text>
            </LinearGradient>
            <Animated.View
              style={[
                styles.ratingWidget,
                {
                  transform: [{ scale: pulse }],
                  shadowColor: currentTheme.glow,
                },
              ]}
            >
              <LinearGradient colors={currentTheme.gradient} style={styles.ratingGlow} />
              <View style={styles.widgetRow}>
                <View style={styles.widgetState}>
                  {currentTheme.emoji ? (
                    <Text style={styles.widgetEmoji}>{currentTheme.emoji}</Text>
                  ) : (
                    <Ionicons
                      name={currentTheme.icon}
                      size={22}
                      color={currentTheme.color}
                      style={styles.widgetIcon}
                    />
                  )}
                  <View>
                    <Text style={styles.widgetLabel}>Your rating</Text>
                    <Text style={styles.widgetValue}>{currentTheme.label}</Text>
                  </View>
                </View>
                <View style={styles.widgetActions}>
                  <TouchableOpacity
                    style={styles.widgetIconButton}
                    onPress={openRatingSheet}
                    activeOpacity={0.9}
                  >
                    <Ionicons name="pencil" size={16} color={COLORS.text} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.widgetIconButton}
                    onPress={openNoteSheet}
                    activeOpacity={0.9}
                  >
                    <Ionicons name="create-outline" size={16} color={COLORS.text} />
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
            <Text style={styles.detailSectionTitle}>Overview</Text>
            <Text style={styles.detailBody}>{overview}</Text>
          </View>
        </View>

        <MovieClipsSection
          clips={movie.clips}
          onPlayClip={(clip) => setActiveClipId(clip.id)}
          activeClipId={activeClipId}
          cinemaActive={cinemaActive}
          onActiveLayout={setClipFrame}
        />

        <View style={[styles.cinemaSection, cinemaActive && styles.cinemaDim]}>
          <View pointerEvents={cinemaActive ? 'none' : 'auto'}>
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
          <Text style={styles.detailSectionTitle}>Why you might love it</Text>
          <View style={styles.detailListItem}>
            <Text style={styles.detailBullet}>•</Text>
            <Text style={styles.detailListText}>
              You like character-driven arcs and quiet tension.
            </Text>
          </View>
          <View style={styles.detailListItem}>
            <Text style={styles.detailBullet}>•</Text>
            <Text style={styles.detailListText}>
              You enjoy hopeful endings earned over time.
            </Text>
          </View>
          <View style={styles.detailListItem}>
            <Text style={styles.detailBullet}>•</Text>
            <Text style={styles.detailListText}>
              You prefer movies that linger after the credits.
            </Text>
          </View>
          <View style={styles.watchCard}>
            <LinearGradient colors={['#171B24', '#0E1118']} style={styles.watchGlow} />
            <View style={styles.watchHeader}>
              <Text style={styles.watchTitle}>You can watch on</Text>
              <Text style={styles.watchCountry}>
                {country?.flag ? `${country.flag} ` : ''}
                {country?.name ?? 'Your country'}
              </Text>
            </View>
            {displayedPlatforms.length > 0 ? (
              <View style={styles.platformRow}>
                {displayedPlatforms.map((platformId) => {
                  const platform = PLATFORM_BY_ID[platformId];
                  if (!platform) return null;
                  return (
                    <View
                      key={platformId}
                      style={[
                        styles.platformPill,
                        { backgroundColor: platform.color },
                      ]}
                    >
                      <Text
                        style={[
                          styles.platformPillText,
                          { color: platform.textColor },
                        ]}
                      >
                        {platform.name}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.platformEmpty}>
                {showAllPlatforms
                  ? 'No platform data yet for this region.'
                  : 'Not on your subscribed platforms yet.'}
              </Text>
            )}
            {availablePlatforms.length > 0 ? (
              <TouchableOpacity
                style={styles.platformToggle}
                onPress={() => setShowAllPlatforms((prev) => !prev)}
              >
                <Text style={styles.platformToggleText}>
                  {showAllPlatforms ? 'Show only my subscriptions' : 'See all platforms'}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
        </View>
      </ScrollView>
      {cinemaActive && clipFrame ? (
        <View style={styles.cinemaOverlay} pointerEvents="box-none">
          <Pressable
            style={[styles.cinemaTapZone, { top: 0, height: clipTop }]}
            onPress={closeCinema}
          />
          <Pressable
            style={[
              styles.cinemaTapZone,
              { top: clipBottom, height: clipBottomSpace },
            ]}
            onPress={closeCinema}
          />
        </View>
      ) : null}

      <Modal visible={showRatingSheet} transparent animationType="none">
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.overlayBackdrop} onPress={closeRatingSheet} />
          <Animated.View
            style={[
              styles.sheet,
              {
                transform: [
                  {
                    translateY: ratingSheetAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [320, 0],
                    }),
                  },
                ],
                opacity: ratingSheetAnim,
              },
            ]}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Rate this movie</Text>
              <TouchableOpacity onPress={closeRatingSheet}>
                <Ionicons name="close" size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[
                styles.optionWide,
                ratingState === 'unwatched' && styles.optionWideActive,
              ]}
              onPress={() => {
                setRatingState('unwatched');
                closeRatingSheet();
              }}
            >
              <Ionicons name="time-outline" size={16} color={COLORS.muted} />
              <Text style={styles.optionWideLabel}>Haven't watched yet</Text>
            </TouchableOpacity>

            <View style={styles.scaleWrap}>
              <Text style={styles.scaleLabel}>Watched scale</Text>
              <View
                style={styles.scaleTrack}
                onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
                onStartShouldSetResponder={() => true}
                onResponderRelease={(event) => {
                  const usable = Math.max(trackWidth - 32, 1);
                  const x = Math.min(
                    trackWidth,
                    Math.max(0, event.nativeEvent.locationX - 16),
                  );
                  const next = x / usable;
                  const index = Math.round(next * 3);
                  const nextRating = ratingScaleOptions[index]?.key;
                  if (nextRating) {
                    setRatingState(nextRating);
                    setWatchedRating(nextRating);
                  }
                  Animated.spring(scaleAnim, {
                    toValue: index / 3,
                    friction: 7,
                    tension: 90,
                    useNativeDriver: true,
                  }).start();
                }}
              >
                <LinearGradient
                  colors={['#FF4D4D', '#FF6B6B', '#4ADE80', '#2DD4BF']}
                  style={styles.scaleGradient}
                />
                <Animated.View
                  style={[
                    styles.scaleThumb,
                    {
                      transform: [
                        {
                          translateX: Animated.multiply(
                            scaleAnim,
                            Math.max(trackWidth - 32, 1),
                          ),
                        },
                      ],
                    },
                  ]}
                  {...panResponder.panHandlers}
                />
              </View>
              <View style={styles.scaleButtons}>
                {ratingScaleOptions.map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.scaleButton,
                      ratingState === option.key && styles.scaleButtonActive,
                    ]}
                    onPress={() => {
                      setRatingState(option.key);
                      setWatchedRating(option.key);
                      Animated.spring(scaleAnim, {
                        toValue:
                          ratingScaleOptions.findIndex((item) => item.key === option.key) /
                          3,
                        friction: 7,
                        tension: 90,
                        useNativeDriver: true,
                      }).start();
                    }}
                  >
                    {option.emoji ? (
                      <Text style={styles.scaleEmoji}>{option.emoji}</Text>
                    ) : (
                      <Ionicons name={option.icon} size={16} color={option.color} />
                    )}
                    <Text style={styles.scaleText}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>

      <Modal visible={showNoteSheet} transparent animationType="none">
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.overlayBackdrop} onPress={closeNoteSheet} />
          <Animated.View
            style={[
              styles.sheet,
              {
                transform: [
                  {
                    translateY: noteSheetAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [340, 0],
                    }),
                  },
                ],
                opacity: noteSheetAnim,
              },
            ]}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Your note</Text>
              <TouchableOpacity onPress={closeNoteSheet}>
                <Ionicons name="close" size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            {notes ? (
              <Text style={styles.notePreview} numberOfLines={4}>
                {notes}
              </Text>
            ) : (
              <Text style={styles.noteEmpty}>
                Capture what you felt, loved, or disliked in a few lines.
              </Text>
            )}
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="What hit hardest? Any favorite scene?"
              placeholderTextColor={COLORS.muted}
              multiline
              textAlignVertical="top"
            />
            <View style={styles.voiceRow}>
              <TouchableOpacity style={styles.voiceButton} activeOpacity={0.9} disabled>
                <Ionicons name="mic" size={14} color={COLORS.muted} />
                <Text style={styles.voiceButtonText}>Voice input (soon)</Text>
              </TouchableOpacity>
              <Text style={styles.notesHint}>Saved on this device.</Text>
            </View>
          </Animated.View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  safeAreaCinema: {
    backgroundColor: '#000',
  },
  screen: {
    padding: 20,
    paddingBottom: 120,
    backgroundColor: COLORS.bg,
  },
  cinemaScreen: {
    backgroundColor: '#000',
  },
  cinemaDim: {
    opacity: 0,
  },
  cinemaSection: {
    position: 'relative',
  },
  cinemaOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  cinemaTapZone: {
    position: 'absolute',
    left: 0,
    right: 0,
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
  ratingWidget: {
    marginTop: 12,
    borderRadius: 20,
    padding: 14,
    backgroundColor: COLORS.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowOpacity: 0.5,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  ratingGlow: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.85,
  },
  widgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  widgetState: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  widgetIcon: {
    marginRight: 10,
  },
  widgetEmoji: {
    fontSize: 22,
    marginRight: 10,
  },
  widgetLabel: {
    color: COLORS.muted,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  widgetValue: {
    color: COLORS.text,
    fontSize: 15,
    fontFamily: Platform.select({ ios: 'Palatino', android: 'serif' }),
  },
  widgetActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  widgetIconButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  optionWide: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  optionWideActive: {
    borderColor: COLORS.accent2,
  },
  optionWideLabel: {
    color: COLORS.text,
    fontSize: 14,
    marginLeft: 10,
  },
  scaleWrap: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 18,
    padding: 12,
  },
  scaleLabel: {
    color: COLORS.muted,
    fontSize: 11,
    marginBottom: 10,
  },
  scaleTrack: {
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  scaleGradient: {
    flex: 1,
  },
  scaleThumb: {
    position: 'absolute',
    top: -7,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.text,
    borderWidth: 2,
    borderColor: COLORS.bg,
  },
  scaleButtons: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scaleButton: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  scaleButtonActive: {
    borderColor: COLORS.text,
  },
  scaleText: {
    color: COLORS.text,
    fontSize: 11,
    marginTop: 6,
  },
  scaleEmoji: {
    fontSize: 16,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8,10,14,0.72)',
  },
  sheet: {
    backgroundColor: '#141822',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sheetTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontFamily: Platform.select({ ios: 'Palatino', android: 'serif' }),
  },
  notePreview: {
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 20,
  },
  noteEmpty: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
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
  watchCard: {
    marginTop: 18,
    borderRadius: 20,
    padding: 16,
    backgroundColor: COLORS.card,
    overflow: 'hidden',
  },
  watchGlow: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.9,
  },
  watchHeader: {
    marginBottom: 12,
  },
  watchTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontFamily: Platform.select({ ios: 'Palatino', android: 'serif' }),
  },
  watchCountry: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 4,
  },
  platformRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  platformPill: {
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  platformPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  platformEmpty: {
    color: COLORS.muted,
    fontSize: 12,
    marginBottom: 10,
  },
  platformToggle: {
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  platformToggleText: {
    color: COLORS.accent2,
    fontSize: 12,
  },
  notesInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    minHeight: 120,
    padding: 14,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginTop: 12,
  },
  voiceRow: {
    marginTop: 12,
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  voiceButton: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    opacity: 0.6,
  },
  voiceButtonText: {
    color: COLORS.muted,
    fontSize: 12,
    marginLeft: 8,
  },
  notesHint: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 8,
  },
});

export default MovieDetailScreen;
