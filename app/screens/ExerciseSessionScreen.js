import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  LayoutAnimation,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';

import { addSessionToHistory, createSessionHistoryId } from '../core/sessionHistoryStorage';
import COLORS from '../theme/colors';

const SAMPLE_SESSION = {
  name: 'Push Day Session',
  totalMinutes: 45,
  exercises: [
    { id: 'bench_press', name: 'Barbell Bench Press', targetSets: 4, targetReps: '6-8' },
    { id: 'incline_press', name: 'Incline Dumbbell Press', targetSets: 3, targetReps: '8-10' },
    { id: 'shoulder_press', name: 'Overhead Shoulder Press', targetSets: 3, targetReps: '8-10' },
    { id: 'triceps_pushdown', name: 'Triceps Pushdown', targetSets: 3, targetReps: '10-12' },
    { id: 'core_finisher', name: 'Plank Hold', targetSets: 3, targetReps: '40 sec' },
  ],
};

const VOICE_COMMANDS = ['next exercise', 'pause timer', 'repeat cue', 'how much remaining?', 'start timer'];

function normalizeSessionTemplate(rawTemplate) {
  if (!rawTemplate || typeof rawTemplate !== 'object') return SAMPLE_SESSION;
  if (!Array.isArray(rawTemplate.exercises) || rawTemplate.exercises.length === 0) return SAMPLE_SESSION;

  return {
    name: String(rawTemplate.name ?? SAMPLE_SESSION.name),
    totalMinutes: Math.max(5, Number(rawTemplate.totalMinutes) || SAMPLE_SESSION.totalMinutes),
    exercises: rawTemplate.exercises.map((exercise, index) => ({
      id: String(exercise.id ?? `exercise_${index}`),
      name: String(exercise.name ?? `Exercise ${index + 1}`),
      targetSets: Math.max(1, Number(exercise.targetSets) || 1),
      targetReps: String(exercise.targetReps ?? '8-10'),
    })),
  };
}

function createExerciseState(sessionTemplate) {
  return sessionTemplate.exercises.map((exercise) => ({
    ...exercise,
    status: 'pending',
    loggedSets: [],
  }));
}

function formatClock(seconds) {
  const safe = Math.max(0, seconds);
  const min = Math.floor(safe / 60);
  const sec = safe % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

function ExerciseSessionScreen({ embedded = false, route, navigation }) {
  const sessionTemplate = useMemo(
    () => normalizeSessionTemplate(route?.params?.sessionTemplate),
    [route?.params?.sessionTemplate],
  );

  const [sessionStarted, setSessionStarted] = useState(false);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [exerciseStates, setExerciseStates] = useState(() => createExerciseState(sessionTemplate));
  const [sessionStartedAt, setSessionStartedAt] = useState(route?.params?.startedAt ?? null);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 'coach_intro',
      role: 'coach',
      text: 'Workout assistant ready. Ask for next exercise, timer, or cues.',
    },
  ]);
  const [isListening, setIsListening] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const chatAnim = useRef(new Animated.Value(0)).current;
  const voiceTimeoutRef = useRef(null);
  const hasSessionLoggedRef = useRef(false);
  const latestSnapshotRef = useRef({
    sessionStarted: false,
    elapsedSeconds: 0,
    exerciseStates: createExerciseState(sessionTemplate),
    sessionStartedAt: route?.params?.startedAt ?? null,
  });

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    setSessionStarted(false);
    setIsTimerRunning(false);
    setElapsedSeconds(0);
    setExerciseStates(createExerciseState(sessionTemplate));
    setSessionStartedAt(route?.params?.startedAt ?? null);
    setChatOpen(false);
    setChatInput('');
    setMessages([
      {
        id: 'coach_intro',
        role: 'coach',
        text: `Workout assistant ready. Session loaded: ${sessionTemplate.name}.`,
      },
    ]);
    hasSessionLoggedRef.current = false;
  }, [route?.params?.startedAt, sessionTemplate]);

  useEffect(() => {
    if (!isTimerRunning) return undefined;

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning]);

  useEffect(() => {
    Animated.timing(chatAnim, {
      toValue: chatOpen ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [chatAnim, chatOpen]);

  useEffect(() => {
    if (!isListening) {
      pulseAnim.setValue(1);
      return undefined;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.18,
          duration: 430,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 430,
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [isListening, pulseAnim]);

  useEffect(
    () => () => {
      if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
    },
    [],
  );

  useEffect(() => {
    latestSnapshotRef.current = {
      sessionStarted,
      elapsedSeconds,
      exerciseStates,
      sessionStartedAt,
    };
  }, [elapsedSeconds, exerciseStates, sessionStarted, sessionStartedAt]);

  const completedCount = useMemo(
    () => exerciseStates.filter((exercise) => exercise.status === 'done').length,
    [exerciseStates],
  );

  const currentExerciseIndex = useMemo(() => {
    const inProgressIndex = exerciseStates.findIndex((exercise) => exercise.status === 'in_progress');
    if (inProgressIndex >= 0) return inProgressIndex;

    return exerciseStates.findIndex((exercise) => exercise.status !== 'done');
  }, [exerciseStates]);

  const currentExercise =
    currentExerciseIndex >= 0 ? exerciseStates[currentExerciseIndex] : exerciseStates[exerciseStates.length - 1];

  const remainingSeconds = useMemo(
    () => Math.max(0, sessionTemplate.totalMinutes * 60 - elapsedSeconds),
    [elapsedSeconds, sessionTemplate.totalMinutes],
  );

  const progressRatio = useMemo(
    () => (sessionTemplate.exercises.length ? completedCount / sessionTemplate.exercises.length : 0),
    [completedCount, sessionTemplate.exercises.length],
  );
  const allExercisesDone = sessionTemplate.exercises.length > 0 && completedCount === sessionTemplate.exercises.length;

  const appendMessage = (role, text) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `${role}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        role,
        text,
      },
    ]);
  };

  const createHistoryRecord = (status, snapshot) => {
    const endedAt = new Date().toISOString();
    const startedAt =
      snapshot.sessionStartedAt ??
      new Date(Date.now() - Math.max(0, snapshot.elapsedSeconds) * 1000).toISOString();
    const setsCount = snapshot.exerciseStates.reduce(
      (sum, exercise) => sum + exercise.loggedSets.length,
      0,
    );
    const exercisesCount = snapshot.exerciseStates.length;
    const volumeKg = Math.round(snapshot.exerciseStates.reduce((sum, exercise) => {
      const exerciseVolume = exercise.loggedSets.reduce((inner, loggedSet) => {
        const weightNumber = Number.parseFloat(String(loggedSet.weight).replace(/[^\d.]/g, ''));
        if (Number.isNaN(weightNumber)) return inner;
        return inner + weightNumber;
      }, 0);
      return sum + exerciseVolume;
    }, 0));

    return {
      id: String(route?.params?.sessionId ?? createSessionHistoryId('workout')),
      type: 'workout',
      title: String(route?.params?.sessionTitle ?? sessionTemplate.name),
      startedAt,
      endedAt,
      durationSeconds: Math.max(0, Number(snapshot.elapsedSeconds) || 0),
      status,
      summary: {
        exercisesCount,
        setsCount,
        volumeKg,
        timeline: snapshot.exerciseStates.map((exercise) => ({
          title: exercise.name,
          status: exercise.status,
          note: `${exercise.loggedSets.length}/${exercise.targetSets} sets`,
        })),
      },
    };
  };

  const persistSessionRecord = async (status) => {
    if (hasSessionLoggedRef.current) return null;
    const snapshot = latestSnapshotRef.current;
    if (!snapshot.sessionStarted) return null;

    const record = createHistoryRecord(status, snapshot);
    hasSessionLoggedRef.current = true;
    await addSessionToHistory(record);
    return record;
  };

  const startSession = () => {
    if (sessionStarted) {
      setIsTimerRunning(true);
      return;
    }

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSessionStartedAt((prev) => prev ?? new Date().toISOString());
    setSessionStarted(true);
    setIsTimerRunning(true);
    setExerciseStates((prev) =>
      prev.map((exercise, index) =>
        index === 0 ? { ...exercise, status: 'in_progress' } : exercise,
      ),
    );
    appendMessage('coach', `Session started: ${sessionTemplate.name}. Begin with your first movement and log each set.`);
  };

  const pauseOrResume = () => {
    setIsTimerRunning((prev) => !prev);
  };

  const setExerciseInProgress = (exerciseId) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExerciseStates((prev) =>
      prev.map((exercise) => {
        if (exercise.status === 'done') return exercise;
        if (exercise.id === exerciseId) return { ...exercise, status: 'in_progress' };
        if (exercise.status === 'in_progress') return { ...exercise, status: 'pending' };
        return exercise;
      }),
    );
  };

  const markExerciseDone = (exerciseId) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExerciseStates((prev) =>
      prev.map((exercise) =>
        exercise.id === exerciseId
          ? { ...exercise, status: 'done' }
          : exercise,
      ),
    );
  };

  const logSet = (exerciseId) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExerciseStates((prev) =>
      prev.map((exercise) => {
        if (exercise.id !== exerciseId) return exercise;

        const setNumber = exercise.loggedSets.length + 1;
        const reps = typeof exercise.targetReps === 'string' ? exercise.targetReps : '8';
        const weight = `${20 + setNumber * 2.5} kg`;
        const nextLogged = [...exercise.loggedSets, { reps, weight }];
        const isDone = nextLogged.length >= exercise.targetSets;

        return {
          ...exercise,
          loggedSets: nextLogged,
          status: isDone ? 'done' : 'in_progress',
        };
      }),
    );
  };

  const goNextExercise = () => {
    const nextIndex = exerciseStates.findIndex(
      (exercise, index) => index > currentExerciseIndex && exercise.status !== 'done',
    );

    if (nextIndex < 0) {
      appendMessage('coach', 'Great work. You are at the final movement.');
      return;
    }

    const nextExercise = exerciseStates[nextIndex];
    setExerciseInProgress(nextExercise.id);
    appendMessage('coach', `Next up: ${nextExercise.name}. Keep your tempo clean.`);
  };

  const finishSession = async (status = 'completed') => {
    const record = await persistSessionRecord(status);
    if (!record) return;

    if (!embedded && navigation?.navigate) {
      navigation.navigate('SessionSummary', { sessionRecord: record });
    }
  };

  const handleCoachCommand = (rawText) => {
    const text = rawText.trim();
    if (!text) return;

    appendMessage('user', text);

    const normalized = text.toLowerCase();
    if (normalized.includes('next')) {
      goNextExercise();
      return;
    }

    if (normalized.includes('pause')) {
      setIsTimerRunning(false);
      appendMessage('coach', 'Timer paused. Resume when you are ready.');
      return;
    }

    if (normalized.includes('start') || normalized.includes('resume')) {
      setIsTimerRunning(true);
      appendMessage('coach', 'Timer running. Stay consistent with rest windows.');
      return;
    }

    if (normalized.includes('repeat')) {
      appendMessage(
        'coach',
        currentExercise
          ? `${currentExercise.name}: stay braced, control the eccentric, and own each rep.`
          : 'Current cue unavailable.',
      );
      return;
    }

    if (normalized.includes('remaining') || normalized.includes('timer') || normalized.includes('time')) {
      appendMessage('coach', `You have ${formatClock(remainingSeconds)} remaining in this block.`);
      return;
    }

    appendMessage('coach', 'Got it. Keep form strict and rest for 60 to 90 seconds between sets.');
  };

  const sendChat = () => {
    const trimmed = chatInput.trim();
    if (!trimmed) return;
    handleCoachCommand(trimmed);
    setChatInput('');
  };

  const triggerVoiceCommand = () => {
    if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);

    setIsListening(true);
    const sample = VOICE_COMMANDS[Math.floor(Math.random() * VOICE_COMMANDS.length)];

    voiceTimeoutRef.current = setTimeout(() => {
      setIsListening(false);
      handleCoachCommand(sample);
    }, 920);
  };

  const chatTranslate = chatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [22, 0],
  });

  const RootContainer = embedded ? View : SafeAreaView;

  useEffect(() => {
    if (!sessionStarted || !allExercisesDone) return;
    setIsTimerRunning(false);
    appendMessage('coach', 'All exercises completed. Session saved to history.');
    void finishSession('completed');
  }, [allExercisesDone, sessionStarted]);

  useEffect(
    () => () => {
      if (hasSessionLoggedRef.current) return;
      const snapshot = latestSnapshotRef.current;
      if (!snapshot?.sessionStarted) return;
      void addSessionToHistory(createHistoryRecord('abandoned', snapshot));
      hasSessionLoggedRef.current = true;
    },
    [],
  );

  return (
    <RootContainer style={styles.safeArea}>
      <View style={[styles.container, embedded && styles.containerEmbedded]}>
        <View style={styles.dashboardCard}>
          <View style={styles.dashboardTopRow}>
            <View>
              <Text style={styles.sessionTitle}>Exercise Session</Text>
              <Text style={styles.sessionSubtitle}>{sessionTemplate.name}</Text>
            </View>
            <View style={styles.progressPill}>
              <Text style={styles.progressPillText}>{completedCount}/{sessionTemplate.exercises.length} done</Text>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{formatClock(elapsedSeconds)}</Text>
              <Text style={styles.metricLabel}>elapsed</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{formatClock(remainingSeconds)}</Text>
              <Text style={styles.metricLabel}>remaining</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{Math.round(progressRatio * 100)}%</Text>
              <Text style={styles.metricLabel}>progress</Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.max(8, progressRatio * 100)}%` }]} />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.exerciseListContent} showsVerticalScrollIndicator={false}>
          {exerciseStates.map((exercise, index) => {
            const pending = exercise.status === 'pending';
            const inProgress = exercise.status === 'in_progress';
            const done = exercise.status === 'done';

            return (
              <View
                key={exercise.id}
                style={[
                  styles.exerciseCard,
                  inProgress && styles.exerciseCardActive,
                  done && styles.exerciseCardDone,
                ]}
              >
                <View style={styles.exerciseHeaderRow}>
                  <View style={styles.exerciseTitleWrap}>
                    <Text style={styles.exerciseStep}>Exercise {index + 1}</Text>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                    <Text style={styles.exerciseMeta}>Target {exercise.targetSets} sets • {exercise.targetReps}</Text>
                  </View>
                  <View style={[
                    styles.statusChip,
                    pending && styles.statusPending,
                    inProgress && styles.statusInProgress,
                    done && styles.statusDone,
                  ]}>
                    <Text style={[
                      styles.statusChipText,
                      pending && styles.statusPendingText,
                      inProgress && styles.statusInProgressText,
                      done && styles.statusDoneText,
                    ]}>
                      {done ? 'Done' : inProgress ? 'In progress' : 'Pending'}
                    </Text>
                  </View>
                </View>

                <View style={styles.setRow}>
                  {exercise.loggedSets.length === 0 ? (
                    <Text style={styles.setHint}>No sets logged yet.</Text>
                  ) : (
                    exercise.loggedSets.map((set, setIndex) => (
                      <View key={`${exercise.id}_set_${setIndex}`} style={styles.setBadge}>
                        <Text style={styles.setBadgeText}>S{setIndex + 1}: {set.reps} • {set.weight}</Text>
                      </View>
                    ))
                  )}
                </View>

                <View style={styles.cardActionsRow}>
                  {pending ? (
                    <TouchableOpacity
                      style={styles.secondaryAction}
                      activeOpacity={0.9}
                      onPress={() => setExerciseInProgress(exercise.id)}
                    >
                      <Text style={styles.secondaryActionText}>Start</Text>
                    </TouchableOpacity>
                  ) : null}

                  {!done ? (
                    <TouchableOpacity
                      style={styles.primaryAction}
                      activeOpacity={0.9}
                      onPress={() => logSet(exercise.id)}
                    >
                      <Text style={styles.primaryActionText}>Log Set</Text>
                    </TouchableOpacity>
                  ) : null}

                  {inProgress ? (
                    <TouchableOpacity
                      style={styles.secondaryAction}
                      activeOpacity={0.9}
                      onPress={() => markExerciseDone(exercise.id)}
                    >
                      <Text style={styles.secondaryActionText}>Mark Done</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.voiceButton}
            activeOpacity={0.9}
            onPress={triggerVoiceCommand}
          >
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Ionicons name="mic" size={17} color={COLORS.bg} />
            </Animated.View>
          </TouchableOpacity>

          {!sessionStarted ? (
            <TouchableOpacity style={styles.bottomMainButton} activeOpacity={0.9} onPress={startSession}>
              <Text style={styles.bottomMainButtonText}>Start Session</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={styles.bottomMainButton} activeOpacity={0.9} onPress={pauseOrResume}>
                <Text style={styles.bottomMainButtonText}>{isTimerRunning ? 'Pause' : 'Resume'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.bottomSecondaryButton} activeOpacity={0.9} onPress={goNextExercise}>
                <Text style={styles.bottomSecondaryButtonText}>Next</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={styles.chatToggleButton}
            activeOpacity={0.9}
            onPress={() => setChatOpen((prev) => !prev)}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={17} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {chatOpen ? (
          <Animated.View style={[styles.chatPanel, { opacity: chatAnim, transform: [{ translateY: chatTranslate }] }]}>
            <View style={styles.chatHeader}>
              <Text style={styles.chatTitle}>Coach Chat</Text>
              <Text style={styles.chatHint}>Dummy assistant for commands and cues</Text>
            </View>

            <ScrollView style={styles.chatMessagesWrap} contentContainerStyle={styles.chatMessagesContent}>
              {messages.slice(-6).map((message) => {
                const isUser = message.role === 'user';
                return (
                  <View
                    key={message.id}
                    style={[styles.messageBubble, isUser ? styles.userBubble : styles.coachBubble]}
                  >
                    <Text style={[styles.messageText, isUser && styles.userMessageText]}>{message.text}</Text>
                  </View>
                );
              })}
            </ScrollView>

            <View style={styles.chatInputRow}>
              <TextInput
                style={styles.chatInput}
                value={chatInput}
                onChangeText={setChatInput}
                placeholder="Ask: next exercise, repeat cue, timer..."
                placeholderTextColor={COLORS.muted}
                onSubmitEditing={sendChat}
              />
              <TouchableOpacity style={styles.chatSendButton} activeOpacity={0.9} onPress={sendChat}>
                <Text style={styles.chatSendText}>Send</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        ) : null}
      </View>
    </RootContainer>
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
  containerEmbedded: {
    paddingTop: 6,
  },
  dashboardCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
  },
  dashboardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  sessionTitle: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: '700',
  },
  sessionSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 3,
  },
  progressPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(90,209,232,0.42)',
    backgroundColor: 'rgba(90,209,232,0.14)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  progressPillText: {
    color: COLORS.accent2,
    fontSize: 11,
    fontWeight: '700',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  metricCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.18)',
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  metricValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  metricLabel: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  progressTrack: {
    marginTop: 10,
    borderRadius: 999,
    height: 6,
    backgroundColor: 'rgba(162,167,179,0.2)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
  },
  exerciseListContent: {
    paddingBottom: 140,
  },
  exerciseCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
  },
  exerciseCardActive: {
    borderColor: 'rgba(90,209,232,0.42)',
    backgroundColor: 'rgba(90,209,232,0.08)',
  },
  exerciseCardDone: {
    borderColor: 'rgba(111,230,189,0.4)',
    backgroundColor: 'rgba(111,230,189,0.08)',
  },
  exerciseHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  exerciseTitleWrap: {
    flex: 1,
  },
  exerciseStep: {
    color: COLORS.muted,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  exerciseName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  exerciseMeta: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 3,
  },
  statusChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusPending: {
    borderColor: 'rgba(245,201,106,0.4)',
    backgroundColor: 'rgba(245,201,106,0.16)',
  },
  statusInProgress: {
    borderColor: 'rgba(90,209,232,0.42)',
    backgroundColor: 'rgba(90,209,232,0.16)',
  },
  statusDone: {
    borderColor: 'rgba(111,230,189,0.42)',
    backgroundColor: 'rgba(111,230,189,0.16)',
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusPendingText: {
    color: COLORS.accent,
  },
  statusInProgressText: {
    color: COLORS.accent2,
  },
  statusDoneText: {
    color: '#8CF0CD',
  },
  setRow: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  setHint: {
    color: COLORS.muted,
    fontSize: 11,
  },
  setBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  setBadgeText: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: '600',
  },
  cardActionsRow: {
    marginTop: 9,
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  primaryAction: {
    borderRadius: 10,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  primaryActionText: {
    color: COLORS.bg,
    fontSize: 11,
    fontWeight: '700',
  },
  secondaryAction: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.36)',
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  secondaryActionText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '700',
  },
  bottomBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: COLORS.card,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  voiceButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
  },
  bottomMainButton: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
  },
  bottomMainButtonText: {
    color: COLORS.bg,
    fontSize: 12,
    fontWeight: '700',
  },
  bottomSecondaryButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.34)',
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: 12,
    justifyContent: 'center',
    height: 38,
  },
  bottomSecondaryButtonText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  chatToggleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.34)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatPanel: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 70,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.card,
    paddingHorizontal: 10,
    paddingVertical: 10,
    maxHeight: 270,
  },
  chatHeader: {
    marginBottom: 8,
  },
  chatTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  chatHint: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 2,
  },
  chatMessagesWrap: {
    maxHeight: 140,
  },
  chatMessagesContent: {
    gap: 6,
    paddingBottom: 8,
  },
  messageBubble: {
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 7,
    maxWidth: '92%',
  },
  coachBubble: {
    backgroundColor: 'rgba(90,209,232,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(90,209,232,0.28)',
    alignSelf: 'flex-start',
  },
  userBubble: {
    backgroundColor: 'rgba(245,201,106,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(245,201,106,0.34)',
    alignSelf: 'flex-end',
  },
  messageText: {
    color: COLORS.text,
    fontSize: 12,
    lineHeight: 17,
  },
  userMessageText: {
    color: '#F2D39A',
  },
  chatInputRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chatInput: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.cardSoft,
    color: COLORS.text,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 12,
  },
  chatSendButton: {
    borderRadius: 10,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  chatSendText: {
    color: COLORS.bg,
    fontSize: 12,
    fontWeight: '700',
  },
});

export default ExerciseSessionScreen;
