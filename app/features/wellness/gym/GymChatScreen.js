import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

import { getSupabaseClient } from '../../../core/integrations/supabase';
import {
  createGymChatSessionId,
  loadGymChatSessions,
  saveGymChatSessions,
} from '../../../core/storage/gymChatStorage';
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
const TRANSCRIBE_FUNCTION_URL = buildFunctionsUrl('chat_transcribe');

function previewText(text, maxChars = 320) {
  if (typeof text !== 'string') return '';
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}...`;
}

function extractPromptTexts(openAiRequestPayload) {
  const inputItems = Array.isArray(openAiRequestPayload?.input) ? openAiRequestPayload.input : [];
  let systemText = '';
  let userText = '';

  for (const item of inputItems) {
    const contentItems = Array.isArray(item?.content) ? item.content : [];
    const merged = contentItems
      .map((entry) => (typeof entry?.text === 'string' ? entry.text : ''))
      .filter(Boolean)
      .join('\n');

    if (item?.role === 'system' && merged && !systemText) systemText = merged;
    if (item?.role === 'user' && merged && !userText) userText = merged;
  }

  return { systemText, userText };
}

function extractDbContextFromUserText(userText) {
  if (typeof userText !== 'string') return null;

  const questionMarker = 'USER_QUESTION:';
  const contextMarker = 'DB_CONTEXT_JSON:';
  const questionIndex = userText.indexOf(questionMarker);
  const contextIndex = userText.indexOf(contextMarker);
  const questionText =
    questionIndex >= 0
      ? userText.slice(questionIndex + questionMarker.length, contextIndex >= 0 ? contextIndex : undefined).trim()
      : '';

  if (contextIndex < 0) {
    return { questionText, contextPayload: null };
  }

  const contextText = userText.slice(contextIndex + contextMarker.length).trim();
  try {
    return { questionText, contextPayload: JSON.parse(contextText) };
  } catch {
    return { questionText, contextPayload: null };
  }
}

function namesPreviewFromRows(rows, limit = 5) {
  if (!Array.isArray(rows)) return '';
  const names = rows
    .map((row) => row?.name ?? row?.name_key ?? row?.id)
    .filter((value) => typeof value === 'string' || typeof value === 'number')
    .map((value) => String(value))
    .slice(0, limit);
  return names.join(', ');
}

function RawJsonSection({ label, data }) {
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

function TraceRow({ label, value }) {
  const safeValue =
    typeof value === 'string' && value.length
      ? value
      : value === 0
        ? '0'
        : value
          ? String(value)
          : '-';
  return (
    <View style={styles.traceRow}>
      <Text style={styles.traceLabel}>{label}</Text>
      <Text style={styles.traceValue}>{safeValue}</Text>
    </View>
  );
}

function TraceCard({ title, children }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={styles.devWrap}>
      <TouchableOpacity style={styles.devToggle} activeOpacity={0.9} onPress={() => setExpanded((prev) => !prev)}>
        <Text style={styles.devToggleText}>{expanded ? `Hide ${title}` : title}</Text>
      </TouchableOpacity>
      {expanded ? (
        <View style={styles.traceCard}>
          <Text style={styles.traceTitle}>{title}</Text>
          {children}
        </View>
      ) : null}
    </View>
  );
}

function UserPayloadSections({ payload }) {
  const requestBody = payload?.body || {};
  const edgePayload = payload?.edgePayload || {};
  const requestCost = edgePayload?.meta?.cost;
  const debug = edgePayload?.meta?.debug || {};
  const edgeContextPayload = debug?.context_payload;
  const openAiRequestPayload = debug?.openai_request;
  const parsedPlan = debug?.parsed_plan || {};
  const actionData = edgePayload?.data;
  const actionRows = Array.isArray(actionData?.rows) ? actionData.rows : [];
  const actionRowPreview = namesPreviewFromRows(actionRows);
  const tablesSummary = Array.isArray(edgeContextPayload?.allowed_tables)
    ? edgeContextPayload.allowed_tables.slice(0, 8).map((table) => `${table.table} (${table.rows})`).join(', ')
    : '';
  const { systemText, userText } = extractPromptTexts(openAiRequestPayload);
  const userPromptContext = extractDbContextFromUserText(userText);
  const contextFromPrompt = userPromptContext?.contextPayload || edgeContextPayload;
  const userQuestionFromPrompt = userPromptContext?.questionText || '';

  return (
    <>
      <TraceCard title="Request Summary">
        <TraceRow label="Endpoint" value={payload?.url || '-'} />
        <TraceRow label="Message" value={requestBody?.message || '-'} />
        <TraceRow label="Attach Tables" value={requestBody?.attach_tables ? 'true' : 'false'} />
        <TraceRow label="History Turns" value={Array.isArray(requestBody?.history) ? requestBody.history.length : 0} />
        <TraceRow label="Debug Mode" value={requestBody?.debug ? 'true' : 'false'} />
        <RawJsonSection label="Raw Request JSON" data={payload} />
      </TraceCard>

      {requestCost ? (
        <TraceCard title="Request Cost (Input)">
          <TraceRow label="Model" value={requestCost?.model || '-'} />
          <TraceRow label="Input Tokens" value={requestCost?.input_tokens || 0} />
          <TraceRow label="Input Cost" value={toUsd(requestCost?.input_cost_usd || 0)} />
          <TraceRow label="Total Cost (Request+Response)" value={toUsd(requestCost?.total_cost_usd || 0)} />
          <TraceRow label="Pricing Source" value={requestCost?.pricing_source || '-'} />
        </TraceCard>
      ) : null}

      {edgePayload && Object.keys(edgePayload).length ? (
        <>
          <TraceCard title="Edge Result">
            <TraceRow label="Action" value={edgePayload?.action || parsedPlan?.action} />
            <TraceRow label="Table" value={parsedPlan?.table || contextFromPrompt?.resolved_table || '-'} />
            <TraceRow label="Status" value={edgePayload?.ok ? 'ok' : 'error'} />
            <TraceRow label="Duration" value={edgePayload?.meta?.ms ? `${edgePayload.meta.ms} ms` : '-'} />
            <TraceRow label="Rows Returned" value={actionRows.length || actionData?.count || 0} />
            {actionRowPreview ? <TraceRow label="Row Preview" value={actionRowPreview} /> : null}
            <RawJsonSection label="Raw Edge Response JSON" data={edgePayload} />
          </TraceCard>

          <TraceCard title="Edge Context -> OpenAI">
            <TraceRow label="Resolved Action" value={contextFromPrompt?.resolved_action || '-'} />
            <TraceRow label="Resolved Table" value={contextFromPrompt?.resolved_table || '-'} />
            <TraceRow label="Allowed Tables" value={tablesSummary || '-'} />
            <RawJsonSection label="Raw Edge Context JSON" data={edgeContextPayload} />
          </TraceCard>

          <TraceCard title="OpenAI Request">
            <TraceRow label="Model" value={openAiRequestPayload?.model || '-'} />
            <TraceRow label="User Question" value={userQuestionFromPrompt || '-'} />
            <Text style={styles.traceSubLabel}>System Prompt</Text>
            <Text style={styles.traceBlockText}>{previewText(systemText || '-')}</Text>
            <Text style={styles.traceSubLabel}>User Prompt (includes DB context)</Text>
            <Text style={styles.traceBlockText}>{previewText(userText || '-')}</Text>
            <RawJsonSection label="Raw OpenAI Request JSON" data={openAiRequestPayload} />
          </TraceCard>
        </>
      ) : null}
    </>
  );
}

function AssistantPayloadSections({ payload }) {
  const openAiResponsePayload = payload?.openaiResponse;
  const cost = payload?.cost;
  const openAiOutputText =
    openAiResponsePayload?.output_text ||
    openAiResponsePayload?.output?.[0]?.content?.find((entry) => entry?.type === 'output_text')?.text ||
    '';

  return (
    <>
      {cost ? (
        <TraceCard title="Response Cost (Output)">
          <TraceRow label="Model" value={cost?.model || '-'} />
          <TraceRow label="Output Tokens" value={cost?.output_tokens || 0} />
          <TraceRow label="Output Cost" value={toUsd(cost?.output_cost_usd || 0)} />
          <TraceRow label="Total Tokens" value={cost?.total_tokens || 0} />
          <TraceRow label="Total Cost (Request+Response)" value={toUsd(cost?.total_cost_usd || 0)} />
          <TraceRow label="Pricing Source" value={cost?.pricing_source || '-'} />
        </TraceCard>
      ) : null}

      <TraceCard title="OpenAI Response">
        <TraceRow label="Response ID" value={openAiResponsePayload?.id || '-'} />
        <TraceRow label="Model" value={openAiResponsePayload?.model || '-'} />
        <Text style={styles.traceSubLabel}>Output Text</Text>
        <Text style={styles.traceBlockText}>{previewText(openAiOutputText || '-')}</Text>
        <RawJsonSection label="Raw OpenAI Response JSON" data={openAiResponsePayload} />
      </TraceCard>

      {payload?.error ? (
        <TraceCard title="Assistant Error">
          <TraceRow label="Error" value={payload.error} />
        </TraceCard>
      ) : null}
    </>
  );
}

function MessagePayloadSections({ message }) {
  const payload = message?.payload;
  if (payload === undefined) return null;

  if (message.role === 'user') {
    return <UserPayloadSections payload={payload} />;
  }

  return <AssistantPayloadSections payload={payload} />;
}

function buildConversationHistory(messages, maxTurns = 10) {
  if (!Array.isArray(messages)) return [];
  const history = messages
    .filter((item) => item?.role === 'user' || item?.role === 'assistant')
    .filter((item) => typeof item?.text === 'string' && item.text.trim().length > 0)
    .map((item) => ({ role: item.role, content: item.text.trim() }));

  if (history.length <= maxTurns) return history;
  return history.slice(history.length - maxTurns);
}

function toUsd(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '$0.000000';
  return `$${value.toFixed(6)}`;
}

function deriveSessionTitle(messages = []) {
  const firstUser = (messages || []).find(
    (entry) => entry?.role === 'user' && typeof entry?.text === 'string' && entry.text.trim().length,
  );
  const text = String(firstUser?.text || '').trim();
  if (!text) return 'New chat';
  return text.length > 48 ? `${text.slice(0, 48)}...` : text;
}

function formatSessionDate(iso) {
  if (!iso) return '';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function GymChatScreen() {
  const recordingRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [chatSessions, setChatSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState('');
  const [historyVisible, setHistoryVisible] = useState(false);
  const [titleEditorVisible, setTitleEditorVisible] = useState(false);
  const [editTitleText, setEditTitleText] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [attachTables, setAttachTables] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceStatusText, setVoiceStatusText] = useState('');

  const configured = useMemo(() => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && FUNCTION_URL), []);
  const activeSession = useMemo(
    () => chatSessions.find((session) => session.id === activeSessionId) || null,
    [chatSessions, activeSessionId],
  );
  const isEmptyDraft = !activeSessionId && messages.length === 0;

  useEffect(() => {
    let alive = true;
    (async () => {
      const stored = await loadGymChatSessions();
      if (!alive) return;
      setChatSessions(stored);
      if (stored.length > 0) {
        const latest = stored[0];
        setActiveSessionId(latest.id);
        setMessages(Array.isArray(latest.messages) ? latest.messages : []);
        setAttachTables(latest.attachTables !== false);
      }
      setHydrated(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(
    () => () => {
      const activeRecording = recordingRef.current;
      if (activeRecording) {
        activeRecording.stopAndUnloadAsync().catch(() => {});
      }
    },
    [],
  );

  useEffect(() => {
    if (!hydrated || !activeSessionId) return;
    if (!messages.length) return;

    setChatSessions((prev) => {
      const nowIso = new Date().toISOString();
      const nextTitle =
        activeSession?.title && activeSession.title !== 'New chat'
          ? activeSession.title
          : deriveSessionTitle(messages);
      const nextSession = {
        id: activeSessionId,
        title: nextTitle,
        attachTables,
        messages,
        createdAt: activeSession?.createdAt || nowIso,
        updatedAt: nowIso,
      };
      const remaining = prev.filter((entry) => entry.id !== activeSessionId);
      const next = [nextSession, ...remaining];
      void saveGymChatSessions(next);
      return next;
    });
  }, [activeSession?.createdAt, activeSessionId, attachTables, hydrated, messages]);

  const switchToSession = useCallback((session) => {
    if (!session?.id) return;
    setActiveSessionId(session.id);
    setMessages(Array.isArray(session.messages) ? session.messages : []);
    setAttachTables(session.attachTables !== false);
    setInput('');
    setHistoryVisible(false);
  }, []);

  const startNewChat = useCallback(() => {
    if (pending) return;
    setActiveSessionId('');
    setMessages([]);
    setAttachTables(true);
    setInput('');
    setHistoryVisible(false);
  }, [pending]);

  const deleteChatSession = useCallback(
    (sessionId) => {
      if (!sessionId || pending) return;
      const target = chatSessions.find((entry) => entry.id === sessionId);
      Alert.alert(
        'Delete chat?',
        `Delete "${target?.title || 'this chat'}"? This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              setChatSessions((prev) => {
                const next = prev.filter((entry) => entry.id !== sessionId);
                void saveGymChatSessions(next);
                if (activeSessionId === sessionId) {
                  const fallback = next[0] || null;
                  setActiveSessionId(fallback?.id || '');
                  setMessages(Array.isArray(fallback?.messages) ? fallback.messages : []);
                  setAttachTables(fallback?.attachTables !== false);
                }
                return next;
              });
            },
          },
        ],
      );
    },
    [activeSessionId, chatSessions, pending],
  );

  const openTitleEditor = useCallback(() => {
    if (!activeSession?.id || !messages.length) return;
    setEditTitleText(activeSession?.title || deriveSessionTitle(messages));
    setTitleEditorVisible(true);
  }, [activeSession?.id, activeSession?.title, messages]);

  const saveEditedTitle = useCallback(() => {
    const nextTitle = editTitleText.trim();
    if (!activeSession?.id || !nextTitle) {
      setTitleEditorVisible(false);
      return;
    }
    setChatSessions((prev) => {
      const nowIso = new Date().toISOString();
      const next = prev.map((entry) =>
        entry.id === activeSession.id ? { ...entry, title: nextTitle, updatedAt: nowIso } : entry,
      );
      void saveGymChatSessions(next);
      return next;
    });
    setTitleEditorVisible(false);
  }, [activeSession?.id, editTitleText]);

  const startVoiceCapture = useCallback(async () => {
    if (!configured || !TRANSCRIBE_FUNCTION_URL || pending || isTranscribing) return;
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission?.granted) {
        Alert.alert('Microphone permission', 'Please allow microphone access to use voice input.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();

      recordingRef.current = recording;
      setIsRecording(true);
      setVoiceStatusText('Listening...');
    } catch (error) {
      recordingRef.current = null;
      setIsRecording(false);
      setVoiceStatusText('');
      Alert.alert('Voice input failed', error?.message || 'Could not start recording.');
    }
  }, [configured, isTranscribing, pending]);

  const stopVoiceCaptureAndTranscribe = useCallback(async () => {
    if (!recordingRef.current) return;

    const activeRecording = recordingRef.current;
    recordingRef.current = null;
    setIsRecording(false);
    setIsTranscribing(true);
    setVoiceStatusText('Transcribing...');

    try {
      await activeRecording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      const uri = activeRecording.getURI();
      if (!uri) throw new Error('No audio captured.');

      const formData = new FormData();
      formData.append('audio', {
        uri,
        name: `voice_${Date.now()}.m4a`,
        type: 'audio/m4a',
      });

      const supabase = getSupabaseClient();
      const sessionResp = await supabase?.auth?.getSession?.();
      const accessToken = sessionResp?.data?.session?.access_token;
      const authToken = accessToken || SUPABASE_ANON_KEY;

      const timeoutController = new AbortController();
      const timeoutId = setTimeout(() => timeoutController.abort(), 30000);

      let response;
      try {
        response = await fetch(TRANSCRIBE_FUNCTION_URL, {
          method: 'POST',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${authToken}`,
          },
          body: formData,
          signal: timeoutController.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      let payload = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || `Transcription failed (${response.status})`);
      }

      const transcript = String(payload?.text || '').trim();
      if (!transcript) throw new Error('Transcription returned empty text.');

      setInput((prev) => (prev.trim() ? `${prev.trim()} ${transcript}` : transcript));
    } catch (error) {
      Alert.alert('Voice transcription failed', error?.message || 'Could not transcribe audio.');
    } finally {
      setIsTranscribing(false);
      setVoiceStatusText('');
    }
  }, []);

  const send = async () => {
    const text = input.trim();
    if (!text || pending || isRecording || isTranscribing) return;

    let resolvedSessionId = activeSessionId;
    if (!resolvedSessionId) {
      resolvedSessionId = createGymChatSessionId();
      setActiveSessionId(resolvedSessionId);
    }

    if (!configured) {
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

    const history = buildConversationHistory(messages, 10);
    const requestBody = { message: text, debug: __DEV__, attach_tables: attachTables, history };
    const userMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      text,
      createdAt: new Date().toISOString(),
      payload: {
        direction: 'request',
        url: FUNCTION_URL,
        body: requestBody,
      },
      sessionId: resolvedSessionId,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setPending(true);

    try {
      const supabase = getSupabaseClient();
      const sessionResp = await supabase?.auth?.getSession?.();
      const accessToken = sessionResp?.data?.session?.access_token;
      const authToken = accessToken || SUPABASE_ANON_KEY;

      let payload = null;
      let fallbackStatus = null;
      let lastInvokeError = null;
      let invokeSucceeded = false;

      try {
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
          invokeSucceeded = true;
        }
      } catch (invokeErr) {
        lastInvokeError = invokeErr?.message || 'Function invoke failed';
      }

      if (!invokeSucceeded) {
        let lastFetchError = null;
        for (let attempt = 0; attempt < 2; attempt += 1) {
          try {
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
            lastFetchError = null;
            break;
          } catch (fetchErr) {
            lastFetchError = fetchErr?.message || 'Fetch failed';
          }
        }

        if (!payload) {
          throw new Error(lastFetchError || lastInvokeError || 'Failed to send a request to the Edge Function');
        }
      }

      const assistantText = payload?.human || payload?.error || `Request failed (${fallbackStatus || 'unknown'})`;

      setMessages((prev) => {
        const updated = prev.map((item) =>
          item.id === userMessage.id ? { ...item, payload: { ...item.payload, edgePayload: payload } } : item,
        );
        return [
          ...updated,
          {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            text: assistantText,
            createdAt: new Date().toISOString(),
            payload: {
              direction: 'assistant',
              openaiResponse: payload?.meta?.debug?.openai_response,
              cost: payload?.meta?.cost || null,
              error: payload?.error,
            },
          },
        ];
      });

    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant_${Date.now()}`,
          role: 'assistant',
          text: `Request failed: ${error?.message || 'Unknown error'}`,
          createdAt: new Date().toISOString(),
          payload: {
            direction: 'response',
            error: error?.message || 'Unknown error',
          },
        },
      ]);
    } finally {
      setPending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.chatHeaderRow}>
          <TouchableOpacity style={styles.headerIconButton} activeOpacity={0.9} onPress={() => setHistoryVisible(true)}>
            <Ionicons name="time-outline" size={15} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.titleCenterWrap}>
            <Text style={styles.activeSessionText} numberOfLines={1}>
              {activeSession?.title || 'New chat'}
            </Text>
            {activeSession?.id && messages.length ? (
              <TouchableOpacity style={styles.titleEditButton} activeOpacity={0.9} onPress={openTitleEditor}>
                <Ionicons name="pencil-outline" size={12} color={COLORS.muted} />
              </TouchableOpacity>
            ) : null}
          </View>
          {!isEmptyDraft ? (
            <TouchableOpacity
              style={styles.headerIconButton}
              activeOpacity={0.9}
              onPress={startNewChat}
              disabled={pending}
            >
              <Ionicons name="add" size={16} color={COLORS.text} />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerIconSpacer} />
          )}
        </View>

        <ScrollView style={styles.messagesWrap} contentContainerStyle={styles.messagesContent}>
          {messages.length === 0 && !pending ? (
            <View style={styles.emptyStateWrap}>
              <Text style={styles.emptyStateText}>Send a message to start.</Text>
            </View>
          ) : (
            messages.map((message) => (
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
            ))
          )}

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
          editable={!pending && !isRecording && !isTranscribing}
        />
          <TouchableOpacity
            style={[
              styles.voiceButton,
              isRecording ? styles.voiceButtonActive : null,
              (pending || isTranscribing) && styles.composerButtonDisabled,
            ]}
            activeOpacity={0.9}
            onPress={isRecording ? stopVoiceCaptureAndTranscribe : startVoiceCapture}
            disabled={pending || isTranscribing}
          >
            {isTranscribing ? (
              <ActivityIndicator color={COLORS.bg} size="small" />
            ) : (
              <Ionicons name={isRecording ? 'stop' : 'mic'} size={16} color={COLORS.bg} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sendButton, (pending || isRecording || isTranscribing) && styles.composerButtonDisabled]}
            activeOpacity={0.9}
            onPress={send}
            disabled={pending || isRecording || isTranscribing}
          >
            {pending ? <ActivityIndicator color={COLORS.bg} size="small" /> : <Text style={styles.sendText}>Send</Text>}
          </TouchableOpacity>
        </View>
        {voiceStatusText ? <Text style={styles.voiceStatus}>{voiceStatusText}</Text> : null}
        <TouchableOpacity
          style={styles.attachToggleRow}
          activeOpacity={0.9}
          onPress={() => setAttachTables((prev) => !prev)}
          disabled={pending || isTranscribing}
        >
          <View style={[styles.attachCheckbox, attachTables && styles.attachCheckboxActive]}>
            <Text style={styles.attachCheckboxText}>{attachTables ? '✓' : ''}</Text>
          </View>
          <Text style={styles.attachToggleText}>Attach tables/context</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={historyVisible} transparent animationType="fade" onRequestClose={() => setHistoryVisible(false)}>
        <Pressable style={styles.historyOverlay} onPress={() => setHistoryVisible(false)}>
          <Pressable style={styles.historyCard} onPress={() => {}}>
            <View style={styles.historyHeaderRow}>
              <Text style={styles.historyTitle}>Chat history</Text>
              <TouchableOpacity style={styles.historyNewButton} activeOpacity={0.9} onPress={startNewChat}>
                <Ionicons name="add" size={13} color={COLORS.accent} />
                <Text style={styles.historyNewText}>New chat</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.historyList} showsVerticalScrollIndicator={false}>
              {chatSessions.length === 0 ? (
                <Text style={styles.historyEmptyText}>No saved chats yet.</Text>
              ) : (
                chatSessions.map((session) => (
                  <TouchableOpacity
                    key={session.id}
                    style={[styles.historyRow, session.id === activeSessionId ? styles.historyRowActive : null]}
                    activeOpacity={0.9}
                    onPress={() => switchToSession(session)}
                  >
                    <View style={styles.historyRowMain}>
                      <Text style={styles.historyRowTitle} numberOfLines={1}>
                        {session.title}
                      </Text>
                      <Text style={styles.historyRowMeta} numberOfLines={1}>
                        {(session.messages || []).length} msgs • {formatSessionDate(session.updatedAt)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.historyDeleteButton}
                      activeOpacity={0.9}
                      onPress={(event) => {
                        event?.stopPropagation?.();
                        deleteChatSession(session.id);
                      }}
                    >
                      <Ionicons name="trash-outline" size={14} color="#FFB4A8" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={titleEditorVisible} transparent animationType="fade" onRequestClose={() => setTitleEditorVisible(false)}>
        <Pressable style={styles.historyOverlay} onPress={() => setTitleEditorVisible(false)}>
          <Pressable style={styles.titleEditorCard} onPress={() => {}}>
            <Text style={styles.historyTitle}>Edit chat title</Text>
            <TextInput
              value={editTitleText}
              onChangeText={setEditTitleText}
              placeholder="Chat title"
              placeholderTextColor={COLORS.muted}
              style={styles.titleEditorInput}
              autoFocus
              editable={!pending}
            />
            <View style={styles.titleEditorActions}>
              <TouchableOpacity
                style={styles.titleEditorButtonSecondary}
                activeOpacity={0.9}
                onPress={() => setTitleEditorVisible(false)}
              >
                <Text style={styles.titleEditorButtonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.titleEditorButtonPrimary}
                activeOpacity={0.9}
                onPress={saveEditedTitle}
              >
                <Text style={styles.titleEditorButtonPrimaryText}>Save</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
    paddingTop: 8,
    paddingBottom: 14,
  },
  chatHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  headerIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.35)',
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconSpacer: {
    width: 32,
    height: 32,
  },
  titleCenterWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  activeSessionText: {
    maxWidth: '90%',
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  titleEditButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesWrap: {
    flex: 1,
  },
  messagesContent: {
    flexGrow: 1,
    paddingBottom: 12,
  },
  emptyStateWrap: {
    flex: 1,
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  emptyStateText: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: '600',
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
  voiceButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceButtonActive: {
    backgroundColor: '#E56F6F',
  },
  composerButtonDisabled: {
    opacity: 0.6,
  },
  sendText: {
    color: COLORS.bg,
    fontSize: 13,
    fontWeight: '700',
  },
  voiceStatus: {
    marginTop: 6,
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  attachToggleRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attachCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.38)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
  },
  attachCheckboxActive: {
    borderColor: 'rgba(245,201,106,0.52)',
    backgroundColor: 'rgba(245,201,106,0.16)',
  },
  attachCheckboxText: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
  },
  attachToggleText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  historyOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5,8,20,0.68)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  historyCard: {
    width: '100%',
    maxHeight: '70%',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.26)',
    backgroundColor: COLORS.card,
    padding: 12,
  },
  titleEditorCard: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.26)',
    backgroundColor: COLORS.card,
    padding: 12,
  },
  titleEditorInput: {
    marginTop: 10,
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.3)',
    backgroundColor: COLORS.cardSoft,
    color: COLORS.text,
    paddingHorizontal: 10,
    fontSize: 13,
  },
  titleEditorActions: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
  },
  titleEditorButtonSecondary: {
    flex: 1,
    minHeight: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.34)',
    backgroundColor: COLORS.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleEditorButtonSecondaryText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  titleEditorButtonPrimary: {
    flex: 1,
    minHeight: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(245,201,106,0.5)',
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleEditorButtonPrimaryText: {
    color: COLORS.bg,
    fontSize: 12,
    fontWeight: '800',
  },
  historyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  historyTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  historyNewButton: {
    minHeight: 28,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(245,201,106,0.45)',
    backgroundColor: 'rgba(245,201,106,0.14)',
    paddingHorizontal: 9,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  historyNewText: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  historyList: {
    marginTop: 10,
  },
  historyEmptyText: {
    color: COLORS.muted,
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 18,
  },
  historyRow: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyRowActive: {
    borderColor: 'rgba(245,201,106,0.45)',
    backgroundColor: 'rgba(245,201,106,0.14)',
  },
  historyRowMain: {
    flex: 1,
    minWidth: 0,
  },
  historyRowTitle: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  historyRowMeta: {
    marginTop: 2,
    color: COLORS.muted,
    fontSize: 10,
  },
  historyDeleteButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,130,130,0.4)',
    backgroundColor: 'rgba(255,130,130,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  devWrap: {
    marginTop: 8,
  },
  traceCard: {
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: 'rgba(14,17,24,0.72)',
    paddingHorizontal: 9,
    paddingVertical: 8,
  },
  traceTitle: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  traceRow: {
    marginBottom: 5,
  },
  traceLabel: {
    color: COLORS.muted,
    fontSize: 10,
    marginBottom: 1,
  },
  traceValue: {
    color: COLORS.text,
    fontSize: 11,
    lineHeight: 15,
  },
  traceSubLabel: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 4,
    marginBottom: 3,
  },
  traceBlockText: {
    color: '#C9D1E0',
    fontSize: 11,
    lineHeight: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: 'rgba(20,24,34,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 6,
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
