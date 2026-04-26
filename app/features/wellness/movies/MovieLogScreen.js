import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { usePreferences } from '../../../context/PreferencesContext';
import { useAuth } from '../../../context/AuthContext';
import useMovieLogs from '../../../hooks/useMovieLogs';
import { PLATFORMS, PLATFORM_BY_ID } from '../../../data/movies/streaming';
import COLORS from '../../../theme/colors';
import UI_TOKENS from '../../../ui/tokens';

function formatShortDate(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function toDateISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function MediaTypeChip({ value }) {
  return (
    <View style={styles.mediaTypeChip}>
      <Text style={styles.mediaTypeChipText}>{value === 'tv_show' ? 'TV show' : 'Movie'}</Text>
    </View>
  );
}

function MovieLogItemCard({ item, isEditing, onChangePlatform, onRemove }) {
  return (
    <View style={styles.itemCard}>
      <View style={styles.itemTopRow}>
        <View style={styles.itemCopy}>
          <Text style={styles.itemTitle}>{item.title}</Text>
          <View style={styles.itemMetaRow}>
            <MediaTypeChip value={item.mediaType} />
            {item.releaseYear ? <Text style={styles.itemYear}>{item.releaseYear}</Text> : null}
          </View>
        </View>
        {isEditing ? (
          <TouchableOpacity style={styles.iconActionDanger} activeOpacity={0.9} onPress={onRemove}>
            <Ionicons name="trash-outline" size={16} color="#FFB4A8" />
          </TouchableOpacity>
        ) : null}
      </View>
      <TouchableOpacity
        style={[styles.platformButton, !isEditing ? styles.platformButtonReadOnly : null]}
        activeOpacity={isEditing ? 0.9 : 1}
        disabled={!isEditing}
        onPress={onChangePlatform}
      >
        <Text style={styles.platformLabel}>Platform</Text>
        <View style={styles.platformValueRow}>
          <Text style={styles.platformValue}>{item.platformName || 'Select platform'}</Text>
          {isEditing ? <Ionicons name="chevron-forward" size={14} color={COLORS.muted} /> : null}
        </View>
      </TouchableOpacity>
    </View>
  );
}

export default function MovieLogScreen({ route, navigation }) {
  const { user } = useAuth();
  const { subscriptions } = usePreferences();
  const { getLogForDate, saveLogForDate, titles, loading, saving, error, hydrate } = useMovieLogs(user);
  const initialDateISO = route?.params?.dateISO;

  const [items, setItems] = useState([]);
  const [screenLoading, setScreenLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateISO, setDateISO] = useState(initialDateISO);
  const [draftDate, setDraftDate] = useState(new Date(`${initialDateISO}T12:00:00`));
  const [originalDateISO, setOriginalDateISO] = useState(initialDateISO);
  const [originalItems, setOriginalItems] = useState([]);
  const [inlineError, setInlineError] = useState('');
  const [platformPickerItemId, setPlatformPickerItemId] = useState(null);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('all');

  const hydrateLog = useCallback(async () => {
    if (!dateISO) return;
    try {
      setScreenLoading(true);
      setInlineError('');
      const log = await getLogForDate(dateISO);
      const nextItems = log?.items || [];
      setItems(nextItems);
      setOriginalItems(nextItems);
      setOriginalDateISO(dateISO);
      setDraftDate(new Date(`${dateISO}T12:00:00`));
      setIsEditing(!nextItems.length);
    } finally {
      setScreenLoading(false);
    }
  }, [dateISO, getLogForDate]);

  useFocusEffect(useCallback(() => { hydrateLog(); }, [hydrateLog]));

  const totals = useMemo(() => ({
    entries: items.length,
    movies: items.filter((item) => item.mediaType === 'movie').length,
    shows: items.filter((item) => item.mediaType === 'tv_show').length,
  }), [items]);

  const selectableTitles = useMemo(() => {
    const usedIds = new Set(items.map((item) => item.mediaTitleId));
    return titles.filter((title) => {
      if (usedIds.has(title.id)) return false;
      if (selectedTypeFilter !== 'all' && title.mediaType !== selectedTypeFilter) return false;
      return true;
    });
  }, [items, selectedTypeFilter, titles]);

  const availablePlatforms = useMemo(() => {
    const active = PLATFORMS.filter((platform) => subscriptions.includes(platform.id));
    return active.length ? active : PLATFORMS;
  }, [subscriptions]);

  const addTitle = useCallback((title) => {
    const defaultPlatform = availablePlatforms[0];
    setItems((prev) => [
      ...prev,
      {
        id: `draft_${title.id}`,
        mediaTitleId: title.id,
        title: title.title,
        mediaType: title.mediaType,
        releaseYear: title.releaseYear,
        sourceMovieId: title.sourceMovieId,
        platformId: defaultPlatform?.id || '',
        platformName: defaultPlatform?.name || '',
      },
    ]);
    setPickerVisible(false);
  }, [availablePlatforms]);

  const updateItemPlatform = useCallback((itemId, platform) => {
    setItems((prev) => prev.map((item) => (
      item.id === itemId
        ? { ...item, platformId: platform.id, platformName: platform.name }
        : item
    )));
    setPlatformPickerItemId(null);
  }, []);

  const removeItem = useCallback((itemId) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  const handleSave = useCallback(async () => {
    try {
      setInlineError('');
      if (dateISO !== originalDateISO) {
        const existing = await getLogForDate(dateISO);
        if (existing?.id && existing.dateISO !== originalDateISO) {
          setInlineError('A movie log already exists on that date. Choose another date.');
          return;
        }
      }
      await saveLogForDate(originalDateISO, []);
      await saveLogForDate(dateISO, items);
      await hydrate();
      setOriginalDateISO(dateISO);
      setOriginalItems(items);
      setIsEditing(false);
    } catch (nextError) {
      setInlineError(nextError?.message || 'Could not save movie log.');
    }
  }, [dateISO, getLogForDate, hydrate, items, originalDateISO, saveLogForDate]);

  const handleDelete = useCallback(() => {
    Alert.alert('Delete log', 'Remove this movie log for the selected date?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await saveLogForDate(originalDateISO, []);
            await hydrate();
            navigation.goBack();
          } catch (nextError) {
            Alert.alert('Delete failed', nextError?.message || 'Could not delete this movie log.');
          }
        },
      },
    ]);
  }, [hydrate, navigation, originalDateISO, saveLogForDate]);

  const handleCancelEdit = useCallback(() => {
    setItems(originalItems);
    setDateISO(originalDateISO);
    setDraftDate(new Date(`${originalDateISO}T12:00:00`));
    setIsEditing(false);
    setInlineError('');
  }, [originalDateISO, originalItems]);

  if (loading || screenLoading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={COLORS.accent} />
        <Text style={styles.loadingText}>Loading movie log...</Text>
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topCard}>
          <View style={styles.topCardHeader}>
            <View style={styles.topCardCopy}>
              <Text style={styles.sectionLabel}>Date</Text>
            </View>
            <View style={styles.topActions}>
              <TouchableOpacity
                style={[styles.iconAction, isEditing ? styles.iconActionActive : null]}
                activeOpacity={0.9}
                onPress={isEditing ? handleCancelEdit : () => setIsEditing(true)}
              >
                <Ionicons name={isEditing ? 'close-outline' : 'create-outline'} size={18} color={COLORS.accent2} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconActionDanger} activeOpacity={0.9} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={18} color="#FFB4A8" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.dateField, !isEditing ? styles.dateFieldReadOnly : null]}
            activeOpacity={isEditing ? 0.9 : 1}
            disabled={!isEditing}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateFieldText}>{formatShortDate(new Date(`${dateISO}T12:00:00`))}</Text>
            {isEditing ? <Ionicons name="calendar-outline" size={18} color={COLORS.accent} /> : null}
          </TouchableOpacity>

          <View style={styles.topSummaryRow}>
            <View style={styles.summaryPill}>
              <Text style={styles.summaryPillLabel}>Entries</Text>
              <Text style={styles.summaryPillValue}>{totals.entries}</Text>
            </View>
            <View style={styles.summaryPill}>
              <Text style={styles.summaryPillLabel}>Movies</Text>
              <Text style={styles.summaryPillValue}>{totals.movies}</Text>
            </View>
            <View style={[styles.summaryPill, styles.summaryPillAccent]}>
              <Text style={styles.summaryPillLabel}>Shows</Text>
              <Text style={styles.summaryPillValue}>{totals.shows}</Text>
            </View>
          </View>

          {inlineError ? <Text style={styles.inlineError}>{inlineError}</Text> : null}
          {error ? <Text style={styles.inlineError}>{error}</Text> : null}
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Entries</Text>
          {isEditing ? (
            <TouchableOpacity style={styles.addButton} activeOpacity={0.9} onPress={() => setPickerVisible(true)}>
              <Ionicons name="add" size={18} color={COLORS.bg} />
              <Text style={styles.addButtonText}>Add title</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {!items.length ? (
          <View style={styles.emptyCard}>
            <Ionicons name="film-outline" size={22} color={COLORS.accent} />
            <Text style={styles.emptyTitle}>Nothing logged so far</Text>
            <Text style={styles.emptySubtitle}>Add movies and TV shows for this date.</Text>
          </View>
        ) : (
          items.map((item) => (
            <MovieLogItemCard
              key={item.id}
              item={item}
              isEditing={isEditing}
              onChangePlatform={() => setPlatformPickerItemId(item.id)}
              onRemove={() => removeItem(item.id)}
            />
          ))
        )}
      </ScrollView>

      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.bottomBarTitle}>{totals.entries} entries</Text>
          <Text style={styles.bottomBarSubtitle}>{totals.movies} movies • {totals.shows} shows</Text>
        </View>
        {isEditing ? (
          <TouchableOpacity style={styles.saveButton} activeOpacity={0.9} onPress={handleSave} disabled={saving}>
            <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save changes'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <Modal visible={pickerVisible} animationType="slide" transparent onRequestClose={() => setPickerVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerVisible(false)}>
          <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add title</Text>
              <TouchableOpacity style={styles.iconAction} activeOpacity={0.9} onPress={() => setPickerVisible(false)}>
                <Ionicons name="close-outline" size={18} color={COLORS.accent2} />
              </TouchableOpacity>
            </View>
            <View style={styles.filterRow}>
              {[
                { key: 'all', label: 'All' },
                { key: 'movie', label: 'Movies' },
                { key: 'tv_show', label: 'TV shows' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.filterChip, selectedTypeFilter === option.key ? styles.filterChipActive : null]}
                  activeOpacity={0.9}
                  onPress={() => setSelectedTypeFilter(option.key)}
                >
                  <Text style={[styles.filterChipText, selectedTypeFilter === option.key ? styles.filterChipTextActive : null]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              {selectableTitles.map((title) => (
                <TouchableOpacity key={title.id} style={styles.catalogRow} activeOpacity={0.9} onPress={() => addTitle(title)}>
                  <View style={styles.catalogCopy}>
                    <Text style={styles.catalogTitle}>{title.title}</Text>
                    <Text style={styles.catalogMeta}>
                      {title.mediaType === 'tv_show' ? 'TV show' : 'Movie'}
                      {title.releaseYear ? ` • ${title.releaseYear}` : ''}
                    </Text>
                  </View>
                  <Ionicons name="add-circle-outline" size={18} color={COLORS.accent} />
                </TouchableOpacity>
              ))}
              {!selectableTitles.length ? <Text style={styles.emptySubtitle}>No titles available for this filter.</Text> : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={Boolean(platformPickerItemId)} animationType="fade" transparent onRequestClose={() => setPlatformPickerItemId(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPlatformPickerItemId(null)}>
          <Pressable style={styles.platformModal} onPress={(event) => event.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose platform</Text>
              <TouchableOpacity style={styles.iconAction} activeOpacity={0.9} onPress={() => setPlatformPickerItemId(null)}>
                <Ionicons name="close-outline" size={18} color={COLORS.accent2} />
              </TouchableOpacity>
            </View>
            {availablePlatforms.map((platform) => (
              <TouchableOpacity
                key={platform.id}
                style={styles.catalogRow}
                activeOpacity={0.9}
                onPress={() => updateItemPlatform(platformPickerItemId, platform)}
              >
                <Text style={styles.catalogTitle}>{platform.name}</Text>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {showDatePicker ? (
        <DateTimePicker
          mode="date"
          display="default"
          value={draftDate}
          onChange={(event, nextDate) => {
            setShowDatePicker(false);
            if (event.type === 'set' && nextDate) {
              setDraftDate(nextDate);
              setDateISO(toDateISO(nextDate));
            }
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: UI_TOKENS.spacing.md, paddingBottom: 120, gap: UI_TOKENS.spacing.md },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: COLORS.bg },
  loadingText: { color: COLORS.muted, fontSize: 13 },
  topCard: {
    borderRadius: UI_TOKENS.radius.xl, borderWidth: UI_TOKENS.border.hairline, borderColor: 'rgba(162,167,179,0.18)',
    backgroundColor: COLORS.card, padding: UI_TOKENS.spacing.md, gap: UI_TOKENS.spacing.md,
  },
  topCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topCardCopy: { flex: 1 },
  topActions: { flexDirection: 'row', gap: 10 },
  sectionLabel: { color: COLORS.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2 },
  dateField: {
    minHeight: 56, borderRadius: 18, borderWidth: UI_TOKENS.border.hairline, borderColor: 'rgba(231,191,94,0.4)',
    backgroundColor: 'rgba(97,84,58,0.3)', paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  dateFieldReadOnly: { borderColor: 'rgba(162,167,179,0.18)', backgroundColor: '#222733' },
  dateFieldText: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  topSummaryRow: { flexDirection: 'row', gap: 8 },
  summaryPill: {
    flex: 1, minHeight: 68, borderRadius: 16, borderWidth: UI_TOKENS.border.hairline, borderColor: 'rgba(162,167,179,0.18)',
    backgroundColor: '#222733', paddingHorizontal: 12, paddingVertical: 10, justifyContent: 'space-between',
  },
  summaryPillAccent: { borderColor: 'rgba(231,191,94,0.4)', backgroundColor: 'rgba(97,84,58,0.3)' },
  summaryPillLabel: { color: COLORS.muted, fontSize: 11, fontWeight: '700' },
  summaryPillValue: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  inlineError: { color: '#FFB4A8', fontSize: 13 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: COLORS.text, fontSize: 17, fontWeight: '800' },
  addButton: {
    minHeight: 46, borderRadius: 18, backgroundColor: COLORS.accent, paddingHorizontal: 18,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  addButtonText: { color: COLORS.bg, fontSize: 15, fontWeight: '800' },
  emptyCard: {
    borderRadius: 22, borderWidth: UI_TOKENS.border.hairline, borderColor: 'rgba(162,167,179,0.18)', backgroundColor: COLORS.card,
    padding: 20, alignItems: 'center', gap: 10,
  },
  emptyTitle: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  emptySubtitle: { color: COLORS.muted, fontSize: 13, textAlign: 'center' },
  itemCard: {
    borderRadius: 22, borderWidth: UI_TOKENS.border.hairline, borderColor: 'rgba(162,167,179,0.18)', backgroundColor: COLORS.card,
    padding: 18, gap: 14,
  },
  itemTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  itemCopy: { flex: 1 },
  itemTitle: { color: COLORS.text, fontSize: 17, fontWeight: '800' },
  itemMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  mediaTypeChip: {
    borderRadius: 12, borderWidth: UI_TOKENS.border.hairline, borderColor: 'rgba(86,214,234,0.3)',
    backgroundColor: 'rgba(86,214,234,0.12)', paddingHorizontal: 10, paddingVertical: 5,
  },
  mediaTypeChipText: { color: COLORS.accent2, fontSize: 11, fontWeight: '700' },
  itemYear: { color: COLORS.muted, fontSize: 12, fontWeight: '600' },
  platformButton: {
    borderRadius: 18, borderWidth: UI_TOKENS.border.hairline, borderColor: 'rgba(162,167,179,0.18)', backgroundColor: '#222733',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  platformButtonReadOnly: { opacity: 1 },
  platformLabel: { color: COLORS.muted, fontSize: 11, fontWeight: '700', marginBottom: 6 },
  platformValueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  platformValue: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  historyButton: {
    minHeight: 36, borderRadius: 14, borderWidth: UI_TOKENS.border.hairline, borderColor: 'rgba(86,214,234,0.3)',
    backgroundColor: 'rgba(86,214,234,0.12)', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  historyButtonText: { color: COLORS.accent2, fontSize: 13, fontWeight: '700' },
  iconAction: {
    width: 46, height: 46, borderRadius: 16, borderWidth: UI_TOKENS.border.hairline, borderColor: 'rgba(86,214,234,0.28)',
    backgroundColor: 'rgba(86,214,234,0.12)', alignItems: 'center', justifyContent: 'center',
  },
  iconActionActive: { borderColor: 'rgba(231,191,94,0.4)', backgroundColor: 'rgba(97,84,58,0.3)' },
  iconActionDanger: {
    width: 46, height: 46, borderRadius: 16, borderWidth: UI_TOKENS.border.hairline, borderColor: 'rgba(255,124,123,0.35)',
    backgroundColor: 'rgba(255,124,123,0.12)', alignItems: 'center', justifyContent: 'center',
  },
  bottomBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(17,20,29,0.98)',
    borderTopWidth: 1, borderTopColor: 'rgba(162,167,179,0.12)', paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  bottomBarTitle: { color: COLORS.text, fontSize: 15, fontWeight: '800' },
  bottomBarSubtitle: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  saveButton: { minHeight: 50, borderRadius: 18, backgroundColor: COLORS.accent, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center' },
  saveButtonText: { color: COLORS.bg, fontSize: 15, fontWeight: '800' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(7,10,15,0.72)', justifyContent: 'flex-end' },
  modalCard: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: COLORS.card, padding: 18, minHeight: 360, gap: 14,
  },
  platformModal: {
    marginHorizontal: 20, borderRadius: 24, backgroundColor: COLORS.card, padding: 18, marginTop: 'auto', marginBottom: 40, gap: 12,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { color: COLORS.text, fontSize: 24, fontWeight: '800' },
  filterRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  filterChip: {
    borderRadius: 14, borderWidth: UI_TOKENS.border.hairline, borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: '#222733', paddingHorizontal: 12, paddingVertical: 8,
  },
  filterChipActive: { borderColor: 'rgba(231,191,94,0.42)', backgroundColor: 'rgba(97,84,58,0.3)' },
  filterChipText: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  filterChipTextActive: { color: COLORS.accent },
  modalList: { maxHeight: 360 },
  catalogRow: {
    borderRadius: 16, borderWidth: UI_TOKENS.border.hairline, borderColor: 'rgba(162,167,179,0.18)', backgroundColor: '#222733',
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  catalogCopy: { flex: 1, paddingRight: 12 },
  catalogTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  catalogMeta: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
});
