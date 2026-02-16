import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  SafeAreaView,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import CollapsibleSection from '../../../components/CollapsibleSection';
import { loadFoodUtensils, saveFoodUtensils } from '../../../core/storage/foodUtensilsStorage';
import COLORS from '../../../theme/colors';

const CATEGORY_ORDER = ['Pans', 'Knives', 'Appliances', 'Containers', 'Tools'];
const CATEGORY_META = {
  Pans: { icon: '🍳', note: 'Cookware for stovetop prep' },
  Knives: { icon: '🔪', note: 'Cutting and prep edges' },
  Appliances: { icon: '⚙️', note: 'Powered kitchen gear' },
  Containers: { icon: '🫙', note: 'Storage and meal prep boxes' },
  Tools: { icon: '🥄', note: 'Hand tools and accessories' },
};

function createUtensilId() {
  return `utensil_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function FoodUtensilsScreen({ embedded = false, showHero = true }) {
  const [items, setItems] = useState([]);
  const [hydrated, setHydrated] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [editorVisible, setEditorVisible] = useState(false);
  const [editorMode, setEditorMode] = useState('add');
  const [editingId, setEditingId] = useState(null);

  const [draftName, setDraftName] = useState('');
  const [draftCategory, setDraftCategory] = useState('Tools');
  const [draftCount, setDraftCount] = useState('1');
  const [draftNote, setDraftNote] = useState('');
  const [draftIcon, setDraftIcon] = useState('🍽️');

  useEffect(() => {
    let isMounted = true;

    loadFoodUtensils().then((nextItems) => {
      if (!isMounted) return;
      setItems(nextItems);
      setHydrated(true);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveFoodUtensils(items);
  }, [hydrated, items]);

  const sections = useMemo(() => {
    const grouped = items.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {});

    const ordered = [...CATEGORY_ORDER, ...Object.keys(grouped).filter((category) => !CATEGORY_ORDER.includes(category))]
      .filter((category) => grouped[category]?.length);

    return ordered.map((category) => ({
      title: category,
      itemCount: grouped[category].length,
      meta: CATEGORY_META[category] ?? { icon: '🍽️', note: 'Kitchen essentials' },
      data: grouped[category]
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }, [items]);

  const visibleSections = useMemo(
    () =>
      sections.map((section) => ({
        ...section,
        data: expandedCategories[section.title] ? section.data : [],
      })),
    [expandedCategories, sections],
  );

  const totalCount = useMemo(
    () => items.reduce((sum, item) => sum + (Number(item.count) || 0), 0),
    [items],
  );

  const openAdd = () => {
    setEditorMode('add');
    setEditingId(null);
    setDraftName('');
    setDraftCategory('Tools');
    setDraftCount('1');
    setDraftNote('');
    setDraftIcon('🍽️');
    setEditorVisible(true);
  };

  const openEdit = (item) => {
    setEditorMode('edit');
    setEditingId(item.id);
    setDraftName(item.name);
    setDraftCategory(item.category);
    setDraftCount(String(item.count));
    setDraftNote(item.note ?? '');
    setDraftIcon(item.icon ?? '🍽️');
    setEditorVisible(true);
  };

  const saveEditor = () => {
    const name = draftName.trim();
    const count = Math.max(0, Number(draftCount) || 0);
    if (!name) return;

    if (editorMode === 'edit' && editingId) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === editingId
            ? {
                ...item,
                name,
                category: draftCategory,
                count,
                note: draftNote.trim(),
                icon: draftIcon.trim() || '🍽️',
              }
            : item,
        ),
      );
    } else {
      setItems((prev) => [
        ...prev,
        {
          id: createUtensilId(),
          name,
          category: draftCategory,
          count,
          note: draftNote.trim(),
          icon: draftIcon.trim() || '🍽️',
        },
      ]);
    }

    setEditorVisible(false);
  };

  const adjustCount = (itemId, delta) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              count: Math.max(0, (Number(item.count) || 0) + delta),
            }
          : item,
      ),
    );
  };

  const toggleCategory = (title) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  if (!hydrated) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading utensils...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const RootContainer = embedded ? View : SafeAreaView;

  return (
    <RootContainer style={styles.safeArea}>
      <View style={[styles.container, embedded && styles.containerEmbedded]}>
        {showHero ? (
          <View style={styles.heroCard}>
            <View>
              <Text style={styles.title}>Utensils</Text>
              <Text style={styles.subtitle}>Track cookware, tools, and appliances.</Text>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statPill}>
                <Text style={styles.statValue}>{items.length}</Text>
                <Text style={styles.statLabel}>items</Text>
              </View>
              <View style={styles.statPill}>
                <Text style={styles.statValue}>{totalCount}</Text>
                <Text style={styles.statLabel}>total count</Text>
              </View>
            </View>
          </View>
        ) : null}

        <SectionList
          sections={visibleSections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section }) => (
            <CollapsibleSection
              title={section.title}
              subtitle={section.meta.note}
              icon={section.meta.icon}
              iconIsEmoji
              expanded={Boolean(expandedCategories[section.title])}
              onToggle={() => toggleCategory(section.title)}
              countLabel={`${section.itemCount} items`}
              style={styles.sectionCardWrap}
            />
          )}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.itemCard} activeOpacity={0.92} onPress={() => openEdit(item)}>
              <View style={styles.itemLeft}>
                <View style={styles.iconWrap}>
                  <Text style={styles.iconText}>{item.icon || '🍽️'}</Text>
                </View>
                <View style={styles.itemTextWrap}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemMeta}>Count: {item.count}</Text>
                  {item.note ? <Text style={styles.itemNote}>{item.note}</Text> : null}
                </View>
              </View>

              <View style={styles.stepper}>
                <TouchableOpacity
                  style={styles.stepperButton}
                  activeOpacity={0.9}
                  onPress={() => adjustCount(item.id, -1)}
                >
                  <Ionicons name="remove" size={14} color={COLORS.text} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.stepperButton, styles.stepperButtonAccent]}
                  activeOpacity={0.9}
                  onPress={() => adjustCount(item.id, 1)}
                >
                  <Ionicons name="add" size={14} color={COLORS.bg} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            items.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyTitle}>No utensils yet</Text>
                <Text style={styles.emptySubtle}>Add your first utensil to get started.</Text>
              </View>
            ) : null
          }
        />

        <TouchableOpacity style={styles.addButton} activeOpacity={0.92} onPress={openAdd}>
          <Ionicons name="add-circle-outline" size={16} color={COLORS.text} />
          <Text style={styles.addButtonText}>Add Utensil</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={editorVisible} transparent animationType="fade" onRequestClose={() => setEditorVisible(false)}>
        <View style={styles.modalRoot}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setEditorVisible(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editorMode === 'edit' ? 'Edit Utensil' : 'Add Utensil'}</Text>

            <TextInput
              style={styles.input}
              value={draftName}
              onChangeText={setDraftName}
              placeholder="Utensil name"
              placeholderTextColor={COLORS.muted}
            />
            <TextInput
              style={styles.input}
              value={draftIcon}
              onChangeText={setDraftIcon}
              placeholder="Icon / emoji"
              placeholderTextColor={COLORS.muted}
            />
            <TextInput
              style={styles.input}
              value={draftCount}
              onChangeText={setDraftCount}
              keyboardType="number-pad"
              placeholder="Count"
              placeholderTextColor={COLORS.muted}
            />
            <TextInput
              style={styles.input}
              value={draftNote}
              onChangeText={setDraftNote}
              placeholder="Note"
              placeholderTextColor={COLORS.muted}
            />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
              {CATEGORY_ORDER.map((category) => {
                const active = draftCategory === category;
                return (
                  <TouchableOpacity
                    key={category}
                    style={[styles.categoryChip, active && styles.categoryChipActive]}
                    activeOpacity={0.9}
                    onPress={() => setDraftCategory(category)}
                  >
                    <Text style={[styles.categoryText, active && styles.categoryTextActive]}>{category}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity style={styles.modalSecondaryButton} activeOpacity={0.9} onPress={() => setEditorVisible(false)}>
                <Text style={styles.modalSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalPrimaryButton} activeOpacity={0.9} onPress={saveEditor}>
                <Text style={styles.modalPrimaryText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingTop: 8,
  },
  containerEmbedded: {
    paddingTop: 6,
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
  heroCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
  },
  title: {
    color: COLORS.text,
    fontSize: 29,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: 3,
    color: COLORS.muted,
    fontSize: 12,
  },
  statsRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
  },
  statPill: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flex: 1,
  },
  statValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  statLabel: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  listContent: {
    paddingBottom: 90,
  },
  sectionCardWrap: {
    marginTop: 6,
    marginBottom: 8,
  },
  sectionHeader: {
    marginTop: 6,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(90,209,232,0.2)',
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  sectionCount: {
    color: COLORS.accent2,
    fontSize: 11,
    fontWeight: '700',
  },
  itemCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.18)',
    backgroundColor: COLORS.card,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(90,209,232,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  iconText: {
    fontSize: 16,
  },
  itemTextWrap: {
    flex: 1,
  },
  itemName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  itemMeta: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 2,
  },
  itemNote: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 2,
  },
  stepper: {
    flexDirection: 'row',
    gap: 6,
  },
  stepperButton: {
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.26)',
    backgroundColor: COLORS.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonAccent: {
    borderColor: 'rgba(245,201,106,0.4)',
    backgroundColor: COLORS.accent,
  },
  emptyWrap: {
    marginTop: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  emptySubtle: {
    color: COLORS.muted,
    marginTop: 5,
    fontSize: 12,
  },
  addButton: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 12,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.26)',
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  addButtonText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8,9,12,0.58)',
  },
  modalCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.25)',
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.cardSoft,
    color: COLORS.text,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginBottom: 8,
    fontSize: 13,
  },
  categoryRow: {
    gap: 8,
    paddingBottom: 2,
    marginBottom: 8,
  },
  categoryChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.3)',
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  categoryChipActive: {
    borderColor: 'rgba(245,201,106,0.45)',
    backgroundColor: 'rgba(245,201,106,0.16)',
  },
  categoryText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  categoryTextActive: {
    color: COLORS.accent,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modalSecondaryButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.3)',
    backgroundColor: COLORS.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  modalSecondaryText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  modalPrimaryButton: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  modalPrimaryText: {
    color: COLORS.bg,
    fontSize: 12,
    fontWeight: '700',
  },
});

export default FoodUtensilsScreen;
