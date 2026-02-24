import { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

import ExercisesHomeScreen from './ExercisesHomeScreen';
import GymHomeScreen from './GymHomeScreen';
import MusclesHomeScreen from './muscles/MusclesHomeScreen';
import GymTemplatesHomeScreen from './GymTemplatesHomeScreen';
import SegmentedControl from '../../../ui/components/SegmentedControl';
import COLORS from '../../../theme/colors';
import UI_TOKENS from '../../../ui/tokens';
import GymChatScreen from './GymChatScreen';
import GymSessionsScreen from './GymSessionsScreen';

const PRIMARY_TABS = [
  { key: 'chat', label: 'Chat', icon: '💬' },
  { key: 'logs', label: 'Sessions', icon: '🗒️' },
  { key: 'library', label: 'Library', icon: '📚' },
];

const LIBRARY_TABS = [
  { key: 'templates', label: 'Templates', icon: '🧩' },
  { key: 'muscles', label: 'Muscles', icon: '💪' },
  { key: 'exercises', label: 'Exercises', icon: '🤸' },
  { key: 'machines', label: 'Machines', icon: '🏋️' },
];

function normalizePrimarySegment(value) {
  if (value === 'Chat' || value === 'chat') return 'chat';
  if (value === 'Logs' || value === 'logs') return 'logs';
  if (value === 'Library' || value === 'library') return 'library';
  if (value === 'Plan' || value === 'plan' || value === 'My Stats' || value === 'my_stats') return 'logs';
  if (value === 'Machines' || value === 'Exercises' || value === 'Muscles' || value === 'Templates') return 'library';
  return 'chat';
}

function normalizeLibrarySegment(value) {
  if (value === 'Templates' || value === 'templates') return 'templates';
  if (value === 'Exercises' || value === 'exercises') return 'exercises';
  if (value === 'Machines' || value === 'machines') return 'machines';
  return 'muscles';
}

function GymHubScreen({ navigation, route }) {
  const [segment, setSegment] = useState(normalizePrimarySegment(route.params?.initialSegment));
  const [librarySegment, setLibrarySegment] = useState(normalizeLibrarySegment(route.params?.initialSegment));

  useEffect(() => {
    const incoming = route.params?.initialSegment;
    setSegment(normalizePrimarySegment(incoming));
    if (incoming) setLibrarySegment(normalizeLibrarySegment(incoming));
  }, [route.params?.initialSegment]);

  const libraryContent = useMemo(() => {
    if (librarySegment === 'templates') {
      return <GymTemplatesHomeScreen navigation={navigation} embedded showHeader={false} />;
    }
    if (librarySegment === 'exercises') {
      return <ExercisesHomeScreen navigation={navigation} embedded showHeader={false} />;
    }
    if (librarySegment === 'machines') {
      return <GymHomeScreen navigation={navigation} embedded showHeader={false} />;
    }
    return <MusclesHomeScreen navigation={navigation} embedded showHeader={false} />;
  }, [librarySegment, navigation]);

  const renderContent = () => {
    if (segment === 'chat') {
      return <GymChatScreen />;
    }
    if (segment === 'logs') {
      return <GymSessionsScreen />;
    }
    return (
      <View style={styles.libraryWrap}>
        <View style={styles.libraryTabsWrap}>
          <SegmentedControl
            items={LIBRARY_TABS}
            selectedIndex={LIBRARY_TABS.findIndex((item) => item.key === librarySegment)}
            onChange={(_, item) => setLibrarySegment(item.key)}
            variant="secondary"
          />
        </View>
        <View style={styles.libraryContentWrap}>{libraryContent}</View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.topCard}>
          <Text style={styles.title}>Gym</Text>

          <SegmentedControl
            items={PRIMARY_TABS}
            selectedIndex={PRIMARY_TABS.findIndex((item) => item.key === segment)}
            onChange={(_, item) => setSegment(item.key)}
          />
        </View>

        <View style={styles.contentWrap}>{renderContent()}</View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  topCard: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(162,167,179,0.12)',
    backgroundColor: COLORS.bg,
  },
  title: {
    color: COLORS.text,
    fontSize: 29,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  contentWrap: {
    flex: 1,
    paddingBottom: UI_TOKENS.spacing.xs,
  },
  libraryWrap: {
    flex: 1,
  },
  libraryTabsWrap: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 2,
    backgroundColor: COLORS.bg,
  },
  libraryContentWrap: {
    flex: 1,
  },
});

export default GymHubScreen;
