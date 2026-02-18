import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  LayoutAnimation,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../../context/AuthContext';
import { addUserSelection, removeUserSelection } from '../../../core/api/catalogSelectionDb';
import { getOrCreateAppUser } from '../../../core/api/foodInventoryDb';
import { addSessionToHistory, createSessionHistoryId } from '../../../core/storage/sessionHistoryStorage';
import { getFoodRecipeById } from '../../../data/wellness/foodRecipes';
import COLORS from '../../../theme/colors';

const VOICE_COMMAND_SAMPLES = [
  'next step',
  'how much salt?',
  'pause timer',
  'repeat that',
  'how long remaining?',
];

const CHEF_GENERIC_RESPONSES = [
  'Got it. Keep the flame medium and watch for color change.',
  'Nice pace. Stir gently to keep texture right.',
  'Looks good. Taste once before moving to the next step.',
  'Perfect. Focus on aroma and slight oil separation as your cue.',
];

function formatClock(totalSeconds) {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function createInitialStepStates(recipe) {
  return recipe.steps.map((step) => ({
    status: 'pending',
    stepRemainingSeconds: step.suggestedMinutes ? step.suggestedMinutes * 60 : null,
  }));
}

function findCurrentStepIndex(stepStates, fallback = 0) {
  const inProgressIndex = stepStates.findIndex((step) => step.status === 'in_progress');
  if (inProgressIndex >= 0) return inProgressIndex;

  const pendingIndex = stepStates.findIndex((step) => step.status === 'pending');
  if (pendingIndex >= 0) return pendingIndex;

  return stepStates.length > 0 ? stepStates.length - 1 : fallback;
}

function createChatMessage(role, text) {
  return {
    id: `chef_chat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    role,
    text,
  };
}

function normalizeSessionRecipe(rawRecipe) {
  if (!rawRecipe || typeof rawRecipe !== 'object') return null;
  if (!Array.isArray(rawRecipe.steps) || rawRecipe.steps.length === 0) return null;

  return {
    id: String(rawRecipe.id ?? `session_recipe_${Date.now()}`),
    name: String(rawRecipe.name ?? 'Session Recipe'),
    emoji: String(rawRecipe.emoji ?? '🍽️'),
    imageColors: Array.isArray(rawRecipe.imageColors) && rawRecipe.imageColors.length >= 2
      ? rawRecipe.imageColors
      : ['#5D84B9', '#324A72'],
    totalTimeMinutes: Math.max(5, Number(rawRecipe.totalTimeMinutes) || 20),
    servings: Math.max(1, Number(rawRecipe.servings) || 2),
    difficulty: String(rawRecipe.difficulty ?? 'Easy'),
    tags: Array.isArray(rawRecipe.tags) ? rawRecipe.tags.map((tag) => String(tag)) : ['Session'],
    ingredients: Array.isArray(rawRecipe.ingredients)
      ? rawRecipe.ingredients.map((item) => String(item))
      : [],
    steps: rawRecipe.steps.map((step, index) => ({
      id: String(step.id ?? `session_step_${index}`),
      title: String(step.title ?? `Step ${index + 1}`),
      instruction: String(step.instruction ?? ''),
      suggestedMinutes: Math.max(1, Number(step.suggestedMinutes) || 2),
      emoji: String(step.emoji ?? '🧑‍🍳'),
    })),
  };
}

function CookRecipeScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isSessionMode = Boolean(route.params?.sessionMode);
  const savedRecipeId = route.params?.savedRecipeId;
  const canManageSaved = !isSessionMode && Boolean(savedRecipeId);
  const recipe = useMemo(() => {
    const sessionRecipe = normalizeSessionRecipe(route.params?.sessionRecipe);
    if (sessionRecipe) return sessionRecipe;
    return getFoodRecipeById(route.params?.recipeId);
  }, [route.params?.recipeId, route.params?.sessionRecipe]);

  const totalRecipeSeconds = recipe.totalTimeMinutes * 60;

  const [stepStates, setStepStates] = useState(() => createInitialStepStates(recipe));
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [expandedStepMap, setExpandedStepMap] = useState({});
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [sessionStartedAt, setSessionStartedAt] = useState(
    route.params?.startedAt ?? new Date().toISOString(),
  );

  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    createChatMessage('chef', 'Chef assistant is ready. Ask anything or tap mic for quick commands.'),
  ]);
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [isMutatingSaved, setIsMutatingSaved] = useState(false);
  const [isSaved, setIsSaved] = useState(route.params?.isAdded ?? true);

  const [toastMessage, setToastMessage] = useState('');

  const stepListRef = useRef(null);
  const chatListRef = useRef(null);
  const chatAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const voicePulse = useRef(new Animated.Value(1)).current;
  const toastAnim = useRef(new Animated.Value(0)).current;

  const voiceTimeoutRef = useRef(null);
  const toastTimeoutRef = useRef(null);
  const hasSessionLoggedRef = useRef(false);
  const latestSnapshotRef = useRef({
    elapsedSeconds: 0,
    stepStates: createInitialStepStates(recipe),
    completedCount: 0,
    sessionStartedAt: route.params?.startedAt ?? new Date().toISOString(),
  });

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    setStepStates(createInitialStepStates(recipe));
    setActiveStepIndex(0);
    setExpandedStepMap({ [recipe.steps[0]?.id]: true });
    setElapsedSeconds(0);
    setIsTimerRunning(false);
    setSessionStartedAt(route.params?.startedAt ?? new Date().toISOString());
    setChatOpen(false);
    setChatInput('');
    setChatMessages([
      createChatMessage('chef', `Starting ${recipe.name}. Ask for next step, timer updates, or substitutions.`),
    ]);
    progressAnim.setValue(0);
    hasSessionLoggedRef.current = false;
  }, [progressAnim, recipe, route.params?.startedAt]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        setIsTimerRunning(false);
      };
    }, []),
  );

  useEffect(() => {
    if (!isTimerRunning) return undefined;

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => Math.min(prev + 1, totalRecipeSeconds));

      setStepStates((prev) => {
        const inProgressIndex = prev.findIndex((step) => step.status === 'in_progress');
        if (inProgressIndex < 0) return prev;

        const current = prev[inProgressIndex];
        if (current.stepRemainingSeconds === null || current.stepRemainingSeconds <= 0) return prev;

        const next = [...prev];
        next[inProgressIndex] = {
          ...current,
          stepRemainingSeconds: Math.max(0, current.stepRemainingSeconds - 1),
        };
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning, totalRecipeSeconds]);

  useEffect(() => {
    if (elapsedSeconds >= totalRecipeSeconds && isTimerRunning) {
      setIsTimerRunning(false);
    }
  }, [elapsedSeconds, isTimerRunning, totalRecipeSeconds]);

  const progressRatio = useMemo(
    () => (totalRecipeSeconds > 0 ? elapsedSeconds / totalRecipeSeconds : 0),
    [elapsedSeconds, totalRecipeSeconds],
  );

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progressRatio,
      duration: 420,
      useNativeDriver: false,
    }).start();
  }, [progressAnim, progressRatio]);

  useEffect(() => {
    Animated.timing(chatAnim, {
      toValue: chatOpen ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [chatAnim, chatOpen]);

  useEffect(() => {
    if (!isVoiceListening) {
      voicePulse.setValue(1);
      return undefined;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(voicePulse, {
          toValue: 1.18,
          duration: 420,
          useNativeDriver: true,
        }),
        Animated.timing(voicePulse, {
          toValue: 1,
          duration: 420,
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [isVoiceListening, voicePulse]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      chatListRef.current?.scrollToEnd({ animated: true });
    }, 60);

    return () => clearTimeout(timeout);
  }, [chatMessages, chatOpen]);

  const createHistoryRecord = useCallback(
    (status, snapshot) => ({
      id: String(route.params?.sessionId ?? createSessionHistoryId('cooking')),
      type: 'cooking',
      title: String(route.params?.sessionTitle ?? `Cooked: ${recipe.name}`),
      startedAt:
        snapshot.sessionStartedAt ??
        new Date(Date.now() - Math.max(0, snapshot.elapsedSeconds) * 1000).toISOString(),
      endedAt: new Date().toISOString(),
      durationSeconds: Math.max(0, Number(snapshot.elapsedSeconds) || 0),
      status,
      summary: {
        recipeName: recipe.name,
        stepsCompleted: snapshot.completedCount,
        totalSteps: recipe.steps.length,
        activeTimeMinutes: Math.round((Number(snapshot.elapsedSeconds) || 0) / 60),
        timeline: recipe.steps.map((step, index) => ({
          title: step.title,
          status: snapshot.stepStates[index]?.status ?? 'pending',
          note: `Step ${index + 1}`,
        })),
      },
    }),
    [recipe.name, recipe.steps, route.params?.sessionId, route.params?.sessionTitle],
  );

  const persistSessionRecord = useCallback(
    async (status, shouldOpenSummary = true) => {
      if (!isSessionMode || hasSessionLoggedRef.current) return null;
      const snapshot = latestSnapshotRef.current;
      if ((snapshot.elapsedSeconds ?? 0) <= 0 && status === 'abandoned') return null;

      const record = createHistoryRecord(status, snapshot);
      hasSessionLoggedRef.current = true;
      await addSessionToHistory(record);

      if (shouldOpenSummary && navigation?.navigate) {
        navigation.navigate('SessionSummary', { sessionRecord: record });
      }

      return record;
    },
    [createHistoryRecord, isSessionMode, navigation],
  );

  useEffect(
    () => () => {
      if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);

      if (isSessionMode && !hasSessionLoggedRef.current) {
        const snapshot = latestSnapshotRef.current;
        if ((snapshot.elapsedSeconds ?? 0) > 0) {
          void addSessionToHistory(createHistoryRecord('abandoned', snapshot));
          hasSessionLoggedRef.current = true;
        }
      }
    },
    [createHistoryRecord, isSessionMode],
  );

  const currentStepIndex = useMemo(
    () => findCurrentStepIndex(stepStates, activeStepIndex),
    [stepStates, activeStepIndex],
  );

  const currentStep = recipe.steps[currentStepIndex] ?? recipe.steps[0];
  const remainingSeconds = Math.max(0, totalRecipeSeconds - elapsedSeconds);
  const completedCount = stepStates.filter((step) => step.status === 'done').length;
  const allStepsDone = completedCount === recipe.steps.length;
  const inProgressIndex = stepStates.findIndex((step) => step.status === 'in_progress');

  useEffect(() => {
    latestSnapshotRef.current = {
      elapsedSeconds,
      stepStates,
      completedCount,
      sessionStartedAt,
    };
  }, [completedCount, elapsedSeconds, sessionStartedAt, stepStates]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const chatTranslate = chatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  const toastTranslate = toastAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });

  const appendChat = useCallback((role, text) => {
    setChatMessages((prev) => [...prev, createChatMessage(role, text)]);
  }, []);

  const showToast = useCallback((message) => {
    setToastMessage(message);
    Animated.timing(toastAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();

    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }, 2200);
  }, [toastAnim]);

  const animateStepTransition = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  };

  const scrollToStep = useCallback((index) => {
    if (index < 0) return;
    setTimeout(() => {
      stepListRef.current?.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.38,
      });
    }, 80);
  }, []);

  const startStep = useCallback(
    (index, options = {}) => {
      const { startTimer = false } = options;
      if (index < 0 || index >= stepStates.length) return;

      animateStepTransition();
      setStepStates((prev) =>
        prev.map((step, idx) => {
          if (step.status === 'done') return step;
          if (idx === index) return { ...step, status: 'in_progress' };
          if (step.status === 'in_progress') return { ...step, status: 'pending' };
          return step;
        }),
      );
      setActiveStepIndex(index);
      setExpandedStepMap((prev) => ({ ...prev, [recipe.steps[index].id]: true }));
      scrollToStep(index);

      if (startTimer && !allStepsDone) {
        setIsTimerRunning(true);
      }
    },
    [allStepsDone, recipe.steps, scrollToStep, stepStates.length],
  );

  const markStepDone = useCallback(
    (index) => {
      if (index < 0 || index >= stepStates.length) {
        return { completed: false, nextIndex: -1 };
      }

      const nextIndex = stepStates.findIndex((step, idx) => idx > index && step.status !== 'done');

      animateStepTransition();
      setStepStates((prev) =>
        prev.map((step, idx) => {
          if (idx === index) return { ...step, status: 'done' };
          if (nextIndex !== -1 && idx === nextIndex) return { ...step, status: 'in_progress' };
          if (nextIndex !== -1 && step.status === 'in_progress' && idx !== nextIndex) {
            return { ...step, status: 'pending' };
          }
          return step;
        }),
      );

      if (nextIndex !== -1) {
        setActiveStepIndex(nextIndex);
        setExpandedStepMap((prev) => ({ ...prev, [recipe.steps[nextIndex].id]: true }));
        scrollToStep(nextIndex);
        return { completed: false, nextIndex };
      }

      setIsTimerRunning(false);
      showToast('Recipe complete 🎉');
      return { completed: true, nextIndex: -1 };
    },
    [recipe.steps, scrollToStep, showToast, stepStates],
  );

  const goToNextStep = useCallback(() => {
    if (allStepsDone) {
      showToast('Recipe complete 🎉');
      return { ok: false, message: 'All steps are done. Recipe complete 🎉' };
    }

    const nextIndex = stepStates.findIndex((step, idx) => idx > currentStepIndex && step.status !== 'done');

    if (nextIndex === -1) {
      return {
        ok: false,
        message: 'No next step available yet. Mark the current step done first.',
      };
    }

    startStep(nextIndex, { startTimer: isTimerRunning });
    return {
      ok: true,
      message: `Moving to Step ${nextIndex + 1}: ${recipe.steps[nextIndex].title}.`,
    };
  }, [allStepsDone, currentStepIndex, isTimerRunning, recipe.steps, showToast, startStep, stepStates]);

  const completeCurrentStep = useCallback(() => {
    if (allStepsDone) {
      showToast('Recipe complete 🎉');
      return 'All steps are already complete.';
    }

    const targetIndex = stepStates[currentStepIndex]?.status === 'done'
      ? stepStates.findIndex((step) => step.status !== 'done')
      : currentStepIndex;

    if (targetIndex === -1) {
      showToast('Recipe complete 🎉');
      return 'All steps are already complete.';
    }

    const result = markStepDone(targetIndex);
    if (result.completed) return 'Great finish. Recipe complete 🎉';
    return `Step ${targetIndex + 1} done. Continue with Step ${result.nextIndex + 1}.`;
  }, [allStepsDone, currentStepIndex, markStepDone, showToast, stepStates]);

  const finishSession = useCallback(() => {
    if (!isSessionMode) return;
    if (allStepsDone) {
      void persistSessionRecord('completed', true);
      return;
    }
    void persistSessionRecord('abandoned', true);
  }, [allStepsDone, isSessionMode, persistSessionRecord]);

  useEffect(() => {
    if (!isSessionMode || !allStepsDone || hasSessionLoggedRef.current) return;
    void persistSessionRecord('completed', true);
  }, [allStepsDone, isSessionMode, persistSessionRecord]);

  const toggleTimer = useCallback(() => {
    if (allStepsDone) {
      showToast('Recipe complete 🎉');
      return;
    }

    if (isTimerRunning) {
      setIsTimerRunning(false);
      return;
    }

    const currentState = stepStates[currentStepIndex];
    if (!currentState || currentState.status === 'pending') {
      startStep(currentStepIndex);
    }

    setIsTimerRunning(true);
  }, [allStepsDone, currentStepIndex, isTimerRunning, showToast, startStep, stepStates]);

  const toggleStepExpand = (stepId) => {
    animateStepTransition();
    setExpandedStepMap((prev) => ({ ...prev, [stepId]: !prev[stepId] }));
  };

  const processChefCommand = useCallback(
    (rawInput) => {
      const text = rawInput.trim();
      if (!text) return;

      setChatOpen(true);
      appendChat('user', text);
      setChatInput('');

      const normalized = text.toLowerCase();
      let reply = CHEF_GENERIC_RESPONSES[Math.floor(Math.random() * CHEF_GENERIC_RESPONSES.length)];

      if (normalized.includes('next')) {
        const result = goToNextStep();
        reply = result.message;
      } else if (normalized.includes('repeat')) {
        reply = `Step ${currentStepIndex + 1}: ${currentStep.instruction}`;
      } else if (normalized.includes('pause') && normalized.includes('timer')) {
        setIsTimerRunning(false);
        reply = 'Timer paused. Resume when you are ready.';
      } else if (
        normalized.includes('resume') ||
        normalized.includes('start timer') ||
        normalized.includes('start cooking')
      ) {
        if (!allStepsDone) {
          if (stepStates[currentStepIndex]?.status === 'pending') {
            startStep(currentStepIndex);
          }
          setIsTimerRunning(true);
          reply = 'Timer resumed. Keep going with controlled heat.';
        } else {
          reply = 'Recipe is already complete 🎉';
        }
      } else if (
        normalized.includes('how long') ||
        normalized.includes('remaining') ||
        normalized.includes('timer')
      ) {
        reply = `Timer update: ${formatClock(remainingSeconds)} remaining, ${formatClock(elapsedSeconds)} elapsed.`;
      } else if (normalized.includes('done')) {
        reply = completeCurrentStep();
      } else if (normalized.includes('salt')) {
        const saltLine = recipe.ingredients.find((item) => item.toLowerCase().includes('salt'));
        reply = saltLine
          ? `Use ${saltLine}. Add gradually and taste before finishing.`
          : 'Use a small pinch first, then adjust after tasting.';
      }

      appendChat('chef', reply);
    },
    [
      allStepsDone,
      appendChat,
      completeCurrentStep,
      currentStep,
      currentStepIndex,
      elapsedSeconds,
      goToNextStep,
      recipe.ingredients,
      remainingSeconds,
      startStep,
      stepStates,
    ],
  );

  const handleSendChat = () => {
    processChefCommand(chatInput);
  };

  const triggerVoiceCommand = () => {
    if (isVoiceListening) return;

    setIsVoiceListening(true);
    if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);

    voiceTimeoutRef.current = setTimeout(() => {
      setIsVoiceListening(false);
      const randomCommand =
        VOICE_COMMAND_SAMPLES[Math.floor(Math.random() * VOICE_COMMAND_SAMPLES.length)];
      processChefCommand(randomCommand);
    }, 1000);
  };

  const renderStepCard = ({ item, index }) => {
    const state = stepStates[index] ?? { status: 'pending', stepRemainingSeconds: null };
    const isInProgress = state.status === 'in_progress';
    const isDone = state.status === 'done';
    const isPending = state.status === 'pending';
    const isExpanded = expandedStepMap[item.id] || isInProgress;

    const shouldDim = inProgressIndex >= 0 && index !== inProgressIndex && !isDone;

    return (
      <View
        style={[
          styles.stepCard,
          isInProgress && styles.stepCardActive,
          isDone && styles.stepCardDone,
          shouldDim && styles.stepCardDimmed,
        ]}
      >
        <View style={styles.stepCardTopRow}>
          <View style={styles.stepIndexWrap}>
            <Text style={styles.stepIndexText}>Step {index + 1}</Text>
            <Text style={styles.stepEmoji}>{item.emoji}</Text>
          </View>

          <View
            style={[
              styles.stepStatusBadge,
              isPending && styles.stepPendingBadge,
              isInProgress && styles.stepProgressBadge,
              isDone && styles.stepDoneBadge,
            ]}
          >
            <Text
              style={[
                styles.stepStatusText,
                isPending && styles.stepPendingText,
                isInProgress && styles.stepProgressText,
                isDone && styles.stepDoneText,
              ]}
            >
              {isDone ? 'Done' : isInProgress ? 'In progress' : 'Pending'}
            </Text>
          </View>
        </View>

        <Text style={styles.stepTitle}>{item.title}</Text>
        <Text style={styles.stepInstruction} numberOfLines={isExpanded ? undefined : 2}>
          {item.instruction}
        </Text>

        <View style={styles.stepMetaRow}>
          <View style={styles.stepTimeChip}>
            <Ionicons name="time-outline" size={12} color={COLORS.muted} />
            <Text style={styles.stepTimeText}>~{item.suggestedMinutes} min</Text>
          </View>

          {isInProgress && state.stepRemainingSeconds !== null ? (
            <View style={styles.stepCountdownChip}>
              <Text style={styles.stepCountdownText}>{formatClock(state.stepRemainingSeconds)}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.stepActionsRow}>
          <TouchableOpacity
            style={styles.expandButton}
            activeOpacity={0.9}
            onPress={() => toggleStepExpand(item.id)}
          >
            <Text style={styles.expandButtonText}>{isExpanded ? 'Collapse' : 'Expand'}</Text>
          </TouchableOpacity>

          {isPending ? (
            <TouchableOpacity
              style={styles.stepPrimaryButton}
              activeOpacity={0.9}
              onPress={() => startStep(index, { startTimer: true })}
            >
              <Text style={styles.stepPrimaryText}>Start step</Text>
            </TouchableOpacity>
          ) : null}

          {isInProgress ? (
            <TouchableOpacity
              style={styles.stepPrimaryButton}
              activeOpacity={0.9}
              onPress={() => markStepDone(index)}
            >
              <Text style={styles.stepPrimaryText}>Mark done</Text>
            </TouchableOpacity>
          ) : null}

          {isDone ? (
            <View style={styles.stepDoneInline}>
              <Ionicons name="checkmark-circle" size={15} color="#6EE7A5" />
              <Text style={styles.stepDoneInlineText}>Completed</Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  const controlsBottom = Math.max(insets.bottom, 10);

  const toggleSavedRecipe = () => {
    if (!canManageSaved || isMutatingSaved) return;

    const actionLabel = isSaved ? 'Remove' : 'Add';
    const actionMessage = isSaved
      ? 'This recipe will be removed from your saved recipes.'
      : 'This recipe will be added to your saved recipes.';

    Alert.alert(`${actionLabel} recipe?`, actionMessage, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: actionLabel,
        style: isSaved ? 'destructive' : 'default',
        onPress: async () => {
          try {
            setIsMutatingSaved(true);
            const appUser = await getOrCreateAppUser({
              username: user?.username || 'demo user',
              name: user?.name || 'Demo User',
            });
            await (isSaved ? removeUserSelection({
              table: 'user_recipes',
              userId: appUser.id,
              fkColumn: 'recipe_id',
              fkValue: savedRecipeId,
            }) : addUserSelection({
              table: 'user_recipes',
              userId: appUser.id,
              fkColumn: 'recipe_id',
              fkValue: savedRecipeId,
            }));
            setIsSaved(!isSaved);
          } catch (error) {
            showToast(error?.message || `Could not ${isSaved ? 'remove' : 'add'} recipe`);
          } finally {
            setIsMutatingSaved(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <FlatList
          ref={stepListRef}
          data={recipe.steps}
          keyExtractor={(item) => item.id}
          renderItem={renderStepCard}
          showsVerticalScrollIndicator={false}
          onScrollToIndexFailed={() => {}}
          contentContainerStyle={{ paddingBottom: 190 + insets.bottom }}
          ListHeaderComponent={
            <View>
              <LinearGradient
                colors={recipe.imageColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroCard}
              >
                <View style={styles.heroTopLine}>
                  <Text style={styles.heroTitle}>{recipe.name}</Text>
                  <Text style={styles.heroEmojiLarge}>{recipe.emoji}</Text>
                </View>

                <View style={styles.heroChipsRow}>
                  <View style={styles.heroChip}>
                    <Ionicons name="time-outline" size={13} color={COLORS.text} />
                    <Text style={styles.heroChipText}>{recipe.totalTimeMinutes} min</Text>
                  </View>
                  <View style={styles.heroChip}>
                    <Ionicons name="flame-outline" size={13} color={COLORS.text} />
                    <Text style={styles.heroChipText}>{recipe.difficulty}</Text>
                  </View>
                  <View style={styles.heroChip}>
                    <Ionicons name="people-outline" size={13} color={COLORS.text} />
                    <Text style={styles.heroChipText}>{recipe.servings} servings</Text>
                  </View>
                </View>
              </LinearGradient>

              <View style={styles.dashboardCard}>
                <View style={styles.dashboardTopRow}>
                  <View style={styles.dashboardStat}>
                    <Text style={styles.dashboardLabel}>Elapsed</Text>
                    <Text style={styles.dashboardValue}>{formatClock(elapsedSeconds)}</Text>
                  </View>
                  <View style={styles.dashboardStat}>
                    <Text style={styles.dashboardLabel}>Remaining</Text>
                    <Text style={styles.dashboardValue}>{formatClock(remainingSeconds)}</Text>
                  </View>
                  <View style={styles.dashboardStat}>
                    <Text style={styles.dashboardLabel}>Current step</Text>
                    <Text style={styles.dashboardValue}>#{currentStepIndex + 1}</Text>
                  </View>
                </View>

                <View style={styles.progressTrack}>
                  <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
                </View>

                <View style={styles.dashboardBottomRow}>
                  <Text style={styles.dashboardBottomText}>
                    {completedCount}/{recipe.steps.length} steps completed
                  </Text>
                  <Text style={styles.dashboardBottomText}>
                    {allStepsDone ? 'Recipe complete 🎉' : `Now: ${currentStep.title}`}
                  </Text>
                </View>
              </View>

              <View style={styles.ingredientsCard}>
                <Text style={styles.ingredientsTitle}>Ingredients</Text>
                <View style={styles.ingredientsWrap}>
                  {recipe.ingredients.map((item) => (
                    <View key={`${recipe.id}_${item}`} style={styles.ingredientChip}>
                      <Text style={styles.ingredientText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <Text style={styles.stepsTitle}>Guided Steps</Text>
            </View>
          }
        />
      </View>

      <Animated.View
        pointerEvents={chatOpen ? 'auto' : 'none'}
        style={[
          styles.chatPanel,
          {
            bottom: controlsBottom + 88,
            opacity: chatAnim,
            transform: [{ translateY: chatTranslate }],
          },
        ]}
      >
        <View style={styles.chatHeader}>
          <Text style={styles.chatTitle}>Chef Chat</Text>
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.chatCloseButton}
            onPress={() => setChatOpen(false)}
          >
            <Ionicons name="chevron-down" size={16} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <FlatList
          ref={chatListRef}
          data={chatMessages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={[styles.chatBubble, item.role === 'user' ? styles.userBubble : styles.chefBubble]}>
              <Text style={[styles.chatBubbleText, item.role === 'user' && styles.userBubbleText]}>
                {item.text}
              </Text>
            </View>
          )}
          contentContainerStyle={styles.chatMessagesContent}
          showsVerticalScrollIndicator={false}
        />

        <View style={styles.chatComposerRow}>
          <TextInput
            style={styles.chatInput}
            value={chatInput}
            onChangeText={setChatInput}
            placeholder="Ask chef or type a command"
            placeholderTextColor={COLORS.muted}
            onSubmitEditing={handleSendChat}
            returnKeyType="send"
          />
          <TouchableOpacity style={styles.chatSendButton} activeOpacity={0.9} onPress={handleSendChat}>
            <Ionicons name="send" size={14} color={COLORS.bg} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <View style={[styles.cookingBar, { bottom: controlsBottom }]}>
        <Pressable style={styles.micButtonWrap} onPress={triggerVoiceCommand}>
          <Animated.View style={[styles.micButton, { transform: [{ scale: voicePulse }] }]}>
            <Ionicons name="mic" size={16} color={COLORS.bg} />
          </Animated.View>
          <Text style={styles.micHint}>{isVoiceListening ? 'Listening...' : 'Voice'}</Text>
        </Pressable>

        <View style={styles.centerControlsWrap}>
          <Text style={styles.nowCookingTitle}>{allStepsDone ? 'Recipe complete' : 'Now Cooking'}</Text>
          <Text style={styles.nowCookingSub} numberOfLines={1}>
            {allStepsDone ? 'Great finish.' : `Step ${currentStepIndex + 1}: ${currentStep.title}`}
          </Text>

          <View style={styles.controlButtonsRow}>
            <TouchableOpacity
              style={[styles.controlButton, styles.controlButtonPrimary]}
              activeOpacity={0.9}
              onPress={toggleTimer}
            >
              <Text style={styles.controlPrimaryText}>{isTimerRunning ? 'Pause' : 'Start'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              activeOpacity={0.9}
              onPress={() => goToNextStep()}
            >
              <Ionicons name="play-forward" size={14} color={COLORS.text} />
              <Text style={styles.controlText}>Next</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              activeOpacity={0.9}
              onPress={() => completeCurrentStep()}
            >
              <Ionicons name="checkmark-done" size={14} color={COLORS.text} />
              <Text style={styles.controlText}>Done</Text>
            </TouchableOpacity>

            {isSessionMode ? (
              <TouchableOpacity
                style={[styles.controlButton, allStepsDone ? styles.controlButtonPrimary : null]}
                activeOpacity={0.9}
                onPress={finishSession}
              >
                <Ionicons
                  name={allStepsDone ? 'checkmark-circle' : 'stop-circle-outline'}
                  size={14}
                  color={allStepsDone ? COLORS.bg : COLORS.text}
                />
                <Text style={allStepsDone ? styles.controlPrimaryText : styles.controlText}>
                  Finish
                </Text>
              </TouchableOpacity>
            ) : null}

            {canManageSaved ? (
              <TouchableOpacity
                style={[styles.controlButton, isSaved ? styles.controlButtonDanger : styles.controlButtonPrimary]}
                activeOpacity={0.9}
                onPress={toggleSavedRecipe}
                disabled={isMutatingSaved}
              >
                {isMutatingSaved ? (
                  <ActivityIndicator size="small" color={isSaved ? '#FFB4A8' : COLORS.bg} />
                ) : (
                  <>
                    <Ionicons
                      name={isSaved ? 'trash-outline' : 'add-circle-outline'}
                      size={14}
                      color={isSaved ? '#FFB4A8' : COLORS.bg}
                    />
                    <Text style={isSaved ? styles.controlDangerText : styles.controlPrimaryText}>
                      {isSaved ? 'Remove' : 'Add'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.chatToggleButton, chatOpen && styles.chatToggleButtonActive]}
          activeOpacity={0.9}
          onPress={() => setChatOpen((prev) => !prev)}
        >
          <Ionicons name="chatbubble-ellipses" size={16} color={chatOpen ? COLORS.bg : COLORS.text} />
          <Text style={[styles.chatToggleText, chatOpen && styles.chatToggleTextActive]}>Chat</Text>
        </TouchableOpacity>
      </View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.toast,
          {
            bottom: controlsBottom + 86,
            opacity: toastAnim,
            transform: [{ translateY: toastTranslate }],
          },
        ]}
      >
        <Text style={styles.toastText}>{toastMessage}</Text>
      </Animated.View>
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
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  heroCard: {
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
  },
  heroTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroTitle: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: '700',
    flex: 1,
    paddingRight: 8,
  },
  heroEmojiLarge: {
    fontSize: 36,
  },
  heroChipsRow: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  heroChip: {
    borderRadius: 999,
    backgroundColor: 'rgba(12,14,20,0.26)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  heroChipText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '600',
  },
  dashboardCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.24)',
    padding: 12,
    marginBottom: 12,
  },
  dashboardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  dashboardStat: {
    flex: 1,
  },
  dashboardLabel: {
    color: COLORS.muted,
    fontSize: 11,
  },
  dashboardValue: {
    color: COLORS.text,
    fontSize: 17,
    marginTop: 4,
    fontWeight: '700',
  },
  progressTrack: {
    marginTop: 12,
    height: 8,
    borderRadius: 999,
    backgroundColor: COLORS.cardSoft,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
  },
  dashboardBottomRow: {
    marginTop: 9,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  dashboardBottomText: {
    color: COLORS.muted,
    fontSize: 11,
    flex: 1,
  },
  ingredientsCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    padding: 12,
    marginBottom: 12,
  },
  ingredientsTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  ingredientsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  ingredientChip: {
    borderRadius: 10,
    backgroundColor: COLORS.cardSoft,
    borderWidth: 1,
    borderColor: 'rgba(90,209,232,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  ingredientText: {
    color: COLORS.accent2,
    fontSize: 10,
    fontWeight: '600',
  },
  stepsTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
  },
  stepCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
  },
  stepCardActive: {
    borderColor: 'rgba(245,201,106,0.5)',
    backgroundColor: '#1C202B',
  },
  stepCardDone: {
    opacity: 0.88,
    borderColor: 'rgba(110,231,165,0.38)',
    paddingVertical: 10,
  },
  stepCardDimmed: {
    opacity: 0.68,
  },
  stepCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepIndexWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  stepIndexText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  stepEmoji: {
    fontSize: 14,
  },
  stepStatusBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
  },
  stepPendingBadge: {
    borderColor: 'rgba(162,167,179,0.28)',
    backgroundColor: 'rgba(162,167,179,0.12)',
  },
  stepProgressBadge: {
    borderColor: 'rgba(245,201,106,0.4)',
    backgroundColor: 'rgba(245,201,106,0.16)',
  },
  stepDoneBadge: {
    borderColor: 'rgba(110,231,165,0.45)',
    backgroundColor: 'rgba(110,231,165,0.15)',
  },
  stepStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  stepPendingText: {
    color: COLORS.muted,
  },
  stepProgressText: {
    color: COLORS.accent,
  },
  stepDoneText: {
    color: '#6EE7A5',
  },
  stepTitle: {
    color: COLORS.text,
    marginTop: 9,
    fontSize: 15,
    fontWeight: '700',
  },
  stepInstruction: {
    color: COLORS.muted,
    marginTop: 5,
    fontSize: 13,
    lineHeight: 18,
  },
  stepMetaRow: {
    marginTop: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepTimeChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.3)',
    backgroundColor: COLORS.cardSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  stepTimeText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  stepCountdownChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(245,201,106,0.45)',
    backgroundColor: 'rgba(245,201,106,0.16)',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  stepCountdownText: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  stepActionsRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  expandButton: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.34)',
  },
  expandButtonText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  stepPrimaryButton: {
    borderRadius: 10,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  stepPrimaryText: {
    color: COLORS.bg,
    fontSize: 12,
    fontWeight: '700',
  },
  stepDoneInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(110,231,165,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(110,231,165,0.35)',
  },
  stepDoneInlineText: {
    color: '#6EE7A5',
    fontSize: 11,
    fontWeight: '700',
  },
  chatPanel: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: '#121722',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.26)',
    maxHeight: 290,
    overflow: 'hidden',
  },
  chatHeader: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(162,167,179,0.2)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  chatCloseButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
  },
  chatMessagesContent: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 7,
  },
  chatBubble: {
    maxWidth: '90%',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  chefBubble: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.card,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.accent,
  },
  chatBubbleText: {
    color: COLORS.text,
    fontSize: 12,
    lineHeight: 17,
  },
  userBubbleText: {
    color: COLORS.bg,
    fontWeight: '600',
  },
  chatComposerRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(162,167,179,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chatInput: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.3)',
    backgroundColor: COLORS.card,
    color: COLORS.text,
    paddingHorizontal: 10,
    fontSize: 12,
  },
  chatSendButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cookingBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: 'rgba(14,15,20,0.97)',
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  micButtonWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 56,
  },
  micButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micHint: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 4,
  },
  centerControlsWrap: {
    flex: 1,
  },
  nowCookingTitle: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  nowCookingSub: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 2,
  },
  controlButtonsRow: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  controlButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.3)',
    backgroundColor: COLORS.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  controlButtonPrimary: {
    backgroundColor: COLORS.accent,
    borderColor: 'rgba(245,201,106,0.58)',
  },
  controlButtonDanger: {
    borderColor: 'rgba(255,124,123,0.42)',
    backgroundColor: 'rgba(255,124,123,0.12)',
  },
  controlText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '700',
  },
  controlDangerText: {
    color: '#FFB4A8',
    fontSize: 11,
    fontWeight: '700',
  },
  controlPrimaryText: {
    color: COLORS.bg,
    fontSize: 11,
    fontWeight: '800',
  },
  chatToggleButton: {
    width: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.3)',
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  chatToggleButtonActive: {
    backgroundColor: COLORS.accent,
    borderColor: 'rgba(245,201,106,0.58)',
  },
  chatToggleText: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: '700',
  },
  chatToggleTextActive: {
    color: COLORS.bg,
  },
  toast: {
    position: 'absolute',
    left: 24,
    right: 24,
    borderRadius: 12,
    backgroundColor: '#141B27',
    borderWidth: 1,
    borderColor: 'rgba(90,209,232,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  toastText: {
    color: COLORS.text,
    textAlign: 'center',
    fontSize: 12,
  },
});

export default CookRecipeScreen;
