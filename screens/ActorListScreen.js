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
import { fetchActors } from '../core/supabaseApi';

function groupByInitial(items) {
  return items.reduce((acc, item) => {
    const letter = (item.sort_name || item.name || '?').charAt(0).toUpperCase();
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(item);
    return acc;
  }, {});
}

function ActorListScreen({ navigation, route }) {
  const roleType = route.params?.roleType || null;
  const title = route.params?.title || 'Actors';
  const [actors, setActors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadActors = async () => {
      setIsLoading(true);
      const { data, error } = await fetchActors({ roleType, limit: 200 });

      if (!isMounted) return;

      if (error) {
        console.warn('Failed to load actors.', error.message);
        setIsLoading(false);
        return;
      }

      setActors(data ?? []);
      setIsLoading(false);
    };

    loadActors();

    return () => {
      isMounted = false;
    };
  }, [roleType]);

  const grouped = useMemo(() => groupByInitial(actors), [actors]);
  const letters = useMemo(() => Object.keys(grouped).sort(), [grouped]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>
          Browse talent in alphabetical order.
        </Text>

        {isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={COLORS.accent} />
            <Text style={styles.loadingText}>Loading list...</Text>
          </View>
        ) : null}

        {!isLoading && actors.length === 0 ? (
          <Text style={styles.emptyText}>No actors found yet.</Text>
        ) : null}

        {letters.map((letter) => (
          <View key={letter} style={styles.group}>
            <Text style={styles.groupLabel}>{letter}</Text>
            {grouped[letter].map((actor) => (
              <TouchableOpacity
                key={actor.id}
                style={styles.itemRow}
                onPress={() => navigation.navigate('ActorDetail', { actorId: actor.id })}
              >
                <Text style={styles.itemName}>{actor.name}</Text>
                <Text style={styles.itemMeta}>{actor.role_type}</Text>
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
  itemMeta: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 4,
  },
});

export default ActorListScreen;
