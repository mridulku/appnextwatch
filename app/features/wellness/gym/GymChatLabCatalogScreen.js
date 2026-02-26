import { useEffect } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import COLORS from '../../../theme/colors';
import useGymSessions from '../../../hooks/useGymSessions';

function GymChatLabCatalogScreen() {
  const sessionsApi = useGymSessions();
  const options = Array.isArray(sessionsApi.exerciseOptions) ? sessionsApi.exerciseOptions : [];
  const loading = sessionsApi.loading || (options.length === 0 && !sessionsApi.error);

  useEffect(() => {
    sessionsApi.loadExerciseOptions().catch(() => {});
  }, [sessionsApi]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Exercise Catalog</Text>
        <Text style={styles.subtitle}>Browse exercises and use the names directly in chat.</Text>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={COLORS.accent} size="small" />
            <Text style={styles.loadingText}>Loading exercises...</Text>
          </View>
        ) : null}

        {!loading && options.length === 0 ? (
          <View style={styles.loadingWrap}>
            <Text style={styles.loadingText}>No exercises found.</Text>
          </View>
        ) : null}

        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {options.map((item) => (
            <View key={item.id} style={styles.row}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>{item.muscle} · {item.equipment}</Text>
            </View>
          ))}
        </ScrollView>
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
    paddingBottom: 12,
  },
  title: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 4,
    marginBottom: 10,
  },
  loadingWrap: {
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: COLORS.muted,
    fontSize: 12,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 16,
  },
  row: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: 'rgba(20,24,34,0.75)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  name: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  meta: {
    marginTop: 2,
    color: COLORS.muted,
    fontSize: 11,
  },
});

export default GymChatLabCatalogScreen;
