import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import COLORS from '../theme/colors';
import { loadFitnessLog, saveFitnessLog } from '../core/fitnessLogStorage';

function createId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function FitnessScreen() {
  const [messages, setMessages] = useState([
    {
      id: createId('assistant'),
      role: 'assistant',
      type: 'text',
      text: 'Fitness logger ready. Send any workout text and I will confirm before adding.',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [logItems, setLogItems] = useState([]);
  const [isLoadingLog, setIsLoadingLog] = useState(true);
  const listRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const loadLog = async () => {
      const items = await loadFitnessLog();
      if (isMounted) {
        setLogItems(items);
        setIsLoadingLog(false);
      }
    };

    loadLog();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isLoadingLog) return;
    saveFitnessLog(logItems);
  }, [isLoadingLog, logItems]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 40);
    return () => clearTimeout(timeout);
  }, [messages, logItems.length]);

  const hasPendingConfirmation = useMemo(
    () => messages.some((item) => item.type === 'confirm' && !item.resolved),
    [messages],
  );

  const sendMessage = () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;

    const userMessage = {
      id: createId('user'),
      role: 'user',
      type: 'text',
      text: trimmed,
    };
    const confirmMessage = {
      id: createId('assistant'),
      role: 'assistant',
      type: 'confirm',
      originalText: trimmed,
      text: `I understood: ${trimmed}. Add this to your workout log?`,
      resolved: false,
    };

    setMessages((prev) => [...prev, userMessage, confirmMessage]);
    setInputText('');
  };

  const handleConfirm = (messageId) => {
    let pendingValue = null;
    setMessages((prev) => {
      const next = prev.map((item) => {
        if (item.id === messageId && item.type === 'confirm' && !item.resolved) {
          pendingValue = item.originalText;
          return { ...item, resolved: true };
        }
        return item;
      });

      if (!pendingValue) return next;
      return [
        ...next,
        {
          id: createId('assistant'),
          role: 'assistant',
          type: 'text',
          text: 'Added to log ✅',
        },
      ];
    });

    if (!pendingValue) return;
    setLogItems((prev) => [
      ...prev,
      {
        id: createId('log'),
        text: pendingValue,
        addedAt: Date.now(),
      },
    ]);
  };

  const handleEdit = (messageId) => {
    let pendingValue = null;
    setMessages((prev) =>
      prev.map((item) => {
        if (item.id === messageId && item.type === 'confirm' && !item.resolved) {
          pendingValue = item.originalText;
          return { ...item, resolved: true };
        }
        return item;
      }),
    );
    if (pendingValue) {
      setInputText(pendingValue);
    }
  };

  const renderMessage = ({ item }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageRow, isUser ? styles.messageRowRight : styles.messageRowLeft]}>
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
          <Text style={[styles.bubbleText, isUser && styles.userBubbleText]}>{item.text}</Text>
        </View>
        {item.type === 'confirm' && !item.resolved ? (
          <View style={styles.confirmRow}>
            <TouchableOpacity
              style={[styles.actionChip, styles.confirmChip]}
              onPress={() => handleConfirm(item.id)}
              activeOpacity={0.9}
            >
              <Text style={styles.confirmChipText}>Confirm</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionChip, styles.editChip]}
              onPress={() => handleEdit(item.id)}
              activeOpacity={0.9}
            >
              <Text style={styles.editChipText}>Edit</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <View style={styles.logCard}>
        <Text style={styles.logTitle}>Workout Log</Text>
        {isLoadingLog ? (
          <Text style={styles.logSubtle}>Loading log...</Text>
        ) : logItems.length === 0 ? (
          <Text style={styles.logSubtle}>No entries yet.</Text>
        ) : (
          logItems
            .slice()
            .reverse()
            .slice(0, 4)
            .map((entry) => (
              <Text key={entry.id} style={styles.logItem} numberOfLines={1}>
                • {entry.text}
              </Text>
            ))
        )}
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.inputBar}>
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          style={styles.input}
          placeholder="Type workout entry..."
          placeholderTextColor={COLORS.muted}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={sendMessage}
          activeOpacity={0.9}
          disabled={!inputText.trim() || hasPendingConfirmation}
        >
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
      {hasPendingConfirmation ? (
        <Text style={styles.pendingHint}>Resolve the pending confirmation before sending again.</Text>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
    padding: 16,
  },
  logCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  logTitle: {
    color: COLORS.text,
    fontSize: 15,
    marginBottom: 6,
    fontWeight: '600',
  },
  logSubtle: {
    color: COLORS.muted,
    fontSize: 12,
  },
  logItem: {
    color: COLORS.text,
    fontSize: 12,
    lineHeight: 18,
  },
  messagesContent: {
    paddingBottom: 12,
  },
  messageRow: {
    marginBottom: 10,
  },
  messageRowLeft: {
    alignItems: 'flex-start',
  },
  messageRowRight: {
    alignItems: 'flex-end',
  },
  bubble: {
    maxWidth: '84%',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  assistantBubble: {
    backgroundColor: COLORS.card,
  },
  userBubble: {
    backgroundColor: COLORS.accent,
  },
  bubbleText: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 20,
  },
  userBubbleText: {
    color: COLORS.bg,
  },
  confirmRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  actionChip: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  confirmChip: {
    backgroundColor: 'rgba(245,201,106,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(245,201,106,0.42)',
  },
  editChip: {
    backgroundColor: COLORS.cardSoft,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.22)',
  },
  confirmChipText: {
    color: COLORS.accent,
    fontWeight: '600',
    fontSize: 12,
  },
  editChipText: {
    color: COLORS.text,
    fontWeight: '600',
    fontSize: 12,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.select({ ios: 12, android: 10 }),
    color: COLORS.text,
    marginRight: 10,
    fontSize: 14,
  },
  sendButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendText: {
    color: COLORS.bg,
    fontWeight: '700',
    fontSize: 13,
  },
  pendingHint: {
    marginTop: 8,
    fontSize: 11,
    color: COLORS.muted,
  },
});

export default FitnessScreen;
