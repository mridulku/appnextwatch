import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
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
import COLORS from '../../../theme/colors';

const MIN_DURATION_MS = 500;
const MIN_CLIP_SIZE_BYTES = 1500;

function formatDuration(ms) {
  const total = Math.max(0, Math.round((Number(ms) || 0) / 1000));
  const min = Math.floor(total / 60);
  const sec = total % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

function formatSize(bytes) {
  const value = Number(bytes) || 0;
  if (!value) return '0 KB';
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(iso) {
  if (!iso) return 'Unknown date';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return 'Unknown date';
  return parsed.toLocaleString();
}

function formatRange(startIso, endIso) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 'Unknown range';
  const timeFmt = { hour: 'numeric', minute: '2-digit', second: '2-digit' };
  return `${start.toLocaleTimeString([], timeFmt)} - ${end.toLocaleTimeString([], timeFmt)}`;
}

function buildCombinedTranscript(segments) {
  const rows = (segments || []).map((segment) => {
    const header = `Part ${segment.segment_index} (${formatRange(segment.started_at, segment.ended_at)})`;
    const body = String(segment.transcript_text || '').trim() || '[No transcript]';
    return `${header}\n${body}`;
  });
  return rows.join('\n\n');
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

function TestAudioRecorderScreen() {
  const { user } = useAuth();
  const recordingRef = useRef(null);
  const playbackRef = useRef(null);

  const [appUserId, setAppUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [clips, setClips] = useState([]);
  const [segmentsByClipId, setSegmentsByClipId] = useState({});
  const [segmentsLoadingByClipId, setSegmentsLoadingByClipId] = useState({});

  const [recorderState, setRecorderState] = useState('idle');
  const [recorderStatusText, setRecorderStatusText] = useState('Ready');
  const [recorderError, setRecorderError] = useState('');

  const [transcribeStatus, setTranscribeStatus] = useState('');
  const [transcribeError, setTranscribeError] = useState('');

  const [expandedClipId, setExpandedClipId] = useState('');
  const [expandedCombinedTranscriptClipId, setExpandedCombinedTranscriptClipId] = useState('');
  const [expandedSegmentTranscriptId, setExpandedSegmentTranscriptId] = useState('');
  const [transcribingSegmentId, setTranscribingSegmentId] = useState('');
  const [buildingCombinedClipId, setBuildingCombinedClipId] = useState('');

  const [activeClipId, setActiveClipId] = useState('');
  const [clipStartedAt, setClipStartedAt] = useState('');
  const [pendingSegmentStartedAt, setPendingSegmentStartedAt] = useState('');
  const [segmentIndexCounter, setSegmentIndexCounter] = useState(1);
  const [failedSegments, setFailedSegments] = useState([]);

  const [activePlayClipId, setActivePlayClipId] = useState('');
  const [activePlaySegmentId, setActivePlaySegmentId] = useState('');

  const isRecording = recorderState === 'recording';
  const isPaused = recorderState === 'paused';
  const isUploading = recorderState === 'uploading';
  const isStopping = recorderState === 'stopping';
  const isFinalizing = recorderState === 'finalizing';
  const isPlaying = recorderState === 'playing';

  const ensureAppUserId = useCallback(async () => {
    if (appUserId) return appUserId;
    const next = await getOrCreateCurrentAppUserId(user);
    setAppUserId(next);
    return next;
  }, [appUserId, user]);

  const refreshClips = useCallback(async () => {
    const userId = await ensureAppUserId();
    const rows = await listAudioClips({ userId });
    setClips(rows);
    return rows;
  }, [ensureAppUserId]);

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
      try {
        setLoading(true);
        setRecorderError('');
        setTranscribeError('');
        await refreshClips();
      } catch (nextError) {
        if (!active) return;
        setRecorderError(nextError?.message || 'Unable to load saved clips.');
      } finally {
        if (active) setLoading(false);
      }
    };

    boot();

    return () => {
      active = false;
      const recording = recordingRef.current;
      const playback = playbackRef.current;
      if (recording) recording.stopAndUnloadAsync().catch(() => {});
      if (playback) playback.unloadAsync().catch(() => {});
    };
  }, [refreshClips]);

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
        } catch (e) {
          reject(e);
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
      } catch (nextError) {
        setRecorderState('ready');
        setRecorderStatusText('Playback failed');
        setRecorderError(nextError?.message || 'Unable to play segment.');
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
          setRecorderError('No segments available for this clip.');
          return;
        }

        for (const segment of segments) {
          const signedUrl = await playableSignedUrlForSegment({ storagePath: segment.storage_path, expiresIn: 3600 });
          await playUriOnce({ uri: signedUrl, clipId, segmentId: segment.id });
        }
      } catch (nextError) {
        setRecorderState('ready');
        setRecorderStatusText('Playback failed');
        setRecorderError(nextError?.message || 'Unable to play all segments.');
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

      if (durationMs <= 0) {
        durationMs = await probeDurationFromUri(uri);
      }

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
        if (expandedClipId === activeClipId) {
          await loadSegmentsForClip(activeClipId, { force: true });
        }
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

  const onPressRecord = useCallback(async () => {
    if (isPlaying || isUploading || isStopping || isFinalizing) return;

    try {
      await stopPlayback();
      setRecorderError('');
      setTranscribeError('');

      const userId = await ensureAppUserId();
      let clipId = activeClipId;
      let baseStart = clipStartedAt;

      if (!clipId) {
        const startedAt = new Date().toISOString();
        const created = await createAudioClip({ userId, startedAt, fileName: `recording_${Date.now()}` });
        clipId = created.id;
        baseStart = startedAt;
        setActiveClipId(clipId);
        setClipStartedAt(baseStart);
        setSegmentIndexCounter(1);
        setFailedSegments([]);
      }

      const segmentStart = new Date().toISOString();
      setPendingSegmentStartedAt(segmentStart);
      await startSegmentRecording();
      setRecorderState('recording');
      setRecorderStatusText('Recording...');

      if (!expandedClipId) {
        setExpandedClipId(clipId);
      }
    } catch (nextError) {
      setRecorderState('ready');
      setRecorderStatusText('Record failed');
      setRecorderError(nextError?.message || 'Unable to start recording.');
    }
  }, [
    activeClipId,
    clipStartedAt,
    ensureAppUserId,
    expandedClipId,
    isFinalizing,
    isPlaying,
    isStopping,
    isUploading,
    startSegmentRecording,
    stopPlayback,
  ]);

  const onPressPause = useCallback(async () => {
    if (!isRecording) return;

    try {
      setRecorderError('');
      await closeActiveSegmentAndUpload();
      setRecorderState('paused');
      setRecorderStatusText('Paused');
    } catch (nextError) {
      setRecorderState('paused');
      setRecorderStatusText('Paused with upload issue');
      setRecorderError(nextError?.message || 'Unable to upload paused segment.');
    }
  }, [closeActiveSegmentAndUpload, isRecording]);

  const onPressResume = useCallback(async () => {
    if (!isPaused || isPlaying || isUploading || isStopping || isFinalizing) return;
    try {
      setRecorderError('');
      const segmentStart = new Date().toISOString();
      setPendingSegmentStartedAt(segmentStart);
      await startSegmentRecording();
      setRecorderState('recording');
      setRecorderStatusText('Recording...');
    } catch (nextError) {
      setRecorderState('paused');
      setRecorderStatusText('Resume failed');
      setRecorderError(nextError?.message || 'Unable to resume recording.');
    }
  }, [isFinalizing, isPaused, isPlaying, isStopping, isUploading, startSegmentRecording]);

  const onPressStop = useCallback(async () => {
    if (!activeClipId || isUploading || isStopping || isFinalizing || isPlaying) return;

    try {
      setRecorderError('');
      setRecorderState('stopping');
      setRecorderStatusText('Stopping...');

      if (isRecording) {
        await closeActiveSegmentAndUpload();
      }

      if (failedSegments.length > 0) {
        setRecorderState('paused');
        setRecorderStatusText('Pending segment uploads');
        setRecorderError('Some segments failed to upload. Retry pending uploads, then press Stop again.');
        return;
      }

      setRecorderState('finalizing');
      setRecorderStatusText('Finalizing recording...');
      const userId = await ensureAppUserId();
      await finalizeAudioClip({ userId, clipId: activeClipId });
      await refreshClips();
      if (expandedClipId === activeClipId) {
        await loadSegmentsForClip(activeClipId, { force: true });
      }

      setRecorderState('ready');
      setRecorderStatusText('Saved');
      setActiveClipId('');
      setClipStartedAt('');
      setPendingSegmentStartedAt('');
      setSegmentIndexCounter(1);
      setFailedSegments([]);
    } catch (nextError) {
      setRecorderState('paused');
      setRecorderStatusText('Stop failed');
      setRecorderError(nextError?.message || 'Unable to stop/finalize recording.');
    }
  }, [
    activeClipId,
    closeActiveSegmentAndUpload,
    ensureAppUserId,
    expandedClipId,
    failedSegments.length,
    isFinalizing,
    isPlaying,
    isRecording,
    isStopping,
    isUploading,
    loadSegmentsForClip,
    refreshClips,
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
        } catch (err) {
          nextFailed.push({ ...item, error: err?.message || 'Upload failed' });
        }
      }

      setFailedSegments(nextFailed);
      if (expandedClipId) await loadSegmentsForClip(expandedClipId, { force: true });

      if (nextFailed.length === 0) {
        setRecorderStatusText('Pending uploads cleared. Press Stop to finalize.');
      } else {
        setRecorderStatusText('Some uploads still pending.');
        setRecorderError(`${nextFailed.length} segment(s) still failed.`);
      }
    } catch (nextError) {
      setRecorderError(nextError?.message || 'Retry failed.');
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

      if ((Number(clip.parts_count) || 0) > 0) {
        try {
          await loadSegmentsForClip(clipId);
        } catch (nextError) {
          setTranscribeError(nextError?.message || 'Unable to load clip parts.');
        }
      }
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
        setTranscribeStatus(`Preparing combined transcript for ${clip.file_name}...`);
        const userId = await ensureAppUserId();

        let segments = await loadSegmentsForClip(clip.id, { force: true });
        if (!segments.length) {
          setTranscribeStatus('No parts available for combined transcript');
          return;
        }

        const missing = segments.filter((s) => !String(s?.transcript_text || '').trim());
        for (const segment of missing) {
          setTranscribingSegmentId(segment.id);
          setTranscribeStatus(`Transcribing part ${segment.segment_index} for combined transcript...`);
          await transcribeAudioSegment({ userId, segmentId: segment.id });
        }

        if (missing.length > 0) {
          segments = await loadSegmentsForClip(clip.id, { force: true });
        }

        const combinedText = buildCombinedTranscript(segments);
        await saveAudioClipTranscript({ userId, clipId: clip.id, transcriptText: combinedText });
        await refreshClips();
        await loadSegmentsForClip(clip.id, { force: true });
        setExpandedCombinedTranscriptClipId(clip.id);
        setTranscribeStatus(`Combined transcript ready for ${clip.file_name}`);
      } catch (nextError) {
        setTranscribeStatus('Combined transcript failed');
        setTranscribeError(nextError?.message || 'Unable to build combined transcript.');
      } finally {
        setBuildingCombinedClipId('');
        setTranscribingSegmentId('');
      }
    },
    [ensureAppUserId, expandedCombinedTranscriptClipId, loadSegmentsForClip, refreshClips],
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
      } catch (nextError) {
        setTranscribeStatus('Transcription failed');
        setTranscribeError(nextError?.message || 'Unable to transcribe segment.');
      } finally {
        setTranscribingSegmentId('');
      }
    },
    [ensureAppUserId, loadSegmentsForClip, transcribingSegmentId],
  );

  const onPressDeleteClip = useCallback(
    async (clip) => {
      Alert.alert('Delete recording?', `This removes "${clip.file_name}" and all its parts.`, [
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
              }
              setSegmentsByClipId((prev) => {
                const next = { ...prev };
                delete next[clip.id];
                return next;
              });
              await refreshClips();
            } catch (nextError) {
              setTranscribeError(nextError?.message || 'Unable to delete clip.');
            }
          },
        },
      ]);
    },
    [ensureAppUserId, expandedClipId, refreshClips],
  );

  const canRecord = useMemo(
    () => recorderState === 'idle' || recorderState === 'ready',
    [recorderState],
  );

  const canPause = isRecording;
  const canResume = isPaused;
  const canStop = activeClipId && (isRecording || isPaused);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Audio Recorder</Text>
        <Text style={styles.subtitle}>Segmented recorder with per-part transcript and timeline.</Text>

        <View style={styles.recorderCard}>
          <Text style={styles.cardTitle}>Recorder</Text>
          <Text style={styles.statusText}>Status: {recorderStatusText}</Text>
          {activeClipId ? <Text style={styles.metaText}>Active clip: {activeClipId.slice(0, 8)} • Part #{segmentIndexCounter}</Text> : null}
          {clipStartedAt ? <Text style={styles.metaText}>Started: {formatDate(clipStartedAt)}</Text> : null}
          {failedSegments.length > 0 ? <Text style={styles.errorText}>{failedSegments.length} pending upload(s)</Text> : null}
          {recorderError ? <Text style={styles.errorText}>{recorderError}</Text> : null}

          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={[styles.controlButton, !canRecord && styles.controlButtonDisabled]}
              onPress={onPressRecord}
              disabled={!canRecord}
              activeOpacity={0.9}
            >
              <Ionicons name="mic" size={16} color={COLORS.bg} />
              <Text style={styles.controlText}>Record</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlButtonAlt, !canPause && styles.controlButtonDisabled]}
              onPress={onPressPause}
              disabled={!canPause}
              activeOpacity={0.9}
            >
              <Ionicons name="pause" size={16} color={COLORS.text} />
              <Text style={styles.controlTextAlt}>Pause</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlButtonAlt, !canResume && styles.controlButtonDisabled]}
              onPress={onPressResume}
              disabled={!canResume}
              activeOpacity={0.9}
            >
              <Ionicons name="play" size={16} color={COLORS.text} />
              <Text style={styles.controlTextAlt}>Resume</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlButtonAlt, !canStop && styles.controlButtonDisabled]}
              onPress={onPressStop}
              disabled={!canStop}
              activeOpacity={0.9}
            >
              {(isStopping || isUploading || isFinalizing) ? (
                <ActivityIndicator color={COLORS.text} size="small" />
              ) : (
                <Ionicons name="stop" size={16} color={COLORS.text} />
              )}
              <Text style={styles.controlTextAlt}>Stop</Text>
            </TouchableOpacity>
          </View>

          {failedSegments.length > 0 ? (
            <TouchableOpacity style={styles.retryButton} activeOpacity={0.9} onPress={retryPendingSegmentUploads}>
              <Ionicons name="refresh" size={14} color={COLORS.text} />
              <Text style={styles.retryButtonText}>Retry pending uploads</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView style={styles.listWrap} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          <View style={styles.sectionCard}>
            <Text style={styles.cardTitle}>Saved clips ({clips.length})</Text>
            {transcribeStatus ? <Text style={styles.statusText}>{transcribeStatus}</Text> : null}
            {transcribeError ? <Text style={styles.errorText}>{transcribeError}</Text> : null}
            {loading ? <ActivityIndicator color={COLORS.accent} /> : null}

            {!loading && clips.length === 0 ? (
              <Text style={styles.emptyText}>No clips yet. Record, pause/resume as needed, then stop to finalize.</Text>
            ) : null}

            {!loading
              ? clips.map((clip) => {
                  const expanded = expandedClipId === clip.id;
                  const isLegacy = (Number(clip.parts_count) || 0) === 0;
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
                            {formatDuration(clip.total_duration_ms || clip.duration_ms)} • {Number(clip.parts_count) || 0} parts • {formatDate(clip.created_at)}
                          </Text>
                          {clip.started_at && clip.ended_at ? (
                            <Text style={styles.metaText}>{formatRange(clip.started_at, clip.ended_at)}</Text>
                          ) : null}
                        </View>
                        <View style={styles.clipActionsWrap}>
                          {!isLegacy ? (
                            <TouchableOpacity style={styles.iconButton} activeOpacity={0.9} onPress={() => playAllSegments(clip.id)}>
                              <Ionicons name={activePlayClipId === clip.id ? 'radio' : 'play-forward'} size={15} color={activePlayClipId === clip.id ? COLORS.accent2 : COLORS.text} />
                            </TouchableOpacity>
                          ) : null}
                          {!isLegacy ? (
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
                          ) : null}
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
                          {isLegacy ? (
                            <View style={styles.legacyBox}>
                              <Text style={styles.metaText}>Legacy clip (single-file v1). Part timeline is unavailable.</Text>
                            </View>
                          ) : null}

                          {!isLegacy && segmentsLoading ? <ActivityIndicator color={COLORS.accent} /> : null}

                          {!isLegacy && !segmentsLoading && segments.length === 0 ? (
                            <Text style={styles.metaText}>No parts found for this clip.</Text>
                          ) : null}

                          {!isLegacy && !segmentsLoading
                            ? segments.map((segment) => {
                                const transcriptExpanded = expandedSegmentTranscriptId === segment.id;
                                return (
                                  <View key={segment.id} style={styles.segmentRow}>
                                    <View style={styles.segmentHeaderRow}>
                                      <View style={styles.segmentMetaWrap}>
                                        <Text style={styles.segmentTitle}>Part {segment.segment_index}</Text>
                                        <Text style={styles.metaText}>{formatRange(segment.started_at, segment.ended_at)}</Text>
                                        <Text style={styles.metaText}>{formatDuration(segment.duration_ms)} • {formatSize(segment.size_bytes)}</Text>
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
                              })
                            : null}

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
                })
              : null}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  title: { color: COLORS.text, fontSize: 30, fontWeight: '700' },
  subtitle: { color: COLORS.muted, fontSize: 13, marginTop: 4, marginBottom: 10 },
  recorderCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  cardTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700', marginBottom: 6 },
  statusText: { color: COLORS.muted, fontSize: 12, marginBottom: 4 },
  errorText: { color: '#ff8787', fontSize: 12, marginBottom: 4 },
  metaText: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  controlsRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  controlButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: 10, minHeight: 38, backgroundColor: COLORS.accent, paddingHorizontal: 12,
  },
  controlButtonAlt: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: 10, minHeight: 38, borderWidth: 1, borderColor: 'rgba(162,167,179,0.28)',
    backgroundColor: 'rgba(31,36,49,0.75)', paddingHorizontal: 12,
  },
  controlButtonDisabled: { opacity: 0.45 },
  controlText: { color: COLORS.bg, fontSize: 13, fontWeight: '700' },
  controlTextAlt: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  retryButton: {
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.28)',
    backgroundColor: 'rgba(31,36,49,0.75)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  retryButtonText: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
  listWrap: { flex: 1, marginTop: 10 },
  listContent: { paddingBottom: 14, gap: 10 },
  sectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  emptyText: { color: COLORS.muted, fontSize: 12 },
  clipRow: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: 'rgba(31,36,49,0.65)',
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginTop: 8,
  },
  clipHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  clipMetaWrap: { flex: 1 },
  clipName: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  clipActionsWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  clipBody: { marginTop: 8, gap: 8 },
  legacyBox: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: 'rgba(24,27,36,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  segmentRow: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: 'rgba(24,27,36,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  segmentHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  segmentMetaWrap: { flex: 1 },
  segmentActionsWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  segmentTitle: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transcriptWrap: {
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(90,209,232,0.25)',
    backgroundColor: 'rgba(90,209,232,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  transcriptTitle: { color: COLORS.accent2, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  transcriptText: { color: COLORS.text, fontSize: 12, lineHeight: 18 },
});

export default TestAudioRecorderScreen;
