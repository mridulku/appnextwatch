import AsyncStorage from '@react-native-async-storage/async-storage';

const GYM_CHAT_STORAGE_KEY = 'appnextwatch:gym_chat_sessions_v1';

function toIsoString(value, fallbackIso) {
  if (typeof value === 'string' && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  return fallbackIso;
}

function normalizeMessage(message, index = 0) {
  const nowIso = new Date().toISOString();
  return {
    id: String(message?.id ?? `gym_chat_message_${Date.now()}_${index}`),
    role: message?.role === 'assistant' ? 'assistant' : 'user',
    text: String(message?.text ?? ''),
    payload: message?.payload ?? undefined,
    createdAt: toIsoString(message?.createdAt, nowIso),
  };
}

function normalizeSessionTitle(value, messages = []) {
  const direct = String(value ?? '').trim();
  if (direct) return direct;
  const firstUser = messages.find((entry) => entry?.role === 'user' && String(entry?.text || '').trim());
  const text = String(firstUser?.text || '').trim();
  if (!text) return 'New chat';
  return text.length > 48 ? `${text.slice(0, 48)}...` : text;
}

function normalizeChatSession(session, index = 0) {
  const nowIso = new Date().toISOString();
  const messages = Array.isArray(session?.messages)
    ? session.messages.map((entry, messageIndex) => normalizeMessage(entry, messageIndex))
    : [];
  const createdAt = toIsoString(session?.createdAt, nowIso);
  const updatedAt = toIsoString(session?.updatedAt, createdAt);
  return {
    id: String(session?.id ?? `gym_chat_session_${Date.now()}_${index}`),
    title: normalizeSessionTitle(session?.title, messages),
    attachTables: session?.attachTables !== false,
    messages,
    createdAt,
    updatedAt,
  };
}

function sortByUpdatedAtDesc(items) {
  return items
    .slice()
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function createGymChatSessionId() {
  return `gym_chat_session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function loadGymChatSessions() {
  try {
    const raw = await AsyncStorage.getItem(GYM_CHAT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const normalized = parsed
      .filter((entry) => entry && typeof entry === 'object')
      .map((entry, index) => normalizeChatSession(entry, index));
    return sortByUpdatedAtDesc(normalized);
  } catch (error) {
    console.warn('Failed to load gym chat sessions.', error?.message ?? error);
    return [];
  }
}

export async function saveGymChatSessions(items) {
  try {
    const normalized = Array.isArray(items)
      ? items.map((entry, index) => normalizeChatSession(entry, index))
      : [];
    await AsyncStorage.setItem(
      GYM_CHAT_STORAGE_KEY,
      JSON.stringify(sortByUpdatedAtDesc(normalized)),
    );
  } catch (error) {
    console.warn('Failed to save gym chat sessions.', error?.message ?? error);
  }
}
