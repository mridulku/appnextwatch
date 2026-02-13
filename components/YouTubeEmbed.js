import React from 'react';
import { Pressable, StyleSheet, Text, View, Image } from 'react-native';
import { WebView } from 'react-native-webview';

import COLORS from '../theme/colors';

function buildEmbedUrl(youtubeId, startSeconds, autoPlay = false) {
  if (!youtubeId) return '';
  const params = new URLSearchParams();
  params.set('modestbranding', '1');
  params.set('playsinline', '1');
  params.set('rel', '0');
  params.set('iv_load_policy', '3');
  params.set('fs', '1');
  params.set('origin', 'https://www.youtube.com');
  params.set('enablejsapi', '1');
  params.set('controls', '1');
  if (autoPlay) {
    params.set('autoplay', '1');
    params.set('mute', '1');
  } else {
    params.set('mute', '0');
  }
  if (startSeconds) {
    params.set('start', String(startSeconds));
  }
  return `https://www.youtube.com/embed/${youtubeId}?${params.toString()}`;
}

function buildThumbnailUrl(youtubeId) {
  if (!youtubeId) return '';
  return `https://i.ytimg.com/vi/${youtubeId}/maxresdefault.jpg`;
}

const THUMBNAIL_FALLBACKS = ['maxresdefault', 'hqdefault', 'mqdefault', 'default'];
const IOS_SAFARI_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

function YouTubeEmbed({
  youtubeId,
  startSeconds,
  title,
  onPlay,
  forcePlay = false,
  autoPlay = false,
  rounded = true,
}) {
  if (!youtubeId) return null;
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [thumbIndex, setThumbIndex] = React.useState(0);
  const forcePlayRef = React.useRef(forcePlay);
  const embedUrl = buildEmbedUrl(
    youtubeId,
    startSeconds,
    autoPlay || isPlaying || forcePlay,
  );
  const thumbnailUrl = `https://i.ytimg.com/vi/${youtubeId}/${THUMBNAIL_FALLBACKS[thumbIndex]}.jpg`;
  const isVideoPlaying = forcePlay || isPlaying;

  React.useEffect(() => {
    if (forcePlayRef.current && !forcePlay) {
      setIsPlaying(false);
    }
    forcePlayRef.current = forcePlay;
  }, [forcePlay]);

  return (
    <View style={styles.container}>
      {isVideoPlaying ? (
        <View style={[styles.playerFrame, !rounded && styles.fullBleedFrame]}>
          <WebView
            source={{ uri: embedUrl }}
            style={[styles.video, !rounded && styles.fullBleedFrame]}
            javaScriptEnabled
            allowsInlineMediaPlayback
            allowsFullscreenVideo
            mediaPlaybackRequiresUserAction={false}
            originWhitelist={['https://*', 'http://*']}
            setSupportMultipleWindows={false}
            userAgent={IOS_SAFARI_UA}
            onShouldStartLoadWithRequest={(request) => {
              if (!request?.url) return true;
              if (request.url.includes('youtube.com/watch')) return false;
              if (request.url.includes('youtu.be/')) return false;
              return true;
            }}
          />
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={title ? `Play ${title}` : 'Play clip'}
          onPress={() => {
            setIsPlaying(true);
            if (onPlay) {
              onPlay({ youtubeId, startSeconds, title });
            }
          }}
          style={({ pressed }) => [
            styles.thumb,
            !rounded && styles.fullBleedFrame,
            pressed && styles.thumbPressed,
          ]}
        >
          <Image
            source={{ uri: thumbnailUrl }}
            style={styles.thumbImage}
            resizeMode="cover"
            onError={() => {
              setThumbIndex((current) =>
                Math.min(current + 1, THUMBNAIL_FALLBACKS.length - 1),
              );
            }}
          />
          <View style={styles.playBadge}>
            <Text style={styles.playIcon}>▶</Text>
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  thumb: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: COLORS.card,
  },
  thumbPressed: {
    opacity: 0.9,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  playBadge: {
    position: 'absolute',
    alignSelf: 'center',
    top: '50%',
    transform: [{ translateY: -18 }],
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    color: '#fff',
    fontSize: 20,
    marginLeft: 4,
  },
  playerFrame: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: COLORS.card,
  },
  video: {
    flex: 1,
    backgroundColor: COLORS.card,
  },
  fullBleedFrame: {
    borderRadius: 0,
  },
});

export default YouTubeEmbed;
