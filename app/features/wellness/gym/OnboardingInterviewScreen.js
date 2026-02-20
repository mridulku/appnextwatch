import { Ionicons } from '@expo/vector-icons';
import { useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import COLORS from '../../../theme/colors';
import UI_TOKENS from '../../../ui/tokens';
import { useGymOnboardingState } from './onboarding/gymOnboardingStore';

const QUESTIONS = [
  {
    id: 'goal',
    title: 'What is your primary goal?',
    type: 'single',
    options: ['Strength', 'Hypertrophy', 'Fat loss', 'General fitness'],
    required: true,
  },
  {
    id: 'frequency',
    title: 'How many days can you train per week?',
    type: 'single',
    options: ['3', '4', '5', '6'],
    required: true,
  },
  {
    id: 'experience',
    title: 'How would you rate your training experience?',
    type: 'single',
    options: ['Beginner', 'Intermediate', 'Advanced'],
    required: true,
  },
  {
    id: 'sessionLength',
    title: 'Preferred session length?',
    type: 'single',
    options: ['30 min', '45 min', '60 min', '75 min'],
    required: true,
  },
  {
    id: 'splitPreference',
    title: 'Which split style do you prefer?',
    type: 'single',
    options: ['Push-Pull-Legs', 'Upper-Lower', 'Full Body'],
    required: true,
  },
  {
    id: 'constraints',
    title: 'Any constraints to consider?',
    type: 'multi',
    options: ['No injuries', 'Knee pain', 'Back sensitivity', 'Shoulder issues'],
    required: false,
  },
];

function QuestionOption({ label, selected, onPress, multi = false }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionButton,
        selected ? styles.optionButtonSelected : null,
        pressed ? styles.optionButtonPressed : null,
      ]}
    >
      <Text style={[styles.optionText, selected ? styles.optionTextSelected : null]}>{label}</Text>
      {selected ? (
        <Ionicons name={multi ? 'checkmark-circle' : 'checkmark-circle-outline'} size={16} color={COLORS.accent} />
      ) : null}
    </Pressable>
  );
}

function OnboardingInterviewScreen({ navigation }) {
  const { draft, setSingleAnswer, toggleConstraint, completeOnboarding } = useGymOnboardingState();
  const [stepIndex, setStepIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const opacity = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;

  const current = QUESTIONS[stepIndex];
  const totalSteps = QUESTIONS.length;
  const progress = (stepIndex + 1) / totalSteps;

  const selectedValue = useMemo(() => {
    if (!current) return null;
    return draft[current.id];
  }, [current, draft]);

  const stepAnswered = useMemo(() => {
    if (!current) return false;
    const value = draft[current.id];
    if (!current.required) return true;
    if (Array.isArray(value)) return value.length > 0;
    return Boolean(value);
  }, [current, draft]);

  const goToStep = (nextIndex, direction = 1) => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    }).start(() => {
      setStepIndex(nextIndex);
      translateX.setValue(direction * 16);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 170,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: 0,
          duration: 170,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const onContinue = () => {
    if (stepIndex === totalSteps - 1) {
      completeOnboarding();
      setFinished(true);
      return;
    }
    goToStep(stepIndex + 1, 1);
  };

  const onBackStep = () => {
    if (stepIndex === 0) {
      navigation.goBack();
      return;
    }
    goToStep(stepIndex - 1, -1);
  };

  const onFinish = () => {
    navigation.navigate({
      name: 'GymHome',
      params: {
        initialSegment: 'Plan',
        onboardingToastTs: Date.now(),
      },
      merge: true,
    });
  };

  if (finished) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.completeWrap}>
          <View style={styles.completeIconWrap}>
            <Ionicons name="checkmark" size={30} color={COLORS.accent} />
          </View>
          <Text style={styles.completeTitle}>Plan setup complete</Text>
          <Text style={styles.completeSubtitle}>We&apos;ll use this to shape your 12-week block.</Text>
          <TouchableOpacity style={styles.finishButton} activeOpacity={0.9} onPress={onFinish}>
            <Text style={styles.finishButtonText}>Go to Plan</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backIconButton} activeOpacity={0.9} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={18} color={COLORS.text} />
            <Text style={styles.backIconText}>Plan</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.progressWrap}>
          <Text style={styles.stepText}>Step {stepIndex + 1} of {totalSteps}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
        </View>

        <Animated.View style={[styles.questionArea, { opacity, transform: [{ translateX }] }]}>
          <Text style={styles.questionTitle} numberOfLines={2}>{current.title}</Text>

          <View style={styles.optionsWrap}>
            {current.options.map((option) => {
              const selected = Array.isArray(selectedValue)
                ? selectedValue.includes(option)
                : selectedValue === option;

              return (
                <QuestionOption
                  key={`${current.id}_${option}`}
                  label={option}
                  selected={selected}
                  multi={current.type === 'multi'}
                  onPress={() => {
                    if (current.type === 'multi') {
                      toggleConstraint(option);
                    } else {
                      setSingleAnswer(current.id, option);
                    }
                  }}
                />
              );
            })}
          </View>
        </Animated.View>

        <View style={styles.bottomCtaWrap}>
          <TouchableOpacity
            style={[styles.continueButton, !stepAnswered ? styles.continueButtonDisabled : null]}
            activeOpacity={stepAnswered ? 0.9 : 1}
            onPress={onContinue}
            disabled={!stepAnswered}
          >
            <Text style={[styles.continueButtonText, !stepAnswered ? styles.continueButtonTextDisabled : null]}>
              {stepIndex === totalSteps - 1 ? 'Finish' : 'Continue'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backStepButton} activeOpacity={0.9} onPress={onBackStep}>
            <Text style={styles.backStepText}>{stepIndex === 0 ? 'Back to plan' : 'Back'}</Text>
          </TouchableOpacity>
        </View>
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
    paddingHorizontal: UI_TOKENS.spacing.md,
    paddingTop: UI_TOKENS.spacing.xs,
    paddingBottom: UI_TOKENS.spacing.md,
  },
  topBar: {
    minHeight: 36,
    justifyContent: 'center',
  },
  backIconButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: UI_TOKENS.spacing.xs,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.3)',
    backgroundColor: COLORS.card,
  },
  backIconText: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
  progressWrap: {
    marginTop: UI_TOKENS.spacing.sm,
    gap: UI_TOKENS.spacing.xs,
  },
  stepText: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
  progressTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(162,167,179,0.2)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
  },
  questionArea: {
    flex: 1,
    paddingTop: UI_TOKENS.spacing.lg,
  },
  questionTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.title + 8,
    fontWeight: '700',
    lineHeight: UI_TOKENS.typography.title + 16,
    maxWidth: '96%',
  },
  optionsWrap: {
    marginTop: UI_TOKENS.spacing.lg,
    gap: UI_TOKENS.spacing.xs,
  },
  optionButton: {
    minHeight: 50,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.3)',
    backgroundColor: COLORS.card,
    paddingHorizontal: UI_TOKENS.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: UI_TOKENS.spacing.sm,
  },
  optionButtonPressed: {
    backgroundColor: COLORS.cardSoft,
  },
  optionButtonSelected: {
    borderColor: 'rgba(245,201,106,0.54)',
    backgroundColor: 'rgba(245,201,106,0.12)',
  },
  optionText: {
    flex: 1,
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 1,
    fontWeight: '600',
  },
  optionTextSelected: {
    color: COLORS.accent,
    fontWeight: '700',
  },
  bottomCtaWrap: {
    paddingTop: UI_TOKENS.spacing.sm,
    gap: UI_TOKENS.spacing.xs,
  },
  continueButton: {
    minHeight: 48,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(245,201,106,0.52)',
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonDisabled: {
    borderColor: 'rgba(162,167,179,0.3)',
    backgroundColor: 'rgba(162,167,179,0.16)',
  },
  continueButtonText: {
    color: COLORS.bg,
    fontSize: UI_TOKENS.typography.subtitle,
    fontWeight: '800',
  },
  continueButtonTextDisabled: {
    color: COLORS.muted,
  },
  backStepButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 34,
  },
  backStepText: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta + 1,
    fontWeight: '700',
  },
  completeWrap: {
    flex: 1,
    paddingHorizontal: UI_TOKENS.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: UI_TOKENS.spacing.sm,
  },
  completeIconWrap: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(245,201,106,0.48)',
    backgroundColor: 'rgba(245,201,106,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.title + 2,
    fontWeight: '700',
    textAlign: 'center',
  },
  completeSubtitle: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.subtitle,
    textAlign: 'center',
    maxWidth: '88%',
  },
  finishButton: {
    marginTop: UI_TOKENS.spacing.sm,
    minHeight: 46,
    minWidth: 180,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(245,201,106,0.5)',
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: UI_TOKENS.spacing.md,
  },
  finishButtonText: {
    color: COLORS.bg,
    fontSize: UI_TOKENS.typography.subtitle,
    fontWeight: '800',
  },
});

export default OnboardingInterviewScreen;

