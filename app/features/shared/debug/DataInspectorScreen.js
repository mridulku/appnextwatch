import { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';

import COLORS from '../../../theme/colors';
import { fetchTablePreview } from '../../../core/api/supabaseApi';

const PRIMARY_TABLES = [
  {
    name: 'movies',
    label: 'Movies',
    fallbackColumns: [
      'id',
      'title',
      'year',
      'genre',
      'minutes',
      'rating',
      'color',
      'overview',
      'trailer_url',
      'trailer_iframe',
      'clips',
      'created_at',
    ],
  },
  {
    name: 'actors',
    label: 'Actors',
    fallbackColumns: ['id', 'name', 'sort_name', 'role_type', 'bio', 'created_at'],
  },
  {
    name: 'directors',
    label: 'Directors',
    fallbackColumns: ['id', 'name', 'sort_name', 'bio', 'created_at'],
  },
  {
    name: 'awards',
    label: 'Awards',
    fallbackColumns: [
      'id',
      'year',
      'category',
      'winner',
      'movie_id',
      'metadata',
      'created_at',
    ],
  },
  {
    name: 'award_shows',
    label: 'Award Shows',
    fallbackColumns: ['id', 'name'],
  },
  {
    name: 'award_years',
    label: 'Award Years',
    fallbackColumns: ['id', 'show_id', 'year'],
  },
  {
    name: 'award_categories',
    label: 'Award Categories',
    fallbackColumns: ['id', 'show_id', 'name'],
  },
  {
    name: 'award_entries',
    label: 'Award Entries',
    fallbackColumns: [
      'id',
      'award_year_id',
      'award_category_id',
      'movie_id',
      'actor_id',
      'director_id',
      'is_winner',
      'created_at',
    ],
  },
  {
    name: 'app_users',
    label: 'Users',
    fallbackColumns: ['id', 'name', 'username', 'created_at'],
  },
];

const SECONDARY_TABLES = [
  {
    name: 'movie_actors',
    label: 'Movie Actors',
    fallbackColumns: [
      'id',
      'movie_id',
      'actor_id',
      'character_name',
      'billing_order',
      'created_at',
    ],
  },
  {
    name: 'movie_directors',
    label: 'Movie Directors',
    fallbackColumns: ['id', 'movie_id', 'director_id', 'created_at'],
  },
  {
    name: 'raw_awards',
    label: 'Raw Awards',
    fallbackColumns: [
      'id',
      'film_year',
      'ceremony_year',
      'ceremony_number',
      'category',
      'canon_category',
      'person_name',
      'film_title',
      'role_name',
      'is_winner',
      'source_url',
      'created_at',
    ],
  },
];

function DataInspectorScreen() {
  const [tableData, setTableData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [showAllTables, setShowAllTables] = useState(false);

  const tables = useMemo(
    () => (showAllTables ? [...PRIMARY_TABLES, ...SECONDARY_TABLES] : PRIMARY_TABLES),
    [showAllTables],
  );

  useEffect(() => {
    let isMounted = true;

    const loadTables = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const results = await Promise.all(
          tables.map(async (table) => {
            const { data, error } = await fetchTablePreview(table.name, 5);
            return { table: table.name, data: data ?? [], error };
          }),
        );

        if (!isMounted) return;

        const next = {};
        results.forEach((result) => {
          next[result.table] = {
            rows: result.data,
            error: result.error,
          };
        });

        setTableData(next);
      } catch (err) {
        if (isMounted) {
          setErrorMessage(err?.message || 'Failed to load data.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadTables();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Database Overview</Text>
        <Text style={styles.subtitle}>
          Live preview of your Supabase tables. Showing up to 5 rows per table.
        </Text>

        {isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={COLORS.accent} />
            <Text style={styles.loadingText}>Loading tables...</Text>
          </View>
        ) : null}

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>
            {showAllTables ? 'Showing all tables' : 'Showing primary tables only'}
          </Text>
          <Text style={styles.toggleAction} onPress={() => setShowAllTables((v) => !v)}>
            {showAllTables ? 'Hide system tables' : 'Show all tables'}
          </Text>
        </View>

        {tables.map((table) => {
          const entry = tableData[table.name];
          const rows = entry?.rows ?? [];
          const error = entry?.error;
          const columns =
            rows.length > 0 ? Object.keys(rows[0]) : table.fallbackColumns;

          if (!rows.length && !error) {
            return null;
          }

          return (
            <View key={table.name} style={styles.card}>
              <Text style={styles.cardTitle}>{table.label}</Text>
              <Text style={styles.cardSubtitle}>Table: {table.name}</Text>

              <Text style={styles.sectionLabel}>Columns</Text>
              <Text style={styles.monoText}>{columns.join(', ')}</Text>

              <Text style={styles.sectionLabel}>Sample Rows</Text>
              {error ? (
                <Text style={styles.errorText}>
                  Failed to load rows: {error.message}
                </Text>
              ) : null}
              {rows.length === 0 && !error ? (
                <Text style={styles.emptyText}>No rows yet.</Text>
              ) : null}
              {rows.map((row, index) => (
                <View key={`${table.name}-row-${index}`} style={styles.rowCard}>
                  <Text style={styles.rowText}>{JSON.stringify(row, null, 2)}</Text>
                </View>
              ))}
            </View>
          );
        })}
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
    marginBottom: 8,
    fontFamily: Platform.select({ ios: 'Palatino', android: 'serif' }),
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  toggleLabel: {
    color: COLORS.muted,
    fontSize: 12,
  },
  toggleAction: {
    color: COLORS.accent,
    fontSize: 12,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingText: {
    color: COLORS.muted,
    fontSize: 12,
    marginLeft: 10,
  },
  errorText: {
    color: '#F58B8B',
    fontSize: 12,
    marginBottom: 12,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 18,
    marginBottom: 4,
    fontFamily: Platform.select({ ios: 'Palatino', android: 'serif' }),
  },
  cardSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginBottom: 12,
  },
  sectionLabel: {
    color: COLORS.accent2,
    fontSize: 11,
    letterSpacing: 1,
    marginTop: 8,
    marginBottom: 6,
  },
  monoText: {
    color: COLORS.text,
    fontSize: 12,
    lineHeight: 18,
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 12,
  },
  rowCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
  },
  rowText: {
    color: COLORS.text,
    fontSize: 11,
    lineHeight: 16,
  },
});

export default DataInspectorScreen;
