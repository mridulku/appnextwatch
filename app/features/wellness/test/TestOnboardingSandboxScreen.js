import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import COLORS from '../../../theme/colors';

const FLOW = [
  {
    key: 'goal',
    question: 'Let’s set up your training plan. What’s your primary goal?',
    options: ['Hypertrophy', 'Strength', 'Fat loss', 'General fitness'],
    mode: 'options',
  },
  {
    key: 'experience',
    question: 'What best matches your training experience?',
    options: ['Beginner', 'Intermediate', 'Advanced'],
    mode: 'options',
  },
  {
    key: 'daysPerWeek',
    question: 'How many days can you train each week?',
    options: ['3', '4', '5', '6'],
    mode: 'options',
  },
  {
    key: 'sessionLength',
    question: 'Preferred session length?',
    options: ['30', '45', '60', '75'],
    mode: 'options',
  },
  {
    key: 'equipmentAccess',
    question: 'What equipment access do you have?',
    options: ['Home gym', 'Commercial gym', 'Minimal equipment'],
    mode: 'options',
  },
  {
    key: 'constraints',
    question: 'Any constraints or injuries we should consider?',
    options: ['Skip'],
    mode: 'free_text',
  },
];

function nowId(prefix = 'msg') {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

function buildAssistantPrompt(step) {
  return {
    id: nowId('assistant'),
    role: 'assistant',
    type: step.mode === 'options' ? 'options' : 'text',
    text: step.question,
    options: step.mode === 'options' ? step.options : undefined,
    ts: Date.now(),
  };
}

function buildSummary(answers) {
  return `Summary: Goal=${answers.goal || '—'}, Level=${answers.experience || '—'}, Days=${answers.daysPerWeek || '—'}, Duration=${answers.sessionLength || '—'} min, Equipment=${answers.equipmentAccess || '—'}, Constraints=${answers.constraints || 'None'}`;
}

function TestOnboardingSandboxScreen() {
  const listRef = useRef(null);
  const chipsAnim = useRef(new Animated.Value(0)).current;
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [input, setInput] = useState('');
  const [recording, setRecording] = useState(false);
  const [copyStatusByMessageId, setCopyStatusByMessageId] = useState({});
  const [messages, setMessages] = useState(() => [buildAssistantPrompt(FLOW[0])]);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last?.role === 'assistant' && Array.isArray(last.options) && last.options.length) {
      chipsAnim.setValue(0);
      Animated.timing(chipsAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [messages, chipsAnim]);

  useEffect(() => {
    const timer = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 30);
    return () => clearTimeout(timer);
  }, [messages]);

  const currentStep = FLOW[stepIndex];
  const lastAssistantOptions = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const item = messages[i];
      if (item.role === 'assistant' && Array.isArray(item.options) && item.options.length) {
        return item.options;
      }
    }
    return [];
  }, [messages]);

  const appendAssistant = (message) => {
    setMessages((prev) => [...prev, message]);
  };

  const appendUser = (text) => {
    setMessages((prev) => [
      ...prev,
      {
        id: nowId('user'),
        role: 'user',
        type: 'text',
        text,
        ts: Date.now(),
      },
    ]);
  };

  const moveToNext = (nextAnswers, userInputText) => {
    const nextStepIndex = stepIndex + 1;

    if (nextStepIndex >= FLOW.length) {
      const summary = buildSummary(nextAnswers);
      setMessages((prev) => [
        ...prev,
        {
          id: nowId('assistant'),
          role: 'assistant',
          type: 'text',
          text: summary,
          ts: Date.now(),
        },
        {
          id: nowId('assistant'),
          role: 'assistant',
          type: 'options',
          text: 'You can restart or export your answers as JSON.',
          options: ['Restart', 'Export JSON'],
          ts: Date.now(),
        },
      ]);
      setStepIndex(FLOW.length);
      return;
    }

    setStepIndex(nextStepIndex);
    appendAssistant(buildAssistantPrompt(FLOW[nextStepIndex]));
  };

  const handleStructuredAnswer = (value) => {
    if (stepIndex >= FLOW.length) {
      if (value === 'Restart') {
        setAnswers({});
        setStepIndex(0);
        setMessages([buildAssistantPrompt(FLOW[0])]);
        return;
      }

      if (value === 'Export JSON') {
        const pretty = JSON.stringify(answers, null, 2);
        setMessages((prev) => [
          ...prev,
          {
            id: nowId('assistant'),
            role: 'assistant',
            type: 'json',
            text: pretty,
            ts: Date.now(),
          },
        ]);
      }
      return;
    }

    appendUser(value);
    const key = currentStep.key;
    const finalValue = key === 'sessionLength' ? `${value}` : value;
    const nextAnswers = {
      ...answers,
      [key]: value === 'Skip' ? '' : finalValue,
    };
    setAnswers(nextAnswers);
    moveToNext(nextAnswers, value);
  };

  const handleFreeTextSend = () => {
    const text = input.trim();
    if (!text || stepIndex >= FLOW.length) return;

    appendUser(text);
    setInput('');
    const nextAnswers = { ...answers, [currentStep.key]: text };
    setAnswers(nextAnswers);
    moveToNext(nextAnswers, text);
  };

  const toggleVoice = () => {
    if (!recording) {
      setRecording(true);
      return;
    }

    setRecording(false);
    const fakeTranscript = 'I want hypertrophy, 4 days, 45 minutes.';

    if (stepIndex >= FLOW.length) {
      appendUser(fakeTranscript);
      return;
    }

    appendUser(fakeTranscript);
    const nextAnswers = { ...answers, [currentStep.key]: fakeTranscript };
    setAnswers(nextAnswers);
    moveToNext(nextAnswers, fakeTranscript);
  };

  const handleCopyJson = (messageId) => {
    setCopyStatusByMessageId((prev) => ({ ...prev, [messageId]: 'Copied' }));
    setTimeout(() => {
      setCopyStatusByMessageId((prev) => ({ ...prev, [messageId]: '' }));
    }, 1000);
  };

  const renderMessage = ({ item }) => {
    const isUser = item.role === 'user';
    const isJson = item.type === 'json';

    return (
      <View style={[styles.bubbleWrap, isUser ? styles.bubbleWrapUser : styles.bubbleWrapAssistant]}>
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble, isJson ? styles.jsonBubble : null]}>
          <Text style={styles.bubbleRole}>{isUser ? 'You' : 'Assistant'}</Text>
          <Text style={[styles.bubbleText, isJson ? styles.jsonText : null]}>{item.text}</Text>
          {isJson ? (
            <TouchableOpacity style={styles.copyButton} activeOpacity={0.9} onPress={() => handleCopyJson(item.id)}>
              <Ionicons name="copy-outline" size={12} color={COLORS.muted} />
              <Text style={styles.copyButtonText}>{copyStatusByMessageId[item.id] || 'Copy'}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.headerTitle}>Onboarding Sandbox</Text>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
        />

        {lastAssistantOptions.length ? (
          <Animated.View
            style={[
              styles.quickRepliesWrap,
              {
                opacity: chipsAnim,
                transform: [
                  {
                    translateY: chipsAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [8, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <FlatList
              horizontal
              data={lastAssistantOptions}
              keyExtractor={(item) => item}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickRepliesContent}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.quickReplyChip} activeOpacity={0.9} onPress={() => handleStructuredAnswer(item)}>
                  <Text style={styles.quickReplyText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </Animated.View>
        ) : null}

        <View style={styles.composerShell}>
          <TextInput
            value={input}
            onChangeText={setInput}
            style={styles.input}
            placeholder={recording ? 'Listening…' : 'Type your response'}
            placeholderTextColor={COLORS.muted}
            multiline
          />

          <View style={styles.composerActions}>
            <TouchableOpacity
              style={[styles.voiceButton, recording ? styles.voiceButtonActive : null]}
              activeOpacity={0.9}
              onPress={toggleVoice}
            >
              <Ionicons name={recording ? 'radio' : 'mic-outline'} size={16} color={recording ? COLORS.bg : COLORS.text} />
              <Text style={[styles.voiceButtonText, recording ? styles.voiceButtonTextActive : null]}>
                {recording ? 'Recording…' : 'Voice'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sendButton} activeOpacity={0.9} onPress={handleFreeTextSend}>
              <Ionicons name="send" size={14} color={COLORS.bg} />
              <Text style={styles.sendText}>Send</Text>
            </TouchableOpacity>
          </View>
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
    paddingTop: 10,
    paddingBottom: 10,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 8,
  },
  chatContent: {
    paddingBottom: 10,
    gap: 8,
  },
  bubbleWrap: {
    flexDirection: 'row',
  },
  bubbleWrapAssistant: {
    justifyContent: 'flex-start',
  },
  bubbleWrapUser: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '90%',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  assistantBubble: {
    backgroundColor: COLORS.card,
    borderColor: 'rgba(162,167,179,0.2)',
  },
  userBubble: {
    backgroundColor: 'rgba(245,201,106,0.16)',
    borderColor: 'rgba(245,201,106,0.34)',
  },
  jsonBubble: {
    backgroundColor: 'rgba(162,167,179,0.1)',
  },
  bubbleRole: {
    color: COLORS.accent2,
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  bubbleText: {
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 18,
  },
  jsonText: {
    fontFamily: 'Courier',
    fontSize: 12,
    lineHeight: 17,
  },
  copyButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.26)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  copyButtonText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  quickRepliesWrap: {
    marginTop: 4,
    marginBottom: 8,
    minHeight: 38,
  },
  quickRepliesContent: {
    gap: 8,
    paddingRight: 4,
  },
  quickReplyChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(245,201,106,0.42)',
    backgroundColor: 'rgba(245,201,106,0.14)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  quickReplyText: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  composerShell: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.card,
    padding: 8,
    gap: 8,
  },
  input: {
    minHeight: 44,
    maxHeight: 110,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.cardSoft,
    color: COLORS.text,
    paddingHorizontal: 10,
    paddingTop: 9,
    paddingBottom: 9,
    fontSize: 13,
    textAlignVertical: 'top',
  },
  composerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  voiceButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.3)',
    backgroundColor: COLORS.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  voiceButtonActive: {
    borderColor: 'rgba(245,201,106,0.52)',
    backgroundColor: COLORS.accent,
  },
  voiceButtonText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  voiceButtonTextActive: {
    color: COLORS.bg,
  },
  sendButton: {
    minWidth: 88,
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    flexDirection: 'row',
    gap: 5,
  },
  sendText: {
    color: COLORS.bg,
    fontSize: 12,
    fontWeight: '700',
  },
});

export default TestOnboardingSandboxScreen;

