import { useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import COLORS from '../theme/colors';
import YouTubeEmbed from './YouTubeEmbed';

const TYPE_LABELS = {
  trailer: 'Trailer',
  scene: 'Scene',
  interview: 'Interview',
  bts: 'Behind the Scenes',
  other: 'Clip',
};

function MovieClipsSection({
  clips,
  onPlayClip,
  activeClipId,
  cinemaActive = false,
  onActiveLayout,
}) {
  if (!Array.isArray(clips) || clips.length === 0) return null;
  const clip = clips[0];
  if (!clip) return null;
  const cardRef = useRef(null);

  const handleLayout = () => {
    if (!cardRef.current || !onActiveLayout) return;
    cardRef.current.measureInWindow((x, y, width, height) => {
      onActiveLayout({ x, y, width, height });
    });
  };
  const isActive = clip.id === activeClipId;

  return (
    <View style={[styles.section, styles.sectionFullBleed]}>
      <Text style={[styles.title, cinemaActive && styles.titleHidden]}>Clips</Text>
      <View
        ref={cardRef}
        onLayout={handleLayout}
        style={[
          styles.card,
          styles.cardFullBleed,
          cinemaActive && styles.cardCinema,
        ]}
      >
        {!cinemaActive ? (
          <View style={styles.clipMeta}>
            <Text style={styles.clipTitle}>{clip.title}</Text>
            {clip.type ? (
              <Text style={styles.clipType}>
                {TYPE_LABELS[clip.type] || 'Clip'}
              </Text>
            ) : null}
          </View>
        ) : null}
        <YouTubeEmbed
          youtubeId={clip.youtubeId}
          startSeconds={clip.startSeconds}
          title={clip.title}
          onPlay={onPlayClip ? () => onPlayClip(clip) : undefined}
          forcePlay={cinemaActive && isActive}
          rounded={false}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 18,
  },
  sectionFullBleed: {
    marginLeft: -20,
    marginRight: -20,
  },
  title: {
    color: COLORS.text,
    fontSize: 18,
    marginBottom: 10,
    marginLeft: 20,
  },
  titleHidden: {
    opacity: 0,
  },
  card: {
    width: 300,
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 14,
  },
  cardFullBleed: {
    width: '100%',
    borderRadius: 0,
    padding: 0,
  },
  cardCinema: {
    backgroundColor: '#000',
  },
  clipMeta: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
  },
  clipTitle: {
    color: COLORS.text,
    fontSize: 14,
    marginBottom: 4,
  },
  clipType: {
    color: COLORS.muted,
    fontSize: 11,
    marginBottom: 10,
  },
});

export default MovieClipsSection;
