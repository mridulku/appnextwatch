import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../../../core/env';
import { KNOWN_SUPABASE_TABLES } from '../../../core/api/supabaseTables';
import { getSupabaseClient } from '../../../core/integrations/supabase';
import COLORS from '../../../theme/colors';

function truncateValue(value) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    if (value.length <= 160) return value;
    return `${value.slice(0, 157)}...`;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 8).map((item) => truncateValue(item));
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value).slice(0, 16);
    return Object.fromEntries(entries.map(([k, v]) => [k, truncateValue(v)]));
  }
  return value;
}

function TestTablesScreen() {
  const [connectionStatus, setConnectionStatus] = useState({
    checking: false,
    ok: null,
    message: 'Not checked',
  });
  const [probesByTable, setProbesByTable] = useState({});
  const [manualTable, setManualTable] = useState('');
  const [manualProbeState, setManualProbeState] = useState({
    checking: false,
    ok: null,
    message: '',
    rows: [],
  });

  const supabaseConfigured = useMemo(
    () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY),
    [],
  );

  const runConnectionCheck = async () => {
    if (!supabaseConfigured) {
      setConnectionStatus({ checking: false, ok: false, message: 'Supabase env not configured' });
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      setConnectionStatus({ checking: false, ok: false, message: 'Supabase client unavailable' });
      return;
    }

    setConnectionStatus({ checking: true, ok: null, message: 'Checking...' });

    try {
      const { error } = await client.from('movies').select('id', { head: true, count: 'exact' }).limit(1);
      if (error) {
        setConnectionStatus({ checking: false, ok: false, message: error.message || 'Connection failed' });
        return;
      }
      setConnectionStatus({ checking: false, ok: true, message: 'Connected successfully' });
    } catch (error) {
      setConnectionStatus({ checking: false, ok: false, message: error?.message || 'Connection failed' });
    }
  };

  const probeKnownTable = async (tableName) => {
    if (!supabaseConfigured) {
      setProbesByTable((prev) => ({
        ...prev,
        [tableName]: { checking: false, ok: false, count: null, message: 'Supabase env not configured' },
      }));
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      setProbesByTable((prev) => ({
        ...prev,
        [tableName]: { checking: false, ok: false, count: null, message: 'Supabase client unavailable' },
      }));
      return;
    }

    setProbesByTable((prev) => ({
      ...prev,
      [tableName]: { checking: true, ok: null, count: null, message: 'Checking...' },
    }));

    try {
      const { count, error } = await client
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (error) {
        setProbesByTable((prev) => ({
          ...prev,
          [tableName]: { checking: false, ok: false, count: null, message: error.message || 'Probe failed' },
        }));
        return;
      }

      setProbesByTable((prev) => ({
        ...prev,
        [tableName]: { checking: false, ok: true, count: count ?? null, message: 'Probe ok' },
      }));
    } catch (error) {
      setProbesByTable((prev) => ({
        ...prev,
        [tableName]: { checking: false, ok: false, count: null, message: error?.message || 'Probe failed' },
      }));
    }
  };

  const runManualProbe = async () => {
    const table = manualTable.trim();
    if (!table) {
      setManualProbeState({ checking: false, ok: false, message: 'Enter a table name', rows: [] });
      return;
    }

    if (!supabaseConfigured) {
      setManualProbeState({ checking: false, ok: false, message: 'Supabase env not configured', rows: [] });
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      setManualProbeState({ checking: false, ok: false, message: 'Supabase client unavailable', rows: [] });
      return;
    }

    setManualProbeState({ checking: true, ok: null, message: 'Fetching...', rows: [] });

    try {
      const { data, error } = await client.from(table).select('*').limit(5);
      if (error) {
        setManualProbeState({ checking: false, ok: false, message: error.message || 'Fetch failed', rows: [] });
        return;
      }

      const safeRows = Array.isArray(data) ? data.map((row) => truncateValue(row)) : [];
      setManualProbeState({
        checking: false,
        ok: true,
        message: `Fetched ${safeRows.length} row(s)`,
        rows: safeRows,
      });
    } catch (error) {
      setManualProbeState({ checking: false, ok: false, message: error?.message || 'Fetch failed', rows: [] });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Tables</Text>
        <Text style={styles.subtitle}>Connectivity and RLS sanity checks.</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Status</Text>
          <Text style={styles.statusText}>Supabase configured: {supabaseConfigured ? 'yes' : 'no'}</Text>
          <Text style={styles.statusText}>Connection check: {connectionStatus.message}</Text>
          <TouchableOpacity style={styles.button} activeOpacity={0.9} onPress={runConnectionCheck}>
            {connectionStatus.checking ? (
              <ActivityIndicator color={COLORS.bg} size="small" />
            ) : (
              <Text style={styles.buttonText}>Run connection check</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Known tables probe</Text>
          {KNOWN_SUPABASE_TABLES.map((tableName) => {
            const state = probesByTable[tableName];
            return (
              <View key={tableName} style={styles.tableRow}>
                <View style={styles.tableTextWrap}>
                  <Text style={styles.tableName}>{tableName}</Text>
                  <Text style={styles.tableMeta}>
                    {state?.message || 'Not probed'}
                    {typeof state?.count === 'number' ? ` · count: ${state.count}` : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  activeOpacity={0.9}
                  onPress={() => probeKnownTable(tableName)}
                >
                  {state?.checking ? (
                    <ActivityIndicator color={COLORS.accent2} size="small" />
                  ) : (
                    <Text style={styles.secondaryButtonText}>Probe</Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Manual table probe</Text>
          <TextInput
            style={styles.input}
            value={manualTable}
            onChangeText={setManualTable}
            placeholder="Enter table name"
            placeholderTextColor={COLORS.muted}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity style={styles.button} activeOpacity={0.9} onPress={runManualProbe}>
            {manualProbeState.checking ? (
              <ActivityIndicator color={COLORS.bg} size="small" />
            ) : (
              <Text style={styles.buttonText}>Fetch sample rows</Text>
            )}
          </TouchableOpacity>

          {manualProbeState.message ? (
            <Text style={styles.manualResultText}>{manualProbeState.message}</Text>
          ) : null}

          {manualProbeState.rows.length > 0 ? (
            <View style={styles.jsonWrap}>
              <Text style={styles.jsonText}>{JSON.stringify(manualProbeState.rows, null, 2)}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  title: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: '700',
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 12,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.card,
    padding: 12,
    marginBottom: 12,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  statusText: {
    color: COLORS.muted,
    fontSize: 12,
    marginBottom: 6,
  },
  button: {
    marginTop: 6,
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: COLORS.bg,
    fontWeight: '700',
    fontSize: 13,
  },
  tableRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(162,167,179,0.18)',
    paddingTop: 9,
    marginTop: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  tableTextWrap: {
    flex: 1,
  },
  tableName: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  tableMeta: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 2,
  },
  secondaryButton: {
    minWidth: 70,
    minHeight: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(90,209,232,0.4)',
    backgroundColor: 'rgba(90,209,232,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  secondaryButtonText: {
    color: COLORS.accent2,
    fontWeight: '700',
    fontSize: 11,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.3)',
    backgroundColor: COLORS.cardSoft,
    color: COLORS.text,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 13,
  },
  manualResultText: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 8,
  },
  jsonWrap: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.25)',
    backgroundColor: '#11151D',
    padding: 10,
    marginTop: 8,
  },
  jsonText: {
    color: COLORS.text,
    fontSize: 11,
    lineHeight: 16,
  },
});

export default TestTablesScreen;
