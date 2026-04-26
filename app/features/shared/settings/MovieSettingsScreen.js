import { useMemo, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

import COLORS from '../../../theme/colors';
import UI_TOKENS from '../../../ui/tokens';
import SegmentedControl from '../../../ui/components/SegmentedControl';
import MovieSubscriptionsScreen from '../../wellness/movies/MovieSubscriptionsScreen';
import MovieTitlesScreen from '../../wellness/movies/MovieTitlesScreen';

const MOVIE_TABS = [
  { key: 'subscriptions', label: 'Subscriptions', icon: '📺' },
  { key: 'titles', label: 'Titles', icon: '🎬' },
];

function normalizeSegment(value) {
  if (value === 'titles' || value === 'Titles') return 'titles';
  return 'subscriptions';
}

export default function MovieSettingsScreen({ navigation, route }) {
  const [segment, setSegment] = useState(normalizeSegment(route.params?.initialSubsegment));

  const content = useMemo(() => {
    if (segment === 'titles') {
      return <MovieTitlesScreen navigation={navigation} embedded showHeader={false} />;
    }
    return <MovieSubscriptionsScreen embedded />;
  }, [navigation, segment]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.topCard}>
          <Text style={styles.title}>Movie settings</Text>
          <SegmentedControl
            items={MOVIE_TABS}
            selectedIndex={MOVIE_TABS.findIndex((item) => item.key === segment)}
            onChange={(_, item) => setSegment(item.key)}
          />
        </View>
        <View style={styles.contentWrap}>{content}</View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1, backgroundColor: COLORS.bg },
  topCard: {
    paddingHorizontal: 16, paddingTop: 6, paddingBottom: 6, borderBottomWidth: 1,
    borderBottomColor: 'rgba(162,167,179,0.12)', backgroundColor: COLORS.bg,
  },
  title: { color: COLORS.text, fontSize: 29, fontWeight: '700', letterSpacing: 0.2 },
  contentWrap: { flex: 1, paddingBottom: UI_TOKENS.spacing.xs },
});
