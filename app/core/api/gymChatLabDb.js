import { getSupabaseClient } from '../integrations/supabase';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../env';

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

const FUNCTION_URL = buildFunctionsUrl('chat_session_lab_parse');
const TRANSCRIBE_FUNCTION_URL = buildFunctionsUrl('chat_transcribe');

export function isGymChatLabConfigured() {
  return Boolean(FUNCTION_URL && SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function isGymChatLabVoiceConfigured() {
  return Boolean(TRANSCRIBE_FUNCTION_URL && SUPABASE_URL && SUPABASE_ANON_KEY);
}

export async function parseSessionCommand({ message, history = [], debug = false }) {
  const trimmed = String(message || '').trim();
  if (!trimmed) throw new Error('Message is required');
  if (!FUNCTION_URL) throw new Error('Chat Lab function URL is not configured');

  const requestBody = {
    message: trimmed,
    history: Array.isArray(history) ? history : [],
    debug: Boolean(debug),
  };

  const supabase = getSupabaseClient();
  const sessionResp = await supabase?.auth?.getSession?.();
  const accessToken = sessionResp?.data?.session?.access_token;
  const authToken = accessToken || SUPABASE_ANON_KEY;

  let payload = null;
  let invokeError = null;

  try {
    const invokeResult = await supabase?.functions?.invoke?.('chat_session_lab_parse', {
      body: requestBody,
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (invokeResult?.error) {
      invokeError = invokeResult.error?.message || 'Function invoke failed';
    } else if (invokeResult?.data) {
      payload = invokeResult.data;
    }
  } catch (error) {
    invokeError = error?.message || 'Function invoke failed';
  }

  if (!payload) {
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(requestBody),
    });

    let parsed = null;
    try {
      parsed = await response.json();
    } catch {
      parsed = null;
    }

    if (!response.ok) {
      const errText = parsed?.error || parsed?.human || `Request failed (${response.status})`;
      throw new Error(errText);
    }

    payload = parsed;
  }

  if (!payload?.ok) {
    throw new Error(payload?.error || payload?.human || invokeError || 'Parse request failed');
  }

  return payload;
}

export { FUNCTION_URL as CHAT_SESSION_LAB_FUNCTION_URL };

export async function transcribeGymChatLabAudio({ audioUri, filename = '', mimeType = 'audio/m4a' }) {
  const uri = String(audioUri || '').trim();
  if (!uri) throw new Error('Audio URI is required');
  if (!TRANSCRIBE_FUNCTION_URL) throw new Error('Transcribe function URL is not configured');

  const supabase = getSupabaseClient();
  const sessionResp = await supabase?.auth?.getSession?.();
  const accessToken = sessionResp?.data?.session?.access_token;
  const authToken = accessToken || SUPABASE_ANON_KEY;

  const formData = new FormData();
  formData.append('audio', {
    uri,
    name: filename || `voice_${Date.now()}.m4a`,
    type: mimeType,
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

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
