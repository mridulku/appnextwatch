import AsyncStorage from '@react-native-async-storage/async-storage';

import { getSupabaseClient } from '../integrations/supabase';

export const MODULE_KEYS = {
  FOOD_INVENTORY: 'food_inventory',
  FOOD_RECIPES: 'food_recipes',
  FOOD_UTENSILS: 'food_utensils',
  GYM_MACHINES: 'gym_machines',
  GYM_EXERCISES: 'gym_exercises',
};

const VALID_MODULE_KEYS = new Set(Object.values(MODULE_KEYS));
const MODULE_READY_LOCAL_STORAGE_KEY = 'appnextwatch:module_ready_state_v1';
const MODULE_READY_LOCAL_VERSION = 1;

function getLocalStateKey(userId, moduleKey) {
  return `${userId}:${moduleKey}`;
}

function warnFallback(action, error) {
  const reason = error?.message || String(error);
  console.warn(`[module-ready] ${action} fallback to local storage: ${reason}`);
}

function normalizeLocalPayload(rawPayload) {
  if (!rawPayload || typeof rawPayload !== 'object') {
    return { version: MODULE_READY_LOCAL_VERSION, states: {} };
  }

  const states =
    rawPayload.version === MODULE_READY_LOCAL_VERSION &&
    rawPayload.states &&
    typeof rawPayload.states === 'object'
      ? rawPayload.states
      : {};

  return { version: MODULE_READY_LOCAL_VERSION, states };
}

async function readLocalPayload() {
  try {
    const raw = await AsyncStorage.getItem(MODULE_READY_LOCAL_STORAGE_KEY);
    if (!raw) {
      return { version: MODULE_READY_LOCAL_VERSION, states: {} };
    }
    return normalizeLocalPayload(JSON.parse(raw));
  } catch (_error) {
    return { version: MODULE_READY_LOCAL_VERSION, states: {} };
  }
}

async function writeLocalPayload(payload) {
  try {
    await AsyncStorage.setItem(
      MODULE_READY_LOCAL_STORAGE_KEY,
      JSON.stringify(normalizeLocalPayload(payload)),
    );
  } catch (_error) {
    // noop: local fallback should never crash runtime UX
  }
}

async function getLocalReadyState(userId, moduleKey) {
  const payload = await readLocalPayload();
  return Boolean(payload.states[getLocalStateKey(userId, moduleKey)]);
}

async function setLocalReadyState(userId, moduleKey, isReady) {
  const payload = await readLocalPayload();
  payload.states[getLocalStateKey(userId, moduleKey)] = Boolean(isReady);
  await writeLocalPayload(payload);
  return Boolean(isReady);
}

function assertModuleKey(moduleKey) {
  if (!VALID_MODULE_KEYS.has(moduleKey)) {
    throw new Error(`Unsupported module key: ${moduleKey}`);
  }
}

export async function getModuleReadyState(userId, moduleKey) {
  if (!userId) throw new Error('Missing userId');
  assertModuleKey(moduleKey);

  const client = getSupabaseClient();
  if (!client) {
    warnFallback('read (Supabase unavailable)', new Error('Supabase client not configured'));
    return getLocalReadyState(userId, moduleKey);
  }

  try {
    const response = await client
      .from('user_module_state')
      .select('is_ready')
      .eq('user_id', userId)
      .eq('module_key', moduleKey)
      .maybeSingle();

    if (response.error) throw response.error;

    const ready = Boolean(response.data?.is_ready);
    await setLocalReadyState(userId, moduleKey, ready);
    return ready;
  } catch (error) {
    warnFallback('read', error);
    return getLocalReadyState(userId, moduleKey);
  }
}

export async function setModuleReadyState(userId, moduleKey, isReady) {
  if (!userId) throw new Error('Missing userId');
  assertModuleKey(moduleKey);
  const next = Boolean(isReady);

  const client = getSupabaseClient();
  if (!client) {
    warnFallback('write (Supabase unavailable)', new Error('Supabase client not configured'));
    return setLocalReadyState(userId, moduleKey, next);
  }

  try {
    const response = await client
      .from('user_module_state')
      .upsert(
        {
          user_id: userId,
          module_key: moduleKey,
          is_ready: next,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,module_key' },
      )
      .select('is_ready')
      .single();

    if (response.error) throw response.error;

    const ready = Boolean(response.data?.is_ready);
    await setLocalReadyState(userId, moduleKey, ready);
    return ready;
  } catch (error) {
    warnFallback('write', error);
    return setLocalReadyState(userId, moduleKey, next);
  }
}

export async function toggleModuleReadyState(userId, moduleKey) {
  const current = await getModuleReadyState(userId, moduleKey);
  const next = !current;
  const saved = await setModuleReadyState(userId, moduleKey, next);
  return saved;
}
