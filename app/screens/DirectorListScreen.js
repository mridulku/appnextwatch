import { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';

import COLORS from '../theme/colors';
import { fetchDirectors } from '../core/supabaseApi';

function groupByInitial(items) {
  return items.reduce((acc, item) => {
    const letter = (item.sort_name || item.name || '?').charAt(0).toUpperCase();
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(item);
    return acc;
  }, {});
}

function DirectorListScreen({ navigation }) {
  const [directors, setDirectors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadDirectors = async () => {
      setIsLoading(true);
      const { data, error } = await fetchDirectors(200);

      if (!isMounted) return;

      if (error) {
        console.warn('Failed to load directors.', error.message);
        setIsLoading(false);
        return;
      }

      setDirectors(data ?? []);
      setIsLoading(false);
    };

    loadDirectors();

    return () => {
      isMounted = false;
    };
  }, []);

  const grouped = useMemo(() => groupByInitial(directors), [directors]);
  const letters = useMemo(() => Object.keys(grouped).sort(), [grouped]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Directors</Text>
        <Text style={styles.subtitle}>Browse directors in alphabetical order.</Text>

        {isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={COLORS.accent} />
            <Text style={styles.loadingText}>Loading list...</Text>
          </View>
        ) : null}

        {!isLoading && directors.length === 0 ? (
          <Text style={styles.emptyText}>No directors found yet.</Text>
        ) : null}

        {letters.map((letter) => (
          <View key={letter} style={styles.group}>
            <Text style={styles.groupLabel}>{letter}</Text>
            {grouped[letter].map((director) => (
              <TouchableOpacity
                key={director.id}
                style={styles.itemRow}
                onPress={() =>
                  navigation.navigate('DirectorDetail', { directorId: director.id })
                }
              >
                <Text style={styles.itemName}>{director.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
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
    marginBottom: 6,
    fontFamily: Platform.select({ ios: 'Palatino', android: 'serif' }),
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 14,
    marginBottom: 16,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  loadingText: {
    color: COLORS.muted,
    fontSize: 12,
    marginLeft: 10,
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 13,
  },
  group: {
    marginBottom: 16,
  },
  groupLabel: {
    color: COLORS.accent2,
    fontSize: 12,
    marginBottom: 8,
    letterSpacing: 1,
  },
  itemRow: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  itemName: {
    color: COLORS.text,
    fontSize: 15,
    fontFamily: Platform.select({ ios: 'Palatino', android: 'serif' }),
  },
});

export default DirectorListScreen;
