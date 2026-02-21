import { createClient } from 'npm:@supabase/supabase-js@2';

type AllowedAction = 'list_tables' | 'get_table_schema' | 'count_rows' | 'sample_rows' | 'search_by_name';

type ChatRequest = {
  message?: string;
  user_id?: string;
  debug?: boolean;
};

type ActionPlan = {
  action: AllowedAction;
  table?: string;
  limit?: number;
  query?: string;
  rawTableToken?: string;
};

type TableSpec = {
  logical: string;
  physical: string;
  aliases: string[];
};

const SUPABASE_URL = Deno.env.get('SB_URL') || Deno.env.get('SUPABASE_URL') || '';
const SERVICE_ROLE_KEY = Deno.env.get('SB_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || Deno.env.get('SB_OPENAI_API_KEY') || '';
const OPENAI_MODEL = Deno.env.get('OPENAI_MODEL') || 'gpt-4.1-mini';
const OPENAI_ENDPOINT = Deno.env.get('OPENAI_ENDPOINT') || 'https://api.openai.com/v1/responses';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const TABLE_SPECS: TableSpec[] = [
  { logical: 'machines', physical: 'catalog_machines', aliases: ['machines', 'machine', 'catalog_machines'] },
  { logical: 'exercises', physical: 'catalog_exercises', aliases: ['exercises', 'exercise', 'catalog_exercises'] },
  {
    logical: 'inventory_items',
    physical: 'catalog_ingredients',
    aliases: ['inventory_items', 'inventory', 'ingredients', 'ingredient', 'catalog_ingredients'],
  },
  { logical: 'recipes', physical: 'catalog_recipes', aliases: ['recipes', 'recipe', 'catalog_recipes'] },
  { logical: 'utensils', physical: 'catalog_utensils', aliases: ['utensils', 'utensil', 'catalog_utensils'] },
  { logical: 'muscles', physical: 'muscles', aliases: ['muscles', 'muscle'] },
  {
    logical: 'muscle_groups',
    physical: 'muscles',
    aliases: ['muscle_groups', 'muscle_group', 'groups', 'group'],
  },
  {
    logical: 'muscle_subgroups',
    physical: 'muscle_subgroups',
    aliases: ['muscle_subgroups', 'muscle_subgroup', 'subgroups', 'subgroup'],
  },
  {
    logical: 'user_setup_state',
    physical: 'user_module_state',
    aliases: ['user_setup_state', 'setup_state', 'user_module_state'],
  },
];

const TABLE_BY_LOGICAL = new Map(TABLE_SPECS.map((spec) => [spec.logical, spec]));

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function clampLimit(input: number | undefined, fallback = 10) {
  const parsed = Number(input);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(50, Math.max(1, Math.floor(parsed)));
}

function detectLogicalTable(message: string): string | null {
  const normalized = ` ${message.toLowerCase()} `;
  for (const spec of TABLE_SPECS) {
    for (const alias of spec.aliases) {
      const pattern = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\\]\\]/g, '\\\\$&')}\\b`, 'i');
      if (pattern.test(normalized)) return spec.logical;
    }
  }
  return null;
}

function detectRawTableToken(message: string): string | undefined {
  const lower = message.toLowerCase();
  const match = lower.match(/\b(?:in|from|table)\s+([a-z_][a-z0-9_]*)\b/);
  return match?.[1];
}

function extractQuotedQuery(message: string): string | null {
  const single = message.match(/'([^']+)'/);
  if (single?.[1]) return single[1].trim();
  const dbl = message.match(/"([^"]+)"/);
  if (dbl?.[1]) return dbl[1].trim();
  return null;
}

function parsePlan(rawMessage: string): ActionPlan {
  const message = rawMessage.trim();
  const lower = message.toLowerCase();
  const detectedTable = detectLogicalTable(message) || undefined;
  const rawTableToken = detectRawTableToken(message);

  if (lower.includes('what tables') || lower.includes('list tables') || lower.includes('tables exist')) {
    return { action: 'list_tables', rawTableToken };
  }

  if (lower.includes('column') || lower.includes('schema') || lower.includes('fields')) {
    return { action: 'get_table_schema', table: detectedTable, rawTableToken };
  }

  if ((lower.includes('how many') || lower.includes('count')) && (lower.includes('row') || lower.includes('rows'))) {
    return { action: 'count_rows', table: detectedTable, rawTableToken };
  }

  if (lower.includes('search')) {
    const q = extractQuotedQuery(message) || message.replace(/^.*search/i, '').replace(/for/i, '').trim();
    const limitMatch = message.match(/\b(\d{1,2})\b/);
    return {
      action: 'search_by_name',
      table: detectedTable,
      query: q || undefined,
      limit: clampLimit(limitMatch ? Number(limitMatch[1]) : 10),
      rawTableToken,
    };
  }

  if (lower.includes('show') || lower.includes('sample') || lower.includes('list')) {
    const limitMatch = message.match(/\b(\d{1,2})\b/);
    return {
      action: 'sample_rows',
      table: detectedTable,
      limit: clampLimit(limitMatch ? Number(limitMatch[1]) : 10),
      rawTableToken,
    };
  }

  return { action: 'list_tables', rawTableToken };
}

async function getTableColumns(admin: ReturnType<typeof createClient>, physicalTable: string) {
  const { data, error } = await admin
    .schema('information_schema')
    .from('columns')
    .select('column_name,data_type,is_nullable,ordinal_position')
    .eq('table_schema', 'public')
    .eq('table_name', physicalTable)
    .order('ordinal_position', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function listAllowedTablesWithCounts(admin: ReturnType<typeof createClient>) {
  const summaries: Array<{ table: string; rows: number }> = [];
  for (const spec of TABLE_SPECS) {
    const { count, error } = await admin.from(spec.physical).select('*', { count: 'exact', head: true });
    if (error) continue;
    summaries.push({ table: spec.logical, rows: Number(count || 0) });
  }
  return summaries;
}

function fallbackHuman(action: AllowedAction, logicalTable: string | undefined, actionData: unknown, message: string) {
  if (action === 'list_tables') {
    const rows = Array.isArray(actionData) ? actionData as Array<{table: string; rows: number}> : [];
    return rows.length
      ? `I can access these tables: ${rows.map((item) => `${item.table} (${item.rows})`).join(', ')}.`
      : 'I could not verify accessible tables right now.';
  }

  if (action === 'count_rows') {
    const count = (actionData as { count?: number })?.count ?? 0;
    return `${logicalTable} has ${count} rows.`;
  }

  if (action === 'get_table_schema') {
    const cols = Array.isArray(actionData) ? actionData as Array<{column_name: string; data_type: string}> : [];
    const preview = cols.slice(0, 8).map((c) => `${c.column_name}(${c.data_type})`).join(', ');
    return cols.length ? `${logicalTable} columns: ${preview}${cols.length > 8 ? ', ...' : ''}` : `No schema found for ${logicalTable}.`;
  }

  if (action === 'sample_rows') {
    const rows = (actionData as { rows?: Array<Record<string, unknown>> })?.rows || [];
    if (!rows.length) return `No rows found in ${logicalTable}.`;
    const names = rows
      .map((row) => row.name ?? row.name_key ?? row.id)
      .map((v) => (typeof v === 'string' || typeof v === 'number' ? String(v) : null))
      .filter(Boolean)
      .slice(0, 6);
    return names.length ? `Here are ${Math.min(names.length, rows.length)} ${logicalTable}: ${names.join(', ')}.` : `Showing ${rows.length} rows from ${logicalTable}.`;
  }

  if (action === 'search_by_name') {
    const rows = (actionData as { rows?: Array<Record<string, unknown>> })?.rows || [];
    const query = (actionData as { query?: string })?.query || message;
    const names = rows
      .map((row) => row.name ?? row.name_key ?? row.id)
      .map((v) => (typeof v === 'string' || typeof v === 'number' ? String(v) : null))
      .filter(Boolean)
      .slice(0, 6);
    return rows.length
      ? `Found ${rows.length} ${logicalTable} matching '${query}': ${names.join(', ')}.`
      : `No ${logicalTable} matched '${query}'.`;
  }

  return 'Request processed.';
}

async function callOpenAIWithContext(args: {
  message: string;
  action: AllowedAction;
  logicalTable?: string;
  tablesSummary: Array<{ table: string; rows: number }>;
  actionData: unknown;
  debug?: boolean;
}) {
  const systemPrompt = [
    'You are a database assistant for a fitness app.',
    'Answer ONLY using the provided database context JSON.',
    'If the user asks for unavailable data, say so clearly and suggest one of the allowed tables.',
    'Keep answers concise and factual.',
  ].join(' ');

  const contextPayload = {
    allowed_tables: args.tablesSummary,
    resolved_action: args.action,
    resolved_table: args.logicalTable || null,
    action_data: args.actionData,
  };

  const userPrompt = [
    `USER_QUESTION:\n${args.message}`,
    `\nDB_CONTEXT_JSON:\n${JSON.stringify(contextPayload, null, 2)}`,
  ].join('\n');

  const requestPayload = {
    model: OPENAI_MODEL,
    input: [
      { role: 'system', content: [{ type: 'input_text', text: systemPrompt }] },
      { role: 'user', content: [{ type: 'input_text', text: userPrompt }] },
    ],
  };

  const res = await fetch(OPENAI_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestPayload),
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`OPENAI_${res.status}: ${raw}`);
  }

  let parsed: any = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      human: raw || 'OpenAI returned non-JSON output.',
      debug: args.debug
        ? {
            openai_request: requestPayload,
            openai_response_raw: raw,
            context_payload: contextPayload,
          }
        : undefined,
    };
  }

  const outText =
    parsed?.output_text ||
    parsed?.output?.[0]?.content?.find((c: any) => c?.type === 'output_text')?.text ||
    '';

  return {
    human: outText || 'I could not generate a response from OpenAI.',
    debug: args.debug
      ? {
          openai_request: requestPayload,
          openai_response: parsed,
          context_payload: contextPayload,
        }
      : undefined,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json(405, {
      ok: false,
      human: 'Only POST is supported.',
      error: 'METHOD_NOT_ALLOWED',
    });
  }

  const startedAt = Date.now();

  try {
    const body = (await req.json()) as ChatRequest;
    const message = String(body?.message || '').trim();
    const debugMode = Boolean(body?.debug);

    if (!message) {
      return json(400, {
        ok: false,
        human: 'Please send a message.',
        error: 'EMPTY_MESSAGE',
        meta: { ms: Date.now() - startedAt },
      });
    }

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return json(500, {
        ok: false,
        human: 'Server DB bridge is not configured.',
        error: 'MISSING_SUPABASE_SERVER_ENV',
        meta: { ms: Date.now() - startedAt },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let resolvedUserId = body?.user_id || null;
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
    if (authHeader.toLowerCase().startsWith('bearer ')) {
      const token = authHeader.slice(7).trim();
      if (token) {
        const { data: userData } = await admin.auth.getUser(token);
        if (userData?.user?.id) resolvedUserId = userData.user.id;
      }
    }

    const plan = parsePlan(message);

    if (plan.rawTableToken && !plan.table && plan.rawTableToken !== 'table' && plan.rawTableToken !== 'tables') {
      return json(403, {
        ok: false,
        action: plan.action,
        human: "I can't access that table yet. Try: machines, exercises, inventory_items, recipes, utensils.",
        error: 'TABLE_NOT_ALLOWED',
        meta: { ms: Date.now() - startedAt, user_id: resolvedUserId },
      });
    }

    if (plan.action !== 'list_tables' && !plan.table) {
      return json(400, {
        ok: false,
        action: plan.action,
        human: 'Please specify a table. Try: machines, exercises, inventory_items, recipes, utensils.',
        error: 'TABLE_REQUIRED',
        meta: { ms: Date.now() - startedAt, user_id: resolvedUserId },
      });
    }

    if (plan.table && !TABLE_BY_LOGICAL.has(plan.table)) {
      return json(403, {
        ok: false,
        action: plan.action,
        human: "I can't access that table yet. Try: machines, exercises, inventory_items, recipes, utensils.",
        error: 'TABLE_NOT_ALLOWED',
        meta: { ms: Date.now() - startedAt, user_id: resolvedUserId },
      });
    }

    const tablesSummary = await listAllowedTablesWithCounts(admin);
    let actionData: unknown = tablesSummary;
    let logicalTable: string | undefined;

    if (plan.action !== 'list_tables') {
      const spec = TABLE_BY_LOGICAL.get(plan.table as string)!;
      logicalTable = spec.logical;

      if (plan.action === 'get_table_schema') {
        const columns = await getTableColumns(admin, spec.physical);
        actionData = columns.map((col) => ({
          column_name: col.column_name,
          data_type: col.data_type,
          is_nullable: col.is_nullable,
          ordinal_position: col.ordinal_position,
        }));
      } else if (plan.action === 'count_rows') {
        const { count, error } = await admin.from(spec.physical).select('*', { count: 'exact', head: true });
        if (error) throw error;
        actionData = { table: spec.logical, count: Number(count || 0) };
      } else if (plan.action === 'sample_rows') {
        const limit = clampLimit(plan.limit, 10);
        const { data, error } = await admin.from(spec.physical).select('*').limit(limit);
        if (error) throw error;
        actionData = { table: spec.logical, limit, rows: data || [] };
      } else if (plan.action === 'search_by_name') {
        const q = String(plan.query || '').trim();
        if (!q) {
          return json(400, {
            ok: false,
            action: plan.action,
            human: "Please provide a search term. Example: Search exercises for 'bench'.",
            error: 'QUERY_REQUIRED',
            meta: { ms: Date.now() - startedAt, user_id: resolvedUserId },
          });
        }

        const columns = await getTableColumns(admin, spec.physical);
        const columnNames = new Set(columns.map((item) => String(item.column_name)));
        const limit = clampLimit(plan.limit, 10);
        let query = admin.from(spec.physical).select('*').limit(limit);

        const hasNameKey = columnNames.has('name_key');
        const hasName = columnNames.has('name');

        if (hasNameKey && hasName) {
          query = query.or(`name_key.ilike.%${q}%,name.ilike.%${q}%`);
        } else if (hasNameKey) {
          query = query.ilike('name_key', `%${q}%`);
        } else if (hasName) {
          query = query.ilike('name', `%${q}%`);
        } else {
          return json(400, {
            ok: false,
            action: plan.action,
            human: `${spec.logical} does not support name search yet.`,
            error: 'SEARCH_NOT_SUPPORTED',
            meta: { ms: Date.now() - startedAt, user_id: resolvedUserId },
          });
        }

        const { data, error } = await query;
        if (error) throw error;
        actionData = { table: spec.logical, query: q, limit, rows: data || [] };
      }
    }

    let human = fallbackHuman(plan.action, logicalTable, actionData, message);
    let debugPayload: Record<string, unknown> | undefined;

    if (OPENAI_API_KEY) {
      try {
        const llm = await callOpenAIWithContext({
          message,
          action: plan.action,
          logicalTable,
          tablesSummary,
          actionData,
          debug: debugMode,
        });
        human = llm.human || human;
        if (debugMode && llm.debug) debugPayload = llm.debug as Record<string, unknown>;
      } catch (e) {
        console.error('[chat_db] openai_error', e);
        if (debugMode) {
          debugPayload = {
            openai_error: e instanceof Error ? e.message : String(e),
          };
        }
      }
    }

    const ms = Date.now() - startedAt;
    console.log('[chat_db]', { action: plan.action, table: logicalTable || null, ms });

    return json(200, {
      ok: true,
      action: plan.action,
      data: actionData,
      human,
      meta: {
        ms,
        user_id: resolvedUserId,
        ...(debugMode
          ? {
              debug: {
                parsed_plan: plan,
                tables_summary: tablesSummary,
                ...(debugPayload ? debugPayload : {}),
                openai_used: Boolean(OPENAI_API_KEY),
              },
            }
          : {}),
      },
    });
  } catch (error) {
    console.error('[chat_db] error', error);
    return json(500, {
      ok: false,
      human: 'Something went wrong while processing your request.',
      error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
      meta: { ms: Date.now() - startedAt },
    });
  }
});
