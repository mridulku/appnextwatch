import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import COLORS from '../../../theme/colors';
import UI_TOKENS from '../../../ui/tokens';
import GymMyStatsScreen from '../gym/GymMyStatsScreen';
import GymProgramBannerCard from '../gym/components/GymProgramBannerCard';
import { useGymOnboardingState } from '../gym/onboarding/gymOnboardingStore';

function TestGymPlanLaterScreen({ navigation, route }) {
  const { onboardingCompleted } = useGymOnboardingState();
  const [showOnboardingToast, setShowOnboardingToast] = useState(false);

  useEffect(() => {
    if (!route.params?.onboardingToastTs) return;
    setShowOnboardingToast(true);
    const timer = setTimeout(() => setShowOnboardingToast(false), 2400);
    return () => clearTimeout(timer);
  }, [route.params?.onboardingToastTs]);

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
              onPress={() => navigation?.navigate('TestGymOnboardingInterview')}
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
              onPress={() => navigation?.navigate('TestGymOnboardingInterview')}
            >
              <Text style={styles.onboardingUpdateLinkText}>Update onboarding answers</Text>
              <Ionicons name="chevron-forward" size={14} color={COLORS.muted} />
            </TouchableOpacity>
          )}

          <GymProgramBannerCard onPress={() => navigation?.navigate('TestGymProgramTimeline')} />
          <Text style={styles.planSectionLabel}>My Stats</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
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
});

export default TestGymPlanLaterScreen;
