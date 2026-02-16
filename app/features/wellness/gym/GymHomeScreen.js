import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import CollapsibleSection from '../../../components/CollapsibleSection';
import { GYM_MACHINES } from '../../../data/wellness/gymMachines';
import COLORS from '../../../theme/colors';

const MUSCLE_FILTERS = ['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio'];
const ZONE_FILTERS = ['All Zones', 'Free Weights', 'Machines', 'Cable', 'Cardio', 'Functional'];
const MACHINE_ZONE_ORDER = ['Free Weights', 'Machines', 'Cable', 'Cardio', 'Functional', 'Other'];

const ZONE_ICONS = {
  'Free Weights': 'barbell-outline',
  Machines: 'apps-outline',
  Cable: 'git-branch-outline',
  Cardio: 'pulse-outline',
  Functional: 'flash-outline',
  Other: 'albums-outline',
};

const ZONE_NOTES = {
  'Free Weights': 'Benches, racks, and free movement stations.',
  Machines: 'Guided path machines for controlled lifts.',
  Cable: 'Pulley stations for versatile resistance angles.',
  Cardio: 'Steady-state and interval conditioning machines.',
  Functional: 'Accessory stations for mobility and conditioning.',
  Other: 'Unmapped stations and special equipment.',
};

function getBusyTone(level) {
  if (level === 'Often busy') {
    return {
      bg: 'rgba(255, 151, 112, 0.18)',
      border: 'rgba(255, 151, 112, 0.38)',
      text: '#FFB690',
    };
  }

  return {
    bg: 'rgba(95, 216, 171, 0.16)',
    border: 'rgba(95, 216, 171, 0.35)',
    text: '#6FE6BD',
  };
}

function normalizeMachineZone(zone) {
  const value = String(zone ?? '').trim().toLowerCase();

  if (!value) return 'Other';
  if (value.includes('free')) return 'Free Weights';
  if (value.includes('machine')) return 'Machines';
  if (value.includes('cable')) return 'Cable';
  if (value.includes('cardio')) return 'Cardio';
  if (value.includes('functional')) return 'Functional';

  return 'Other';
}

function GymHomeScreen({ navigation, embedded = false, showHeader = true }) {
  const [selectedMuscle, setSelectedMuscle] = useState('All');
  const [selectedZone, setSelectedZone] = useState('All Zones');
  const [expandedZones, setExpandedZones] = useState({});

  const filteredMachines = useMemo(() => {
    return GYM_MACHINES.filter((machine) => {
      const matchesMuscle =
        selectedMuscle === 'All' ||
        machine.tags.some((tag) => tag.toLowerCase() === selectedMuscle.toLowerCase());
      const machineZone = normalizeMachineZone(machine.zone);
      const matchesZone = selectedZone === 'All Zones' || machineZone === selectedZone;

      return matchesMuscle && matchesZone;
    });
  }, [selectedMuscle, selectedZone]);

  const zoneCount = useMemo(() => {
    const counts = GYM_MACHINES.reduce((acc, machine) => {
      const zone = normalizeMachineZone(machine.zone);
      acc[zone] = (acc[zone] || 0) + 1;
      return acc;
    }, {});

    return Object.keys(counts).length;
  }, []);

  const groupedMachines = useMemo(() => {
    const grouped = filteredMachines.reduce((acc, machine) => {
      const zone = normalizeMachineZone(machine.zone);
      if (!acc[zone]) acc[zone] = [];
      acc[zone].push(machine);
      return acc;
    }, {});

    return MACHINE_ZONE_ORDER.filter((zone) => grouped[zone]?.length > 0).map((zone) => ({
      zone,
      icon: ZONE_ICONS[zone] ?? ZONE_ICONS.Other,
      note: ZONE_NOTES[zone] ?? ZONE_NOTES.Other,
      machines: grouped[zone].slice().sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }, [filteredMachines]);

  const openMachine = (machine) => {
    navigation.navigate('GymMachineDetail', {
      machineId: machine.id,
      machineName: machine.name,
    });
  };

  const toggleZone = (zone) => {
    setExpandedZones((prev) => ({
      ...prev,
      [zone]: !prev[zone],
    }));
  };

  const renderMachineCard = (machine) => {
    const busyTone = getBusyTone(machine.busyLevel);
    const machineZone = normalizeMachineZone(machine.zone);

    return (
      <TouchableOpacity
        style={styles.machineCard}
        activeOpacity={0.9}
        onPress={() => openMachine(machine)}
      >
        <LinearGradient
          colors={machine.imageColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.machineHero}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.zoneChip}>
              <Ionicons
                name={ZONE_ICONS[machineZone] ?? 'fitness-outline'}
                size={12}
                color={COLORS.text}
              />
              <Text style={styles.zoneChipText}>{machineZone}</Text>
            </View>
            <View
              style={[
                styles.busyChip,
                { backgroundColor: busyTone.bg, borderColor: busyTone.border },
              ]}
            >
              <Text style={[styles.busyChipText, { color: busyTone.text }]}>{machine.busyLevel}</Text>
            </View>
          </View>
          <View style={styles.heroBottomRow}>
            <Text style={styles.heroHint}>Quick tips available</Text>
            <Ionicons name="bulb-outline" size={16} color={COLORS.text} />
          </View>
        </LinearGradient>

        <View style={styles.machineBody}>
          <View style={styles.nameRow}>
            <Text style={styles.machineName}>{machine.name}</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
          </View>

          <Text style={styles.muscleLine}>
            {machine.primaryMuscles.join(' • ')}
            {machine.secondaryMuscles.length ? `  ·  ${machine.secondaryMuscles.slice(0, 2).join(' • ')}` : ''}
          </Text>

          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{machineZone} Zone</Text>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.metaText}>{machine.riskLevel} risk</Text>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.metaText}>{machine.difficulty}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const RootContainer = embedded ? View : SafeAreaView;

  return (
    <RootContainer style={styles.safeArea}>
      <View style={[styles.container, embedded && styles.containerEmbedded]}>
        <View style={[styles.headerWrap, !showHeader && styles.headerWrapCompact]}>
          {showHeader ? (
            <>
              <Text style={styles.title}>Gym</Text>
              <Text style={styles.subtitle}>Your gym layout and available machines.</Text>

              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{GYM_MACHINES.length}</Text>
                  <Text style={styles.statLabel}>machines</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{zoneCount}</Text>
                  <Text style={styles.statLabel}>zones</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{filteredMachines.length}</Text>
                  <Text style={styles.statLabel}>filtered</Text>
                </View>
              </View>
            </>
          ) : null}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersRow}
          >
            {MUSCLE_FILTERS.map((filter) => {
              const active = selectedMuscle === filter;
              return (
                <TouchableOpacity
                  key={filter}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  activeOpacity={0.9}
                  onPress={() => setSelectedMuscle(filter)}
                >
                  <Text style={[styles.filterText, active && styles.filterTextActive]}>{filter}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersRowSecondary}
          >
            {ZONE_FILTERS.map((zone) => {
              const active = selectedZone === zone;
              return (
                <TouchableOpacity
                  key={zone}
                  style={[styles.zoneFilterChip, active && styles.zoneFilterChipActive]}
                  activeOpacity={0.9}
                  onPress={() => setSelectedZone(zone)}
                >
                  <Text style={[styles.zoneFilterText, active && styles.zoneFilterTextActive]}>{zone}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <ScrollView
          style={styles.groupsScroll}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {groupedMachines.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No machines in this filter</Text>
              <Text style={styles.emptySubtle}>Try changing muscle or zone filters.</Text>
            </View>
          ) : (
            groupedMachines.map((group) => (
              <CollapsibleSection
                key={group.zone}
                title={group.zone}
                subtitle={group.note}
                icon={group.icon}
                iconIsEmoji={false}
                expanded={Boolean(expandedZones[group.zone])}
                onToggle={() => toggleZone(group.zone)}
                countLabel={`${group.machines.length} ${group.machines.length === 1 ? 'machine' : 'machines'}`}
                style={styles.groupSection}
                contentStyle={styles.groupContent}
              >
                {group.machines.map((machine) => (
                  <View key={machine.id}>{renderMachineCard(machine)}</View>
                ))}
              </CollapsibleSection>
            ))
          )}
        </ScrollView>
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
  headerWrapCompact: {
    marginBottom: 8,
  },
  title: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 3,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  statValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  statLabel: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  filtersRow: {
    gap: 8,
    paddingBottom: 2,
  },
  filtersRowSecondary: {
    gap: 8,
    paddingBottom: 2,
    marginTop: 8,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.3)',
    backgroundColor: COLORS.card,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterChipActive: {
    borderColor: 'rgba(245,201,106,0.5)',
    backgroundColor: 'rgba(245,201,106,0.16)',
  },
  filterText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  filterTextActive: {
    color: COLORS.accent,
  },
  zoneFilterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(90,209,232,0.28)',
    backgroundColor: 'rgba(90,209,232,0.08)',
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  zoneFilterChipActive: {
    borderColor: 'rgba(90,209,232,0.55)',
    backgroundColor: 'rgba(90,209,232,0.2)',
  },
  zoneFilterText: {
    color: '#9DCEE0',
    fontSize: 11,
    fontWeight: '600',
  },
  zoneFilterTextActive: {
    color: COLORS.accent2,
  },
  groupsScroll: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 26,
  },
  groupSection: {
    marginTop: 0,
  },
  groupContent: {
    paddingTop: 8,
  },
  machineCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.18)',
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.24,
    shadowRadius: 10,
    elevation: 4,
  },
  machineHero: {
    height: 94,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'space-between',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  zoneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(14,15,20,0.34)',
    borderWidth: 1,
    borderColor: 'rgba(245,246,248,0.22)',
  },
  zoneChipText: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: '600',
  },
  busyChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  busyChipText: {
    fontSize: 10,
    fontWeight: '700',
  },
  heroBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroHint: {
    color: 'rgba(245,246,248,0.92)',
    fontSize: 11,
    fontWeight: '600',
  },
  machineBody: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  machineName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  muscleLine: {
    color: COLORS.text,
    fontSize: 12,
    opacity: 0.88,
    marginBottom: 7,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
  },
  metaText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  metaDot: {
    color: COLORS.muted,
    fontSize: 11,
  },
  emptyWrap: {
    marginTop: 30,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  emptySubtle: {
    marginTop: 6,
    color: COLORS.muted,
    fontSize: 12,
    textAlign: 'center',
  },
});

export default GymHomeScreen;
