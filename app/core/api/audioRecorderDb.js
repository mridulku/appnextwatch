import { getSupabaseClient } from '../integrations/supabase';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../env';
import { getOrCreateAppUser } from './foodInventoryDb';

const AUDIO_BUCKET = 'user-audio';
const TRANSCRIBE_FUNCTION = 'chat_transcribe';

function buildFunctionsUrl(pathname) {
  if (!SUPABASE_URL) return '';
  try {
    const parsed = new URL(SUPABASE_URL);
    const host = parsed.host;
    if (!host.endsWith('.supabase.co')) return '';
    const projectRef = host.replace('.supabase.co', '');
    return `https://${projectRef}.functions.supabase.co/${pathname}`;
  } catch {
    return '';
  }
}

const TRANSCRIBE_FUNCTION_URL = buildFunctionsUrl(TRANSCRIBE_FUNCTION);

function getClientOrThrow() {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client not configured');
  return client;
}

function buildFilePath(userId, extension = 'm4a') {
  const randomPart = Math.random().toString(36).slice(2, 8);
  return `${userId}/${Date.now()}_${randomPart}.${extension}`;
}

function toIntOrNull(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.round(parsed));
}

function inferExtension(mimeType = '') {
  if (mimeType.includes('wav')) return 'wav';
  if (mimeType.includes('aac')) return 'aac';
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'mp3';
  return 'm4a';
}

function sumDurationMs(segments) {
  return (segments || []).reduce((sum, row) => sum + (Number(row?.duration_ms) || 0), 0);
}

export async function getOrCreateCurrentAppUserId(user) {
  const appUser = await getOrCreateAppUser({
    username: user?.username || 'demo user',
    name: user?.name || 'Demo User',
  });
  return appUser.id;
}

export async function createAudioClip({
  userId,
  startedAt = new Date().toISOString(),
  fileName = '',
  gymSessionId = null,
}) {
  const client = getClientOrThrow();
  if (!userId) throw new Error('Missing user id');

  const normalizedName = String(fileName || '').trim() || `recording_${Date.now()}`;
  const insert = await client
    .from('user_audio_clips')
    .insert({
      user_id: userId,
      storage_path: null,
      bucket: AUDIO_BUCKET,
      file_name: normalizedName,
      mime_type: 'audio/m4a',
      started_at: startedAt,
      parts_count: 0,
      total_duration_ms: 0,
      gym_session_id: gymSessionId,
    })
    .select('id,user_id,gym_session_id,file_name,bucket,parts_count,total_duration_ms,started_at,ended_at,created_at,updated_at,storage_path,duration_ms,size_bytes')
    .maybeSingle();

  if (insert.error) throw insert.error;
  if (!insert.data?.id) throw new Error('Unable to create audio clip');
  return insert.data;
}

export async function uploadAudioClipSegment({
  userId,
  clipId,
  segmentIndex,
  uri,
  mimeType = 'audio/m4a',
  durationMs = null,
  sizeBytes = null,
  startedAt,
  endedAt,
  filename = '',
}) {
  const client = getClientOrThrow();
  if (!userId || !clipId) throw new Error('Missing user id or clip id');
  if (!uri) throw new Error('Missing audio segment URI');
  if (!startedAt || !endedAt) throw new Error('Missing segment timing');

  const response = await fetch(uri);
  if (!response.ok) throw new Error('Unable to read recorded segment');
  const arrayBuffer = await response.arrayBuffer();
  const inferredSize = arrayBuffer.byteLength || null;

  const extension = inferExtension(mimeType);
  const storagePath = buildFilePath(userId, extension);
  const fileName = String(filename || '').trim() || `segment_${segmentIndex}.${extension}`;

  const upload = await client.storage.from(AUDIO_BUCKET).upload(storagePath, arrayBuffer, {
    contentType: mimeType,
    upsert: false,
  });
  if (upload.error) throw upload.error;

  const insert = await client
    .from('user_audio_clip_segments')
    .insert({
      clip_id: clipId,
      user_id: userId,
      segment_index: segmentIndex,
      storage_path: storagePath,
      bucket: AUDIO_BUCKET,
      file_name: fileName,
      mime_type: mimeType,
      duration_ms: toIntOrNull(durationMs),
      size_bytes: toIntOrNull(sizeBytes ?? inferredSize),
      started_at: startedAt,
      ended_at: endedAt,
    })
    .select('id,clip_id,user_id,segment_index,storage_path,bucket,file_name,mime_type,duration_ms,size_bytes,started_at,ended_at,transcript_text,transcribed_at,created_at,updated_at')
    .maybeSingle();

  if (insert.error) throw insert.error;
  if (!insert.data?.id) throw new Error('Unable to create audio segment');
  return insert.data;
}

export async function finalizeAudioClip({ userId, clipId }) {
  const client = getClientOrThrow();
  if (!userId || !clipId) throw new Error('Missing user id or clip id');

  const segmentsResp = await client
    .from('user_audio_clip_segments')
    .select('id,duration_ms,started_at,ended_at')
    .eq('user_id', userId)
    .eq('clip_id', clipId)
    .order('segment_index', { ascending: true });

  if (segmentsResp.error) throw segmentsResp.error;

  const segments = segmentsResp.data || [];
  const partsCount = segments.length;
  const totalDurationMs = sumDurationMs(segments);
  const startedAt = partsCount > 0 ? segments[0]?.started_at : null;
  const endedAt = partsCount > 0 ? segments[partsCount - 1]?.ended_at : null;

  const update = await client
    .from('user_audio_clips')
    .update({
      parts_count: partsCount,
      total_duration_ms: totalDurationMs,
      duration_ms: totalDurationMs,
      started_at: startedAt,
      ended_at: endedAt,
    })
    .eq('id', clipId)
    .eq('user_id', userId)
    .select('id,user_id,gym_session_id,file_name,bucket,parts_count,total_duration_ms,started_at,ended_at,created_at,updated_at,storage_path,duration_ms,size_bytes,mime_type,transcript_text,transcribed_at')
    .maybeSingle();

  if (update.error) throw update.error;
  if (!update.data?.id) throw new Error('Unable to finalize audio clip');
  return update.data;
}

export async function listAudioClips({ userId, gymSessionId = undefined }) {
  const client = getClientOrThrow();
  if (!userId) throw new Error('Missing user id');

  let query = client
    .from('user_audio_clips')
    .select('id,user_id,gym_session_id,storage_path,bucket,file_name,mime_type,duration_ms,size_bytes,transcript_text,transcribed_at,parts_count,total_duration_ms,started_at,ended_at,created_at,updated_at')
    .eq('user_id', userId);

  if (gymSessionId === null) {
    query = query.is('gym_session_id', null);
  } else if (gymSessionId) {
    query = query.eq('gym_session_id', gymSessionId);
  }

  const response = await query.order('created_at', { ascending: false });

  if (response.error) throw response.error;
  return response.data || [];
}

export async function listAudioClipSegments({ userId, clipId }) {
  const client = getClientOrThrow();
  if (!userId || !clipId) throw new Error('Missing user id or clip id');

  const response = await client
    .from('user_audio_clip_segments')
    .select('id,clip_id,user_id,segment_index,storage_path,bucket,file_name,mime_type,duration_ms,size_bytes,started_at,ended_at,transcript_text,transcribed_at,created_at,updated_at')
    .eq('user_id', userId)
    .eq('clip_id', clipId)
    .order('segment_index', { ascending: true });

  if (response.error) throw response.error;
  return response.data || [];
}

export async function createClipSignedUrl({ storagePath, expiresIn = 3600 }) {
  const client = getClientOrThrow();
  const path = String(storagePath || '').trim();
  if (!path) throw new Error('Missing storage path');

  const signed = await client.storage.from(AUDIO_BUCKET).createSignedUrl(path, expiresIn);
  if (signed.error) throw signed.error;
  if (!signed.data?.signedUrl) throw new Error('Signed URL was not returned');
  return signed.data.signedUrl;
}

export async function playableSignedUrlForSegment({ storagePath, expiresIn = 3600 }) {
  return createClipSignedUrl({ storagePath, expiresIn });
}

export async function deleteAudioClip({ userId, clipId }) {
  const client = getClientOrThrow();
  if (!userId || !clipId) throw new Error('Missing user id or clip id');

  const clipResp = await client
    .from('user_audio_clips')
    .select('id,storage_path')
    .eq('id', clipId)
    .eq('user_id', userId)
    .maybeSingle();
  if (clipResp.error) throw clipResp.error;
  if (!clipResp.data?.id) throw new Error('Audio clip not found');

  const segmentsResp = await client
    .from('user_audio_clip_segments')
    .select('storage_path')
    .eq('clip_id', clipId)
    .eq('user_id', userId);
  if (segmentsResp.error) throw segmentsResp.error;

  const storagePaths = [
    ...((segmentsResp.data || []).map((row) => row?.storage_path).filter(Boolean)),
    ...(clipResp.data?.storage_path ? [clipResp.data.storage_path] : []),
  ];

  if (storagePaths.length > 0) {
    const removeStorage = await client.storage.from(AUDIO_BUCKET).remove(storagePaths);
    if (removeStorage.error) throw removeStorage.error;
  }

  const removeRow = await client.from('user_audio_clips').delete().eq('id', clipId).eq('user_id', userId);
  if (removeRow.error) throw removeRow.error;
  return true;
}

export async function transcribeAudioClipUri({
  audioUri,
  filename = '',
  mimeType = 'audio/m4a',
  language = '',
  prompt = '',
}) {
  const uri = String(audioUri || '').trim();
  if (!uri) throw new Error('Audio URI is required');
  if (!TRANSCRIBE_FUNCTION_URL) throw new Error('Transcribe function URL is not configured');

  const client = getClientOrThrow();
  const sessionResp = await client?.auth?.getSession?.();
  const accessToken = sessionResp?.data?.session?.access_token;
  const authToken = accessToken || SUPABASE_ANON_KEY;

  const resolvedName = filename || `audio_${Date.now()}.m4a`;
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    const jsonBody = {
      audio_url: uri,
      file_name: resolvedName,
      mime_type: mimeType,
      language: language || undefined,
      prompt: prompt || undefined,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);
    let response;
    try {
      response = await fetch(TRANSCRIBE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(jsonBody),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error || `Transcription failed (${response.status})`);
    }

    const text = String(payload?.text || '').trim();
    if (!text) throw new Error('Transcription returned empty text');
    return { text, payload };
  }

  const formData = new FormData();
  formData.append('audio', {
    uri,
    name: resolvedName,
    type: mimeType,
  });
  if (language) formData.append('language', language);
  if (prompt) formData.append('prompt', prompt);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);
  let response;
  try {
    response = await fetch(TRANSCRIBE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${authToken}`,
      },
      body: formData,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || `Transcription failed (${response.status})`);
  }

  const text = String(payload?.text || '').trim();
  if (!text) throw new Error('Transcription returned empty text');
  return { text, payload };
}

export async function transcribeAudioSegment({ userId, segmentId }) {
  const client = getClientOrThrow();
  if (!userId || !segmentId) throw new Error('Missing user id or segment id');

  const segmentResp = await client
    .from('user_audio_clip_segments')
    .select('id,user_id,file_name,mime_type,storage_path')
    .eq('id', segmentId)
    .eq('user_id', userId)
    .maybeSingle();
  if (segmentResp.error) throw segmentResp.error;
  if (!segmentResp.data?.id) throw new Error('Audio segment not found');

  const signedUrl = await createClipSignedUrl({
    storagePath: segmentResp.data.storage_path,
    expiresIn: 3600,
  });

  const { text, payload } = await transcribeAudioClipUri({
    audioUri: signedUrl,
    filename: segmentResp.data.file_name,
    mimeType: segmentResp.data.mime_type || 'audio/m4a',
  });

  const update = await client
    .from('user_audio_clip_segments')
    .update({
      transcript_text: text,
      transcribed_at: new Date().toISOString(),
    })
    .eq('id', segmentId)
    .eq('user_id', userId)
    .select('id,transcript_text,transcribed_at')
    .maybeSingle();
  if (update.error) throw update.error;
  if (!update.data?.id) throw new Error('Unable to persist segment transcript');

  return { segment: update.data, payload };
}

// Legacy compatibility for old v1 clip-level transcript path.
export async function saveAudioClipTranscript({ userId, clipId, transcriptText }) {
  const client = getClientOrThrow();
  const normalized = String(transcriptText || '').trim();
  if (!userId || !clipId) throw new Error('Missing user id or clip id');
  if (!normalized) throw new Error('Transcript text is required');

  const response = await client
    .from('user_audio_clips')
    .update({
      transcript_text: normalized,
      transcribed_at: new Date().toISOString(),
    })
    .eq('id', clipId)
    .eq('user_id', userId)
    .select('id,transcript_text,transcribed_at')
    .maybeSingle();

  if (response.error) throw response.error;
  if (!response.data?.id) throw new Error('Unable to persist clip transcript');
  return response.data;
}
