import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { OPENAI_API_KEY, OPENAI_MODEL } from '../../../core/env';
import { callOpenAIChat } from '../../../core/integrations/openai';
import COLORS from '../../../theme/colors';

const DEFAULT_MODEL = 'gpt-4.1-mini';

function TestChatScreen() {
  const [messages, setMessages] = useState([
    { id: 'intro', role: 'assistant', text: 'Test chat ready. Send a message to validate OpenAI connectivity.' },
  ]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [statusText, setStatusText] = useState('Idle');

  const openAiConfigured = useMemo(() => Boolean(OPENAI_API_KEY), []);
  const model = useMemo(() => OPENAI_MODEL || DEFAULT_MODEL, []);

  const send = async () => {
    const text = input.trim();
    if (!text || pending) return;

    if (!openAiConfigured) {
      setStatusText('OpenAI not configured');
      return;
    }

    const nextUser = { id: `user_${Date.now()}`, role: 'user', text };
    const nextMessages = [...messages, nextUser];
    setMessages(nextMessages);
    setInput('');
    setPending(true);
    setStatusText('Sending...');

    try {
      const payload = nextMessages.map((item) => ({ role: item.role, content: item.text }));
      const { extractedOutputText } = await callOpenAIChat({
        apiKey: OPENAI_API_KEY,
        model,
        messages: payload,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant_${Date.now()}`,
          role: 'assistant',
          text: extractedOutputText || 'No response text returned.',
        },
      ]);
      setStatusText('Request succeeded');
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error_${Date.now()}`,
          role: 'assistant',
          text: `Request failed: ${error?.message || 'Unknown error'}`,
        },
      ]);
      setStatusText('Request failed');
    } finally {
      setPending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Chat</Text>
        <Text style={styles.subtitle}>OpenAI configured: {openAiConfigured ? 'yes' : 'no'}</Text>
        <Text style={styles.status}>Status: {statusText}</Text>

        <ScrollView style={styles.messagesWrap} contentContainerStyle={styles.messagesContent}>
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageBubble,
                message.role === 'user' ? styles.userBubble : styles.assistantBubble,
              ]}
            >
              <Text style={styles.messageRole}>{message.role === 'user' ? 'You' : 'Assistant'}</Text>
              <Text style={styles.messageText}>{message.text}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            value={input}
            onChangeText={setInput}
            style={styles.input}
            placeholder="Type test message"
            placeholderTextColor={COLORS.muted}
            editable={!pending}
          />
          <TouchableOpacity style={styles.sendButton} activeOpacity={0.9} onPress={send} disabled={pending}>
            {pending ? <ActivityIndicator color={COLORS.bg} size="small" /> : <Text style={styles.sendText}>Send</Text>}
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
    paddingBottom: 14,
  },
  title: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: '700',
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 4,
  },
  status: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  messagesWrap: {
    flex: 1,
  },
  messagesContent: {
    paddingBottom: 12,
  },
  messageBubble: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginBottom: 8,
    maxWidth: '92%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(245,201,106,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(245,201,106,0.3)',
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
  },
  messageRole: {
    color: COLORS.accent2,
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 3,
  },
  messageText: {
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 18,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.28)',
    backgroundColor: COLORS.card,
    color: COLORS.text,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 13,
  },
  sendButton: {
    minWidth: 72,
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  sendText: {
    color: COLORS.bg,
    fontSize: 13,
    fontWeight: '700',
  },
});

export default TestChatScreen;
