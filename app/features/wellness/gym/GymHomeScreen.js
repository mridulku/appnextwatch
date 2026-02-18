import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CollapsibleSection from '../../../components/CollapsibleSection';
import SelectedCatalogItemCard from '../../../components/cards/SelectedCatalogItemCard';
import { useAuth } from '../../../context/AuthContext';
import { getOrCreateAppUser } from '../../../core/api/foodInventoryDb';
import { fetchUserMachines } from '../../../core/api/gymMachinesDb';
import COLORS from '../../../theme/colors';

const MACHINE_GROUP_ORDER = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio', 'Other'];

function normalizeMachineCategory(machine) {
  const muscles = Array.isArray(machine?.primary_muscles)
    ? machine.primary_muscles.map((m) => String(m).toLowerCase())
    : [];

  if (muscles.some((m) => m.includes('chest'))) return 'Chest';
  if (muscles.some((m) => m.includes('back') || m.includes('lat'))) return 'Back';
  if (muscles.some((m) => m.includes('quad') || m.includes('hamstring') || m.includes('glute') || m.includes('leg'))) return 'Legs';
  if (muscles.some((m) => m.includes('shoulder') || m.includes('delt'))) return 'Shoulders';
  if (muscles.some((m) => m.includes('bicep') || m.includes('tricep') || m.includes('arm'))) return 'Arms';
  if (muscles.some((m) => m.includes('core') || m.includes('ab'))) return 'Core';

  const zone = String(machine?.zone || '').toLowerCase();
  if (zone.includes('cardio')) return 'Cardio';

  return 'Other';
}

function GymHomeScreen({ navigation, embedded = false, showHeader = true }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [inlineError, setInlineError] = useState('');

  const [userMachines, setUserMachines] = useState([]);

  const [expandedGroups, setExpandedGroups] = useState({});

  const hydrate = useCallback(async () => {
    try {
      setLoading(true);
      setInlineError('');
      const appUser = await getOrCreateAppUser({
        username: user?.username || 'demo user',
        name: user?.name || 'Demo User',
      });

      const rows = await fetchUserMachines(appUser.id);
      setUserMachines(rows);
    } catch (error) {
      setInlineError(error?.message || 'Could not load machines right now.');
    } finally {
      setLoading(false);
    }
  }, [user?.name, user?.username]);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useFocusEffect(
    useCallback(() => {
      hydrate();
    }, [hydrate]),
  );

  const groupedUserMachineSections = useMemo(() => {
    const grouped = userMachines.reduce((acc, row) => {
      const machine = row.catalog_machine;
      if (!machine) return acc;
      const category = normalizeMachineCategory(machine);
      if (!acc[category]) acc[category] = [];
      acc[category].push(row);
      return acc;
    }, {});

    return MACHINE_GROUP_ORDER.filter((cat) => grouped[cat]?.length > 0).map((cat) => ({
      title: cat,
      data: grouped[cat].slice().sort((a, b) => (a.catalog_machine?.name || '').localeCompare(b.catalog_machine?.name || '')),
      itemCount: grouped[cat].length,
    }));
  }, [userMachines]);

  const toggleGroup = (title) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const openAddScreen = () => {
    navigation?.navigate('AddMachines');
  };
  const openVoiceCommand = () =>
    Alert.alert('Voice Command', 'Machine voice command is coming soon.');

  const RootContainer = embedded ? View : SafeAreaView;

  if (loading) {
    return (
      <RootContainer style={styles.safeArea}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading machines...</Text>
        </View>
      </RootContainer>
    );
  }

  return (
    <RootContainer style={styles.safeArea}>
      <View style={[styles.container, embedded && styles.containerEmbedded]}>
        <View style={styles.headerWrap}>
          {showHeader ? (
            <>
              <Text style={styles.title}>Machines</Text>
              <Text style={styles.subtitle}>Track machines available in your gym.</Text>
            </>
          ) : null}

        </View>

        {inlineError ? (
          <View style={styles.inlineErrorWrap}>
            <Text style={styles.inlineErrorText}>{inlineError}</Text>
            <TouchableOpacity style={styles.retryButton} activeOpacity={0.9} onPress={hydrate}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {groupedUserMachineSections.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>No machines yet</Text>
            <Text style={styles.emptySubtle}>
              Add the machines available at your gym to personalize workouts.
            </Text>
            <TouchableOpacity style={styles.emptyCta} activeOpacity={0.9} onPress={openAddScreen}>
              <Ionicons name="add-circle-outline" size={16} color={COLORS.bg} />
              <Text style={styles.emptyCtaText}>Add machines</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <SectionList
            sections={groupedUserMachineSections.map((section) => ({
              ...section,
              data: expandedGroups[section.title] ? section.data : [],
            }))}
            keyExtractor={(item) => item.id}
            stickySectionHeadersEnabled={false}
            renderSectionHeader={({ section }) => (
              <CollapsibleSection
                title={section.title}
                subtitle="Selected machines"
                icon="barbell-outline"
                iconIsEmoji={false}
                expanded={Boolean(expandedGroups[section.title])}
                onToggle={() => toggleGroup(section.title)}
                countLabel={`${section.itemCount}`}
                style={styles.groupSection}
              />
            )}
            renderItem={({ item }) => (
              <SelectedCatalogItemCard
                title={item.catalog_machine?.name || 'Machine'}
                subtitle={`${normalizeMachineCategory(item.catalog_machine)} • ${item.catalog_machine?.zone || 'Gym Zone'}`}
                onPress={() =>
                  navigation?.navigate('MachineDetail', {
                    itemId: item.machine_id,
                    machineName: item.catalog_machine?.name,
                    item: item.catalog_machine,
                  })
                }
                topAction={{
                  iconName: 'create-outline',
                  onPress: () =>
                    navigation?.navigate('MachineDetail', {
                      itemId: item.machine_id,
                      machineName: item.catalog_machine?.name,
                      item: item.catalog_machine,
                    }),
                }}
              />
            )}
            contentContainerStyle={[styles.listContent, { paddingBottom: 130 + insets.bottom }]}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
      <View style={[styles.bottomBar, { bottom: Math.max(insets.bottom, 10) }]}>
        <TouchableOpacity style={styles.voiceButton} activeOpacity={0.92} onPress={openVoiceCommand}>
          <Ionicons name="mic" size={18} color={COLORS.bg} />
          <Text style={styles.voiceButtonText}>Voice Command</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomAddButton} activeOpacity={0.9} onPress={openAddScreen}>
          <Ionicons name="add-circle-outline" size={16} color={COLORS.text} />
          <Text style={styles.bottomAddButtonText}>Add Machine</Text>
        </TouchableOpacity>
      </View>
    </RootContainer>
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
  },
  containerEmbedded: {
    paddingTop: 6,
  },
  headerWrap: {
    marginBottom: 10,
  },
  title: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: '700',
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 3,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: COLORS.muted,
    fontSize: 13,
  },
  inlineErrorWrap: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,145,107,0.4)',
    backgroundColor: 'rgba(255,145,107,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  inlineErrorText: {
    color: '#FFA674',
    fontSize: 12,
  },
  retryButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,145,107,0.45)',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  retryButtonText: {
    color: '#FFA674',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyWrap: {
    marginTop: 22,
    alignItems: 'center',
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
  },
  emptySubtle: {
    color: COLORS.muted,
    marginTop: 5,
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 280,
  },
  emptyCta: {
    marginTop: 12,
    borderRadius: 12,
    minHeight: 42,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  emptyCtaText: {
    color: COLORS.bg,
    fontSize: 13,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 100,
  },
  bottomBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: 'rgba(14,15,20,0.96)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.24)',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  voiceButton: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: COLORS.accent,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  voiceButtonText: {
    color: COLORS.bg,
    fontSize: 14,
    fontWeight: '700',
  },
  bottomAddButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.35)',
    backgroundColor: COLORS.card,
    minHeight: 46,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  bottomAddButtonText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  groupSection: {
    marginTop: 8,
    marginBottom: 8,
  },
  machineRow: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.18)',
    minHeight: 56,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  machineIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(90,209,232,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  machineTextWrap: {
    flex: 1,
  },
  machineName: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  machineMeta: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 2,
  },
  removeButton: {
    width: 30,
    height: 30,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,145,107,0.4)',
    backgroundColor: 'rgba(255,145,107,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  addSheet: {
    backgroundColor: '#11151F',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.24)',
    maxHeight: '88%',
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(162,167,179,0.42)',
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
  },
  sheetSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 3,
    marginBottom: 12,
  },
  searchInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.28)',
    backgroundColor: COLORS.card,
    color: COLORS.text,
    paddingHorizontal: 10,
    fontSize: 13,
  },
  filterRow: {
    gap: 8,
    paddingVertical: 10,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.3)',
    backgroundColor: COLORS.card,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  filterChipActive: {
    borderColor: 'rgba(245,201,106,0.54)',
    backgroundColor: 'rgba(245,201,106,0.15)',
  },
  filterChipText: {
    color: COLORS.muted,
    fontSize: 11,
  },
  filterChipTextActive: {
    color: COLORS.accent,
    fontWeight: '700',
  },
  catalogList: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.card,
    maxHeight: 360,
  },
  catalogListContent: {
    padding: 8,
    gap: 8,
  },
  catalogListEmptyWrap: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.card,
    minHeight: 88,
    justifyContent: 'center',
  },
  catalogEmpty: {
    color: COLORS.muted,
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  catalogRow: {
    minHeight: 52,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.18)',
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  catalogTextWrap: {
    flex: 1,
  },
  catalogName: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  catalogMeta: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 2,
  },
  addedChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(95,216,171,0.35)',
    backgroundColor: 'rgba(95,216,171,0.14)',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  addedChipText: {
    color: '#6FE6BD',
    fontSize: 11,
    fontWeight: '700',
  },
  addOneButton: {
    minWidth: 64,
    minHeight: 34,
    borderRadius: 10,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  addOneButtonText: {
    color: COLORS.bg,
    fontSize: 12,
    fontWeight: '700',
  },
  closeSheetButton: {
    marginTop: 10,
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.35)',
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeSheetButtonText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
});

export default GymHomeScreen;
