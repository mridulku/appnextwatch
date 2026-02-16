import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_HISTORY_STORAGE_KEY = 'appnextwatch:session_history_v1';

function isValidType(value) {
  return value === 'workout' || value === 'cooking';
}

function isValidStatus(value) {
  return value === 'completed' || value === 'abandoned';
}

function toIsoString(value, fallbackIso) {
  if (typeof value === 'string' && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  return fallbackIso;
}

function normalizeSummary(summary) {
  if (!summary || typeof summary !== 'object') return {};
  return JSON.parse(JSON.stringify(summary));
}

function normalizeSessionRecord(record, index = 0) {
  const nowIso = new Date().toISOString();

  const startedAt = toIsoString(record?.startedAt, nowIso);
  const endedAt = toIsoString(record?.endedAt, startedAt);

  return {
    id: String(record?.id ?? `session_${Date.now()}_${index}`),
    type: isValidType(record?.type) ? record.type : 'workout',
    title: String(record?.title ?? 'Session'),
    startedAt,
    endedAt,
    durationSeconds: Math.max(0, Number(record?.durationSeconds) || 0),
    status: isValidStatus(record?.status) ? record.status : 'completed',
    summary: normalizeSummary(record?.summary),
  };
}

function sortByStartedAtDesc(items) {
  return items
    .slice()
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
}

export function createSessionHistoryId(prefix = 'session') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function loadSessionHistory() {
  try {
    const raw = await AsyncStorage.getItem(SESSION_HISTORY_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const normalized = parsed
      .filter((item) => item && typeof item === 'object')
      .map((item, index) => normalizeSessionRecord(item, index));

    return sortByStartedAtDesc(normalized);
  } catch (error) {
    console.warn('Failed to load session history.', error?.message ?? error);
    return [];
  }
}

export async function saveSessionHistory(items) {
  try {
    const normalized = Array.isArray(items)
      ? items.map((item, index) => normalizeSessionRecord(item, index))
      : [];

    await AsyncStorage.setItem(
      SESSION_HISTORY_STORAGE_KEY,
      JSON.stringify(sortByStartedAtDesc(normalized)),
    );
  } catch (error) {
    console.warn('Failed to save session history.', error?.message ?? error);
  }
}

export async function addSessionToHistory(record) {
  const normalizedRecord = normalizeSessionRecord(record, 0);
  const current = await loadSessionHistory();
  const next = [
    normalizedRecord,
    ...current.filter((item) => item.id !== normalizedRecord.id),
  ];

  await saveSessionHistory(next);
  return normalizedRecord;
}
