import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import CollapsibleSection from '../../../components/CollapsibleSection';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../../../core/env';
import { ALL_DB_TABLES, DB_TABLE_GROUPS, getDbTableMeta } from '../../../core/api/dbTableCatalog';
import { getSupabaseClient } from '../../../core/integrations/supabase';
import COLORS from '../../../theme/colors';

function toDisplayCell(value) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return `[${value.length}]`;
  if (typeof value === 'object') return '{…}';
  return String(value);
}

function getCellKind(value) {
  if (Array.isArray(value)) return 'array';
  if (value && typeof value === 'object') return 'object';
  return 'scalar';
}

function truncateText(text, limit = 24) {
  const raw = String(text ?? '');
  if (raw.length <= limit) return raw;
  return `${raw.slice(0, limit - 1)}…`;
}

function friendlyError(errorMessage) {
  const text = String(errorMessage || '').toLowerCase();
  if (text.includes('row-level security') || text.includes('permission')) {
    return 'Blocked by RLS or permissions';
  }
  return errorMessage || 'Request failed';
}

function DataPreview({ title, rows }) {
  const columns = useMemo(() => {
    if (!rows || rows.length === 0) return [];
    const ordered = [];
    rows.forEach((row) => {
      Object.keys(row || {}).forEach((key) => {
        if (!ordered.includes(key)) ordered.push(key);
      });
    });
    return ordered.slice(0, 14);
  }, [rows]);

  const [jsonModalValue, setJsonModalValue] = useState(null);

  if (!rows || rows.length === 0) {
    return (
      <View style={styles.previewCard}>
        <Text style={styles.cardTitle}>Data Preview</Text>
        <Text style={styles.previewMeta}>{title} · rows fetched: 0</Text>
        <Text style={styles.emptyHint}>No rows returned. Try another table or check permissions.</Text>
      </View>
    );
  }

  return (
    <View style={styles.previewCard}>
      <Text style={styles.cardTitle}>Data Preview</Text>
      <Text style={styles.previewMeta}>{title} · rows fetched: {rows.length}</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={styles.tableHeaderRow}>
            {columns.map((column) => (
              <View key={`head_${column}`} style={styles.headerCell}>
                <Text style={styles.headerCellText}>{column}</Text>
              </View>
            ))}
          </View>

          {rows.map((row, rowIndex) => (
            <View key={`row_${rowIndex}`} style={styles.tableDataRow}>
              {columns.map((column) => {
                const value = row?.[column];
                const cellKind = getCellKind(value);
                const display = truncateText(toDisplayCell(value), 34);
                const canOpenJson = cellKind === 'array' || cellKind === 'object';

                return (
                  <TouchableOpacity
                    key={`cell_${rowIndex}_${column}`}
                    style={styles.dataCell}
                    activeOpacity={canOpenJson ? 0.85 : 1}
                    onPress={() => {
                      if (!canOpenJson) return;
                      setJsonModalValue({ column, value });
                    }}
                  >
                    <Text style={[styles.dataCellText, canOpenJson && styles.dataCellJson]}>
                      {display}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      <Modal
        visible={Boolean(jsonModalValue)}
        transparent
        animationType="fade"
        onRequestClose={() => setJsonModalValue(null)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setJsonModalValue(null)} />
          <View style={styles.jsonModalCard}>
            <Text style={styles.sheetTitle}>{jsonModalValue?.column || 'Value'}</Text>
            <ScrollView style={styles.jsonScroll}>
              <Text style={styles.jsonPretty}>
                {jsonModalValue ? JSON.stringify(jsonModalValue.value, null, 2) : ''}
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={styles.secondaryButtonWide}
              activeOpacity={0.9}
              onPress={() => setJsonModalValue(null)}
            >
              <Text style={styles.secondaryButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function TestTablesScreen() {
  const [connectionStatus, setConnectionStatus] = useState({
    checking: false,
    ok: null,
    message: 'Not checked',
  });
  const [expandedGroups, setExpandedGroups] = useState({
    movies: true,
    wellness: true,
    shared: false,
  });
  const [probesByTable, setProbesByTable] = useState({});
  const [detailsTableName, setDetailsTableName] = useState(null);

  const [manualTable, setManualTable] = useState('');
  const [manualProbeState, setManualProbeState] = useState({
    checking: false,
    ok: null,
    message: '',
    rows: [],
    table: '',
  });

  const [manualPickerVisible, setManualPickerVisible] = useState(false);

  const supabaseConfigured = useMemo(() => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY), []);

  const manualSuggestions = useMemo(() => {
    const query = manualTable.trim().toLowerCase();
    if (!query) return ALL_DB_TABLES.slice(0, 8);
    return ALL_DB_TABLES.filter((table) => table.includes(query)).slice(0, 8);
  }, [manualTable]);

  const detailsTableMeta = useMemo(
    () => (detailsTableName ? getDbTableMeta(detailsTableName) : null),
    [detailsTableName],
  );

  useEffect(() => {
    if (!manualPickerVisible) return;
    if (manualSuggestions.length === 0) setManualPickerVisible(false);
  }, [manualPickerVisible, manualSuggestions.length]);

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
        setConnectionStatus({ checking: false, ok: false, message: friendlyError(error.message) });
        return;
      }
      setConnectionStatus({ checking: false, ok: true, message: 'Connected successfully' });
    } catch (error) {
      setConnectionStatus({ checking: false, ok: false, message: friendlyError(error?.message) });
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
      const { count, error } = await client.from(tableName).select('*', { count: 'exact', head: true });

      if (error) {
        setProbesByTable((prev) => ({
          ...prev,
          [tableName]: {
            checking: false,
            ok: false,
            count: null,
            message: friendlyError(error.message),
          },
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
        [tableName]: {
          checking: false,
          ok: false,
          count: null,
          message: friendlyError(error?.message),
        },
      }));
    }
  };

  const runManualProbe = async (maybeTableName) => {
    const table = String(maybeTableName || manualTable).trim();
    if (!table) {
      setManualProbeState({ checking: false, ok: false, message: 'Enter a table name', rows: [], table: '' });
      return;
    }

    if (!supabaseConfigured) {
      setManualProbeState({ checking: false, ok: false, message: 'Supabase env not configured', rows: [], table });
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      setManualProbeState({ checking: false, ok: false, message: 'Supabase client unavailable', rows: [], table });
      return;
    }

    setManualProbeState({ checking: true, ok: null, message: 'Fetching...', rows: [], table });

    try {
      const { data, error } = await client.from(table).select('*').limit(8);
      if (error) {
        setManualProbeState({
          checking: false,
          ok: false,
          message: friendlyError(error.message),
          rows: [],
          table,
        });
        return;
      }

      setManualProbeState({
        checking: false,
        ok: true,
        message: `Fetched ${Array.isArray(data) ? data.length : 0} row(s)`,
        rows: Array.isArray(data) ? data : [],
        table,
      });
    } catch (error) {
      setManualProbeState({
        checking: false,
        ok: false,
        message: friendlyError(error?.message),
        rows: [],
        table,
      });
    }
  };

  const toggleGroup = (groupId) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Tables</Text>
        <Text style={styles.subtitle}>Connectivity, grouped probes, and readable previews.</Text>

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
          {DB_TABLE_GROUPS.map((group) => (
            <CollapsibleSection
              key={group.id}
              title={group.title}
              subtitle={`${group.tables.length} tables`}
              icon={group.icon}
              iconIsEmoji={false}
              expanded={Boolean(expandedGroups[group.id])}
              onToggle={() => toggleGroup(group.id)}
              countLabel={`${group.tables.length}`}
              style={styles.groupSection}
            >
              {group.tables.map((table) => {
                const state = probesByTable[table.name];
                return (
                  <View key={table.name} style={styles.tableRow}>
                    <View style={styles.tableTextWrap}>
                      <Text style={styles.tableName}>{table.name}</Text>
                      <Text style={styles.tableDescription}>
                        {table.description || 'No description'}
                      </Text>
                      <Text style={styles.tableMeta}>
                        {state?.message || 'Not probed'}
                        {typeof state?.count === 'number' ? ` · count: ${state.count}` : ''}
                      </Text>
                    </View>

                    <View style={styles.rowActions}>
                      <TouchableOpacity
                        style={styles.iconAction}
                        activeOpacity={0.9}
                        onPress={() => setDetailsTableName(table.name)}
                      >
                        <Ionicons name="information-circle-outline" size={16} color={COLORS.accent2} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.secondaryButton}
                        activeOpacity={0.9}
                        onPress={() => probeKnownTable(table.name)}
                      >
                        {state?.checking ? (
                          <ActivityIndicator color={COLORS.accent2} size="small" />
                        ) : (
                          <Text style={styles.secondaryButtonText}>Probe</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </CollapsibleSection>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Manual table probe</Text>
          <View style={styles.manualInputWrap}>
            <TextInput
              style={styles.input}
              value={manualTable}
              onChangeText={(value) => {
                setManualTable(value);
                setManualPickerVisible(true);
              }}
              onFocus={() => setManualPickerVisible(true)}
              placeholder="Enter or pick table name"
              placeholderTextColor={COLORS.muted}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.iconAction}
              activeOpacity={0.9}
              onPress={() => setManualPickerVisible((prev) => !prev)}
            >
              <Ionicons name={manualPickerVisible ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.accent2} />
            </TouchableOpacity>
          </View>

          {manualPickerVisible ? (
            <View style={styles.suggestionsWrap}>
              {manualSuggestions.length === 0 ? (
                <Text style={styles.suggestionEmpty}>No matching tables.</Text>
              ) : (
                manualSuggestions.map((tableName) => (
                  <TouchableOpacity
                    key={tableName}
                    style={styles.suggestionRow}
                    activeOpacity={0.9}
                    onPress={() => {
                      setManualTable(tableName);
                      setManualPickerVisible(false);
                    }}
                  >
                    <Text style={styles.suggestionText}>{tableName}</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          ) : null}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickPickRow}>
            {ALL_DB_TABLES.map((tableName) => (
              <TouchableOpacity
                key={tableName}
                style={styles.quickChip}
                activeOpacity={0.9}
                onPress={() => setManualTable(tableName)}
              >
                <Text style={styles.quickChipText}>{tableName}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.button} activeOpacity={0.9} onPress={() => runManualProbe(manualTable)}>
            {manualProbeState.checking ? (
              <ActivityIndicator color={COLORS.bg} size="small" />
            ) : (
              <Text style={styles.buttonText}>Fetch sample rows</Text>
            )}
          </TouchableOpacity>

          {manualProbeState.message ? <Text style={styles.manualResultText}>{manualProbeState.message}</Text> : null}

          <DataPreview title={manualProbeState.table || manualTable || 'Selected table'} rows={manualProbeState.rows} />
        </View>
      </ScrollView>

      <Modal
        visible={Boolean(detailsTableMeta)}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailsTableName(null)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setDetailsTableName(null)} />
          <View style={styles.detailsCard}>
            <Text style={styles.sheetTitle}>{detailsTableMeta?.name}</Text>
            <Text style={styles.detailsSubtitle}>{detailsTableMeta?.description || 'No description'}</Text>

            <Text style={styles.detailsLabel}>Key columns</Text>
            <View style={styles.detailsChipWrap}>
              {(detailsTableMeta?.keyColumns || []).map((col) => (
                <View key={col} style={styles.detailsChip}>
                  <Text style={styles.detailsChipText}>{col}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.detailsLabel}>Typical usage</Text>
            <View style={styles.surfacesWrap}>
              {(detailsTableMeta?.surfaces || []).map((surface) => (
                <Text key={surface} style={styles.surfaceText}>• {surface}</Text>
              ))}
            </View>

            <TouchableOpacity
              style={styles.secondaryButtonWide}
              activeOpacity={0.9}
              onPress={() => setDetailsTableName(null)}
            >
              <Text style={styles.secondaryButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 30,
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
  groupSection: {
    marginTop: 6,
    marginBottom: 6,
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
  tableDescription: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  tableMeta: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 4,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconAction: {
    width: 30,
    height: 30,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(90,209,232,0.32)',
    backgroundColor: 'rgba(90,209,232,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    minWidth: 62,
    minHeight: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(90,209,232,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: 8,
  },
  secondaryButtonWide: {
    marginTop: 10,
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(90,209,232,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.cardSoft,
  },
  secondaryButtonText: {
    color: COLORS.accent2,
    fontSize: 12,
    fontWeight: '700',
  },
  manualInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.28)',
    backgroundColor: COLORS.cardSoft,
    color: COLORS.text,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 13,
  },
  suggestionsWrap: {
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.cardSoft,
    overflow: 'hidden',
  },
  suggestionRow: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(162,167,179,0.14)',
  },
  suggestionText: {
    color: COLORS.text,
    fontSize: 12,
  },
  suggestionEmpty: {
    color: COLORS.muted,
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  quickPickRow: {
    gap: 8,
    marginTop: 8,
    paddingBottom: 4,
  },
  quickChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.3)',
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  quickChipText: {
    color: COLORS.muted,
    fontSize: 11,
  },
  manualResultText: {
    marginTop: 8,
    color: COLORS.muted,
    fontSize: 12,
  },
  previewCard: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: '#10141E',
    padding: 10,
  },
  previewMeta: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 2,
    marginBottom: 8,
  },
  emptyHint: {
    color: COLORS.muted,
    fontSize: 12,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(162,167,179,0.28)',
    marginBottom: 2,
  },
  headerCell: {
    width: 126,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  headerCellText: {
    color: COLORS.accent2,
    fontSize: 11,
    fontWeight: '700',
  },
  tableDataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(162,167,179,0.1)',
  },
  dataCell: {
    width: 126,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  dataCellText: {
    color: COLORS.text,
    fontSize: 11,
  },
  dataCellJson: {
    color: COLORS.accent,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  detailsCard: {
    backgroundColor: '#11151F',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.24)',
    maxHeight: '80%',
  },
  jsonModalCard: {
    backgroundColor: '#11151F',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.24)',
    maxHeight: '78%',
  },
  sheetTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
  },
  detailsSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 4,
  },
  detailsLabel: {
    marginTop: 12,
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  detailsChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  detailsChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(245,201,106,0.35)',
    backgroundColor: 'rgba(245,201,106,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  detailsChipText: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  surfacesWrap: {
    marginTop: 8,
  },
  surfaceText: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  jsonScroll: {
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.card,
    maxHeight: 280,
    padding: 8,
  },
  jsonPretty: {
    color: COLORS.text,
    fontSize: 11,
    lineHeight: 16,
  },
});

export default TestTablesScreen;
