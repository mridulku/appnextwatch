import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuth } from '../../../context/AuthContext';
import useMovieLogs from '../../../hooks/useMovieLogs';
import COLORS from '../../../theme/colors';
import SegmentedControl from '../../../ui/components/SegmentedControl';

const TITLE_TABS = [
  { key: 'movie', label: 'Movies', icon: '🎬' },
  { key: 'tv_show', label: 'TV shows', icon: '📺' },
];

function TitleRow({ item, onPress }) {
  return (
    <TouchableOpacity style={styles.titleCard} activeOpacity={0.9} onPress={onPress}>
      <View style={styles.titleCopy}>
        <Text style={styles.titleText}>{item.title}</Text>
        <Text style={styles.titleMeta}>
          {item.mediaType === 'tv_show' ? 'TV show' : 'Movie'}
          {item.releaseYear ? ` • ${item.releaseYear}` : ''}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
    </TouchableOpacity>
  );
}

export default function MovieTitlesScreen({ navigation, embedded = false, showHeader = true }) {
  const { user } = useAuth();
  const { titles, loading, hydrate } = useMovieLogs(user);
  const [segment, setSegment] = useState('movie');
  const Root = embedded ? View : SafeAreaView;

  useFocusEffect(useCallback(() => { hydrate(); }, [hydrate]));

  const visibleTitles = useMemo(
    () => titles.filter((item) => item.mediaType === segment),
    [segment, titles],
  );

  if (loading) {
    return (
      <Root style={styles.safeArea}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading titles...</Text>
        </View>
      </Root>
    );
  }

  return (
    <Root style={styles.safeArea}>
      <View style={styles.container}>
        {showHeader ? (
          <View style={styles.headerWrap}>
            <Text style={styles.title}>Titles</Text>
            <Text style={styles.subtitle}>Manage the catalog used by the movie logger.</Text>
          </View>
        ) : null}

        <View style={styles.segmentRow}>
          <SegmentedControl
            items={TITLE_TABS}
            selectedIndex={TITLE_TABS.findIndex((item) => item.key === segment)}
            onChange={(_, item) => setSegment(item.key)}
          />
          <TouchableOpacity
            style={styles.addButton}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('MovieTitleDetail', { mode: 'create', mediaType: segment })}
          >
            <Ionicons name="add" size={18} color={COLORS.bg} />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {visibleTitles.map((item) => (
            <TitleRow
              key={item.id}
              item={item}
              onPress={() => navigation.navigate('MovieTitleDetail', { titleId: item.id })}
            />
          ))}
          {!visibleTitles.length ? <Text style={styles.emptyText}>No titles yet.</Text> : null}
        </ScrollView>
      </View>
    </Root>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16, paddingTop: 8 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: COLORS.muted, fontSize: 13 },
  headerWrap: { marginBottom: 8, gap: 4 },
  title: { color: COLORS.text, fontSize: 30, fontWeight: '700' },
  subtitle: { color: COLORS.muted, fontSize: 12 },
  segmentRow: { gap: 10, marginBottom: 10 },
  addButton: {
    alignSelf: 'flex-end', minHeight: 44, borderRadius: 16, backgroundColor: COLORS.accent,
    paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  addButtonText: { color: COLORS.bg, fontSize: 14, fontWeight: '800' },
  listContent: { paddingBottom: 24, gap: 10 },
  titleCard: {
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(162,167,179,0.2)', backgroundColor: COLORS.card,
    paddingHorizontal: 14, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  titleCopy: { flex: 1 },
  titleText: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  titleMeta: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  emptyText: { color: COLORS.muted, fontSize: 13, textAlign: 'center', marginTop: 16 },
});
