import { createClient } from 'npm:@supabase/supabase-js@2';

type ChatLabRequest = {
  message?: string;
  history?: Array<{ role?: string; content?: string }>;
  debug?: boolean;
};

type ParsedSet = {
  reps: number | null;
  weight_kg: number | null;
};

type ParsedExerciseRequest = {
  raw_name: string;
  resolved_exercise_id: string | null;
  resolved_name: string | null;
  sets: ParsedSet[];
};

type ParsedIssue = {
  type: string;
  message: string;
  raw_name?: string;
  candidate_names?: string[];
};

type ParsedAction = {
  intent: 'create_session';
  confidence: number;
  session: {
    title: string;
    why_note: string | null;
    exercise_requests: ParsedExerciseRequest[];
  };
  issues: ParsedIssue[];
};

type CatalogExercise = {
  id: string;
  name: string;
  name_key: string;
  primary_muscle_group: string | null;
  equipment: string | null;
};

const SUPABASE_URL = Deno.env.get('SB_URL') || Deno.env.get('SUPABASE_URL') || '';
const SERVICE_ROLE_KEY = Deno.env.get('SB_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || Deno.env.get('SB_OPENAI_API_KEY') || '';
const OPENAI_MODEL = Deno.env.get('OPENAI_MODEL') || 'gpt-4.1-mini';
const OPENAI_ENDPOINT = Deno.env.get('OPENAI_ENDPOINT') || 'https://api.openai.com/v1/responses';

const MAX_HISTORY = 8;
const MAX_EXERCISES = 24;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function normalizeText(value: unknown) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value: string) {
  return normalizeText(value).split(' ').filter(Boolean);
}

function jaccard(a: string, b: string) {
  const setA = new Set(tokenize(a));
  const setB = new Set(tokenize(b));
  if (!setA.size || !setB.size) return 0;
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  return union ? intersection / union : 0;
}

function scoreCandidate(rawName: string, candidate: CatalogExercise) {
  const raw = normalizeText(rawName);
  const name = normalizeText(candidate.name);
  const nameKey = normalizeText(candidate.name_key || candidate.name);

  if (!raw) return 0;
  if (raw === name || raw === nameKey) return 1;
  if (name.includes(raw) || raw.includes(name)) return 0.9;
  if (nameKey.includes(raw) || raw.includes(nameKey)) return 0.88;

  return jaccard(raw, nameKey);
}

function clampReps(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(1, Math.min(100, Math.round(parsed)));
}

function clampWeight(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const bounded = Math.max(0, Math.min(500, parsed));
  return Math.round(bounded * 100) / 100;
}

function normalizeSets(inputSets: unknown): ParsedSet[] {
  const source = Array.isArray(inputSets) ? inputSets : [];
  if (!source.length) {
    return [
      { reps: 10, weight_kg: null },
      { reps: 10, weight_kg: null },
      { reps: 10, weight_kg: null },
    ];
  }

  return source.slice(0, 12).map((entry) => ({
    reps: clampReps((entry as { reps?: unknown })?.reps),
    weight_kg: clampWeight((entry as { weight_kg?: unknown })?.weight_kg),
  }));
}

function fallbackActionFromMessage(message: string): ParsedAction {
  const normalized = normalizeText(message);
  const afterWith = normalized.includes(' with ') ? normalized.split(' with ')[1] : normalized;
  const parts = afterWith
    .split(/,| and /g)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 8);

  const requests = parts.map((name) => ({
    raw_name: name,
    resolved_exercise_id: null,
    resolved_name: null,
    sets: [
      { reps: 10, weight_kg: null },
      { reps: 10, weight_kg: null },
      { reps: 10, weight_kg: null },
    ],
  }));

  return {
    intent: 'create_session',
    confidence: 0.35,
    session: {
      title: 'Chat Session',
      why_note: null,
      exercise_requests: requests,
    },
    issues: [],
  };
}

function normalizeHistory(history: ChatLabRequest['history']) {
  if (!Array.isArray(history)) return [];
  return history
    .map((entry) => ({
      role: entry?.role === 'assistant' ? 'assistant' : 'user',
      content: String(entry?.content || '').trim(),
    }))
    .filter((entry) => entry.content.length > 0)
    .slice(-MAX_HISTORY);
}

function toInputTurn(entry: { role: 'user' | 'assistant'; content: string }) {
  const type = entry.role === 'assistant' ? 'output_text' : 'input_text';
  return {
    role: entry.role,
    content: [{ type, text: entry.content }],
  };
}

function buildSystemPrompt(catalogPreview: string) {
  return [
    'You transform free text into STRICT JSON only. No markdown, no prose.',
    'Intent scope is only: create_session.',
    'Return exactly this schema:',
    '{"intent":"create_session","confidence":0.0,"session":{"title":"string","why_note":"string|null","exercise_requests":[{"raw_name":"string","sets":[{"reps":8,"weight_kg":20}]}]},"issues":[]}',
    'Rules:',
    '- include exercise_requests in user order',
    '- do not invent unsupported intents',
    '- if uncertain, keep raw_name and leave details minimal',
    '- reps should be integer or null; weight_kg should be number or null',
    '- keep max 24 exercise_requests',
    `Catalog reference: ${catalogPreview}`,
  ].join('\n');
}

async function callOpenAIForAction(args: {
  message: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  catalog: CatalogExercise[];
}) {
  const catalogPreview = args.catalog
    .slice(0, 120)
    .map((row) => row.name)
    .join(', ');

  const requestPayload = {
    model: OPENAI_MODEL,
    input: [
      {
        role: 'system',
        content: [{ type: 'input_text', text: buildSystemPrompt(catalogPreview) }],
      },
      ...args.history.map(toInputTurn),
      {
        role: 'user',
        content: [{ type: 'input_text', text: args.message }],
      },
    ],
  };

  const response = await fetch(OPENAI_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestPayload),
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`OPENAI_${response.status}: ${raw}`);
  }

  let parsedResponse: Record<string, unknown> | null = null;
  try {
    parsedResponse = raw ? JSON.parse(raw) : null;
  } catch {
    parsedResponse = null;
  }

  const outputText =
    (parsedResponse?.output_text as string | undefined) ||
    (parsedResponse?.output as Array<{ content?: Array<{ type?: string; text?: string }> }> | undefined)?.[0]?.content?.find(
      (item) => item?.type === 'output_text',
    )?.text ||
    raw;

  try {
    return {
      action: JSON.parse(String(outputText || '{}')) as ParsedAction,
      openai_request: requestPayload,
      openai_response: parsedResponse || raw,
    };
  } catch {
    return {
      action: fallbackActionFromMessage(args.message),
      openai_request: requestPayload,
      openai_response: parsedResponse || raw,
    };
  }
}

function resolveExerciseRequests(action: ParsedAction, catalog: CatalogExercise[]) {
  const issues: ParsedIssue[] = Array.isArray(action?.issues) ? [...action.issues] : [];
  const requests = Array.isArray(action?.session?.exercise_requests)
    ? action.session.exercise_requests
    : [];

  const resolvedRequests: ParsedExerciseRequest[] = requests.slice(0, MAX_EXERCISES).map((entry) => {
    const rawName = String(entry?.raw_name || '').trim();
    const sets = normalizeSets((entry as { sets?: unknown })?.sets);

    if (!rawName) {
      issues.push({
        type: 'invalid_exercise',
        message: 'Encountered an empty exercise name in parsed output.',
      });
      return {
        raw_name: rawName,
        resolved_exercise_id: null,
        resolved_name: null,
        sets,
      };
    }

    const scored = catalog
      .map((row) => ({ row, score: scoreCandidate(rawName, row) }))
      .sort((a, b) => b.score - a.score);

    const top = scored[0];
    const second = scored[1];

    if (!top || top.score < 0.45) {
      issues.push({
        type: 'unresolved_exercise',
        message: `Could not resolve exercise: ${rawName}`,
        raw_name: rawName,
        candidate_names: scored.slice(0, 3).map((entry) => entry.row.name),
      });
      return {
        raw_name: rawName,
        resolved_exercise_id: null,
        resolved_name: null,
        sets,
      };
    }

    if (second && top.score - second.score < 0.05 && second.score > 0.55) {
      issues.push({
        type: 'ambiguous_exercise',
        message: `Exercise is ambiguous: ${rawName}. Picked ${top.row.name}.`,
        raw_name: rawName,
        candidate_names: [top.row.name, second.row.name],
      });
    }

    return {
      raw_name: rawName,
      resolved_exercise_id: top.row.id,
      resolved_name: top.row.name,
      sets,
    };
  });

  return {
    issues,
    requests: resolvedRequests,
  };
}

function normalizeAction(action: ParsedAction, catalog: CatalogExercise[]) {
  const base: ParsedAction = {
    intent: 'create_session',
    confidence: Number.isFinite(Number(action?.confidence)) ? Number(action.confidence) : 0.5,
    session: {
      title: String(action?.session?.title || '').trim() || 'Chat Session',
      why_note: action?.session?.why_note ? String(action.session.why_note).trim() : null,
      exercise_requests: [],
    },
    issues: [],
  };

  const { issues, requests } = resolveExerciseRequests(action, catalog);
  base.session.exercise_requests = requests;
  base.issues = issues;

  return base;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json(405, { ok: false, error: 'METHOD_NOT_ALLOWED', human: 'Only POST is supported.' });
  }

  const startedAt = Date.now();

  try {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return json(500, {
        ok: false,
        error: 'MISSING_SUPABASE_SERVER_ENV',
        human: 'Server database bridge is not configured.',
      });
    }

    if (!OPENAI_API_KEY) {
      return json(500, {
        ok: false,
        error: 'MISSING_OPENAI_SERVER_ENV',
        human: 'OpenAI is not configured on the server.',
      });
    }

    const body = (await req.json()) as ChatLabRequest;
    const message = String(body?.message || '').trim();
    const debugMode = Boolean(body?.debug);

    if (!message) {
      return json(400, {
        ok: false,
        error: 'EMPTY_MESSAGE',
        human: 'Please send a message.',
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const catalogResp = await admin
      .from('catalog_exercises')
      .select('id,name,name_key,primary_muscle_group,equipment')
      .order('name', { ascending: true });

    if (catalogResp.error) throw catalogResp.error;

    const catalog = (catalogResp.data || []) as CatalogExercise[];
    if (!catalog.length) {
      return json(200, {
        ok: false,
        error: 'CATALOG_UNAVAILABLE',
        human: 'No exercises found in catalog_exercises.',
        meta: { ms: Date.now() - startedAt, model: OPENAI_MODEL },
      });
    }

    const history = normalizeHistory(body?.history);
    const llm = await callOpenAIForAction({
      message,
      history,
      catalog,
    });

    const normalized = normalizeAction(llm.action, catalog);
    const resolvedCount = normalized.session.exercise_requests.filter((entry) => entry.resolved_exercise_id).length;

    const human =
      resolvedCount > 0
        ? `Parsed create_session. Resolved ${resolvedCount}/${normalized.session.exercise_requests.length} exercises.`
        : 'Parsed create_session, but no exercises could be resolved yet.';

    return json(200, {
      ok: true,
      human,
      action: normalized,
      meta: {
        ms: Date.now() - startedAt,
        model: OPENAI_MODEL,
      },
      ...(debugMode
        ? {
            debug_payload: {
              history_turns: history.length,
              catalog_count: catalog.length,
              openai_request: llm.openai_request,
              openai_response: llm.openai_response,
            },
          }
        : {}),
    });
  } catch (error) {
    console.error('[chat_session_lab_parse] error', error);
    return json(500, {
      ok: false,
      error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
      human: 'Parse service unavailable. Please try again.',
      meta: { ms: Date.now() - startedAt, model: OPENAI_MODEL },
    });
  }
});
