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

const FUNCTION_NAME = 'chat_action_orchestrator';
const FUNCTION_URL = buildFunctionsUrl(FUNCTION_NAME);

function normalizeErrorMessage(status, payload, fallback) {
  if (payload?.error) return payload.error;
  if (payload?.human) return payload.human;
  if (fallback) return fallback;
  return `Request failed (${status})`;
}

async function callOrchestrator(requestBody) {
  if (!FUNCTION_URL) throw new Error('Action engine function URL is not configured');

  const supabase = getSupabaseClient();
  const sessionResp = await supabase?.auth?.getSession?.();
  const accessToken = sessionResp?.data?.session?.access_token;
  const authToken = accessToken || SUPABASE_ANON_KEY;

  let payload = null;
  try {
    const invokeResult = await supabase?.functions?.invoke?.(FUNCTION_NAME, {
      body: requestBody,
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (!invokeResult?.error && invokeResult?.data) payload = invokeResult.data;
  } catch {
    payload = null;
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

    if (!response.ok || !parsed?.ok) {
      throw new Error(normalizeErrorMessage(response.status, parsed));
    }

    payload = parsed;
  }

  if (!payload?.ok) {
    throw new Error(normalizeErrorMessage(500, payload, 'Action engine request failed'));
  }

  return payload;
}

export function isChatActionEngineConfigured() {
  return Boolean(FUNCTION_URL && SUPABASE_URL && SUPABASE_ANON_KEY);
}

export async function startGuidedAction({ appUserId, actionType = 'create_session', debug = false }) {
  if (!appUserId) throw new Error('App user id is required');

  return callOrchestrator({
    app_user_id: appUserId,
    action_type: actionType,
    stage: 'start',
    debug: Boolean(debug),
  });
}

export async function runActionStage({
  appUserId,
  conversationId,
  actionType = 'create_session',
  stage,
  userInput = {},
  clientRequestId = '',
  debug = false,
}) {
  if (!appUserId) throw new Error('App user id is required');
  if (!stage) throw new Error('Stage is required');

  return callOrchestrator({
    app_user_id: appUserId,
    conversation_id: conversationId || null,
    action_type: actionType,
    stage,
    user_input: {
      text: typeof userInput?.text === 'string' ? userInput.text : '',
      selection: typeof userInput?.selection === 'string' ? userInput.selection : '',
      choices: Array.isArray(userInput?.choices) ? userInput.choices : [],
    },
    client_request_id: clientRequestId || '',
    debug: Boolean(debug),
  });
}

// Backward-compatible wrappers used by previous Chat Lab wiring.
export async function startActionConversation({ appUserId, message, history = [], debug = false }) {
  if (!history) {
    // no-op, backward signature compatibility
  }
  const started = await startGuidedAction({ appUserId, actionType: 'create_session', debug });
  return runActionStage({
    appUserId,
    conversationId: started?.conversation_id,
    actionType: 'create_session',
    stage: 'collect_exercises',
    userInput: { text: message },
    clientRequestId: '',
    debug,
  });
}

export async function submitActionClarification({ appUserId, conversationId, answer, debug = false }) {
  return runActionStage({
    appUserId,
    conversationId,
    actionType: 'create_session',
    stage: 'resolve_entities',
    userInput: { text: answer },
    clientRequestId: '',
    debug,
  });
}

export async function executeActionConversation({ appUserId, conversationId, debug = false }) {
  return runActionStage({
    appUserId,
    conversationId,
    actionType: 'create_session',
    stage: 'execute_action',
    userInput: { selection: 'Yes' },
    clientRequestId: `${Date.now()}`,
    debug,
  });
}
