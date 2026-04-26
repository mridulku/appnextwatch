import { useMemo, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

import COLORS from '../../../theme/colors';
import UI_TOKENS from '../../../ui/tokens';
import SegmentedControl from '../../../ui/components/SegmentedControl';
import GymHomeScreen from '../../wellness/gym/GymHomeScreen';
import ExercisesHomeScreen from '../../wellness/gym/ExercisesHomeScreen';
import MusclesHomeScreen from '../../wellness/gym/muscles/MusclesHomeScreen';
import GymMyStatsScreen from '../../wellness/gym/GymMyStatsScreen';
import GymAiPromptsScreen from '../../wellness/gym/GymAiPromptsScreen';

const GYM_TABS = [
  { key: 'muscles', label: 'Muscles', icon: '💪' },
  { key: 'exercises', label: 'Exercises', icon: '🤸' },
  { key: 'machines', label: 'Machines', icon: '🏋️' },
  { key: 'profile', label: 'Profile', icon: '📊' },
  { key: 'aiPrompts', label: 'AI prompts', icon: '✨' },
];

function normalizeGymSegment(value) {
  if (value === 'exercises' || value === 'Exercises') return 'exercises';
  if (value === 'machines' || value === 'Machines') return 'machines';
  if (value === 'profile' || value === 'Profile') return 'profile';
  if (value === 'aiPrompts' || value === 'AI prompts' || value === 'ai prompts') return 'aiPrompts';
  return 'muscles';
}

export default function GymSettingsScreen({ navigation, route }) {
  const [segment, setSegment] = useState(normalizeGymSegment(route.params?.initialSubsegment));

  const content = useMemo(() => {
    if (segment === 'exercises') {
      return <ExercisesHomeScreen navigation={navigation} embedded showHeader={false} />;
    }
    if (segment === 'machines') {
      return <GymHomeScreen navigation={navigation} embedded showHeader={false} />;
    }
    if (segment === 'profile') {
      return <GymMyStatsScreen navigation={navigation} embedded showHeader={false} />;
    }
    if (segment === 'aiPrompts') {
      return <GymAiPromptsScreen navigation={navigation} embedded showHeader={false} />;
    }
    return <MusclesHomeScreen navigation={navigation} embedded showHeader={false} />;
  }, [segment, navigation]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.topCard}>
          <Text style={styles.title}>Gym settings</Text>
          <SegmentedControl
            items={GYM_TABS}
            selectedIndex={GYM_TABS.findIndex((item) => item.key === segment)}
            onChange={(_, item) => setSegment(item.key)}
          />
        </View>
        <View style={styles.contentWrap}>{content}</View>
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
});
