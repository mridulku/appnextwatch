import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import COLORS from '../../../theme/colors';
import UI_TOKENS from '../../../ui/tokens';
import { useAuth } from '../../../context/AuthContext';
import {
  createAudioClip,
  deleteAudioClip,
  finalizeAudioClip,
  getOrCreateCurrentAppUserId,
  listAudioClipSegments,
  listAudioClips,
  playableSignedUrlForSegment,
  saveAudioClipTranscript,
  transcribeAudioSegment,
  uploadAudioClipSegment,
} from '../../../core/api/audioRecorderDb';
import { findLogById } from './mockGymLogs';
import { estimateExerciseDurationMin } from './sessionDuration';

const MIN_DURATION_MS = 500;
const MIN_CLIP_SIZE_BYTES = 1500;

function toDateOnly(value) {
  const date = value instanceof Date ? new Date(value) : new Date(`${String(value).slice(0, 10)}T00:00:00`);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDateTitle(value) {
  const date = toDateOnly(value);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatDuration(ms) {
  const total = Math.max(0, Math.round((Number(ms) || 0) / 1000));
  const min = Math.floor(total / 60);
  const sec = total % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

function formatRange(startIso, endIso) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 'Unknown range';
  const timeFmt = { hour: 'numeric', minute: '2-digit', second: '2-digit' };
  return `${start.toLocaleTimeString([], timeFmt)} - ${end.toLocaleTimeString([], timeFmt)}`;
}

function buildCombinedTranscript(segments) {
  return (segments || [])
    .map((segment) => {
      const header = `Part ${segment.segment_index} (${formatRange(segment.started_at, segment.ended_at)})`;
      const body = String(segment.transcript_text || '').trim() || '[No transcript]';
      return `${header}\n${body}`;
    })
    .join('\n\n');
}

async function probeDurationFromUri(uri) {
  if (!uri) return 0;
  let sound = null;
  try {
    const created = await Audio.Sound.createAsync({ uri }, { shouldPlay: false });
    sound = created?.sound || null;
    const status = await sound?.getStatusAsync?.();
    return Number(status?.durationMillis) || 0;
  } catch {
    return 0;
  } finally {
    if (sound) {
      try {
        await sound.unloadAsync();
      } catch {}
    }
  }
}

function isLikelyIsolation(name = '') {
  const key = String(name).toLowerCase();
  return ['curl', 'raise', 'pushdown', 'fly', 'extension'].some((token) => key.includes(token));
}

function defaultWeightForExercise(name = '', equipment = '') {
  const key = `${name} ${equipment}`.toLowerCase();
  if (key.includes('barbell')) return 40;
  if (key.includes('machine') || key.includes('cable')) return 30;
  if (key.includes('dumbbell')) return 12;
  return 20;
}

function buildFallbackPlannedSets(exercise) {
  const isolation = isLikelyIsolation(exercise?.name);
  const setCount = isolation ? 3 : 4;
  const reps = isolation ? 12 : 8;
  const weight = defaultWeightForExercise(exercise?.name, exercise?.equipment);
  return Array.from({ length: setCount }).map((_, index) => ({
    set: index + 1,
    reps,
    weight,
  }));
}

function normalizeSetRows(sets, fallbackExercise) {
  if (!Array.isArray(sets) || sets.length === 0) {
    return buildFallbackPlannedSets(fallbackExercise);
  }

  return sets.map((setRow, index) => ({
    set: toNumber(setRow?.set || setRow?.setIndex || index + 1, index + 1),
    reps: Math.max(0, Math.round(toNumber(setRow?.reps, 0))),
    weight: Math.max(0, Math.round(toNumber(setRow?.weight ?? setRow?.weightKg, 0) * 10) / 10),
  }));
}

function normalizeExercises(exercises = []) {
  return exercises.map((exercise, index) => ({
    id: exercise?.id || `exercise_${index + 1}`,
    exerciseCatalogId: exercise?.exerciseCatalogId || exercise?.exerciseId || null,
    name: exercise?.name || `Exercise ${index + 1}`,
    muscleGroup: exercise?.primaryGroup || exercise?.muscleGroup || 'Muscle',
    equipment: exercise?.equipment || 'Equipment',
    image: exercise?.image || null,
    plannedSets: normalizeSetRows(
      exercise?.planned_sets || exercise?.plannedSets || exercise?.planned || exercise?.sets,
      exercise,
    ),
    actualSets: Array.isArray(exercise?.actual_sets || exercise?.actualSets) && (exercise?.actual_sets || exercise?.actualSets).length
      ? normalizeSetRows(exercise?.actual_sets || exercise?.actualSets, exercise)
      : null,
    estimatedDurationMin:
      Number(exercise?.estimatedDurationMin)
      || estimateExerciseDurationMin({
        name: exercise?.name,
        sets: exercise?.planned_sets || exercise?.plannedSets || exercise?.planned || exercise?.sets,
      }),
  }));
}

function sumSets(exercises = [], actualByExerciseId = {}) {
  return exercises.reduce((sum, exercise) => {
    const actual = actualByExerciseId[exercise.id];
    if (actual && actual.length) return sum + actual.length;
    if (exercise.actualSets && exercise.actualSets.length) return sum + exercise.actualSets.length;
    return sum;
  }, 0);
}

function sumVolume(sets = []) {
  return sets.reduce((sum, setRow) => sum + toNumber(setRow.reps) * toNumber(setRow.weight), 0);
}

function sumExerciseVolume(exercises = [], actualByExerciseId = {}) {
  return Math.round(
    exercises.reduce((sum, exercise) => {
      const actual = actualByExerciseId[exercise.id];
      if (actual && actual.length) return sum + sumVolume(actual);
      if (exercise.actualSets && exercise.actualSets.length) return sum + sumVolume(exercise.actualSets);
      return sum;
    }, 0),
  );
}

function SetsRow({ setRow }) {
  const repsWarn = toNumber(setRow.reps) === 0;

  return (
    <View style={styles.setRow}>
      <View style={styles.setIndexPill}>
        <Text style={styles.setIndexText}>Set {setRow.set}</Text>
      </View>
      <View style={[styles.setValueChip, repsWarn ? styles.setWarnChip : null]}>
        <Text style={[styles.setValueText, repsWarn ? styles.setWarnText : null]}>{setRow.reps} reps</Text>
      </View>
      <View style={styles.setValueChip}>
        <Text style={styles.setValueText}>{setRow.weight} kg</Text>
      </View>
    </View>
  );
}

function ExerciseAccordionCard({
  exercise,
  expanded,
  onToggle,
  mode,
  dayIsFuture,
  onLogPress,
  onOpenExercise,
}) {
  const hasActual = Array.isArray(exercise.actualSets) && exercise.actualSets.length > 0;

  return (
    <View style={styles.exerciseCardWrap}>
      <Pressable onPress={onToggle} style={({ pressed }) => [styles.exerciseCard, pressed && styles.exerciseCardPressed]}>
        <View style={styles.exerciseThumbWrap}>
          <View style={styles.exerciseThumbFrame}>
            <Ionicons name="barbell-outline" size={20} color={COLORS.muted} />
          </View>
        </View>

        <View style={styles.exerciseMain}>
          <Text style={styles.exerciseTitle}>{exercise.name}</Text>
          <Text style={styles.exerciseMeta}>
            {exercise.muscleGroup} • {exercise.equipment}
            {exercise.estimatedDurationMin ? ` • est ${exercise.estimatedDurationMin} min` : ''}
          </Text>

          {mode === 'actual' && !hasActual ? (
            <Text style={styles.notLoggedText}>Not logged</Text>
          ) : null}
        </View>

        <View style={styles.exerciseRight}>
          {onOpenExercise ? (
            <TouchableOpacity
              style={styles.openDetailButton}
              activeOpacity={0.9}
              onPress={(event) => {
                event?.stopPropagation?.();
                onOpenExercise(exercise);
              }}
            >
              <Ionicons name="open-outline" size={13} color={COLORS.accent2} />
              <Text style={styles.openDetailText}>Details</Text>
            </TouchableOpacity>
          ) : null}
          {mode === 'planned' && hasActual ? (
            <View style={styles.loggedPill}>
              <Text style={styles.loggedPillText}>Logged</Text>
            </View>
          ) : null}
          <View style={styles.viewSetsPill}>
            <Text style={styles.viewSetsText}>View sets</Text>
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={12} color={COLORS.muted} />
          </View>
        </View>
      </Pressable>

      {expanded ? (
        <View style={styles.exerciseExpandPanel}>
          {mode === 'planned' ? (
            <>
              {exercise.plannedSets.map((setRow) => (
                <SetsRow key={`planned_${exercise.id}_${setRow.set}`} setRow={setRow} />
              ))}
              <TouchableOpacity
                style={[styles.logButton, dayIsFuture ? styles.logButtonDisabled : null]}
                activeOpacity={dayIsFuture ? 1 : 0.9}
                disabled={dayIsFuture}
                onPress={() => onLogPress(exercise)}
              >
                <Text style={[styles.logButtonText, dayIsFuture ? styles.logButtonDisabledText : null]}>
                  {dayIsFuture ? 'Scheduled' : 'Log this exercise'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {hasActual ? (
                <>
                  {exercise.actualSets.map((setRow) => (
                    <SetsRow key={`actual_${exercise.id}_${setRow.set}`} setRow={setRow} />
                  ))}
                  {!dayIsFuture ? (
                    <TouchableOpacity style={styles.logButtonSecondary} activeOpacity={0.9} onPress={() => onLogPress(exercise)}>
                      <Text style={styles.logButtonSecondaryText}>Edit logged sets</Text>
                    </TouchableOpacity>
                  ) : null}
                </>
              ) : (
                <View style={styles.actualEmptyWrap}>
                  <Text style={styles.actualEmptyText}>Not logged</Text>
                  {!dayIsFuture ? (
                    <TouchableOpacity style={styles.logButtonSecondary} activeOpacity={0.9} onPress={() => onLogPress(exercise)}>
                      <Text style={styles.logButtonSecondaryText}>Log now</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.futureLabelPill}>
                      <Text style={styles.futureLabelText}>Scheduled</Text>
                    </View>
                  )}
                </View>
              )}
            </>
          )}
        </View>
      ) : null}
    </View>
  );
}

function LogSetsModal({ visible, exercise, dayIsFuture, onClose, onSave }) {
  const initialRows = useMemo(() => {
    if (!exercise) return [];
    return (exercise.actualSets && exercise.actualSets.length ? exercise.actualSets : exercise.plannedSets).map((setRow, index) => ({
      set: index + 1,
      reps: toNumber(setRow.reps, 0),
      weight: toNumber(setRow.weight, 0),
    }));
  }, [exercise]);

  const [rows, setRows] = useState(initialRows);

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  const updateRow = (setNumber, patch) => {
    setRows((prev) => prev.map((row) => (row.set === setNumber ? { ...row, ...patch } : row)));
  };

  const addSet = () => {
    setRows((prev) => [
      ...prev,
      {
        set: prev.length + 1,
        reps: prev.length ? prev[prev.length - 1].reps : 8,
        weight: prev.length ? prev[prev.length - 1].weight : 20,
      },
    ]);
  };

  const removeSet = (setNumber) => {
    setRows((prev) => prev.filter((row) => row.set !== setNumber).map((row, index) => ({ ...row, set: index + 1 })));
  };

  const save = () => {
    const payload = rows.map((row, index) => ({
      set: index + 1,
      reps: Math.max(0, Math.round(toNumber(row.reps, 0))),
      weight: Math.max(0, Math.round(toNumber(row.weight, 0) * 10) / 10),
    }));
    onSave(payload);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{exercise?.name || 'Log sets'}</Text>
          <Text style={styles.modalSubtitle}>Logging actual sets</Text>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {rows.map((row) => (
              <View key={`modal_set_${row.set}`} style={styles.modalSetRow}>
                <Text style={styles.modalSetLabel}>Set {row.set}</Text>

                <TextInput
                  value={String(row.reps)}
                  onChangeText={(text) => updateRow(row.set, { reps: text.replace(/[^0-9]/g, '') })}
                  keyboardType="number-pad"
                  style={styles.modalInput}
                  placeholder="Reps"
                  placeholderTextColor={COLORS.muted}
                  editable={!dayIsFuture}
                />

                <TextInput
                  value={String(row.weight)}
                  onChangeText={(text) => updateRow(row.set, { weight: text.replace(/[^0-9.]/g, '') })}
                  keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
                  style={styles.modalInput}
                  placeholder="Weight"
                  placeholderTextColor={COLORS.muted}
                  editable={!dayIsFuture}
                />

                {!dayIsFuture ? (
                  <TouchableOpacity style={styles.removeSetButton} activeOpacity={0.9} onPress={() => removeSet(row.set)}>
                    <Ionicons name="trash-outline" size={14} color="#FF9D9D" />
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}

            {!dayIsFuture ? (
              <TouchableOpacity style={styles.addSetButton} activeOpacity={0.9} onPress={addSet}>
                <Text style={styles.addSetText}>+ Add set</Text>
              </TouchableOpacity>
            ) : null}
          </ScrollView>

          <View style={styles.modalActionsRow}>
            <TouchableOpacity style={styles.modalActionSecondary} activeOpacity={0.9} onPress={onClose}>
              <Text style={styles.modalActionSecondaryText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalActionPrimary, dayIsFuture ? styles.modalActionDisabled : null]}
              activeOpacity={dayIsFuture ? 1 : 0.9}
              disabled={dayIsFuture}
              onPress={save}
            >
              <Text style={[styles.modalActionPrimaryText, dayIsFuture ? styles.modalActionDisabledText : null]}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function GymLogDetailScreen({
  route,
  navigation,
  sessionRecordingSessionId = '',
  onSessionStatusChange,
  onLoggedCountChange,
  onActualSetsSave,
  onRequestDuplicate,
  onRequestDelete,
}) {
  const { user } = useAuth();
  const recordingRef = useRef(null);
  const playbackRef = useRef(null);

  const passedLog = route.params?.log || null;
  const logId = route.params?.logId;
  const sourceLog = passedLog || findLogById(logId);

  const initialExercises = useMemo(() => normalizeExercises(sourceLog?.exercises || []), [sourceLog?.exercises]);

  const dayDate = toDateOnly(sourceLog?.dateISO || new Date());
  const today = toDateOnly(new Date());
  const isFutureDay = dayDate.getTime() > today.getTime();
  const isPastDay = dayDate.getTime() < today.getTime();
  const isRestDay = /rest/i.test(String(sourceLog?.dayType || sourceLog?.workoutType || ''));

  const [activeTab, setActiveTab] = useState('planned');
  const [whyExpanded, setWhyExpanded] = useState(false);
  const [expandedMap, setExpandedMap] = useState({});
  const [actualByExerciseId, setActualByExerciseId] = useState(() => {
    const map = {};
    initialExercises.forEach((exercise) => {
      if (exercise.actualSets && exercise.actualSets.length) {
        map[exercise.id] = exercise.actualSets;
      }
    });
    return map;
  });
  const [sessionStatus, setSessionStatus] = useState(
    (() => {
      const normalized = String(sourceLog?.status || '').toLowerCase();
      if (['completed', 'skipped', 'rest', 'planned'].includes(normalized)) return normalized;
      return 'planned';
    })(),
  );
  const [editingExerciseId, setEditingExerciseId] = useState(null);
  const [actualRecordingExpanded, setActualRecordingExpanded] = useState(true);
  const [actualExercisesExpanded, setActualExercisesExpanded] = useState(true);
  const [appUserId, setAppUserId] = useState('');
  const [sessionClips, setSessionClips] = useState([]);
  const [segmentsByClipId, setSegmentsByClipId] = useState({});
  const [segmentsLoadingByClipId, setSegmentsLoadingByClipId] = useState({});
  const [expandedClipId, setExpandedClipId] = useState('');
  const [expandedCombinedTranscriptClipId, setExpandedCombinedTranscriptClipId] = useState('');
  const [expandedSegmentTranscriptId, setExpandedSegmentTranscriptId] = useState('');
  const [transcribingSegmentId, setTranscribingSegmentId] = useState('');
  const [buildingCombinedClipId, setBuildingCombinedClipId] = useState('');

  const [recorderState, setRecorderState] = useState('idle');
  const [recorderStatusText, setRecorderStatusText] = useState('Ready');
  const [recorderError, setRecorderError] = useState('');
  const [transcribeStatus, setTranscribeStatus] = useState('');
  const [transcribeError, setTranscribeError] = useState('');
  const [activeClipId, setActiveClipId] = useState('');
  const [pendingSegmentStartedAt, setPendingSegmentStartedAt] = useState('');
  const [segmentIndexCounter, setSegmentIndexCounter] = useState(1);
  const [failedSegments, setFailedSegments] = useState([]);
  const [activePlayClipId, setActivePlayClipId] = useState('');
  const [activePlaySegmentId, setActivePlaySegmentId] = useState('');

  const exercises = useMemo(
    () => initialExercises.map((exercise) => ({ ...exercise, actualSets: actualByExerciseId[exercise.id] || exercise.actualSets || null })),
    [initialExercises, actualByExerciseId],
  );

  const editingExercise = useMemo(() => exercises.find((exercise) => exercise.id === editingExerciseId) || null, [exercises, editingExerciseId]);

  const loggedCount = useMemo(
    () => exercises.filter((exercise) => Array.isArray(exercise.actualSets) && exercise.actualSets.length > 0).length,
    [exercises],
  );

  const allUnlogged = loggedCount === 0;

  const plannedSetCount = useMemo(
    () => exercises.reduce((sum, exercise) => sum + (exercise.plannedSets?.length || 0), 0),
    [exercises],
  );

  const plannedVolume = useMemo(
    () => Math.round(exercises.reduce((sum, exercise) => sum + sumVolume(exercise.plannedSets || []), 0)),
    [exercises],
  );

  const actualSetCount = useMemo(() => sumSets(exercises, actualByExerciseId), [exercises, actualByExerciseId]);
  const actualVolume = useMemo(() => sumExerciseVolume(exercises, actualByExerciseId), [exercises, actualByExerciseId]);

  useEffect(() => {
    if (!onSessionStatusChange) return;
    onSessionStatusChange(sessionStatus);
  }, [onSessionStatusChange, sessionStatus]);

  useEffect(() => {
    if (!onLoggedCountChange) return;
    onLoggedCountChange(loggedCount);
  }, [loggedCount, onLoggedCountChange]);

  const ensureAppUserId = useCallback(async () => {
    if (appUserId) return appUserId;
    const next = await getOrCreateCurrentAppUserId(user);
    setAppUserId(next);
    return next;
  }, [appUserId, user]);

  const refreshSessionClips = useCallback(async () => {
    if (!sessionRecordingSessionId) return [];
    const userId = await ensureAppUserId();
    const rows = await listAudioClips({ userId, gymSessionId: sessionRecordingSessionId });
    setSessionClips(rows);
    return rows;
  }, [ensureAppUserId, sessionRecordingSessionId]);

  const loadSegmentsForClip = useCallback(
    async (clipId, { force = false } = {}) => {
      if (!clipId) return [];
      if (!force && segmentsByClipId[clipId]) return segmentsByClipId[clipId];

      setSegmentsLoadingByClipId((prev) => ({ ...prev, [clipId]: true }));
      try {
        const userId = await ensureAppUserId();
        const rows = await listAudioClipSegments({ userId, clipId });
        setSegmentsByClipId((prev) => ({ ...prev, [clipId]: rows }));
        return rows;
      } finally {
        setSegmentsLoadingByClipId((prev) => ({ ...prev, [clipId]: false }));
      }
    },
    [ensureAppUserId, segmentsByClipId],
  );

  useEffect(() => {
    let active = true;

    const boot = async () => {
      if (!sessionRecordingSessionId) return;
      try {
        await refreshSessionClips();
      } catch (error) {
        if (!active) return;
        setRecorderError(error?.message || 'Unable to load session recordings.');
      }
    };

    boot();
    return () => {
      active = false;
    };
  }, [refreshSessionClips, sessionRecordingSessionId]);

  useEffect(() => () => {
    const recording = recordingRef.current;
    const playback = playbackRef.current;
    if (recording) recording.stopAndUnloadAsync().catch(() => {});
    if (playback) playback.unloadAsync().catch(() => {});
  }, []);

  const stopPlayback = useCallback(async () => {
    const activePlayback = playbackRef.current;
    playbackRef.current = null;
    setActivePlayClipId('');
    setActivePlaySegmentId('');
    if (activePlayback) {
      try {
        await activePlayback.stopAsync();
      } catch {}
      try {
        await activePlayback.unloadAsync();
      } catch {}
    }
  }, []);

  const playUriOnce = useCallback(
    async ({ uri, clipId = '', segmentId = '' }) => {
      await stopPlayback();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
      setRecorderState('playing');
      setRecorderStatusText('Playing...');
      setActivePlayClipId(clipId);
      setActivePlaySegmentId(segmentId);

      await new Promise(async (resolve, reject) => {
        try {
          const { sound } = await Audio.Sound.createAsync(
            { uri },
            { shouldPlay: true },
            (status) => {
              if (status?.didJustFinish) resolve();
            },
          );
          playbackRef.current = sound;
        } catch (error) {
          reject(error);
        }
      });

      await stopPlayback();
      setRecorderState('ready');
      setRecorderStatusText('Playback finished');
    },
    [stopPlayback],
  );

  const playSegment = useCallback(
    async (segment, clipId) => {
      try {
        setRecorderError('');
        const signedUrl = await playableSignedUrlForSegment({ storagePath: segment.storage_path, expiresIn: 3600 });
        await playUriOnce({ uri: signedUrl, clipId, segmentId: segment.id });
      } catch (error) {
        setRecorderState('ready');
        setRecorderStatusText('Playback failed');
        setRecorderError(error?.message || 'Unable to play segment.');
      }
    },
    [playUriOnce],
  );

  const playAllSegments = useCallback(
    async (clipId) => {
      try {
        setRecorderError('');
        const segments = await loadSegmentsForClip(clipId, { force: true });
        if (!segments.length) {
          setRecorderError('No recording parts available.');
          return;
        }

        for (const segment of segments) {
          const signedUrl = await playableSignedUrlForSegment({ storagePath: segment.storage_path, expiresIn: 3600 });
          await playUriOnce({ uri: signedUrl, clipId, segmentId: segment.id });
        }
      } catch (error) {
        setRecorderState('ready');
        setRecorderStatusText('Playback failed');
        setRecorderError(error?.message || 'Unable to play full recording.');
      }
    },
    [loadSegmentsForClip, playUriOnce],
  );

  const startSegmentRecording = useCallback(async () => {
    const permissions = await Audio.requestPermissionsAsync();
    if (!permissions.granted) throw new Error('Microphone permission denied.');
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });

    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    await recording.startAsync();
    recordingRef.current = recording;
  }, []);

  const closeActiveSegmentAndUpload = useCallback(
    async () => {
      const recording = recordingRef.current;
      if (!recording || !activeClipId || !pendingSegmentStartedAt) return;
      const userId = await ensureAppUserId();

      await recording.stopAndUnloadAsync();
      recordingRef.current = null;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });

      const status = await recording.getStatusAsync();
      let durationMs = Number(status?.durationMillis) || 0;
      const uri = recording.getURI();
      if (!uri) throw new Error('Recording URI was not available.');

      const resp = await fetch(uri);
      const buffer = await resp.arrayBuffer();
      const sizeBytes = buffer.byteLength || 0;
      if (durationMs <= 0) durationMs = await probeDurationFromUri(uri);

      const isClearlyTooShort = durationMs > 0 ? durationMs < MIN_DURATION_MS : sizeBytes < MIN_CLIP_SIZE_BYTES;
      if (isClearlyTooShort) {
        setPendingSegmentStartedAt('');
        throw new Error('Recording segment is too short.');
      }

      const segmentPayload = {
        userId,
        clipId: activeClipId,
        segmentIndex: segmentIndexCounter,
        uri,
        mimeType: 'audio/m4a',
        durationMs,
        sizeBytes,
        startedAt: pendingSegmentStartedAt,
        endedAt: new Date().toISOString(),
        filename: `segment_${segmentIndexCounter}.m4a`,
      };

      try {
        setRecorderState('uploading');
        setRecorderStatusText(`Uploading part ${segmentIndexCounter}...`);
        await uploadAudioClipSegment(segmentPayload);
        setSegmentIndexCounter((prev) => prev + 1);
        setFailedSegments((prev) => prev.filter((row) => row.segmentIndex !== segmentPayload.segmentIndex));
        if (expandedClipId === activeClipId) await loadSegmentsForClip(activeClipId, { force: true });
      } catch (error) {
        setFailedSegments((prev) => {
          const next = prev.filter((row) => row.segmentIndex !== segmentPayload.segmentIndex);
          next.push({ ...segmentPayload, error: error?.message || 'Upload failed' });
          return next;
        });
        throw error;
      } finally {
        setPendingSegmentStartedAt('');
      }
    },
    [activeClipId, ensureAppUserId, expandedClipId, loadSegmentsForClip, pendingSegmentStartedAt, segmentIndexCounter],
  );

  const onPressRecordSession = useCallback(async () => {
    if (!sessionRecordingSessionId) return;
    if (['playing', 'uploading', 'stopping', 'finalizing'].includes(recorderState)) return;

    try {
      await stopPlayback();
      setRecorderError('');
      setTranscribeError('');
      const userId = await ensureAppUserId();

      let clipId = activeClipId;
      if (!clipId) {
        const startedAt = new Date().toISOString();
        const created = await createAudioClip({
          userId,
          startedAt,
          fileName: `session_${sessionRecordingSessionId.slice(0, 8)}_${Date.now()}`,
          gymSessionId: sessionRecordingSessionId,
        });
        clipId = created.id;
        setActiveClipId(clipId);
        setSegmentIndexCounter(1);
        setFailedSegments([]);
        await refreshSessionClips();
      }

      const segmentStart = new Date().toISOString();
      setPendingSegmentStartedAt(segmentStart);
      await startSegmentRecording();
      setRecorderState('recording');
      setRecorderStatusText('Recording...');

      if (!expandedClipId) setExpandedClipId(clipId);
    } catch (error) {
      setRecorderState('ready');
      setRecorderStatusText('Record failed');
      setRecorderError(error?.message || 'Unable to start recording.');
    }
  }, [
    activeClipId,
    ensureAppUserId,
    expandedClipId,
    recorderState,
    refreshSessionClips,
    sessionRecordingSessionId,
    startSegmentRecording,
    stopPlayback,
  ]);

  const onPressPauseSession = useCallback(async () => {
    if (recorderState !== 'recording') return;
    try {
      setRecorderError('');
      await closeActiveSegmentAndUpload();
      setRecorderState('paused');
      setRecorderStatusText('Paused');
    } catch (error) {
      setRecorderState('paused');
      setRecorderStatusText('Paused with upload issue');
      setRecorderError(error?.message || 'Unable to upload paused segment.');
    }
  }, [closeActiveSegmentAndUpload, recorderState]);

  const onPressResumeSession = useCallback(async () => {
    if (recorderState !== 'paused') return;
    if (['playing', 'uploading', 'stopping', 'finalizing'].includes(recorderState)) return;
    try {
      setRecorderError('');
      const segmentStart = new Date().toISOString();
      setPendingSegmentStartedAt(segmentStart);
      await startSegmentRecording();
      setRecorderState('recording');
      setRecorderStatusText('Recording...');
    } catch (error) {
      setRecorderState('paused');
      setRecorderStatusText('Resume failed');
      setRecorderError(error?.message || 'Unable to resume recording.');
    }
  }, [recorderState, startSegmentRecording]);

  const onPressCompleteSessionRecording = useCallback(async () => {
    if (!activeClipId || ['uploading', 'stopping', 'finalizing', 'playing'].includes(recorderState)) return;

    try {
      setRecorderError('');
      setRecorderState('stopping');
      setRecorderStatusText('Completing session...');

      if (recorderState === 'recording') {
        await closeActiveSegmentAndUpload();
      }

      if (failedSegments.length > 0) {
        setRecorderState('paused');
        setRecorderStatusText('Pending segment uploads');
        setRecorderError('Some parts failed to upload. Retry pending uploads, then complete again.');
        return;
      }

      setRecorderState('finalizing');
      setRecorderStatusText('Finalizing session recording...');
      const userId = await ensureAppUserId();
      await finalizeAudioClip({ userId, clipId: activeClipId });
      await refreshSessionClips();
      if (expandedClipId === activeClipId) await loadSegmentsForClip(activeClipId, { force: true });

      setRecorderState('ready');
      setRecorderStatusText('Session recording saved');
      setActiveClipId('');
      setPendingSegmentStartedAt('');
      setSegmentIndexCounter(1);
      setFailedSegments([]);
      setSessionStatus('completed');
    } catch (error) {
      setRecorderState('paused');
      setRecorderStatusText('Complete failed');
      setRecorderError(error?.message || 'Unable to complete session recording.');
    }
  }, [
    activeClipId,
    closeActiveSegmentAndUpload,
    ensureAppUserId,
    expandedClipId,
    failedSegments.length,
    loadSegmentsForClip,
    recorderState,
    refreshSessionClips,
  ]);

  const retryPendingSegmentUploads = useCallback(async () => {
    if (!failedSegments.length || !appUserId) return;
    try {
      setRecorderError('');
      setRecorderStatusText('Retrying pending uploads...');
      const nextFailed = [];
      for (const item of failedSegments) {
        try {
          await uploadAudioClipSegment(item);
          setSegmentIndexCounter((prev) => Math.max(prev, Number(item.segmentIndex) + 1));
        } catch (error) {
          nextFailed.push({ ...item, error: error?.message || 'Upload failed' });
        }
      }
      setFailedSegments(nextFailed);
      if (expandedClipId) await loadSegmentsForClip(expandedClipId, { force: true });
      if (nextFailed.length === 0) {
        setRecorderStatusText('Pending uploads cleared. You can complete session now.');
      } else {
        setRecorderStatusText('Some uploads still pending.');
      }
    } catch (error) {
      setRecorderError(error?.message || 'Retry failed.');
    }
  }, [appUserId, expandedClipId, failedSegments, loadSegmentsForClip]);

  const toggleClipExpand = useCallback(
    async (clip) => {
      const clipId = clip?.id;
      if (!clipId) return;
      if (expandedClipId === clipId) {
        setExpandedClipId('');
        return;
      }
      setExpandedClipId(clipId);
      setExpandedCombinedTranscriptClipId('');
      setExpandedSegmentTranscriptId('');
      setTranscribeError('');
      setTranscribeStatus('');
      if ((Number(clip.parts_count) || 0) > 0) await loadSegmentsForClip(clipId);
    },
    [expandedClipId, loadSegmentsForClip],
  );

  const onPressCombinedTranscript = useCallback(
    async (clip) => {
      if (!clip?.id) return;
      if (expandedCombinedTranscriptClipId === clip.id && clip.transcript_text) {
        setExpandedCombinedTranscriptClipId('');
        return;
      }

      try {
        setTranscribeError('');
        setBuildingCombinedClipId(clip.id);
        setTranscribeStatus(`Preparing transcript for ${clip.file_name}...`);
        const userId = await ensureAppUserId();

        let segments = await loadSegmentsForClip(clip.id, { force: true });
        const missing = segments.filter((segment) => !String(segment?.transcript_text || '').trim());
        for (const segment of missing) {
          setTranscribingSegmentId(segment.id);
          setTranscribeStatus(`Transcribing part ${segment.segment_index}...`);
          await transcribeAudioSegment({ userId, segmentId: segment.id });
        }

        if (missing.length > 0) segments = await loadSegmentsForClip(clip.id, { force: true });
        const combinedText = buildCombinedTranscript(segments);
        await saveAudioClipTranscript({ userId, clipId: clip.id, transcriptText: combinedText });
        await refreshSessionClips();
        await loadSegmentsForClip(clip.id, { force: true });
        setExpandedCombinedTranscriptClipId(clip.id);
        setTranscribeStatus(`Transcript ready for ${clip.file_name}`);
      } catch (error) {
        setTranscribeStatus('Transcript failed');
        setTranscribeError(error?.message || 'Unable to build transcript.');
      } finally {
        setBuildingCombinedClipId('');
        setTranscribingSegmentId('');
      }
    },
    [ensureAppUserId, expandedCombinedTranscriptClipId, loadSegmentsForClip, refreshSessionClips],
  );

  const onPressTranscribeSegment = useCallback(
    async (clipId, segment) => {
      if (!segment?.id || transcribingSegmentId) return;
      if (segment.transcript_text) {
        setExpandedSegmentTranscriptId((prev) => (prev === segment.id ? '' : segment.id));
        return;
      }

      try {
        setTranscribeError('');
        setTranscribingSegmentId(segment.id);
        setTranscribeStatus(`Transcribing part ${segment.segment_index}...`);
        const userId = await ensureAppUserId();
        await transcribeAudioSegment({ userId, segmentId: segment.id });
        await loadSegmentsForClip(clipId, { force: true });
        setExpandedSegmentTranscriptId(segment.id);
        setTranscribeStatus(`Transcript ready for part ${segment.segment_index}`);
      } catch (error) {
        setTranscribeStatus('Transcription failed');
        setTranscribeError(error?.message || 'Unable to transcribe segment.');
      } finally {
        setTranscribingSegmentId('');
      }
    },
    [ensureAppUserId, loadSegmentsForClip, transcribingSegmentId],
  );

  const onPressDeleteClip = useCallback(
    async (clip) => {
      Alert.alert('Delete recording?', `Delete "${clip.file_name}" and all parts?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const userId = await ensureAppUserId();
              await deleteAudioClip({ userId, clipId: clip.id });
              if (expandedClipId === clip.id) {
                setExpandedClipId('');
                setExpandedSegmentTranscriptId('');
                setExpandedCombinedTranscriptClipId('');
              }
              setSegmentsByClipId((prev) => {
                const next = { ...prev };
                delete next[clip.id];
                return next;
              });
              await refreshSessionClips();
            } catch (error) {
              setTranscribeError(error?.message || 'Unable to delete recording.');
            }
          },
        },
      ]);
    },
    [ensureAppUserId, expandedClipId, refreshSessionClips],
  );

  if (!sourceLog) {
    return (
      <View style={styles.safeArea}>
        <View style={styles.notFoundCard}>
          <Text style={styles.notFoundTitle}>Log not found</Text>
          <TouchableOpacity style={styles.backButton} activeOpacity={0.9} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const decisionTrace = sourceLog?.decisionTrace || {
    phase: 'Base building',
    lastSignal: 'Last session showed late-set fatigue',
    adjustment: 'Kept sets stable and adjusted target load slightly',
    note: 'Focus on clean reps and consistent rest timing.',
  };

  const openLogModal = (exercise) => {
    if (!exercise || isFutureDay || isRestDay) return;
    setEditingExerciseId(exercise.id);
  };

  const openExerciseDetail = (exercise) => {
    if (!exercise) return;
    const itemId = exercise.exerciseCatalogId;
    if (!itemId) return;
    navigation.navigate('ExerciseDetail', {
      itemId,
      exerciseName: exercise.name,
      item: {
        id: itemId,
        name: exercise.name,
        primary_muscle_group: exercise.muscleGroup,
        equipment: exercise.equipment,
      },
      fromCatalog: true,
      isAdded: false,
    });
  };

  const saveActualSets = (setRows) => {
    if (!editingExerciseId) return;

    if (onActualSetsSave) {
      Promise.resolve(onActualSetsSave({ exerciseId: editingExerciseId, sets: setRows })).catch(() => {});
    }

    setActualByExerciseId((prev) => ({
      ...prev,
      [editingExerciseId]: setRows,
    }));
    setEditingExerciseId(null);
    setActiveTab('actual');
  };

  const canRecord = recorderState === 'idle' || recorderState === 'ready';
  const canPause = recorderState === 'recording';
  const canResume = recorderState === 'paused';
  const canComplete = Boolean(activeClipId) && (recorderState === 'recording' || recorderState === 'paused');

  return (
    <View style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroTitle}>{sourceLog?.dayType || 'Workout Day'}</Text>
              <Text style={styles.heroSubtitle}>{formatDateTitle(sourceLog?.dateISO)}</Text>
            </View>
            <View style={styles.heroActions}>
              {onRequestDuplicate ? (
                <TouchableOpacity style={styles.heroIconButton} activeOpacity={0.9} onPress={onRequestDuplicate}>
                  <Ionicons name="copy-outline" size={15} color={COLORS.accent2} />
                </TouchableOpacity>
              ) : null}
              {onRequestDelete ? (
                <TouchableOpacity style={styles.heroIconButtonDanger} activeOpacity={0.9} onPress={onRequestDelete}>
                  <Ionicons name="trash-outline" size={15} color="#FFB4A8" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.summaryStrip}>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>Duration</Text>
            <Text style={styles.summaryValue}>{sourceLog?.durationMin || 45} min</Text>
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>Planned sets</Text>
            <Text style={styles.summaryValue}>{plannedSetCount}</Text>
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>Planned volume</Text>
            <Text style={styles.summaryValue}>{plannedVolume} kg</Text>
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>Calories</Text>
            <Text style={styles.summaryValue}>{sourceLog?.summary?.estCalories ?? '—'}</Text>
          </View>
        </View>

        <View style={styles.whyCard}>
          <TouchableOpacity style={styles.whyHeader} activeOpacity={0.9} onPress={() => setWhyExpanded((prev) => !prev)}>
            <Text style={styles.whyTitle}>Why this plan?</Text>
            <Ionicons name={whyExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.muted} />
          </TouchableOpacity>

          <Text style={styles.whySummary}>Based on last session + weekly volume target.</Text>

          {whyExpanded ? (
            <View style={styles.whyExpandedArea}>
              <Text style={styles.whyField}><Text style={styles.whyFieldLabel}>Phase:</Text> {decisionTrace.phase || '—'}</Text>
              <Text style={styles.whyField}><Text style={styles.whyFieldLabel}>Input:</Text> {decisionTrace.lastSignal || '—'}</Text>
              <Text style={styles.whyField}><Text style={styles.whyFieldLabel}>Decision:</Text> {decisionTrace.adjustment || '—'}</Text>
              {decisionTrace.note ? (
                <Text style={styles.whyField}><Text style={styles.whyFieldLabel}>Note:</Text> {decisionTrace.note}</Text>
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'planned' ? styles.tabButtonActive : null]}
            activeOpacity={0.9}
            onPress={() => setActiveTab('planned')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'planned' ? styles.tabButtonTextActive : null]}>Planned</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'actual' ? styles.tabButtonActive : null]}
            activeOpacity={0.9}
            onPress={() => setActiveTab('actual')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'actual' ? styles.tabButtonTextActive : null]}>Actual</Text>
          </TouchableOpacity>
        </View>

        {isRestDay ? (
          <View style={styles.restCard}>
            <Text style={styles.restTitle}>Rest day</Text>
            <Text style={styles.restSub}>Recovery and mobility focus. No exercise logging required.</Text>
          </View>
        ) : null}

        {activeTab === 'actual' && !isRestDay && isPastDay && allUnlogged ? (
          <View style={styles.actualEmptyCard}>
            <Text style={styles.actualEmptyTitle}>No workout logged</Text>
            <Text style={styles.actualEmptySub}>This day is in the past and no actual sets were recorded.</Text>
          </View>
        ) : null}

        {activeTab === 'actual' && !isRestDay && sessionRecordingSessionId ? (
          <View style={styles.actualWidgetWrap}>
            <View style={styles.actualWidgetCard}>
              <TouchableOpacity style={styles.actualWidgetHeader} activeOpacity={0.9} onPress={() => setActualRecordingExpanded((prev) => !prev)}>
                <Text style={styles.actualWidgetTitle}>Session Recording</Text>
                <Ionicons name={actualRecordingExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.muted} />
              </TouchableOpacity>

              {actualRecordingExpanded ? (
                <View style={styles.actualWidgetBody}>
                  <Text style={styles.statusText}>Status: {recorderStatusText}</Text>
                  {recorderError ? <Text style={styles.errorText}>{recorderError}</Text> : null}
                  {transcribeStatus ? <Text style={styles.statusText}>{transcribeStatus}</Text> : null}
                  {transcribeError ? <Text style={styles.errorText}>{transcribeError}</Text> : null}
                  {failedSegments.length > 0 ? <Text style={styles.errorText}>{failedSegments.length} pending upload(s)</Text> : null}

                  <View style={styles.controlsRow}>
                    <TouchableOpacity
                      style={[styles.controlButton, !canRecord && styles.controlButtonDisabled]}
                      onPress={onPressRecordSession}
                      disabled={!canRecord}
                      activeOpacity={0.9}
                    >
                      <Ionicons name="mic" size={14} color={COLORS.bg} />
                      <Text style={styles.controlText}>Record</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.controlButtonAlt, !canPause && styles.controlButtonDisabled]}
                      onPress={onPressPauseSession}
                      disabled={!canPause}
                      activeOpacity={0.9}
                    >
                      <Ionicons name="pause" size={14} color={COLORS.text} />
                      <Text style={styles.controlTextAlt}>Pause</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.controlButtonAlt, !canResume && styles.controlButtonDisabled]}
                      onPress={onPressResumeSession}
                      disabled={!canResume}
                      activeOpacity={0.9}
                    >
                      <Ionicons name="play" size={14} color={COLORS.text} />
                      <Text style={styles.controlTextAlt}>Resume</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.completeSessionButton, !canComplete && styles.controlButtonDisabled]}
                      onPress={onPressCompleteSessionRecording}
                      disabled={!canComplete}
                      activeOpacity={0.9}
                    >
                      {['stopping', 'uploading', 'finalizing'].includes(recorderState) ? (
                        <ActivityIndicator color={COLORS.bg} size="small" />
                      ) : (
                        <Ionicons name="checkmark-done-outline" size={14} color={COLORS.bg} />
                      )}
                      <Text style={styles.completeSessionText}>Complete session</Text>
                    </TouchableOpacity>
                  </View>

                  {failedSegments.length > 0 ? (
                    <TouchableOpacity style={styles.retryButton} activeOpacity={0.9} onPress={retryPendingSegmentUploads}>
                      <Ionicons name="refresh" size={13} color={COLORS.text} />
                      <Text style={styles.retryButtonText}>Retry pending uploads</Text>
                    </TouchableOpacity>
                  ) : null}

                  <View style={styles.savedRecordingsWrap}>
                    <Text style={styles.savedRecordingsTitle}>Saved session recordings ({sessionClips.length})</Text>
                    {sessionClips.length === 0 ? (
                      <Text style={styles.metaText}>No session recordings yet.</Text>
                    ) : null}

                    {sessionClips.map((clip) => {
                      const expanded = expandedClipId === clip.id;
                      const segments = segmentsByClipId[clip.id] || [];
                      const segmentsLoading = Boolean(segmentsLoadingByClipId[clip.id]);
                      const combinedExpanded = expandedCombinedTranscriptClipId === clip.id;
                      const combinedReady = Boolean(String(clip.transcript_text || '').trim());
                      return (
                        <View key={clip.id} style={styles.clipRow}>
                          <View style={styles.clipHeaderRow}>
                            <View style={styles.clipMetaWrap}>
                              <Text style={styles.clipName} numberOfLines={1}>{clip.file_name}</Text>
                              <Text style={styles.metaText}>
                                {formatDuration(clip.total_duration_ms || clip.duration_ms)} • {Number(clip.parts_count) || 0} parts
                              </Text>
                              {clip.started_at && clip.ended_at ? <Text style={styles.metaText}>{formatRange(clip.started_at, clip.ended_at)}</Text> : null}
                            </View>
                            <View style={styles.clipActionsWrap}>
                              <TouchableOpacity style={styles.iconButton} activeOpacity={0.9} onPress={() => playAllSegments(clip.id)}>
                                <Ionicons
                                  name={activePlayClipId === clip.id ? 'radio' : 'play-forward'}
                                  size={15}
                                  color={activePlayClipId === clip.id ? COLORS.accent2 : COLORS.text}
                                />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.iconButton}
                                activeOpacity={0.9}
                                onPress={() => onPressCombinedTranscript(clip)}
                                disabled={Boolean(buildingCombinedClipId && buildingCombinedClipId !== clip.id)}
                              >
                                {buildingCombinedClipId === clip.id ? (
                                  <ActivityIndicator color={COLORS.text} size="small" />
                                ) : combinedReady ? (
                                  <Ionicons
                                    name={combinedExpanded ? 'document-text' : 'document-text-outline'}
                                    size={15}
                                    color={COLORS.accent2}
                                  />
                                ) : (
                                  <Ionicons name="documents-outline" size={15} color={COLORS.text} />
                                )}
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.iconButton} activeOpacity={0.9} onPress={() => toggleClipExpand(clip)}>
                                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={15} color={COLORS.text} />
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.iconButton} activeOpacity={0.9} onPress={() => onPressDeleteClip(clip)}>
                                <Ionicons name="trash-outline" size={15} color="#ff8787" />
                              </TouchableOpacity>
                            </View>
                          </View>

                          {expanded ? (
                            <View style={styles.clipBody}>
                              {segmentsLoading ? <ActivityIndicator color={COLORS.accent} /> : null}

                              {!segmentsLoading && segments.length === 0 ? (
                                <Text style={styles.metaText}>No parts found for this recording.</Text>
                              ) : null}

                              {!segmentsLoading ? segments.map((segment) => {
                                const transcriptExpanded = expandedSegmentTranscriptId === segment.id;
                                return (
                                  <View key={segment.id} style={styles.segmentRow}>
                                    <View style={styles.segmentHeaderRow}>
                                      <View style={styles.segmentMetaWrap}>
                                        <Text style={styles.segmentTitle}>Part {segment.segment_index}</Text>
                                        <Text style={styles.metaText}>{formatRange(segment.started_at, segment.ended_at)}</Text>
                                        <Text style={styles.metaText}>{formatDuration(segment.duration_ms)}</Text>
                                      </View>
                                      <View style={styles.segmentActionsWrap}>
                                        <TouchableOpacity style={styles.iconButton} activeOpacity={0.9} onPress={() => playSegment(segment, clip.id)}>
                                          <Ionicons
                                            name={activePlaySegmentId === segment.id ? 'radio' : 'play'}
                                            size={15}
                                            color={activePlaySegmentId === segment.id ? COLORS.accent2 : COLORS.text}
                                          />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                          style={styles.iconButton}
                                          activeOpacity={0.9}
                                          onPress={() => onPressTranscribeSegment(clip.id, segment)}
                                          disabled={Boolean(transcribingSegmentId && transcribingSegmentId !== segment.id)}
                                        >
                                          {transcribingSegmentId === segment.id ? (
                                            <ActivityIndicator color={COLORS.text} size="small" />
                                          ) : segment.transcript_text ? (
                                            <Ionicons
                                              name={transcriptExpanded ? 'document-text' : 'document-text-outline'}
                                              size={15}
                                              color={COLORS.accent2}
                                            />
                                          ) : (
                                            <Ionicons name="language-outline" size={15} color={COLORS.text} />
                                          )}
                                        </TouchableOpacity>
                                      </View>
                                    </View>

                                    {transcriptExpanded && segment.transcript_text ? (
                                      <View style={styles.transcriptWrap}>
                                        <Text style={styles.transcriptTitle}>Transcript</Text>
                                        <Text style={styles.transcriptText}>{segment.transcript_text}</Text>
                                      </View>
                                    ) : null}
                                  </View>
                                );
                              }) : null}

                              {combinedExpanded && combinedReady ? (
                                <View style={styles.transcriptWrap}>
                                  <Text style={styles.transcriptTitle}>Combined transcript</Text>
                                  <Text style={styles.transcriptText}>{clip.transcript_text}</Text>
                                </View>
                              ) : null}
                            </View>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                </View>
              ) : null}
            </View>

            <View style={styles.actualWidgetCard}>
              <TouchableOpacity style={styles.actualWidgetHeader} activeOpacity={0.9} onPress={() => setActualExercisesExpanded((prev) => !prev)}>
                <Text style={styles.actualWidgetTitle}>Session Exercises</Text>
                <Ionicons name={actualExercisesExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.muted} />
              </TouchableOpacity>

              {actualExercisesExpanded ? (
                <View style={styles.actualWidgetBody}>
                  {exercises.map((exercise) => {
                    const expanded = Boolean(expandedMap[exercise.id]);
                    return (
                      <ExerciseAccordionCard
                        key={exercise.id}
                        exercise={exercise}
                        expanded={expanded}
                        mode={activeTab}
                        dayIsFuture={isFutureDay}
                        onLogPress={openLogModal}
                        onOpenExercise={openExerciseDetail}
                        onToggle={() => setExpandedMap((prev) => ({ ...prev, [exercise.id]: !prev[exercise.id] }))}
                      />
                    );
                  })}
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {!isRestDay && activeTab !== 'actual'
          ? exercises.map((exercise) => {
              const expanded = Boolean(expandedMap[exercise.id]);
              return (
                <ExerciseAccordionCard
                  key={exercise.id}
                  exercise={exercise}
                  expanded={expanded}
                  mode={activeTab}
                  dayIsFuture={isFutureDay}
                  onLogPress={openLogModal}
                  onOpenExercise={openExerciseDetail}
                  onToggle={() => setExpandedMap((prev) => ({ ...prev, [exercise.id]: !prev[exercise.id] }))}
                />
              );
            })
          : null}

        {!isRestDay && activeTab === 'actual' && !sessionRecordingSessionId
          ? exercises.map((exercise) => {
              const expanded = Boolean(expandedMap[exercise.id]);
              return (
                <ExerciseAccordionCard
                  key={exercise.id}
                  exercise={exercise}
                  expanded={expanded}
                  mode={activeTab}
                  dayIsFuture={isFutureDay}
                  onLogPress={openLogModal}
                  onOpenExercise={openExerciseDetail}
                  onToggle={() => setExpandedMap((prev) => ({ ...prev, [exercise.id]: !prev[exercise.id] }))}
                />
              );
            })
          : null}

        {!isFutureDay && !isRestDay ? (
          <View style={styles.sessionActionsWrap}>
            {loggedCount > 0 ? (
              <TouchableOpacity
                style={styles.sessionActionPrimary}
                activeOpacity={0.9}
                onPress={() => setSessionStatus('completed')}
              >
                <Text style={styles.sessionActionPrimaryText}>Mark session completed</Text>
              </TouchableOpacity>
            ) : null}

            {loggedCount === 0 && isPastDay ? (
              <TouchableOpacity
                style={styles.sessionActionSecondary}
                activeOpacity={0.9}
                onPress={() => setSessionStatus('skipped')}
              >
                <Text style={styles.sessionActionSecondaryText}>Mark as skipped</Text>
              </TouchableOpacity>
            ) : null}

            <Text style={styles.sessionStateText}>Session status: {sessionStatus === 'completed' ? 'Completed' : sessionStatus === 'skipped' ? 'Skipped' : 'Planned'}</Text>
            {activeTab === 'actual' ? (
              <Text style={styles.actualSummaryText}>Actual summary: {actualSetCount} sets • {actualVolume} kg</Text>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <LogSetsModal
        visible={Boolean(editingExerciseId)}
        exercise={editingExercise}
        dayIsFuture={isFutureDay}
        onClose={() => setEditingExerciseId(null)}
        onSave={saveActualSets}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    paddingHorizontal: UI_TOKENS.spacing.md,
    paddingTop: UI_TOKENS.spacing.sm,
    paddingBottom: UI_TOKENS.spacing.xl,
  },
  heroCard: {
    borderRadius: UI_TOKENS.radius.lg,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.md,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: UI_TOKENS.spacing.sm,
  },
  heroTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: UI_TOKENS.spacing.xs,
  },
  heroIconButton: {
    width: UI_TOKENS.control.iconButton,
    height: UI_TOKENS.control.iconButton,
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(90,209,232,0.4)',
    backgroundColor: 'rgba(90,209,232,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIconButtonDanger: {
    width: UI_TOKENS.control.iconButton,
    height: UI_TOKENS.control.iconButton,
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(255,130,130,0.45)',
    backgroundColor: 'rgba(255,130,130,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.title + 6,
    fontWeight: '700',
  },
  heroSubtitle: {
    marginTop: 4,
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.subtitle,
  },
  summaryStrip: {
    marginTop: UI_TOKENS.spacing.sm,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.sm,
    gap: UI_TOKENS.spacing.xs,
  },
  summaryCell: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: UI_TOKENS.spacing.sm,
  },
  summaryLabel: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
  summaryValue: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
  whyCard: {
    marginTop: UI_TOKENS.spacing.sm,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.sm,
  },
  whyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  whyTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.meta + 1,
    fontWeight: '700',
  },
  whySummary: {
    marginTop: UI_TOKENS.spacing.xs,
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
  whyExpandedArea: {
    marginTop: UI_TOKENS.spacing.xs,
    gap: 4,
  },
  whyField: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.meta,
  },
  whyFieldLabel: {
    color: COLORS.muted,
    fontWeight: '700',
  },
  tabsRow: {
    marginTop: UI_TOKENS.spacing.sm,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.card,
    padding: 4,
    flexDirection: 'row',
    gap: 6,
  },
  tabButton: {
    flex: 1,
    minHeight: 36,
    borderRadius: UI_TOKENS.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: 'rgba(245,201,106,0.16)',
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(245,201,106,0.5)',
  },
  tabButtonText: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta + 1,
    fontWeight: '700',
  },
  tabButtonTextActive: {
    color: COLORS.accent,
  },
  restCard: {
    marginTop: UI_TOKENS.spacing.sm,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.sm,
  },
  restTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 1,
    fontWeight: '700',
  },
  restSub: {
    marginTop: 2,
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
  actualEmptyCard: {
    marginTop: UI_TOKENS.spacing.sm,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(255,164,116,0.42)',
    backgroundColor: 'rgba(255,164,116,0.12)',
    padding: UI_TOKENS.spacing.sm,
  },
  actualEmptyTitle: {
    color: '#FFD1AE',
    fontSize: UI_TOKENS.typography.subtitle,
    fontWeight: '700',
  },
  actualEmptySub: {
    marginTop: 2,
    color: '#FFB98F',
    fontSize: UI_TOKENS.typography.meta,
  },
  exerciseCardWrap: {
    marginTop: UI_TOKENS.spacing.xs,
  },
  exerciseCard: {
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: UI_TOKENS.spacing.sm,
  },
  exerciseCardPressed: {
    backgroundColor: COLORS.cardSoft,
  },
  exerciseThumbWrap: {
    width: UI_TOKENS.card.imageSize,
    alignItems: 'center',
  },
  exerciseThumbFrame: {
    width: UI_TOKENS.card.imageSize,
    height: UI_TOKENS.card.imageSize,
    borderRadius: UI_TOKENS.card.imageRadius,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: 'rgba(162,167,179,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseMain: {
    flex: 1,
    minWidth: 0,
  },
  exerciseTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 2,
    fontWeight: '700',
  },
  exerciseMeta: {
    marginTop: 2,
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
  notLoggedText: {
    marginTop: 2,
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '700',
  },
  exerciseRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  openDetailButton: {
    borderRadius: 999,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(90,209,232,0.35)',
    backgroundColor: 'rgba(90,209,232,0.12)',
    paddingHorizontal: UI_TOKENS.spacing.xs + 2,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  openDetailText: {
    color: COLORS.accent2,
    fontSize: 10,
    fontWeight: '700',
  },
  loggedPill: {
    borderRadius: 999,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(113,228,179,0.5)',
    backgroundColor: 'rgba(113,228,179,0.16)',
    paddingHorizontal: UI_TOKENS.spacing.xs + 2,
    paddingVertical: 2,
  },
  loggedPillText: {
    color: '#79E3B9',
    fontSize: 10,
    fontWeight: '700',
  },
  viewSetsPill: {
    borderRadius: 999,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.32)',
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: UI_TOKENS.spacing.xs + 2,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewSetsText: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '700',
  },
  exerciseExpandPanel: {
    marginTop: 4,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: COLORS.cardSoft,
    padding: UI_TOKENS.spacing.sm,
    gap: 6,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  setIndexPill: {
    borderRadius: 999,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.3)',
    backgroundColor: 'rgba(162,167,179,0.12)',
    paddingHorizontal: UI_TOKENS.spacing.xs + 2,
    paddingVertical: 2,
  },
  setIndexText: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '700',
  },
  setValueChip: {
    borderRadius: 999,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.3)',
    backgroundColor: 'rgba(162,167,179,0.12)',
    paddingHorizontal: UI_TOKENS.spacing.xs + 2,
    paddingVertical: 2,
  },
  setValueText: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: '700',
  },
  setWarnChip: {
    borderColor: 'rgba(255,164,116,0.5)',
    backgroundColor: 'rgba(255,164,116,0.16)',
  },
  setWarnText: {
    color: '#FFB98F',
  },
  logButton: {
    marginTop: 4,
    minHeight: 36,
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(245,201,106,0.52)',
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logButtonDisabled: {
    borderColor: 'rgba(162,167,179,0.36)',
    backgroundColor: 'rgba(162,167,179,0.16)',
  },
  logButtonText: {
    color: COLORS.bg,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '800',
  },
  logButtonDisabledText: {
    color: COLORS.muted,
  },
  logButtonSecondary: {
    marginTop: 4,
    minHeight: 34,
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.34)',
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logButtonSecondaryText: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
  actualEmptyWrap: {
    gap: 6,
  },
  actualEmptyText: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
  futureLabelPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.34)',
    backgroundColor: 'rgba(162,167,179,0.14)',
    paddingHorizontal: UI_TOKENS.spacing.xs + 2,
    paddingVertical: 2,
  },
  futureLabelText: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '700',
  },
  sessionActionsWrap: {
    marginTop: UI_TOKENS.spacing.sm,
    gap: UI_TOKENS.spacing.xs,
  },
  sessionActionPrimary: {
    minHeight: 42,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(113,228,179,0.5)',
    backgroundColor: 'rgba(113,228,179,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionActionPrimaryText: {
    color: '#79E3B9',
    fontSize: UI_TOKENS.typography.meta + 1,
    fontWeight: '700',
  },
  sessionActionSecondary: {
    minHeight: 42,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(255,130,130,0.46)',
    backgroundColor: 'rgba(255,130,130,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionActionSecondaryText: {
    color: '#FF9D9D',
    fontSize: UI_TOKENS.typography.meta + 1,
    fontWeight: '700',
  },
  sessionStateText: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
    textAlign: 'center',
  },
  actualSummaryText: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
    textAlign: 'center',
  },
  actualWidgetWrap: {
    marginTop: UI_TOKENS.spacing.sm,
    gap: UI_TOKENS.spacing.sm,
  },
  actualWidgetCard: {
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.card,
    overflow: 'hidden',
  },
  actualWidgetHeader: {
    minHeight: 44,
    paddingHorizontal: UI_TOKENS.spacing.sm,
    paddingVertical: UI_TOKENS.spacing.xs + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: UI_TOKENS.border.hairline,
    borderBottomColor: 'rgba(162,167,179,0.2)',
  },
  actualWidgetTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.meta + 1,
    fontWeight: '700',
  },
  actualWidgetBody: {
    padding: UI_TOKENS.spacing.sm,
  },
  statusText: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
    marginBottom: 4,
  },
  errorText: {
    color: '#ff8787',
    fontSize: UI_TOKENS.typography.meta,
    marginBottom: 4,
  },
  metaText: {
    color: COLORS.muted,
    fontSize: 11,
  },
  controlsRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    minHeight: 34,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 11,
  },
  controlButtonAlt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    minHeight: 34,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.28)',
    backgroundColor: 'rgba(31,36,49,0.75)',
    paddingHorizontal: 11,
  },
  completeSessionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    minHeight: 34,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 11,
  },
  completeSessionText: {
    color: COLORS.bg,
    fontSize: 12,
    fontWeight: '800',
  },
  controlButtonDisabled: {
    opacity: 0.45,
  },
  controlText: {
    color: COLORS.bg,
    fontSize: 12,
    fontWeight: '700',
  },
  controlTextAlt: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  retryButton: {
    marginTop: 8,
    borderRadius: 10,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.28)',
    backgroundColor: 'rgba(31,36,49,0.75)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  savedRecordingsWrap: {
    marginTop: UI_TOKENS.spacing.sm,
    gap: UI_TOKENS.spacing.xs,
  },
  savedRecordingsTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.meta + 1,
    fontWeight: '700',
  },
  clipRow: {
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: 'rgba(31,36,49,0.65)',
    paddingHorizontal: UI_TOKENS.spacing.sm,
    paddingVertical: UI_TOKENS.spacing.sm,
  },
  clipHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  clipMetaWrap: {
    flex: 1,
    minWidth: 0,
  },
  clipName: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.meta + 1,
    fontWeight: '700',
  },
  clipActionsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  clipBody: {
    marginTop: UI_TOKENS.spacing.xs,
    gap: UI_TOKENS.spacing.xs,
  },
  segmentRow: {
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: 'rgba(24,27,36,0.6)',
    paddingHorizontal: UI_TOKENS.spacing.xs + 2,
    paddingVertical: UI_TOKENS.spacing.xs + 2,
  },
  segmentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  segmentMetaWrap: {
    flex: 1,
    minWidth: 0,
  },
  segmentActionsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  segmentTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transcriptWrap: {
    marginTop: UI_TOKENS.spacing.xs,
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: 'rgba(24,27,36,0.6)',
    paddingHorizontal: UI_TOKENS.spacing.xs + 2,
    paddingVertical: UI_TOKENS.spacing.xs + 2,
  },
  transcriptTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
    marginBottom: 4,
  },
  transcriptText: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10,12,16,0.62)',
    padding: UI_TOKENS.spacing.lg,
    justifyContent: 'center',
  },
  modalCard: {
    borderRadius: UI_TOKENS.radius.lg,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.3)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.md,
    maxHeight: 560,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 2,
    fontWeight: '700',
  },
  modalSubtitle: {
    marginTop: 2,
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
  modalScroll: {
    marginTop: UI_TOKENS.spacing.sm,
  },
  modalSetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: UI_TOKENS.spacing.xs,
    marginBottom: UI_TOKENS.spacing.xs,
  },
  modalSetLabel: {
    width: 44,
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
  modalInput: {
    flex: 1,
    minHeight: 36,
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.34)',
    backgroundColor: COLORS.cardSoft,
    color: COLORS.text,
    paddingHorizontal: UI_TOKENS.spacing.sm,
    fontSize: UI_TOKENS.typography.meta,
  },
  removeSetButton: {
    width: 32,
    height: 32,
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(255,130,130,0.4)',
    backgroundColor: 'rgba(255,130,130,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSetButton: {
    marginTop: 2,
    minHeight: 34,
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.34)',
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSetText: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: UI_TOKENS.spacing.xs,
    marginTop: UI_TOKENS.spacing.sm,
  },
  modalActionSecondary: {
    flex: 1,
    minHeight: 40,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.34)',
    backgroundColor: COLORS.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActionSecondaryText: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
  modalActionPrimary: {
    flex: 1,
    minHeight: 40,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(245,201,106,0.5)',
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActionPrimaryText: {
    color: COLORS.bg,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '800',
  },
  modalActionDisabled: {
    borderColor: 'rgba(162,167,179,0.34)',
    backgroundColor: 'rgba(162,167,179,0.16)',
  },
  modalActionDisabledText: {
    color: COLORS.muted,
  },
  notFoundCard: {
    margin: UI_TOKENS.spacing.md,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.md,
    alignItems: 'center',
  },
  notFoundTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 1,
    fontWeight: '700',
  },
  backButton: {
    marginTop: UI_TOKENS.spacing.sm,
    minHeight: 40,
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.32)',
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: UI_TOKENS.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
});

export default GymLogDetailScreen;
