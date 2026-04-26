import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuth } from '../../../context/AuthContext';
import useMovieLogs from '../../../hooks/useMovieLogs';
import COLORS from '../../../theme/colors';

const TYPE_OPTIONS = [
  { key: 'movie', label: 'Movie' },
  { key: 'tv_show', label: 'TV show' },
];

export default function MovieTitleDetailScreen({ route, navigation }) {
  const { user } = useAuth();
  const { titles, loading, saving, createTitle, updateTitle, hydrate } = useMovieLogs(user);
  const titleId = route.params?.titleId;
  const mode = route.params?.mode || (titleId ? 'edit' : 'create');
  const initialType = route.params?.mediaType || 'movie';

  const existing = useMemo(() => titles.find((item) => item.id === titleId) || null, [titleId, titles]);
  const [title, setTitle] = useState('');
  const [releaseYear, setReleaseYear] = useState('');
  const [mediaType, setMediaType] = useState(initialType);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      hydrate();
    }, [hydrate]),
  );

  useFocusEffect(
    useCallback(() => {
      if (existing) {
        setTitle(existing.title || '');
        setReleaseYear(existing.releaseYear ? String(existing.releaseYear) : '');
        setMediaType(existing.mediaType || 'movie');
      } else if (mode === 'create') {
        setTitle('');
        setReleaseYear('');
        setMediaType(initialType);
      }
    }, [existing, initialType, mode]),
  );

  const handleSave = useCallback(async () => {
    try {
      setError('');
      const payload = {
        title: title.trim(),
        mediaType,
        releaseYear: releaseYear ? Number(releaseYear) : null,
      };
      if (!payload.title) {
        setError('Title is required.');
        return;
      }
      if (mode === 'create') await createTitle(payload);
      else await updateTitle(titleId, payload);
      navigation.goBack();
    } catch (nextError) {
      setError(nextError?.message || 'Could not save title.');
    }
  }, [createTitle, mediaType, mode, navigation, releaseYear, title, titleId, updateTitle]);

  if (loading && mode !== 'create') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading title...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Enter title"
            placeholderTextColor={COLORS.muted}
          />

          <Text style={styles.label}>Type</Text>
          <View style={styles.typeRow}>
            {TYPE_OPTIONS.map((option) => {
              const selected = mediaType === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.typeButton, selected ? styles.typeButtonActive : null]}
                  activeOpacity={0.9}
                  onPress={() => setMediaType(option.key)}
                >
                  <Text style={[styles.typeButtonText, selected ? styles.typeButtonTextActive : null]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>Release year</Text>
          <TextInput
            style={styles.input}
            value={releaseYear}
            onChangeText={setReleaseYear}
            placeholder="Optional"
            placeholderTextColor={COLORS.muted}
            keyboardType="number-pad"
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity style={styles.saveButton} activeOpacity={0.9} onPress={handleSave} disabled={saving}>
            <Ionicons name="save-outline" size={16} color={COLORS.bg} />
            <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save changes'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  content: { flex: 1, backgroundColor: COLORS.bg, padding: 16 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: COLORS.muted, fontSize: 13 },
  card: {
    borderRadius: 22, borderWidth: 1, borderColor: 'rgba(162,167,179,0.18)', backgroundColor: COLORS.card,
    padding: 18, gap: 12,
  },
  label: { color: COLORS.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2 },
  input: {
    minHeight: 52, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(162,167,179,0.2)', backgroundColor: '#222733',
    color: COLORS.text, fontSize: 16, fontWeight: '700', paddingHorizontal: 14,
  },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeButton: {
    flex: 1, minHeight: 46, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: '#222733', alignItems: 'center', justifyContent: 'center',
  },
  typeButtonActive: { borderColor: 'rgba(231,191,94,0.42)', backgroundColor: 'rgba(97,84,58,0.3)' },
  typeButtonText: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  typeButtonTextActive: { color: COLORS.accent },
  errorText: { color: '#FFB4A8', fontSize: 13 },
  saveButton: {
    marginTop: 4, minHeight: 50, borderRadius: 18, backgroundColor: COLORS.accent,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  saveButtonText: { color: COLORS.bg, fontSize: 15, fontWeight: '800' },
});
