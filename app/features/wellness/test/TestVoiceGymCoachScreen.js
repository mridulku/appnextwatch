import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import COLORS from '../../../theme/colors';
import UI_TOKENS from '../../../ui/tokens';

const DAY_TEMPLATES = {
  push: {
    label: 'Push day',
    exercises: ['Treadmill Run', 'Push-up', 'Flat Press', 'Lateral Raise', 'Incline Press', 'Triceps Pushdown', 'Thoracic Rotation Mobility'],
  },
  pull: {
    label: 'Pull day',
    exercises: ['Treadmill Run', 'Lat Pulldown', 'Curl', 'Bent-Over Row', 'Seated Row', 'Thoracic Rotation Mobility'],
  },
  legs: {
    label: 'Leg day',
    exercises: ['Treadmill Run', 'Dynamic Hip Mobility', 'Squat', 'Leg Extension', 'Leg Curl', 'Thoracic Rotation Mobility'],
  },
};

const MOVEMENT_ALIASES = [
  { name: 'Flat Press', aliases: ['bench press', 'flat press', 'bench'] },
  { name: 'Incline Press', aliases: ['incline press', 'incline bench'] },
  { name: 'Decline Press', aliases: ['decline press', 'decline bench press'] },
  { name: 'Lateral Raise', aliases: ['lateral raise', 'side raise'] },
  { name: 'Triceps Pushdown', aliases: ['tricep pushdown', 'triceps pushdown', 'pushdown'] },
  { name: 'Lat Pulldown', aliases: ['lat pulldown', 'pulldown'] },
  { name: 'Curl', aliases: ['bicep curl', 'curl', 'barbell curl', 'hammer curl', 'preacher curl', 'cable curl'] },
  { name: 'Bent-Over Row', aliases: ['barbell row', 'bent over row', 'rowing barbell'] },
  { name: 'Seated Row', aliases: ['seated row', 'seated cable row', 'rowing machine row'] },
  { name: 'Squat', aliases: ['squat', 'free squat', 'back squat', 'front squat'] },
  { name: 'Leg Extension', aliases: ['leg extension'] },
  { name: 'Leg Curl', aliases: ['leg curl', 'lying leg curl', 'seated leg curl'] },
  { name: 'Push-up', aliases: ['push up', 'push-up', 'pushups'] },
  { name: 'Treadmill Run', aliases: ['treadmill', 'cardio', 'run'] },
  { name: 'Thoracic Rotation Mobility', aliases: ['stretching', 'thoracic rotation', 'stretch'] },
  { name: 'Dynamic Hip Mobility', aliases: ['hip mobility', 'dynamic hip mobility', 'warmup'] },
];

const MOCK_HISTORY = {
  'Flat Press': { sets: 3, reps: 8, weight: 40, note: 'completed cleanly' },
  'Incline Press': { sets: 2, reps: 6, weight: 20, note: 'last set slowed down' },
  'Lateral Raise': { sets: 2, reps: 10, weight: 7.5, note: 'stable form' },
  'Triceps Pushdown': { sets: 2, reps: 8, weight: 15, note: 'comfortable' },
  'Lat Pulldown': { sets: 2, reps: 8, weight: 30, note: 'repeatable' },
  'Curl': { sets: 2, reps: 8, weight: 5, note: 'could increase slightly' },
  'Seated Row': { sets: 2, reps: 8, weight: 25, note: 'good control' },
  'Bent-Over Row': { sets: 2, reps: 8, weight: 20, note: 'stay strict' },
  Squat: { sets: 2, reps: 10, weight: 0, note: 'bodyweight warm build' },
  'Leg Extension': { sets: 2, reps: 8, weight: 30, note: 'good depth' },
  'Leg Curl': { sets: 2, reps: 8, weight: 25, note: 'hold the contraction' },
};

function todayTemplateKey() {
  const dayIndex = new Date().getDay();
  if ([1, 4].includes(dayIndex)) return 'push';
  if ([2, 5].includes(dayIndex)) return 'pull';
  return 'legs';
}

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferMovementName(text) {
  const haystack = normalize(text);
  for (const entry of MOVEMENT_ALIASES) {
    if (entry.aliases.some((alias) => haystack.includes(normalize(alias)))) return entry.name;
  }
  return '';
}

function extractMetric(text, labels) {
  const haystack = normalize(text);
  for (const label of labels) {
    const regex = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${label}`);
    const match = haystack.match(regex);
    if (match) return Number(match[1]);
  }
  return null;
}

function parseLogIntent(text) {
  const movementName = inferMovementName(text);
  const sets = extractMetric(text, ['sets?', 'x']);
  const reps = extractMetric(text, ['reps?', 'rep']);
  const weight = extractMetric(text, ['kg', 'kilos?', 'kilograms?']);
  return { movementName, sets, reps, weight };
}

function getSuggestionForMovement(movementName) {
  const prior = MOCK_HISTORY[movementName];
  if (!prior) return `I do not have prior memory for ${movementName}. Start conservative and log the first clean working set.`;
  const nextWeight = prior.weight > 0 && prior.note.includes('clean') ? Math.round((prior.weight + 2.5) * 10) / 10 : prior.weight;
  if (prior.weight > 0) {
    return `Last time you did ${prior.sets} sets of ${prior.reps} at ${prior.weight} kilos. I would suggest ${prior.sets} sets of ${prior.reps} at ${nextWeight} kilos if it feels stable.`;
  }
  return `Last time you did ${prior.sets} sets of ${prior.reps}. I would repeat that and add load only if the form feels clean.`;
}

function deriveIntent(text) {
  const haystack = normalize(text);
  if (!haystack) return { type: 'clarify' };
  if (haystack.includes('what next') || haystack.includes('next exercise') || haystack.includes('what is next')) {
    return { type: 'ask_whats_next' };
  }
  if (haystack.includes('last time') || haystack.includes('what did i do')) {
    return { type: 'ask_last_time', movementName: inferMovementName(text) };
  }
  if (haystack.includes('suggest') || haystack.includes('what should i do') || haystack.includes('how much should i do')) {
    return { type: 'ask_suggestion', movementName: inferMovementName(text) };
  }
  if (inferMovementName(text)) {
    return { type: 'log_exercise', ...parseLogIntent(text) };
  }
  return { type: 'clarify' };
}

function buildSummary(loggedEntries, template) {
  const completedNames = new Set(loggedEntries.map((entry) => entry.movementName));
  return {
    nextMovement: template.exercises.find((name) => !completedNames.has(name)) || '',
  };
}

export default function TestVoiceGymCoachScreen() {
  const scrollRef = useRef(null);
  const [dayKey] = useState(todayTemplateKey());
  const template = DAY_TEMPLATES[dayKey];
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputText, setInputText] = useState('');
  const [errorText, setErrorText] = useState('');
  const [loggedEntries, setLoggedEntries] = useState([]);
  const [pendingClarification, setPendingClarification] = useState(null);
  const [conversationTurns, setConversationTurns] = useState([
    {
      id: 'intro_assistant',
      role: 'assistant',
      text: `This is a text-based stand-in for the voice gym coach. Press start listening to open a turn.`,
    },
  ]);

  const summary = useMemo(() => buildSummary(loggedEntries, template), [loggedEntries, template]);

  const appendTurn = useCallback((role, text) => {
    setConversationTurns((prev) => [...prev, { id: `${role}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, role, text }]);
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd?.({ animated: true }));
  }, []);

  const reply = useCallback(
    async (message) => {
      appendTurn('assistant', message);
    },
    [appendTurn],
  );

  const startListening = useCallback(async () => {
    setErrorText('');
    setIsListening(true);
    await reply("Hey, I am listening now.");
  }, [reply]);

  const stopListening = useCallback(async () => {
    setErrorText('');
    setIsListening(false);
    setPendingClarification(null);
    await reply('I am stopping to listen now.');
  }, [reply]);

  const handleIntent = useCallback(
    async (text) => {
      const intent = deriveIntent(text);
      const activeMovement = pendingClarification?.movementName || intent.movementName || '';

      if (pendingClarification && activeMovement) {
        const parsed = parseLogIntent(`${activeMovement} ${text}`);
        if (!parsed.sets || !parsed.reps) {
          await reply(`I still need sets and reps for ${activeMovement}.`);
          return;
        }
        setPendingClarification(null);
        const nextEntry = {
          movementName: parsed.movementName,
          sets: parsed.sets,
          reps: parsed.reps,
          weight: parsed.weight ?? null,
        };
        const nextEntries = [...loggedEntries, nextEntry];
        setLoggedEntries(nextEntries);
        const next = buildSummary(nextEntries, template).nextMovement;
        await reply(`Logged ${parsed.movementName}. ${next ? `Next is ${next}.` : 'That completes the session plan.'}`);
        return;
      }

      if (intent.type === 'ask_whats_next') {
        const next = summary.nextMovement;
        await reply(next ? `Next is ${next}.` : 'You have completed the current plan.');
        return;
      }

      if (intent.type === 'ask_last_time') {
        const movementName = intent.movementName || summary.nextMovement;
        if (!movementName || !MOCK_HISTORY[movementName]) {
          await reply('I do not have a last-session record for that yet.');
          return;
        }
        const prior = MOCK_HISTORY[movementName];
        await reply(
          prior.weight > 0
            ? `Last time you did ${movementName}: ${prior.sets} sets of ${prior.reps} at ${prior.weight} kilos.`
            : `Last time you did ${movementName}: ${prior.sets} sets of ${prior.reps}.`,
        );
        return;
      }

      if (intent.type === 'ask_suggestion') {
        const movementName = intent.movementName || summary.nextMovement;
        if (!movementName) {
          await reply('I need an exercise name before I can suggest load.');
          return;
        }
        await reply(getSuggestionForMovement(movementName));
        return;
      }

      if (intent.type === 'log_exercise') {
        if (!intent.movementName) {
          await reply('I could not identify the exercise. Say the movement name first.');
          return;
        }
        if (!intent.sets || !intent.reps) {
          setPendingClarification({ movementName: intent.movementName });
          await reply(`I heard ${intent.movementName}. Tell me the sets and reps so I can log it.`);
          return;
        }
        const nextEntry = {
          movementName: intent.movementName,
          sets: intent.sets,
          reps: intent.reps,
          weight: intent.weight ?? null,
        };
        const nextEntries = [...loggedEntries, nextEntry];
        setLoggedEntries(nextEntries);
        const next = buildSummary(nextEntries, template).nextMovement;
        await reply(
          nextEntry.weight !== null
            ? `Logged ${nextEntry.movementName}: ${nextEntry.sets} sets of ${nextEntry.reps} at ${nextEntry.weight} kilos. ${next ? `Next is ${next}.` : 'That completes the session plan.'}`
            : `Logged ${nextEntry.movementName}: ${nextEntry.sets} sets of ${nextEntry.reps}. ${next ? `Next is ${next}.` : 'That completes the session plan.'}`,
        );
        return;
      }

      await reply('I am not sure what you meant. Try logging an exercise, asking what is next, or asking what you did last time.');
    },
    [loggedEntries, pendingClarification, reply, summary.nextMovement, template],
  );

  const onSend = useCallback(async () => {
    const trimmed = String(inputText || '').trim();
    if (!trimmed || !isListening || isProcessing) return;

    setErrorText('');
    setInputText('');
    appendTurn('user', trimmed);
    setIsProcessing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await handleIntent(trimmed);
    } catch (error) {
      setErrorText(error?.message || 'Unable to process this turn.');
    } finally {
      setIsProcessing(false);
    }
  }, [appendTurn, handleIntent, inputText, isListening, isProcessing]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerCard}>
          <View style={styles.headerTopRow}>
            <View>
              <Text style={styles.eyebrow}>VOICE FLOW LAB</Text>
              <Text style={styles.title}>Text Gated Coach</Text>
            </View>
            <View style={styles.dayPill}>
              <Ionicons name="fitness-outline" size={13} color={COLORS.accent} />
              <Text style={styles.dayPillText}>{template.label}</Text>
            </View>
          </View>
          <View style={styles.listenRow}>
            <TouchableOpacity
              style={[styles.listenButton, isListening ? styles.listenButtonActive : null]}
              activeOpacity={0.9}
              onPress={isListening ? stopListening : startListening}
            >
              <Ionicons name={isListening ? 'pause' : 'radio-outline'} size={16} color={COLORS.bg} />
              <Text style={styles.listenButtonText}>{isListening ? 'Stop listening' : 'Start listening'}</Text>
            </TouchableOpacity>
            <View style={styles.statusPill}>
              {isProcessing ? <ActivityIndicator color={COLORS.text} size="small" /> : <Ionicons name={isListening ? 'ear-outline' : 'chatbubble-outline'} size={13} color={COLORS.text} />}
              <Text style={styles.statusPillText}>{isProcessing ? 'Processing' : isListening ? 'Listening now' : 'Idle'}</Text>
            </View>
          </View>
          {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
        </View>

        <ScrollView ref={scrollRef} style={styles.chatCard} contentContainerStyle={styles.chatContent} showsVerticalScrollIndicator={false}>
          {conversationTurns.map((turn) => (
            <View key={turn.id} style={[styles.turnBubble, turn.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
              <Text style={styles.turnRole}>{turn.role === 'user' ? 'You' : 'Coach'}</Text>
              <Text style={styles.turnText}>{turn.text}</Text>
            </View>
          ))}
          {isProcessing ? (
            <View style={[styles.turnBubble, styles.assistantBubble]}>
              <Text style={styles.turnRole}>Coach</Text>
              <Text style={styles.turnText}>Processing…</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.inputCard}>
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder={isListening ? 'Type the message for this listening turn' : 'Press Start listening first'}
            placeholderTextColor={COLORS.muted}
            style={[styles.input, !isListening ? styles.inputDisabled : null]}
            editable={isListening && !isProcessing}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, (!isListening || isProcessing || !String(inputText || '').trim()) ? styles.sendButtonDisabled : null]}
            activeOpacity={0.9}
            onPress={onSend}
            disabled={!isListening || isProcessing || !String(inputText || '').trim()}
          >
            <Ionicons name="arrow-up" size={18} color={COLORS.bg} />
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
    backgroundColor: COLORS.bg,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 18,
    gap: 12,
  },
  headerCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: COLORS.card,
    padding: 14,
    gap: 10,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  eyebrow: {
    color: COLORS.accent2,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  title: {
    marginTop: 6,
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '700',
  },
  dayPill: {
    minHeight: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(245,201,106,0.42)',
    backgroundColor: 'rgba(245,201,106,0.14)',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dayPillText: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  listenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listenButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: COLORS.accent2,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  listenButtonActive: {
    backgroundColor: '#FF9B6B',
  },
  listenButtonText: {
    color: COLORS.bg,
    fontSize: 14,
    fontWeight: '700',
  },
  statusPill: {
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusPillText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  errorText: {
    color: '#FFB4A8',
    fontSize: 12,
  },
  chatCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.card,
  },
  chatContent: {
    padding: 14,
    gap: 8,
  },
  turnBubble: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  userBubble: {
    borderColor: 'rgba(245,201,106,0.42)',
    backgroundColor: 'rgba(245,201,106,0.12)',
  },
  assistantBubble: {
    borderColor: 'rgba(90,209,232,0.28)',
    backgroundColor: 'rgba(90,209,232,0.08)',
  },
  turnRole: {
    color: COLORS.accent2,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  turnText: {
    marginTop: 4,
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 18,
  },
  inputCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.card,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 56,
    maxHeight: 132,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.cardSoft,
    color: COLORS.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  inputDisabled: {
    opacity: 0.65,
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
