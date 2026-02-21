import { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import ExercisesHomeScreen from './ExercisesHomeScreen';
import GymHomeScreen from './GymHomeScreen';
import GymLogsScreen from './GymLogsScreen';
import GymMyStatsScreen from './GymMyStatsScreen';
import MusclesHomeScreen from './muscles/MusclesHomeScreen';
import SegmentedControl from '../../../ui/components/SegmentedControl';
import COLORS from '../../../theme/colors';
import UI_TOKENS from '../../../ui/tokens';
import GymProgramBannerCard from './components/GymProgramBannerCard';
import { useGymOnboardingState } from './onboarding/gymOnboardingStore';
import GymChatScreen from './GymChatScreen';

const PRIMARY_TABS = [
  { key: 'chat', label: 'Chat', icon: '💬' },
  { key: 'logs', label: 'Sessions', icon: '🗒️' },
  { key: 'plan', label: 'Plan', icon: '🧭' },
  { key: 'library', label: 'Library', icon: '📚' },
];

const LIBRARY_TABS = [
  { key: 'muscles', label: 'Muscles', icon: '💪' },
  { key: 'exercises', label: 'Exercises', icon: '🤸' },
  { key: 'machines', label: 'Machines', icon: '🏋️' },
];

function normalizePrimarySegment(value) {
  if (value === 'Chat' || value === 'chat') return 'chat';
  if (value === 'Logs' || value === 'logs') return 'logs';
  if (value === 'Library' || value === 'library') return 'library';
  if (value === 'Plan' || value === 'plan' || value === 'My Stats' || value === 'my_stats') return 'plan';
  if (value === 'Machines' || value === 'Exercises' || value === 'Muscles') return 'library';
  return 'chat';
}

function normalizeLibrarySegment(value) {
  if (value === 'Exercises' || value === 'exercises') return 'exercises';
  if (value === 'Machines' || value === 'machines') return 'machines';
  return 'muscles';
}

function GymHubScreen({ navigation, route }) {
  const [segment, setSegment] = useState(normalizePrimarySegment(route.params?.initialSegment));
  const [librarySegment, setLibrarySegment] = useState(normalizeLibrarySegment(route.params?.initialSegment));
  const { onboardingCompleted } = useGymOnboardingState();
  const [showOnboardingToast, setShowOnboardingToast] = useState(false);

  useEffect(() => {
    const incoming = route.params?.initialSegment;
    setSegment(normalizePrimarySegment(incoming));
    if (incoming) setLibrarySegment(normalizeLibrarySegment(incoming));
  }, [route.params?.initialSegment]);

  useEffect(() => {
    if (!route.params?.onboardingToastTs) return;
    setShowOnboardingToast(true);
    const timer = setTimeout(() => setShowOnboardingToast(false), 2400);
    return () => clearTimeout(timer);
  }, [route.params?.onboardingToastTs]);

  const libraryContent = useMemo(() => {
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
    if (segment === 'plan') {
      return (
        <GymMyStatsScreen
          navigation={navigation}
          embedded
          showHeader={false}
          topContent={(
            <View style={styles.planTopWrap}>
              {showOnboardingToast ? (
                <View style={styles.onboardingToast}>
                  <Ionicons name="checkmark-circle" size={14} color="#79E3B9" />
                  <Text style={styles.onboardingToastText}>Onboarding saved. Plan personalized.</Text>
                </View>
              ) : null}

              {!onboardingCompleted ? (
                <TouchableOpacity
                  style={styles.onboardingCtaCard}
                  activeOpacity={0.92}
                  onPress={() => navigation?.navigate('OnboardingInterview')}
                >
                  <View style={styles.onboardingCtaLeft}>
                    <Text style={styles.onboardingCtaTitle}>Set up your plan</Text>
                    <Text style={styles.onboardingCtaSub}>Answer a few questions to personalize your block.</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.accent} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.onboardingUpdateLink}
                  activeOpacity={0.9}
                  onPress={() => navigation?.navigate('OnboardingInterview')}
                >
                  <Text style={styles.onboardingUpdateLinkText}>Update onboarding answers</Text>
                  <Ionicons name="chevron-forward" size={14} color={COLORS.muted} />
                </TouchableOpacity>
              )}

              <GymProgramBannerCard onPress={() => navigation?.navigate('ProgramTimeline')} />
              <Text style={styles.planSectionLabel}>My Stats</Text>
            </View>
          )}
        />
      );
    }
    if (segment === 'logs') {
      return <GymLogsScreen navigation={navigation} />;
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
  planTopWrap: {
    gap: UI_TOKENS.spacing.sm,
  },
  onboardingToast: {
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(113,228,179,0.44)',
    backgroundColor: 'rgba(113,228,179,0.14)',
    paddingHorizontal: UI_TOKENS.spacing.sm,
    paddingVertical: UI_TOKENS.spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  onboardingToastText: {
    color: '#79E3B9',
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
  onboardingCtaCard: {
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(245,201,106,0.42)',
    backgroundColor: 'rgba(245,201,106,0.1)',
    paddingHorizontal: UI_TOKENS.spacing.md,
    paddingVertical: UI_TOKENS.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: UI_TOKENS.spacing.sm,
  },
  onboardingCtaLeft: {
    flex: 1,
    minWidth: 0,
  },
  onboardingCtaTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 1,
    fontWeight: '700',
  },
  onboardingCtaSub: {
    marginTop: 2,
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
  onboardingUpdateLink: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.3)',
    backgroundColor: COLORS.card,
    paddingHorizontal: UI_TOKENS.spacing.sm,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  onboardingUpdateLinkText: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
  planSectionLabel: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta + 1,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
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
