import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import COLORS from '../theme/colors';
import { loadFitnessLog } from '../core/fitnessLogStorage';

function FitnessHistoryScreen() {
  const [entries, setEntries] = useState([]);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      loadFitnessLog().then((items) => {
        if (isMounted) {
          setEntries(items.slice().reverse());
        }
      });
      return () => {
        isMounted = false;
      };
    }, []),
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Workout History</Text>
        {entries.length === 0 ? (
          <Text style={styles.emptyText}>No entries yet.</Text>
        ) : (
          <FlatList
            data={entries}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <Text style={styles.rowText}>{item.text}</Text>
              </View>
            )}
            contentContainerStyle={styles.listContent}
          />
        )}
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
    padding: 16,
  },
  title: {
    color: COLORS.text,
    fontSize: 22,
    marginBottom: 12,
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 13,
  },
  listContent: {
    paddingBottom: 30,
  },
  row: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
  },
  rowText: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 20,
  },
});

export default FitnessHistoryScreen;
