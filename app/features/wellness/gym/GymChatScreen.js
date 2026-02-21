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

import { getSupabaseClient } from '../../../core/integrations/supabase';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../../../core/env';
import COLORS from '../../../theme/colors';

function buildFunctionsUrl(pathname) {
  if (!SUPABASE_URL) return '';
  try {
    const parsed = new URL(SUPABASE_URL);
    const host = parsed.host;
    if (!host.endsWith('.supabase.co')) return '';
    const projectRef = host.replace('.supabase.co', '');
    return `https://${projectRef}.functions.supabase.co/${pathname}`;
  } catch {
    return '';
  }
}

const FUNCTION_URL = buildFunctionsUrl('chat_db');

function JsonPayloadSection({ label, data }) {
  const [expanded, setExpanded] = useState(false);
  if (data === undefined) return null;

  return (
    <View style={styles.devWrap}>
      <TouchableOpacity style={styles.devToggle} activeOpacity={0.9} onPress={() => setExpanded((prev) => !prev)}>
        <Text style={styles.devToggleText}>{expanded ? `Hide ${label}` : label}</Text>
      </TouchableOpacity>
      {expanded ? <Text style={styles.devJson}>{JSON.stringify(data, null, 2)}</Text> : null}
    </View>
  );
}

function MessagePayloadSections({ message }) {
  const payload = message?.payload;
  if (payload === undefined) return null;

  if (message.role === 'user') {
    return <JsonPayloadSection label="Payload" data={payload} />;
  }

  const responseBody = payload?.body;
  const debug = responseBody?.meta?.debug;
  const edgeContextPayload = debug?.context_payload;
  const openAiRequestPayload = debug?.openai_request;
  const openAiResponsePayload = debug?.openai_response;

  return (
    <>
      <JsonPayloadSection label="Payload" data={payload} />
      <JsonPayloadSection label="Edge Context" data={edgeContextPayload} />
      <JsonPayloadSection label="OpenAI Request" data={openAiRequestPayload} />
      <JsonPayloadSection label="OpenAI Response" data={openAiResponsePayload} />
    </>
  );
}

function GymChatScreen() {
  const [messages, setMessages] = useState([
    { id: 'intro', role: 'assistant', text: 'Gym DB chat ready. Try: "What tables exist?"' },
  ]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [statusText, setStatusText] = useState('Idle');

  const configured = useMemo(() => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && FUNCTION_URL), []);

  const send = async () => {
    const text = input.trim();
    if (!text || pending) return;

    if (!configured) {
      setStatusText('Supabase function not configured');
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant_${Date.now()}`,
          role: 'assistant',
          text: 'Supabase function is not configured. Check EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY.',
        },
      ]);
      return;
    }

    const requestBody = { message: text, debug: __DEV__ };
    const userMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      text,
      payload: {
        direction: 'request',
        url: FUNCTION_URL,
        body: requestBody,
      },
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setPending(true);
    setStatusText('Thinking...');

    try {
      const supabase = getSupabaseClient();
      const sessionResp = await supabase?.auth?.getSession?.();
      const accessToken = sessionResp?.data?.session?.access_token;
      const authToken = accessToken || SUPABASE_ANON_KEY;

      let payload = null;
      let responseOk = false;
      let fallbackStatus = null;
      const invokeResult = await supabase?.functions?.invoke?.('chat_db', {
        body: requestBody,
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (invokeResult?.data || invokeResult?.error) {
        if (invokeResult?.error) {
          throw new Error(invokeResult.error?.message || 'Function invoke failed');
        }
        payload = invokeResult.data;
        responseOk = Boolean(invokeResult.data?.ok);
      } else {
        const response = await fetch(FUNCTION_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(requestBody),
        });
        fallbackStatus = response.status;
        payload = await response.json();
        responseOk = response.ok && Boolean(payload?.ok);
      }

      const assistantText = payload?.human || payload?.error || `Request failed (${fallbackStatus || 'unknown'})`;

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant_${Date.now()}`,
          role: 'assistant',
          text: assistantText,
          payload: {
            direction: 'response',
            status: fallbackStatus,
            body: payload,
          },
        },
      ]);

      setStatusText(responseOk ? 'Request succeeded' : 'Request failed');
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant_${Date.now()}`,
          role: 'assistant',
          text: `Request failed: ${error?.message || 'Unknown error'}`,
          payload: {
            direction: 'response',
            error: error?.message || 'Unknown error',
          },
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
        <Text style={styles.title}>Gym Chat</Text>
        <Text style={styles.subtitle}>Remote DB bridge: {configured ? 'configured' : 'missing config'}</Text>
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
              <MessagePayloadSections message={message} />
            </View>
          ))}

          {pending ? (
            <View style={[styles.messageBubble, styles.assistantBubble]}>
              <Text style={styles.messageRole}>Assistant</Text>
              <Text style={styles.messageText}>Thinking...</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            value={input}
            onChangeText={setInput}
            style={styles.input}
            placeholder="Ask about gym data"
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
    maxWidth: '96%',
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
  devWrap: {
    marginTop: 8,
  },
  devToggle: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.32)',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  devToggleText: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '700',
  },
  devJson: {
    marginTop: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: 'rgba(17,20,29,0.8)',
    padding: 8,
    color: '#B8C0CF',
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'Courier',
  },
});

export default GymChatScreen;
