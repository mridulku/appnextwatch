import { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';

import COLORS from '../../../theme/colors';
import { callOpenAIChat } from '../../../core/integrations/openai';
import { OPENAI_API_KEY, OPENAI_MODEL } from '../../../core/env';
import { fetchMovies } from '../../../core/api/supabaseApi';
import { MOVIES } from '../../../data/movies/catalog';

const DEFAULT_MODEL = 'gpt-4.1-mini';

function ChatScreen() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hi! Ask me anything about movies, awards, or building this app.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [movies, setMovies] = useState([]);
  const [moviesLoaded, setMoviesLoaded] = useState(false);

  const model = useMemo(() => OPENAI_MODEL || DEFAULT_MODEL, []);

  useEffect(() => {
    let isMounted = true;

    const loadMovies = async () => {
      const { data, error } = await fetchMovies();
      if (!isMounted) return;

      if (error || !data?.length) {
        setMovies(MOVIES);
      } else {
        setMovies(data);
      }
      setMoviesLoaded(true);
    };

    loadMovies();

    return () => {
      isMounted = false;
    };
  }, []);

  const buildMovieContext = () => {
    if (!movies?.length) return '';

    const lines = movies.map((movie, index) => {
      const parts = [
        `(${index + 1}) ${movie.title}`,
        movie.year ? `year: ${movie.year}` : null,
        movie.genre ? `genre: ${movie.genre}` : null,
        movie.minutes ? `duration: ${movie.minutes}` : null,
        movie.rating ? `rating: ${movie.rating}` : null,
      ].filter(Boolean);
      return parts.join(', ');
    });

    return [
      'You are a movie assistant. Use ONLY the following movie catalog to answer questions.',
      'If a question asks for a movie not in the catalog, say it is not available yet.',
      'Movie catalog:',
      ...lines,
    ].join('\n');
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    if (!OPENAI_API_KEY) {
      setErrorMessage('Missing OpenAI key. Add EXPO_PUBLIC_OPENAI_API_KEY to .env.');
      return;
    }

    setErrorMessage('');
    setIsSending(true);
    setInput('');

    const nextMessages = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextMessages);

    try {
      const movieContext = buildMovieContext();
      const payloadMessages = movieContext
        ? [{ role: 'system', content: movieContext }, ...nextMessages]
        : nextMessages;

      const { extractedOutputText } = await callOpenAIChat({
        apiKey: OPENAI_API_KEY,
        model,
        messages: payloadMessages,
      });

      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: extractedOutputText || 'No response text returned.',
        },
      ]);
    } catch (err) {
      setErrorMessage(err?.message || 'Failed to reach OpenAI.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Chat</Text>
        <Text style={styles.subtitle}>
          Connected to OpenAI. Ask a question to confirm the live connection.
        </Text>

        {messages.map((message, index) => (
          <View
            key={`${message.role}-${index}`}
            style={[
              styles.messageBubble,
              message.role === 'user' ? styles.userBubble : styles.assistantBubble,
            ]}
          >
            <Text style={styles.messageRole}>
              {message.role === 'user' ? 'You' : 'Assistant'}
            </Text>
            <Text style={styles.messageText}>{message.content}</Text>
          </View>
        ))}

        {isSending ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={COLORS.accent} />
            <Text style={styles.loadingText}>Thinking...</Text>
          </View>
        ) : null}

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Ask something..."
          placeholderTextColor={COLORS.muted}
          value={input}
          onChangeText={setInput}
          editable={!isSending}
        />
        <TouchableOpacity
          style={[styles.sendButton, isSending && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={isSending}
        >
          <Text style={styles.sendButtonText}>{isSending ? '...' : 'Send'}</Text>
        </TouchableOpacity>
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
    padding: 20,
    paddingBottom: 120,
    backgroundColor: COLORS.bg,
  },
  title: {
    color: COLORS.text,
    fontSize: 26,
    marginBottom: 8,
    fontFamily: Platform.select({ ios: 'Palatino', android: 'serif' }),
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  messageBubble: {
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
  },
  userBubble: {
    backgroundColor: 'rgba(245,201,106,0.18)',
    alignSelf: 'flex-end',
  },
  assistantBubble: {
    backgroundColor: COLORS.card,
    alignSelf: 'flex-start',
  },
  messageRole: {
    color: COLORS.accent2,
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 6,
  },
  messageText: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 20,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  loadingText: {
    color: COLORS.muted,
    fontSize: 12,
    marginLeft: 10,
  },
  errorText: {
    color: '#F58B8B',
    fontSize: 12,
    marginTop: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.card,
    color: COLORS.text,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 12,
  },
  sendButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  sendButtonDisabled: {
    opacity: 0.7,
  },
  sendButtonText: {
    color: COLORS.bg,
    fontWeight: '600',
  },
});

export default ChatScreen;
