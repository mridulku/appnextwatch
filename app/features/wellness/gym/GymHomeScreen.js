import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import SelectedCatalogItemCard from '../../../components/cards/SelectedCatalogItemCard';
import { useAuth } from '../../../context/AuthContext';
import { getOrCreateAppUser } from '../../../core/api/foodInventoryDb';
import { fetchCatalogMachines, fetchUserMachines } from '../../../core/api/gymMachinesDb';
import { MODULE_KEYS } from '../../../core/api/userModuleStateDb';
import ModuleReadyChip from '../../../ui/components/ModuleReadyChip';
import COLORS from '../../../theme/colors';
import UI_TOKENS from '../../../ui/tokens';
import CatalogGroupSection from './components/CatalogGroupSection';
import GroupByPills from './components/GroupByPills';
import LibrarySearchBar from './library/components/LibrarySearchBar';
import { classifyMachineType, groupMachines, MACHINE_GROUP_BY_MODES, MACHINE_GROUP_BY_OPTIONS } from './machineGrouping';

function GymHomeScreen({ navigation, embedded = false, showHeader = true }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [inlineError, setInlineError] = useState('');
  const [catalogMachines, setCatalogMachines] = useState([]);
  const [userMachines, setUserMachines] = useState([]);
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [groupBy, setGroupBy] = useState(MACHINE_GROUP_BY_MODES.DAY);

  const hydrate = useCallback(async () => {
    try {
      setLoading(true);
      setInlineError('');
      const appUser = await getOrCreateAppUser({
        username: user?.username || 'demo user',
        name: user?.name || 'Demo User',
      });

      const [catalogRows, userRows] = await Promise.all([
        fetchCatalogMachines(),
        fetchUserMachines(appUser.id),
      ]);
      setCatalogMachines(catalogRows || []);
      setUserMachines(userRows || []);
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(String(queryInput || '').trim().toLowerCase());
    }, 280);
    return () => clearTimeout(timer);
  }, [queryInput]);

  const selectedMachineIdSet = useMemo(
    () => new Set((userMachines || []).map((row) => row.machine_id).filter(Boolean)),
    [userMachines],
  );
  const groupedRows = useMemo(() => groupMachines(catalogMachines, groupBy, query), [catalogMachines, groupBy, query]);

  const sectionMeta = useCallback(({ title, parentTitle }) => {
    const byName = Object.fromEntries((catalogMachines || []).map((row) => [String(row.name || ''), row.image_url || null]));
    const pushImage = byName['Bench Press Station'] || byName['Pec Deck'] || null;
    const pullImage = byName['Lat Pulldown Machine'] || byName['Cable Tower'] || null;
    const legsImage = byName['Leg Press Machine'] || byName['Glute Drive Machine'] || null;
    const cardioImage = byName.Treadmill || byName['Air Bike'] || null;
    const generalImage = byName['Cable Tower'] || byName['Smith Machine'] || cardioImage || null;

    if (title === 'Push') return { imageUrl: pushImage, subtitle: 'Chest, shoulders, and triceps' };
    if (title === 'Pull') return { imageUrl: pullImage, subtitle: 'Back and biceps' };
    if (title === 'Legs') return { imageUrl: legsImage, subtitle: 'Lower-body machines' };
    if (title === 'General') return { imageUrl: cardioImage || generalImage, subtitle: 'Cardio and mixed-use machines' };

    if (title === 'Cardio') return { imageUrl: cardioImage, subtitle: parentTitle || 'Machine type' };
    if (title === 'Multi-purpose') return { imageUrl: generalImage, subtitle: parentTitle || 'Machine type' };
    if (title === 'Targeted') return { imageUrl: parentTitle === 'Legs' ? legsImage : parentTitle === 'Pull' ? pullImage : pushImage || generalImage, subtitle: parentTitle || 'Machine type' };

    return { imageUrl: generalImage, subtitle: parentTitle || 'Machine group' };
  }, [catalogMachines]);

  const openAddScreen = () => {
    navigation?.navigate('AddMachines');
  };
  const openVoiceCommand = () => Alert.alert('Voice Command', 'Machine voice command is coming soon.');

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
              <Text style={styles.subtitle}>Browse the machines available in your gym.</Text>
            </>
          ) : null}
          <View style={styles.searchRow}>
            <View style={styles.searchWrap}>
              <LibrarySearchBar
                value={queryInput}
                onChangeText={setQueryInput}
                showFilterButton={false}
                placeholder="Search machines"
              />
            </View>
            <View style={styles.groupSelectorWrap}>
              <GroupByPills value={groupBy} onChange={setGroupBy} options={MACHINE_GROUP_BY_OPTIONS} title="Group machines" />
            </View>
          </View>
        </View>

        {inlineError ? (
          <View style={styles.inlineErrorWrap}>
            <Text style={styles.inlineErrorText}>{inlineError}</Text>
            <TouchableOpacity style={styles.retryButton} activeOpacity={0.9} onPress={hydrate}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <ScrollView contentContainerStyle={[styles.listContent, !embedded ? { paddingBottom: 130 + insets.bottom } : null]} showsVerticalScrollIndicator={false}>
          {catalogMachines.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No machines yet</Text>
              <Text style={styles.emptySubtle}>Add the machines available at your gym to personalize workouts.</Text>
              <TouchableOpacity style={styles.emptyCta} activeOpacity={0.9} onPress={openAddScreen}>
                <Ionicons name="add-circle-outline" size={16} color={COLORS.bg} />
                <Text style={styles.emptyCtaText}>Add machines</Text>
              </TouchableOpacity>
            </View>
          ) : groupedRows.length && groupedRows.some((section) => (section.items?.length || section.groups?.length)) ? (
            groupedRows.map((section, index) => (
              <CatalogGroupSection
                key={`${section.type}_${section.title || 'flat'}_${index}`}
                section={section}
                getSectionMeta={sectionMeta}
                countLabel="machine"
                renderItem={(item) => (
                  <View key={item.id} style={styles.cardWrap}>
                    <SelectedCatalogItemCard
                      title={item?.name || 'Machine'}
                      subtitle={`${item?.zone || classifyMachineType(item)} • ${(Array.isArray(item?.primary_muscles) ? item.primary_muscles.join(', ') : 'Strength')}`}
                      imageUrl={item?.image_url || null}
                      badges={selectedMachineIdSet.has(item.id) ? [{ label: '👍 Liked', tone: 'warn' }] : []}
                      onPress={() =>
                        navigation?.navigate('MachineDetail', {
                          itemId: item.id,
                          machineName: item?.name,
                          item,
                          fromCatalog: true,
                          isAdded: selectedMachineIdSet.has(item.id),
                        })
                      }
                      topAction={{
                        iconName: 'create-outline',
                        onPress: () =>
                          navigation?.navigate('MachineDetail', {
                            itemId: item.id,
                            machineName: item?.name,
                            item,
                            fromCatalog: true,
                            isAdded: selectedMachineIdSet.has(item.id),
                          }),
                      }}
                    />
                  </View>
                )}
              />
            ))
          ) : (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No machines match this search</Text>
              <Text style={styles.emptySubtle}>Try a different term or switch grouping.</Text>
              <TouchableOpacity style={styles.emptyCta} activeOpacity={0.9} onPress={() => setQueryInput('')}>
                <Ionicons name="refresh-outline" size={16} color={COLORS.bg} />
                <Text style={styles.emptyCtaText}>Clear search</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
      {embedded ? null : (
        <View style={[styles.bottomBar, { bottom: Math.max(insets.bottom, 10) }]}>
          <ModuleReadyChip moduleKey={MODULE_KEYS.GYM_MACHINES} />

          <TouchableOpacity style={styles.voiceButton} activeOpacity={0.92} onPress={openVoiceCommand}>
            <Ionicons name="mic" size={18} color={COLORS.bg} />
            <Text style={styles.voiceButtonText}>Voice Command</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bottomAddButton} activeOpacity={0.9} onPress={openAddScreen}>
            <Ionicons name="add-circle-outline" size={16} color={COLORS.text} />
            <Text style={styles.bottomAddButtonText}>Add Machine</Text>
          </TouchableOpacity>
        </View>
      )}
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
    gap: 10,
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  searchWrap: {
    flex: 1,
  },
  groupSelectorWrap: {
    width: 138,
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
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 24,
  },
  cardWrap: {
    marginBottom: UI_TOKENS.spacing.sm,
  },
  emptyWrap: {
    marginTop: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: COLORS.card,
    padding: 16,
    gap: 8,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtle: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  emptyCta: {
    marginTop: 6,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  emptyCtaText: {
    color: COLORS.bg,
    fontSize: 13,
    fontWeight: '800',
  },
  bottomBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  voiceButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  voiceButtonText: {
    color: COLORS.bg,
    fontSize: 15,
    fontWeight: '800',
  },
  bottomAddButton: {
    minWidth: 140,
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.26)',
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
  },
  bottomAddButtonText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
});

export default GymHomeScreen;
