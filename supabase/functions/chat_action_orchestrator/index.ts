import { createClient } from 'npm:@supabase/supabase-js@2';

type ActionType = 'create_session';
type Stage =
  | 'start'
  | 'collect_exercises'
  | 'resolve_entities'
  | 'collect_sets'
  | 'prepare_action_snapshot'
  | 'execute_action';

type ConversationState = 'collect_exercises' | 'resolve_entities' | 'collect_sets' | 'confirm' | 'executing' | 'done' | 'failed';

type CatalogExercise = {
  id: string;
  name: string;
  name_key: string;
  primary_muscle_group: string | null;
  equipment: string | null;
};

type UserInput = {
  text?: string;
  selection?: string;
  choices?: string[];
};

type RequestBody = {
  app_user_id?: string;
  conversation_id?: string | null;
  action_type?: ActionType;
  stage?: Stage;
  user_input?: UserInput;
  client_request_id?: string;
  debug?: boolean;
};

type ResolvedExercise = {
  raw_name: string;
  exercise_id: string | null;
  resolved_name: string | null;
  confidence: number;
  status: 'resolved' | 'ambiguous' | 'unresolved' | 'skipped';
  candidates: Array<{ id: string; name: string; score: number }>;
};

type SetTemplate = {
  exercise_id: string;
  exercise_name: string;
  sets: Array<{ reps: number; weight_kg: number | null; rest_sec: number | null }>;
  source: 'user' | 'default';
  complete: boolean;
};

type DraftCard = {
  action_type: ActionType;
  stage: ConversationState;
  fields: {
    session_title: string | null;
    why_note: string | null;
    exercises_raw: string[];
    exercises_resolved: ResolvedExercise[];
    set_templates: SetTemplate[];
  };
  missing_fields: string[];
  last_question: {
    code: string;
    payload: Record<string, unknown>;
  } | null;
  confirmation: {
    ready: boolean;
    user_confirmed: boolean;
  };
  prepared_snapshot: Record<string, unknown>;
  execution: {
    idempotency_key: string | null;
    status: 'not_started' | 'executing' | 'done' | 'failed';
    last_receipt: Record<string, unknown> | null;
  };
};

type AssistantPayload = {
  message: string;
  question: string | null;
  input_mode: 'text' | 'single_select' | 'confirm' | 'none';
  options: string[];
};

const SUPABASE_URL = Deno.env.get('SB_URL') || Deno.env.get('SUPABASE_URL') || '';
const SERVICE_ROLE_KEY = Deno.env.get('SB_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || Deno.env.get('SB_OPENAI_API_KEY') || '';
const OPENAI_MODEL = Deno.env.get('OPENAI_MODEL') || 'gpt-4.1-mini';
const OPENAI_ENDPOINT = Deno.env.get('OPENAI_ENDPOINT') || 'https://api.openai.com/v1/responses';

const MAX_HISTORY = 8;
const MAX_EXERCISES = 16;

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
  if (name.includes(raw) || raw.includes(name)) return 0.92;
  if (nameKey.includes(raw) || raw.includes(nameKey)) return 0.88;
  return jaccard(raw, nameKey);
}

function clampInt(value: unknown, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function clampWeight(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const bounded = Math.max(0, Math.min(500, parsed));
  return Math.round(bounded * 100) / 100;
}

function draftDefaults(actionType: ActionType): DraftCard {
  return {
    action_type: actionType,
    stage: 'collect_exercises',
    fields: {
      session_title: 'Workout Session',
      why_note: null,
      exercises_raw: [],
      exercises_resolved: [],
      set_templates: [],
    },
    missing_fields: ['resolved_exercises', 'sets_complete', 'confirmation'],
    last_question: {
      code: 'ask_exercise_list',
      payload: {},
    },
    confirmation: {
      ready: false,
      user_confirmed: false,
    },
    prepared_snapshot: {},
    execution: {
      idempotency_key: null,
      status: 'not_started',
      last_receipt: null,
    },
  };
}

function parseExercisesFallback(text: string) {
  const cleaned = text
    .replace(/leg day|pull day|push day|session|workout|create|with|for|include/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const parts = cleaned
    .split(/,| and /gi)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, MAX_EXERCISES);
  return parts;
}

function extractOpenAIOutputText(parsedResponse: any, raw: string) {
  return (
    parsedResponse?.output_text ||
    parsedResponse?.output?.[0]?.content?.find((item: any) => item?.type === 'output_text')?.text ||
    raw
  );
}

function toInputTurn(entry: { role: 'user' | 'assistant'; content: string }) {
  return {
    role: entry.role,
    content: [{ type: entry.role === 'assistant' ? 'output_text' : 'input_text', text: entry.content }],
  };
}

function normalizeHistoryRows(rows: Array<{ role?: string; content?: string }>) {
  return rows
    .map((row) => ({
      role: row?.role === 'assistant' ? 'assistant' : 'user',
      content: String(row?.content || '').trim(),
    }))
    .filter((row) => row.content.length > 0)
    .slice(-MAX_HISTORY);
}

async function parseExerciseListWithLLM(args: {
  text: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  catalog: CatalogExercise[];
}) {
  const catalogPreview = args.catalog.slice(0, 120).map((row) => row.name).join(', ');
  const prompt = [
    'Extract only exercise names from the user input.',
    'Return strict JSON only: {"session_title":"string|null","why_note":"string|null","exercises_raw":["name"]}',
    'No markdown, no prose.',
    `Catalog preview: ${catalogPreview}`,
  ].join('\n');

  const requestPayload = {
    model: OPENAI_MODEL,
    input: [
      {
        role: 'system',
        content: [{ type: 'input_text', text: prompt }],
      },
      ...args.history.map(toInputTurn),
      {
        role: 'user',
        content: [{ type: 'input_text', text: args.text }],
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
  let parsedResponse: any = null;
  try {
    parsedResponse = raw ? JSON.parse(raw) : null;
  } catch {
    parsedResponse = null;
  }

  if (!response.ok) {
    return {
      parsed: {
        session_title: null,
        why_note: null,
        exercises_raw: parseExercisesFallback(args.text),
      },
      request: requestPayload,
      response: parsedResponse || raw,
      usage: parsedResponse?.usage || null,
      low_confidence: true,
    };
  }

  const outputText = extractOpenAIOutputText(parsedResponse, raw);
  try {
    const parsed = JSON.parse(String(outputText || '{}'));
    const exercises = Array.isArray(parsed?.exercises_raw)
      ? parsed.exercises_raw.map((name: unknown) => String(name || '').trim()).filter(Boolean).slice(0, MAX_EXERCISES)
      : [];

    return {
      parsed: {
        session_title: parsed?.session_title ? String(parsed.session_title).trim() : null,
        why_note: parsed?.why_note ? String(parsed.why_note).trim() : null,
        exercises_raw: exercises.length ? exercises : parseExercisesFallback(args.text),
      },
      request: requestPayload,
      response: parsedResponse || raw,
      usage: parsedResponse?.usage || null,
      low_confidence: false,
    };
  } catch {
    return {
      parsed: {
        session_title: null,
        why_note: null,
        exercises_raw: parseExercisesFallback(args.text),
      },
      request: requestPayload,
      response: parsedResponse || raw,
      usage: parsedResponse?.usage || null,
      low_confidence: true,
    };
  }
}

function resolveExercises(rawNames: string[], catalog: CatalogExercise[]): ResolvedExercise[] {
  return rawNames.map((rawName) => {
    const ranked = catalog
      .map((row) => ({ row, score: scoreCandidate(rawName, row) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);

    const top = ranked[0];
    const second = ranked[1];

    if (!top || top.score < 0.45) {
      return {
        raw_name: rawName,
        exercise_id: null,
        resolved_name: null,
        confidence: 0,
        status: 'unresolved',
        candidates: ranked.map((entry) => ({ id: entry.row.id, name: entry.row.name, score: Number(entry.score.toFixed(3)) })),
      };
    }

    if (second && top.score - second.score < 0.06 && second.score > 0.55) {
      return {
        raw_name: rawName,
        exercise_id: top.row.id,
        resolved_name: top.row.name,
        confidence: Number(top.score.toFixed(3)),
        status: 'ambiguous',
        candidates: ranked.map((entry) => ({ id: entry.row.id, name: entry.row.name, score: Number(entry.score.toFixed(3)) })),
      };
    }

    return {
      raw_name: rawName,
      exercise_id: top.row.id,
      resolved_name: top.row.name,
      confidence: Number(top.score.toFixed(3)),
      status: 'resolved',
      candidates: ranked.map((entry) => ({ id: entry.row.id, name: entry.row.name, score: Number(entry.score.toFixed(3)) })),
    };
  });
}

function findMissingSetTemplate(draft: DraftCard) {
  const resolved = draft.fields.exercises_resolved.filter((row) => row.status === 'resolved' && row.exercise_id);
  for (const row of resolved) {
    const template = draft.fields.set_templates.find((entry) => entry.exercise_id === row.exercise_id);
    if (!template || !template.complete) return row;
  }
  return null;
}

function parseGlobalSetTemplate(text: string) {
  const input = String(text || '').toLowerCase();
  const a = input.match(/(\d+)\s*sets?.*?(\d+)\s*reps?.*?(\d+(?:\.\d+)?)\s*kg/);
  const b = input.match(/(\d+)\s*x\s*(\d+)(?:\s*@\s*(\d+(?:\.\d+)?))?/);
  const c = input.match(/(\d+)\s*sets?.*?(\d+)\s*reps?/);

  const selected = a || b || c;
  if (!selected) return null;

  const setsCount = clampInt(selected[1], 1, 12);
  const reps = clampInt(selected[2], 1, 100);
  const weight = selected[3] ? clampWeight(selected[3]) : null;
  if (!setsCount || !reps) return null;

  return Array.from({ length: setsCount }).map(() => ({ reps, weight_kg: weight, rest_sec: null }));
}

function parsePerExerciseTemplates(text: string, resolvedExercises: ResolvedExercise[]) {
  const input = String(text || '').toLowerCase();
  const output: Record<string, Array<{ reps: number; weight_kg: number | null; rest_sec: number | null }>> = {};

  for (const exercise of resolvedExercises) {
    if (!exercise.exercise_id || exercise.status !== 'resolved') continue;
    const name = normalizeText(exercise.resolved_name || exercise.raw_name);
    if (!name) continue;

    const idx = input.indexOf(name);
    if (idx < 0) continue;

    const chunk = input.slice(idx, Math.min(input.length, idx + name.length + 80));
    const parsed = parseGlobalSetTemplate(chunk);
    if (parsed) {
      output[exercise.exercise_id] = parsed;
    }
  }

  return output;
}

function computeMissingFields(draft: DraftCard) {
  const missing: string[] = [];
  const resolved = draft.fields.exercises_resolved.filter((row) => row.status === 'resolved' && row.exercise_id);
  const unresolved = draft.fields.exercises_resolved.some((row) => row.status === 'unresolved' || row.status === 'ambiguous');

  if (!resolved.length || unresolved) missing.push('resolved_exercises');
  if (findMissingSetTemplate(draft)) missing.push('sets_complete');
  if (!draft.confirmation.user_confirmed) missing.push('confirmation');

  return missing;
}

function buildPreparedSnapshot(draft: DraftCard) {
  const resolved = draft.fields.exercises_resolved.filter((row) => row.status === 'resolved' && row.exercise_id);
  const exercises = resolved.map((row, index) => {
    const template = draft.fields.set_templates.find((entry) => entry.exercise_id === row.exercise_id);
    return {
      exercise_id: row.exercise_id,
      resolved_name: row.resolved_name,
      sort_order: index + 1,
      sets: template?.sets || [],
    };
  });

  return {
    title: draft.fields.session_title || 'Workout Session',
    why_note: draft.fields.why_note || null,
    exercise_count: exercises.length,
    set_count: exercises.reduce((sum, row) => sum + row.sets.length, 0),
    exercises,
  };
}

function createAssistant(message: string, question: string | null, inputMode: AssistantPayload['input_mode'], options: string[] = []) {
  return {
    message,
    question,
    input_mode: inputMode,
    options,
  };
}

async function sha256Hex(input: string) {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function parseTokenUsage(usage: any) {
  if (!usage) return null;
  const inputTokens = Number(usage?.input_tokens ?? usage?.prompt_tokens ?? 0);
  const outputTokens = Number(usage?.output_tokens ?? usage?.completion_tokens ?? 0);
  const totalTokens = Number(usage?.total_tokens ?? inputTokens + outputTokens);
  return {
    input_tokens: Number.isFinite(inputTokens) ? inputTokens : 0,
    output_tokens: Number.isFinite(outputTokens) ? outputTokens : 0,
    total_tokens: Number.isFinite(totalTokens) ? totalTokens : 0,
  };
}

function containsYes(value: string) {
  const t = normalizeText(value);
  return ['yes', 'y', 'correct', 'continue', 'ok', 'yes continue'].includes(t) || t.includes('yes');
}

function containsNo(value: string) {
  const t = normalizeText(value);
  return ['no', 'n', 're enter', 're-enter', 'edit'].includes(t) || t.includes('re enter') || t.includes('re-enter');
}

async function insertTurn(args: {
  admin: ReturnType<typeof createClient>;
  conversationId: string;
  userId: string;
  role: 'user' | 'assistant' | 'system';
  kind: string;
  content: string;
  payload?: unknown;
}) {
  const response = await args.admin.from('user_action_turns').insert({
    conversation_id: args.conversationId,
    user_id: args.userId,
    role: args.role,
    kind: args.kind,
    content: args.content,
    payload: args.payload ?? {},
  });
  if (response.error) throw response.error;
}

async function writeSessionFromSnapshot(args: {
  admin: ReturnType<typeof createClient>;
  userId: string;
  snapshot: any;
}) {
  const sessionInsert = await args.admin
    .from('user_gym_sessions')
    .insert({
      user_id: args.userId,
      title: String(args.snapshot?.title || 'Workout Session').trim(),
      status: 'not_started',
      why_note: args.snapshot?.why_note || null,
    })
    .select('id,title')
    .single();

  if (sessionInsert.error) throw sessionInsert.error;

  const sessionId = sessionInsert.data.id;
  const exercises = Array.isArray(args.snapshot?.exercises) ? args.snapshot.exercises : [];

  const insertedExercises: Array<{ id: string; exercise_id: string; sort_order: number; resolved_name?: string }> = [];
  for (const exercise of exercises) {
    const insert = await args.admin
      .from('user_gym_session_exercises')
      .insert({
        user_id: args.userId,
        session_id: sessionId,
        exercise_id: exercise.exercise_id,
        sort_order: exercise.sort_order,
      })
      .select('id,exercise_id,sort_order')
      .single();
    if (insert.error) throw insert.error;
    insertedExercises.push({
      id: insert.data.id,
      exercise_id: insert.data.exercise_id,
      sort_order: insert.data.sort_order,
      resolved_name: exercise.resolved_name,
    });

    const sets = Array.isArray(exercise.sets) ? exercise.sets : [];
    for (let idx = 0; idx < sets.length; idx += 1) {
      const setRow = sets[idx];
      const setInsert = await args.admin.from('user_gym_session_sets').insert({
        user_id: args.userId,
        session_exercise_id: insert.data.id,
        set_index: idx + 1,
        planned_reps: clampInt(setRow?.reps, 1, 100),
        planned_weight_kg: setRow?.weight_kg === null || setRow?.weight_kg === undefined ? null : clampWeight(setRow?.weight_kg),
      });
      if (setInsert.error) throw setInsert.error;
    }
  }

  return {
    session_id: sessionId,
    title: sessionInsert.data.title,
    exercises: insertedExercises.map((row) => ({
      session_exercise_id: row.id,
      exercise_id: row.exercise_id,
      sort_order: row.sort_order,
      resolved_name: row.resolved_name || null,
    })),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
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

    const body = (await req.json()) as RequestBody;
    const appUserId = String(body?.app_user_id || '').trim();
    const actionType = body?.action_type || 'create_session';
    const stage = body?.stage || 'start';
    const debug = Boolean(body?.debug);
    const clientRequestId = String(body?.client_request_id || '').trim();

    if (!appUserId) {
      return json(400, {
        ok: false,
        error: 'APP_USER_ID_REQUIRED',
        human: 'App user id is required.',
      });
    }

    if (actionType !== 'create_session') {
      return json(400, {
        ok: false,
        error: 'ACTION_NOT_SUPPORTED',
        human: 'Only create_session is supported in v1.',
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

    let conversationId = String(body?.conversation_id || '').trim();
    let draft = draftDefaults('create_session');

    if (stage === 'start') {
      const created = await admin
        .from('user_action_conversations')
        .insert({
          user_id: appUserId,
          domain: 'gym',
          intent: 'create_session',
          status: 'needs_clarification',
          draft,
          issues: [],
          last_assistant_message: 'Tell me the exercises to include in this session.',
        })
        .select('id,draft')
        .single();
      if (created.error) throw created.error;
      conversationId = created.data.id;

      await insertTurn({
        admin,
        conversationId,
        userId: appUserId,
        role: 'assistant',
        kind: 'system_prompt',
        content: 'Tell me the exercises to include in this session.',
        payload: { stage: 'collect_exercises' },
      });

      return json(200, {
        ok: true,
        conversation_id: conversationId,
        action_type: 'create_session',
        state: 'collect_exercises',
        assistant: createAssistant(
          'Create workout session selected.',
          'What exercises should I include?',
          'text',
          [],
        ),
        draft_card: draft,
        prepared_snapshot: {},
        receipt: null,
        meta: { ms: Date.now() - startedAt, stage: 'start', token_usage: null },
      });
    }

    if (!conversationId) {
      return json(400, {
        ok: false,
        error: 'CONVERSATION_ID_REQUIRED',
        human: 'conversation_id is required for this stage.',
      });
    }

    const conversationResp = await admin
      .from('user_action_conversations')
      .select('id,user_id,draft,status')
      .eq('id', conversationId)
      .eq('user_id', appUserId)
      .maybeSingle();
    if (conversationResp.error) throw conversationResp.error;
    if (!conversationResp.data) {
      return json(404, {
        ok: false,
        error: 'CONVERSATION_NOT_FOUND',
        human: 'Conversation not found.',
      });
    }

    draft = (conversationResp.data.draft || draftDefaults('create_session')) as DraftCard;

    const userText = String(body?.user_input?.text || '').trim();
    const userSelection = String(body?.user_input?.selection || '').trim();
    const incoming = userSelection || userText;

    if (incoming) {
      await insertTurn({
        admin,
        conversationId,
        userId: appUserId,
        role: 'user',
        kind: 'stage_input',
        content: incoming,
        payload: {
          stage,
          user_input: body?.user_input || {},
          client_request_id: clientRequestId || null,
        },
      });
    }

    let assistant = createAssistant('Working on it.', null, 'none', []);
    let tokenUsage: Record<string, unknown> | null = null;
    let parsedLowConfidence = false;
    let resolverLog: unknown = null;
    let receipt: Record<string, unknown> | null = null;

    if (stage === 'collect_exercises') {
      const historyRows = await admin
        .from('user_action_turns')
        .select('role,content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (historyRows.error) throw historyRows.error;

      const llm = OPENAI_API_KEY
        ? await parseExerciseListWithLLM({
            text: userText,
            history: normalizeHistoryRows((historyRows.data || []) as Array<{ role?: string; content?: string }>),
            catalog,
          })
        : {
            parsed: {
              session_title: null,
              why_note: null,
              exercises_raw: parseExercisesFallback(userText),
            },
            request: null,
            response: null,
            usage: null,
            low_confidence: true,
          };

      tokenUsage = parseTokenUsage(llm.usage);
      parsedLowConfidence = llm.low_confidence;

      draft.stage = 'resolve_entities';
      draft.fields.session_title = llm.parsed.session_title || draft.fields.session_title || 'Workout Session';
      draft.fields.why_note = llm.parsed.why_note || draft.fields.why_note;
      draft.fields.exercises_raw = llm.parsed.exercises_raw;
      draft.fields.exercises_resolved = resolveExercises(draft.fields.exercises_raw, catalog);
      resolverLog = draft.fields.exercises_resolved;
      draft.fields.set_templates = [];
      draft.confirmation.user_confirmed = false;
      draft.confirmation.ready = false;
      draft.prepared_snapshot = {};

      const unresolved = draft.fields.exercises_resolved.find((row) => row.status === 'unresolved' || row.status === 'ambiguous');
      if (unresolved) {
        const options = unresolved.candidates.slice(0, 3).map((row) => row.name);
        if (unresolved.status === 'unresolved') options.push('Re-enter');
        if (unresolved.status === 'ambiguous') options.push('Skip');

        draft.last_question = {
          code: unresolved.status === 'ambiguous' ? 'ask_ambiguous_exercise' : 'ask_unresolved_exercise',
          payload: {
            raw_name: unresolved.raw_name,
            request_index: draft.fields.exercises_resolved.findIndex((row) => row.raw_name === unresolved.raw_name),
            options,
          },
        };

        assistant = createAssistant(
          `I extracted ${draft.fields.exercises_raw.length} exercise(s).`,
          unresolved.status === 'ambiguous'
            ? `I found multiple matches for "${unresolved.raw_name}". Which one did you mean?`
            : `I couldn't resolve "${unresolved.raw_name}". Please choose a suggestion or re-enter.`,
          'single_select',
          options,
        );
      } else {
        const names = draft.fields.exercises_resolved.map((row) => row.resolved_name || row.raw_name).join(', ');
        draft.last_question = {
          code: 'confirm_resolved_list',
          payload: { names },
        };
        assistant = createAssistant(
          `I got: ${names}.`,
          'Are these exercises correct?',
          'single_select',
          ['Yes, continue', 'Re-enter exercises'],
        );
      }
    } else if (stage === 'resolve_entities') {
      const lastQuestion = draft.last_question;
      if (lastQuestion?.code === 'ask_ambiguous_exercise' || lastQuestion?.code === 'ask_unresolved_exercise') {
        const idx = Number(lastQuestion.payload?.request_index ?? -1);
        const target = draft.fields.exercises_resolved[idx];
        if (target) {
          if (normalizeText(incoming) === 'skip') {
            target.status = 'skipped';
            target.exercise_id = null;
            target.resolved_name = null;
          } else
          if (containsNo(incoming) || normalizeText(incoming) === 're enter') {
            draft.stage = 'collect_exercises';
            draft.last_question = { code: 'ask_exercise_list', payload: {} };
            assistant = createAssistant('No problem.', 'Please re-enter exercise names.', 'text', []);
          } else {
            const matchedCandidate = target.candidates.find((row) => normalizeText(row.name) === normalizeText(incoming));
            const freeTyped = catalog
              .map((row) => ({ row, score: scoreCandidate(incoming, row) }))
              .sort((a, b) => b.score - a.score)[0];

            if (matchedCandidate) {
              target.exercise_id = matchedCandidate.id;
              target.resolved_name = matchedCandidate.name;
              target.confidence = matchedCandidate.score;
              target.status = 'resolved';
            } else if (freeTyped && freeTyped.score >= 0.55) {
              target.exercise_id = freeTyped.row.id;
              target.resolved_name = freeTyped.row.name;
              target.confidence = Number(freeTyped.score.toFixed(3));
              target.status = 'resolved';
              target.candidates = [
                { id: freeTyped.row.id, name: freeTyped.row.name, score: Number(freeTyped.score.toFixed(3)) },
              ];
            }
          }
        }
      } else if (lastQuestion?.code === 'confirm_resolved_list') {
        if (containsYes(incoming)) {
          draft.stage = 'collect_sets';
        } else {
          draft.stage = 'collect_exercises';
          draft.last_question = { code: 'ask_exercise_list', payload: {} };
          assistant = createAssistant('Okay.', 'Please re-enter exercise names.', 'text', []);
        }
      }

      if (draft.stage === 'resolve_entities') {
        resolverLog = draft.fields.exercises_resolved;
        const unresolved = draft.fields.exercises_resolved.find((row) => row.status === 'unresolved' || row.status === 'ambiguous');
        if (unresolved) {
          const options = unresolved.candidates.slice(0, 3).map((row) => row.name);
          options.push(unresolved.status === 'ambiguous' ? 'Skip' : 'Re-enter');
          draft.last_question = {
            code: unresolved.status === 'ambiguous' ? 'ask_ambiguous_exercise' : 'ask_unresolved_exercise',
            payload: {
              raw_name: unresolved.raw_name,
              request_index: draft.fields.exercises_resolved.findIndex((row) => row.raw_name === unresolved.raw_name),
              options,
            },
          };
          assistant = createAssistant(
            'Need one more resolution.',
            unresolved.status === 'ambiguous'
              ? `Did you mean one of these for "${unresolved.raw_name}"?`
              : `I still can't resolve "${unresolved.raw_name}".`,
            'single_select',
            options,
          );
        } else {
          const names = draft.fields.exercises_resolved.map((row) => row.resolved_name || row.raw_name).join(', ');
          draft.last_question = {
            code: 'confirm_resolved_list',
            payload: { names },
          };
          assistant = createAssistant(
            `Resolved list: ${names}`,
            'Looks correct?',
            'single_select',
            ['Yes, continue', 'Re-enter exercises'],
          );
        }
      }

      if (draft.stage === 'collect_sets') {
        const first = draft.fields.exercises_resolved.find((row) => row.status === 'resolved' && row.exercise_id);
        draft.last_question = {
          code: 'ask_sets_for_exercise',
          payload: {
            exercise_id: first?.exercise_id || null,
            exercise_name: first?.resolved_name || null,
          },
        };
        assistant = createAssistant(
          'Great, exercises are resolved.',
          'Provide sets/reps/weight (e.g. 3x10@20kg) for all exercises, or I can ask one-by-one.',
          'text',
          [],
        );
      }
    } else if (stage === 'collect_sets') {
      const resolved = draft.fields.exercises_resolved.filter((row) => row.status === 'resolved' && row.exercise_id);

      const perExercise = parsePerExerciseTemplates(incoming, resolved);
      const globalTemplate = parseGlobalSetTemplate(incoming);

      if (Object.keys(perExercise).length) {
        for (const [exerciseId, sets] of Object.entries(perExercise)) {
          const existingIndex = draft.fields.set_templates.findIndex((row) => row.exercise_id === exerciseId);
          const match = resolved.find((row) => row.exercise_id === exerciseId);
          const template: SetTemplate = {
            exercise_id: exerciseId,
            exercise_name: match?.resolved_name || 'Exercise',
            sets,
            source: 'user',
            complete: true,
          };
          if (existingIndex >= 0) draft.fields.set_templates[existingIndex] = template;
          else draft.fields.set_templates.push(template);
        }
      } else if (globalTemplate) {
        for (const row of resolved) {
          const existingIndex = draft.fields.set_templates.findIndex((entry) => entry.exercise_id === row.exercise_id);
          const template: SetTemplate = {
            exercise_id: row.exercise_id!,
            exercise_name: row.resolved_name || row.raw_name,
            sets: globalTemplate,
            source: 'user',
            complete: true,
          };
          if (existingIndex >= 0) draft.fields.set_templates[existingIndex] = template;
          else draft.fields.set_templates.push(template);
        }
      } else if (normalizeText(incoming) === 'use defaults') {
        for (const row of resolved) {
          const existingIndex = draft.fields.set_templates.findIndex((entry) => entry.exercise_id === row.exercise_id);
          const template: SetTemplate = {
            exercise_id: row.exercise_id!,
            exercise_name: row.resolved_name || row.raw_name,
            sets: Array.from({ length: 3 }).map(() => ({ reps: 10, weight_kg: null, rest_sec: null })),
            source: 'default',
            complete: true,
          };
          if (existingIndex >= 0) draft.fields.set_templates[existingIndex] = template;
          else draft.fields.set_templates.push(template);
        }
      }

      const missing = findMissingSetTemplate(draft);
      if (missing) {
        draft.stage = 'collect_sets';
        draft.last_question = {
          code: 'ask_sets_for_exercise',
          payload: {
            exercise_id: missing.exercise_id,
            exercise_name: missing.resolved_name || missing.raw_name,
          },
        };
        assistant = createAssistant(
          'I still need set details.',
          `How many sets/reps/weight for ${missing.resolved_name || missing.raw_name}?`,
          'text',
          [],
        );
      } else {
        draft.stage = 'confirm';
        draft.prepared_snapshot = buildPreparedSnapshot(draft);
        draft.confirmation.ready = true;
        draft.confirmation.user_confirmed = false;
        draft.last_question = {
          code: 'ask_confirm',
          payload: {
            title: draft.prepared_snapshot.title,
            exercise_count: draft.prepared_snapshot.exercise_count,
            set_count: draft.prepared_snapshot.set_count,
          },
        };
        assistant = createAssistant(
          `Prepared session "${draft.prepared_snapshot.title}" with ${draft.prepared_snapshot.exercise_count} exercise(s).`,
          'Create this session?',
          'confirm',
          ['Yes', 'No'],
        );
      }
    } else if (stage === 'prepare_action_snapshot') {
      draft.prepared_snapshot = buildPreparedSnapshot(draft);
      draft.stage = 'confirm';
      draft.confirmation.ready = true;
      draft.confirmation.user_confirmed = false;
      draft.last_question = {
        code: 'ask_confirm',
        payload: {
          title: draft.prepared_snapshot.title,
          exercise_count: draft.prepared_snapshot.exercise_count,
          set_count: draft.prepared_snapshot.set_count,
        },
      };
      assistant = createAssistant(
        `Prepared session "${draft.prepared_snapshot.title}".`,
        'Create this session?',
        'confirm',
        ['Yes', 'No'],
      );
    } else if (stage === 'execute_action') {
      if (!draft.confirmation.ready) {
        return json(409, {
          ok: false,
          error: 'NOT_READY',
          human: 'Session draft is not ready for execution.',
        });
      }

      const confirmationSignal = userSelection || userText || 'yes';
      if (!containsYes(confirmationSignal)) {
        draft.confirmation.user_confirmed = false;
        draft.stage = 'confirm';
        assistant = createAssistant('Execution cancelled.', 'Session was not created.', 'none', []);
      } else {
        draft.confirmation.user_confirmed = true;
        draft.stage = 'executing';
        draft.execution.status = 'executing';

        draft.missing_fields = computeMissingFields(draft);
        if (draft.missing_fields.includes('resolved_exercises') || draft.missing_fields.includes('sets_complete')) {
          draft.stage = 'failed';
          draft.execution.status = 'failed';
          assistant = createAssistant(
            'Cannot execute because required fields are incomplete.',
            'Please resolve exercises and complete sets first.',
            'none',
            [],
          );
        } else {
          const snapshot = draft.prepared_snapshot;
          const snapshotJson = JSON.stringify(snapshot);
          const snapshotHash = await sha256Hex(snapshotJson);
          const baseMaterial = `${appUserId}:${conversationId}:${snapshotHash}:${clientRequestId || 'default'}`;
          const idempotencyKey = await sha256Hex(baseMaterial);

          draft.execution.idempotency_key = idempotencyKey;

          const existingExecution = await admin
            .from('user_action_executions')
            .select('id,status,receipt,error')
            .eq('idempotency_key', idempotencyKey)
            .maybeSingle();
          if (existingExecution.error) throw existingExecution.error;

          if (existingExecution.data?.status === 'done') {
            receipt = (existingExecution.data.receipt || {}) as Record<string, unknown>;
            draft.execution.status = 'done';
            draft.execution.last_receipt = receipt;
            draft.stage = 'done';
            assistant = createAssistant('Session already created for this request.', null, 'none', []);
          } else {
            if (!existingExecution.data) {
              const insertExec = await admin.from('user_action_executions').insert({
                conversation_id: conversationId,
                user_id: appUserId,
                action_type: 'create_session',
                idempotency_key: idempotencyKey,
                snapshot_hash: snapshotHash,
                status: 'executing',
                receipt: {},
              });
              if (insertExec.error) throw insertExec.error;
            }

            try {
              const createdReceipt = await writeSessionFromSnapshot({
                admin,
                userId: appUserId,
                snapshot,
              });
              receipt = {
                action_type: 'create_session',
                conversation_id: conversationId,
                ...createdReceipt,
                partial_issues: [],
              };

              const execUpdate = await admin
                .from('user_action_executions')
                .update({
                  status: 'done',
                  receipt,
                  error: null,
                })
                .eq('idempotency_key', idempotencyKey);
              if (execUpdate.error) throw execUpdate.error;

              draft.execution.status = 'done';
              draft.execution.last_receipt = receipt;
              draft.stage = 'done';
              assistant = createAssistant(`Session created: ${createdReceipt.title}.`, null, 'none', []);
            } catch (error) {
              const errMessage = error instanceof Error ? error.message : 'Execution failed';
              const execUpdate = await admin
                .from('user_action_executions')
                .update({
                  status: 'failed',
                  error: errMessage,
                })
                .eq('idempotency_key', idempotencyKey);
              if (execUpdate.error) throw execUpdate.error;

              draft.execution.status = 'failed';
              draft.stage = 'failed';
              assistant = createAssistant('Execution failed.', errMessage, 'none', []);
            }
          }
        }
      }
    } else {
      return json(400, {
        ok: false,
        error: 'STAGE_NOT_SUPPORTED',
        human: `Unsupported stage: ${stage}`,
      });
    }

    draft.missing_fields = computeMissingFields(draft);

    const statusForConversation =
      draft.stage === 'done'
        ? 'executed'
        : draft.stage === 'failed'
          ? 'failed'
          : draft.stage === 'confirm'
            ? 'ready_to_execute'
            : 'needs_clarification';

    const updateConversation = await admin
      .from('user_action_conversations')
      .update({
        status: statusForConversation,
        draft,
        issues: draft.fields.exercises_resolved
          .filter((row) => row.status !== 'resolved' && row.status !== 'skipped')
          .map((row) => ({
            type: row.status === 'ambiguous' ? 'ambiguous_exercise' : 'unresolved_exercise',
            message: `${row.status}: ${row.raw_name}`,
            raw_name: row.raw_name,
            candidate_names: row.candidates.map((item) => item.name),
          })),
        last_user_message: incoming || null,
        last_assistant_message: assistant.message,
        executed_result: receipt || null,
        executed_at: draft.stage === 'done' ? new Date().toISOString() : null,
      })
      .eq('id', conversationId)
      .eq('user_id', appUserId);
    if (updateConversation.error) throw updateConversation.error;

    await insertTurn({
      admin,
      conversationId,
      userId: appUserId,
      role: 'assistant',
      kind: 'stage_output',
      content: assistant.message,
      payload: {
        stage,
        state: draft.stage,
        assistant,
        missing_fields: draft.missing_fields,
        last_question: draft.last_question,
      },
    });

    const responseBody: Record<string, unknown> = {
      ok: true,
      conversation_id: conversationId,
      action_type: 'create_session',
      state: draft.stage,
      assistant,
      draft_card: draft,
      prepared_snapshot: draft.prepared_snapshot || {},
      receipt,
      meta: {
        ms: Date.now() - startedAt,
        stage,
        token_usage: tokenUsage,
      },
    };

    if (receipt && typeof receipt.session_id === 'string') {
      responseBody.created_session_id = receipt.session_id;
    }

    if (debug) {
      responseBody.debug_payload = {
        parsed_low_confidence: parsedLowConfidence,
        resolver: resolverLog,
        missing_fields: draft.missing_fields,
        last_question: draft.last_question,
      };
    }

    return json(200, responseBody);
  } catch (error) {
    console.error('[chat_action_orchestrator] error', error);
    return json(500, {
      ok: false,
      error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
      human: 'Action engine failed. Please retry.',
      meta: { ms: Date.now() - startedAt, model: OPENAI_MODEL },
    });
  }
});
