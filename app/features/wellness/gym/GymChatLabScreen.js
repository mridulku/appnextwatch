import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Audio } from 'expo-av';

import COLORS from '../../../theme/colors';
import useGymSessions from '../../../hooks/useGymSessions';
import { useAuth } from '../../../context/AuthContext';
import { getOrCreateCurrentAppUserId } from '../../../core/api/gymSessionsDb';
import {
  isChatActionEngineConfigured,
  runActionStage,
  startGuidedAction,
} from '../../../core/api/chatActionDb';
import {
  isGymChatLabVoiceConfigured,
  transcribeGymChatLabAudio,
} from '../../../core/api/gymChatLabDb';

const ACTION_MENU = [
  { key: 'create_session', label: 'Create workout session', subtitle: 'Build a new planned session', enabled: true },
  { key: 'log_sets', label: 'Log sets', subtitle: 'Coming soon', enabled: false },
  { key: 'add_exercise', label: 'Add exercise to catalog', subtitle: 'Coming soon', enabled: false },
  { key: 'edit_session', label: 'Edit session', subtitle: 'Coming soon', enabled: false },
];

function randomRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function getSubmitStage(state) {
  if (state === 'collect_exercises') return 'collect_exercises';
  if (state === 'resolve_entities') return 'resolve_entities';
  if (state === 'collect_sets') return 'collect_sets';
  if (state === 'confirm') return 'resolve_entities';
  return 'resolve_entities';
}

function buildAssistantFromPayload(payload) {
  const assistant = payload?.assistant || {};
  return {
    state: payload?.state || null,
    assistant,
    draftCard: payload?.draft_card || null,
    preparedSnapshot: payload?.prepared_snapshot || null,
    receipt: payload?.receipt || null,
    createdSessionId: payload?.created_session_id || payload?.receipt?.session_id || null,
    meta: payload?.meta || null,
  };
}

function StageBadge({ stage }) {
  if (!stage) return null;
  return (
    <View style={styles.stageBadge}>
      <Text style={styles.stageBadgeText}>{stage}</Text>
    </View>
  );
}

function SnapshotCard({ snapshot }) {
  if (!snapshot || !snapshot.exercise_count) return null;
  const exercises = Array.isArray(snapshot?.exercises) ? snapshot.exercises : [];
  return (
    <View style={styles.snapshotCard}>
      <Text style={styles.snapshotTitle}>Prepared Session</Text>
      <Text style={styles.snapshotMeta}>Title: {snapshot?.title || '-'}</Text>
      <Text style={styles.snapshotMeta}>Exercises: {snapshot?.exercise_count || 0}</Text>
      <Text style={styles.snapshotMeta}>Total sets: {snapshot?.set_count || 0}</Text>
      <View style={styles.snapshotList}>
        {exercises.map((row, index) => (
          <Text key={`${row?.exercise_id || index}_${index}`} style={styles.snapshotRow}>
            {index + 1}. {row?.resolved_name || 'Exercise'} · {Array.isArray(row?.sets) ? row.sets.length : 0} sets
          </Text>
        ))}
      </View>
    </View>
  );
}

function DraftDebug({ response }) {
  const draft = response?.draftCard;
  if (!draft) return null;
  const missing = Array.isArray(draft?.missing_fields) ? draft.missing_fields : [];
  return (
    <View style={styles.snapshotCard}>
      <Text style={styles.snapshotTitle}>Draft State</Text>
      <Text style={styles.snapshotMeta}>Stage: {draft?.stage || '-'}</Text>
      <Text style={styles.snapshotMeta}>Missing: {missing.length ? missing.join(', ') : 'none'}</Text>
      <Text style={styles.snapshotMeta}>Question: {draft?.last_question?.code || '-'}</Text>
    </View>
  );
}

function AssistantControls({
  response,
  pending,
  onSelectOption,
  onExecute,
  onEdit,
  onOpenCatalog,
  canShowCatalog,
}) {
  if (!response?.assistant) return null;
  const mode = response.assistant.input_mode;
  const options = Array.isArray(response.assistant.options) ? response.assistant.options : [];

  const showCatalogButton = canShowCatalog && (response?.state === 'collect_exercises' || response?.state === 'resolve_entities');

  return (
    <View style={styles.controlsWrap}>
      {showCatalogButton ? (
        <TouchableOpacity
          style={[styles.catalogToggleButton, pending ? styles.choiceChipDisabled : null]}
          activeOpacity={0.9}
          onPress={onOpenCatalog}
          disabled={pending}
        >
          <Text style={styles.catalogToggleText}>Show catalog</Text>
        </TouchableOpacity>
      ) : null}

      {mode === 'single_select' && options.length ? (
        <View style={styles.chipsWrap}>
          {options.map((option) => (
            <TouchableOpacity
              key={option}
              style={[styles.choiceChip, pending ? styles.choiceChipDisabled : null]}
              activeOpacity={0.9}
              onPress={() => onSelectOption(option)}
              disabled={pending}
            >
              <Text style={styles.choiceChipText}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {mode === 'confirm' ? (
        <View style={styles.confirmRow}>
          <TouchableOpacity
            style={[styles.secondaryButton, pending ? styles.choiceChipDisabled : null]}
            activeOpacity={0.9}
            onPress={onEdit}
            disabled={pending}
          >
            <Text style={styles.secondaryButtonText}>Back to edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.createButton, pending ? styles.createButtonDisabled : null]}
            activeOpacity={0.9}
            onPress={onExecute}
            disabled={pending}
          >
            {pending ? <ActivityIndicator color={COLORS.bg} size="small" /> : <Text style={styles.createButtonText}>Create session</Text>}
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

function MessageBubble({
  item,
  debugEnabled,
  pending,
  onSelectOption,
  onExecute,
  onEdit,
  onOpenSession,
  onOpenCatalog,
  canShowCatalog,
}) {
  const isUser = item.role === 'user';
  const response = item?.response;
  const assistant = response?.assistant || null;

  return (
    <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
      <Text style={styles.messageRole}>{isUser ? 'You' : 'Assistant'}</Text>
      <Text style={styles.messageText}>{item.text}</Text>

      {!isUser && response ? (
        <>
          {debugEnabled ? <StageBadge stage={response?.state} /> : null}
          {assistant?.question ? <Text style={styles.questionText}>{assistant.question}</Text> : null}
          <SnapshotCard snapshot={response?.preparedSnapshot} />

          <AssistantControls
            response={response}
            pending={pending}
            onSelectOption={onSelectOption}
            onExecute={onExecute}
            onEdit={onEdit}
            onOpenCatalog={onOpenCatalog}
            canShowCatalog={canShowCatalog}
          />

          {response?.state === 'done' && response?.createdSessionId ? (
            <TouchableOpacity style={styles.openSessionButton} activeOpacity={0.9} onPress={onOpenSession}>
              <Text style={styles.openSessionText}>Open created session</Text>
            </TouchableOpacity>
          ) : null}

          {debugEnabled ? <DraftDebug response={response} /> : null}
        </>
      ) : null}

      {debugEnabled && item?.debugPayload ? (
        <View style={styles.debugWrap}>
          <Text style={styles.debugTitle}>Debug</Text>
          <Text style={styles.debugBody}>{JSON.stringify(item.debugPayload, null, 2)}</Text>
        </View>
      ) : null}
    </View>
  );
}

function ActionMenu({ selectedAction, onSelect }) {
  return (
    <View style={styles.actionMenuCard}>
      <Text style={styles.actionMenuTitle}>Action Menu</Text>
      {ACTION_MENU.map((item) => {
        const selected = selectedAction === item.key;
        return (
          <TouchableOpacity
            key={item.key}
            style={[
              styles.actionRow,
              selected ? styles.actionRowSelected : null,
              !item.enabled ? styles.actionRowDisabled : null,
            ]}
            activeOpacity={0.9}
            onPress={() => item.enabled && onSelect(item.key)}
            disabled={!item.enabled}
          >
            <View>
              <Text style={[styles.actionLabel, !item.enabled ? styles.actionLabelDisabled : null]}>{item.label}</Text>
              <Text style={styles.actionSubtitle}>{item.subtitle}</Text>
            </View>
            {!item.enabled ? <Text style={styles.comingSoon}>Soon</Text> : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function GymChatLabScreen({ navigation }) {
  const recordingRef = useRef(null);
  const scrollRef = useRef(null);
  const sessionsApi = useGymSessions();
  const { user } = useAuth();

  const [selectedAction, setSelectedAction] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [debugEnabled, setDebugEnabled] = useState(Boolean(__DEV__));
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceStatusText, setVoiceStatusText] = useState('');

  const [conversationId, setConversationId] = useState('');
  const [draftState, setDraftState] = useState(null);
  const [currentStage, setCurrentStage] = useState('');
  const [lastAssistantPrompt, setLastAssistantPrompt] = useState('');
  const [inputMode, setInputMode] = useState('text');
  const [resolvedAppUserId, setResolvedAppUserId] = useState('');

  const [catalogLoading, setCatalogLoading] = useState(false);

  const configured = useMemo(() => isChatActionEngineConfigured(), []);
  const voiceConfigured = useMemo(() => isGymChatLabVoiceConfigured(), []);

  useEffect(
    () => () => {
      const activeRecording = recordingRef.current;
      if (activeRecording) activeRecording.stopAndUnloadAsync().catch(() => {});
    },
    [],
  );

  useEffect(() => {
    if (!scrollRef.current) return;
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd?.({ animated: true });
    }, 80);
    return () => clearTimeout(timer);
  }, [messages, pending]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const id = await getOrCreateCurrentAppUserId(user);
        if (mounted) setResolvedAppUserId(id);
      } catch {
        if (mounted) setResolvedAppUserId('');
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user]);

  const appendUser = (text) => {
    const value = String(text || '').trim();
    if (!value) return;
    setMessages((prev) => [
      ...prev,
      {
        id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        role: 'user',
        text: value,
      },
    ]);
  };

  const appendAssistantFromPayload = (payload, fallbackText) => {
    const response = buildAssistantFromPayload(payload);
    const text = response?.assistant?.message || fallbackText || 'No response returned.';

    setDraftState(response?.draftCard || null);
    setCurrentStage(response?.state || '');
    setInputMode(response?.assistant?.input_mode || 'text');
    setLastAssistantPrompt(response?.assistant?.question || response?.assistant?.message || '');

    setMessages((prev) => [
      ...prev,
      {
        id: `assistant_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        role: 'assistant',
        text,
        response,
        debugPayload: payload?.debug_payload,
      },
    ]);
  };

  const withUserId = () => {
    const userId = resolvedAppUserId || sessionsApi.appUserId;
    if (!userId) throw new Error('App user id is not ready');
    return userId;
  };

  const ensureCatalogLoaded = async () => {
    if (sessionsApi.exerciseOptions?.length) return;
    setCatalogLoading(true);
    try {
      await sessionsApi.loadExerciseOptions();
    } finally {
      setCatalogLoading(false);
    }
  };

  const selectAction = async (actionKey) => {
    if (pending) return;
    if (!configured) {
      Alert.alert('Configuration', 'Action engine is not configured.');
      return;
    }

    setPending(true);
    try {
      const userId = withUserId();
      setSelectedAction(actionKey);
      setMessages([]);
      setInput('');

      const payload = await startGuidedAction({
        appUserId: userId,
        actionType: actionKey,
        debug: __DEV__,
      });

      setConversationId(String(payload?.conversation_id || ''));
      appendAssistantFromPayload(payload, 'Action started.');

      if (actionKey === 'create_session') {
        await ensureCatalogLoaded();
      }
    } catch (error) {
      appendAssistantFromPayload(null, `Failed to start action: ${error?.message || 'Unknown error'}`);
    } finally {
      setPending(false);
    }
  };

  const runStage = async ({ stage, text = '', selection = '' }) => {
    const userId = withUserId();
    const payload = await runActionStage({
      appUserId: userId,
      conversationId,
      actionType: selectedAction,
      stage,
      userInput: { text, selection },
      clientRequestId: randomRequestId(),
      debug: __DEV__,
    });

    appendAssistantFromPayload(payload, 'Updated.');
    if (payload?.created_session_id) {
      await sessionsApi.refresh();
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || pending || isRecording || isTranscribing) return;
    if (!selectedAction || !conversationId) return;

    appendUser(text);
    setInput('');
    setPending(true);
    try {
      await runStage({ stage: getSubmitStage(currentStage), text });
    } catch (error) {
      appendAssistantFromPayload(null, `Action failed: ${error?.message || 'Unknown error'}`);
    } finally {
      setPending(false);
    }
  };

  const onSelectOption = async (option) => {
    if (pending || !selectedAction || !conversationId) return;
    appendUser(option);
    setPending(true);
    try {
      await runStage({ stage: getSubmitStage(currentStage), selection: option });
    } catch (error) {
      appendAssistantFromPayload(null, `Selection failed: ${error?.message || 'Unknown error'}`);
    } finally {
      setPending(false);
    }
  };

  const onExecute = async () => {
    if (pending || !selectedAction || !conversationId) return;
    setPending(true);
    try {
      await runStage({ stage: 'execute_action', selection: 'Yes' });
    } catch (error) {
      appendAssistantFromPayload(null, `Execution failed: ${error?.message || 'Unknown error'}`);
    } finally {
      setPending(false);
    }
  };

  const onBackToEdit = async () => {
    if (pending || !selectedAction || !conversationId) return;
    setPending(true);
    try {
      await runStage({ stage: 'resolve_entities', selection: 'Re-enter exercises' });
    } catch (error) {
      appendAssistantFromPayload(null, `Could not return to edit mode: ${error?.message || 'Unknown error'}`);
    } finally {
      setPending(false);
    }
  };

  const onOpenCatalog = async () => {
    if (pending) return;
    await ensureCatalogLoaded();
    navigation.navigate('GymChatLabCatalog');
  };

  const startVoiceCapture = async () => {
    if (!voiceConfigured || pending || isTranscribing || !selectedAction) return;

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
  };

  const stopVoiceCaptureAndTranscribe = async () => {
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

      const { text } = await transcribeGymChatLabAudio({
        audioUri: uri,
        filename: `chatlab_${Date.now()}.m4a`,
        mimeType: 'audio/m4a',
      });

      setInput((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
    } catch (error) {
      Alert.alert('Voice transcription failed', error?.message || 'Could not transcribe audio.');
    } finally {
      setIsTranscribing(false);
      setVoiceStatusText('');
    }
  };

  const inputPlaceholder = !selectedAction
    ? 'Select an action to begin'
    : inputMode === 'text'
      ? lastAssistantPrompt || 'Type your response'
      : 'Use options below';

  const canShowCatalog = selectedAction === 'create_session';
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.topRow}>
          <Text style={styles.subtitle}>Guided Action Engine v1.5.1</Text>
          {__DEV__ ? (
            <TouchableOpacity style={styles.debugToggle} activeOpacity={0.9} onPress={() => setDebugEnabled((prev) => !prev)}>
              <Text style={styles.debugToggleText}>{debugEnabled ? 'Debug ON' : 'Debug OFF'}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView ref={scrollRef} style={styles.messagesWrap} contentContainerStyle={styles.messagesContent}>
          <ActionMenu selectedAction={selectedAction} onSelect={selectAction} />

          {catalogLoading ? (
            <View style={styles.catalogLoadingBar}>
              <ActivityIndicator color={COLORS.accent} size="small" />
              <Text style={styles.catalogLoadingText}>Loading catalog...</Text>
            </View>
          ) : null}

          {messages.length === 0 && !pending ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>Select “Create workout session” to start guided mode.</Text>
            </View>
          ) : (
            messages.map((entry) => (
              <MessageBubble
                key={entry.id}
                item={entry}
                debugEnabled={debugEnabled}
                pending={pending}
                onSelectOption={onSelectOption}
                onExecute={onExecute}
                onEdit={onBackToEdit}
                onOpenCatalog={onOpenCatalog}
                canShowCatalog={canShowCatalog}
                onOpenSession={() => {
                  const sessionId = entry?.response?.createdSessionId;
                  if (sessionId) navigation.navigate('GymSessionWork', { sessionId });
                }}
              />
            ))
          )}

          {pending ? (
            <View style={[styles.messageBubble, styles.assistantBubble]}>
              <Text style={styles.messageRole}>Assistant</Text>
              <Text style={styles.messageText}>Working on it...</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            value={input}
            onChangeText={setInput}
            style={styles.input}
            placeholder={inputPlaceholder}
            placeholderTextColor={COLORS.muted}
            editable={Boolean(selectedAction) && !pending && !isRecording && !isTranscribing && inputMode === 'text'}
            multiline
          />
          <TouchableOpacity
            style={[
              styles.voiceButton,
              isRecording ? styles.voiceButtonActive : null,
              (!voiceConfigured || pending || isTranscribing || !selectedAction || inputMode !== 'text') ? styles.composerButtonDisabled : null,
            ]}
            activeOpacity={0.9}
            onPress={isRecording ? stopVoiceCaptureAndTranscribe : startVoiceCapture}
            disabled={!voiceConfigured || pending || isTranscribing || !selectedAction || inputMode !== 'text'}
          >
            {isTranscribing ? (
              <ActivityIndicator color={COLORS.bg} size="small" />
            ) : (
              <Text style={styles.voiceIconText}>{isRecording ? '■' : '🎙️'}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!selectedAction || inputMode !== 'text' || pending || isRecording || isTranscribing) ? styles.composerButtonDisabled : null,
            ]}
            activeOpacity={0.9}
            onPress={send}
            disabled={!selectedAction || inputMode !== 'text' || pending || isRecording || isTranscribing}
          >
            {pending ? <ActivityIndicator color={COLORS.bg} size="small" /> : <Text style={styles.sendText}>Send</Text>}
          </TouchableOpacity>
        </View>

        {voiceStatusText ? <Text style={styles.voiceStatus}>{voiceStatusText}</Text> : null}
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
    paddingTop: 8,
    paddingBottom: 14,
  },
  topRow: {
    marginBottom: 8,
    gap: 8,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  debugToggle: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.32)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: COLORS.card,
  },
  debugToggleText: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '700',
  },
  actionMenuCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: COLORS.card,
    padding: 10,
    marginBottom: 10,
  },
  actionMenuTitle: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  actionRow: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.18)',
    backgroundColor: 'rgba(20,24,34,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginBottom: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionRowSelected: {
    borderColor: 'rgba(245,201,106,0.42)',
    backgroundColor: 'rgba(245,201,106,0.12)',
  },
  actionRowDisabled: {
    opacity: 0.58,
  },
  actionLabel: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  actionLabelDisabled: {
    color: COLORS.muted,
  },
  actionSubtitle: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 1,
  },
  comingSoon: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '700',
  },
  catalogLoadingBar: {
    marginBottom: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(245,201,106,0.25)',
    backgroundColor: 'rgba(245,201,106,0.08)',
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catalogLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catalogLoadingText: {
    color: COLORS.muted,
    fontSize: 11,
  },
  messagesWrap: {
    flex: 1,
  },
  messagesContent: {
    paddingBottom: 12,
    flexGrow: 1,
  },
  emptyWrap: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  emptyText: {
    color: COLORS.muted,
    textAlign: 'center',
    fontSize: 13,
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
  stageBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.3)',
    backgroundColor: 'rgba(20,24,34,0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  stageBadgeText: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '700',
  },
  questionText: {
    marginTop: 8,
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
  },
  snapshotCard: {
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: 'rgba(14,17,24,0.72)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  snapshotTitle: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  snapshotMeta: {
    color: COLORS.muted,
    fontSize: 11,
    marginBottom: 2,
  },
  snapshotList: {
    marginTop: 4,
  },
  snapshotRow: {
    color: COLORS.text,
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 2,
  },
  controlsWrap: {
    marginTop: 8,
    gap: 6,
  },
  catalogToggleButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(245,201,106,0.45)',
    backgroundColor: 'rgba(245,201,106,0.16)',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  catalogToggleText: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  choiceChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.3)',
    backgroundColor: 'rgba(20,24,34,0.75)',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  choiceChipDisabled: {
    opacity: 0.45,
  },
  choiceChipText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '600',
  },
  confirmRow: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 36,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20,24,34,0.75)',
  },
  secondaryButtonText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  createButton: {
    flex: 1,
    minHeight: 36,
    borderRadius: 9,
    backgroundColor: COLORS.accent,
    borderWidth: 1,
    borderColor: 'rgba(245,201,106,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  createButtonDisabled: {
    opacity: 0.45,
  },
  createButtonText: {
    color: COLORS.bg,
    fontSize: 12,
    fontWeight: '800',
  },
  openSessionButton: {
    marginTop: 8,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(79,214,159,0.42)',
    backgroundColor: 'rgba(79,214,159,0.14)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  openSessionText: {
    color: '#9DF3C8',
    fontSize: 11,
    fontWeight: '700',
  },
  debugWrap: {
    marginTop: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: 'rgba(17,20,29,0.8)',
    padding: 8,
  },
  debugTitle: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  debugBody: {
    color: '#B8C0CF',
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'Courier',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 96,
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
    borderWidth: 1,
    borderColor: 'rgba(245,201,106,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  sendText: {
    color: COLORS.bg,
    fontSize: 12,
    fontWeight: '800',
  },
  voiceButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    borderWidth: 1,
    borderColor: 'rgba(245,201,106,0.45)',
  },
  voiceButtonActive: {
    backgroundColor: '#FF7A7A',
    borderColor: 'rgba(255,122,122,0.65)',
  },
  voiceIconText: {
    color: COLORS.bg,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 18,
  },
  composerButtonDisabled: {
    opacity: 0.5,
  },
  voiceStatus: {
    marginTop: 6,
    color: COLORS.muted,
    fontSize: 11,
  },
});

export default GymChatLabScreen;
