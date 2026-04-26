import { createClient } from 'npm:@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || Deno.env.get('SB_OPENAI_API_KEY') || '';
const OPENAI_MODEL = Deno.env.get('OPENAI_MODEL') || 'gpt-4.1-mini';
const OPENAI_ENDPOINT = Deno.env.get('OPENAI_ENDPOINT') || 'https://api.openai.com/v1/responses';
const SUPABASE_URL = Deno.env.get('SB_URL') || Deno.env.get('SUPABASE_URL') || '';
const SERVICE_ROLE_KEY = Deno.env.get('SB_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const DEFAULT_SYSTEM_PROMPT =
  'You are a concise gym progression assistant. Use only the provided exercise identity, measurement metadata, current draft, and historical sessions. Do not invent numbers or sessions. Do not give medical advice or injury diagnosis. Give one short paragraph, maximum 45 words. If the data is sparse or inconsistent, suggest a conservative repeat or a small adjustment only.';

const DEFAULT_DATA_ATTACHMENT_SPEC =
  'The attached payload includes exercise identity, measurement metadata, current draft sets, and the last up to 5 historical sessions for the exact exercise variant.';

const DEFAULT_RESPONSE_STRUCTURE =
  '{"advice":"string"} Return exactly one short paragraph in the advice field. No bullets. No JSON commentary outside this structure.';

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

function extractOutputText(parsedResponse: any, raw: string) {
  return (
    parsedResponse?.output_text ||
    parsedResponse?.output?.[0]?.content?.find((item: any) => item?.type === 'output_text')?.text ||
    raw
  );
}

function extractAdviceValue(value: unknown) {
  const text = String(value || '').trim();
  if (!text) return '';

  try {
    const parsed = JSON.parse(text);
    if (typeof parsed?.advice === 'string') {
      return parsed.advice.trim();
    }
  } catch {
    // Fall through to raw text.
  }

  return text;
}

async function loadPromptConfig() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return null;
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await admin
    .from('app_ai_prompt_configs')
    .select('system_prompt, data_attachment_spec, response_structure, enabled')
    .eq('scope_key', 'gym')
    .eq('use_case_key', 'exercise_history_recommendation')
    .limit(1);

  if (error || !Array.isArray(data) || !data.length) {
    return null;
  }

  const row = data[0];
  if (row?.enabled === false) {
    return null;
  }

  return row;
}

function buildPrompt(payload: Record<string, unknown>, config?: Record<string, unknown> | null) {
  const dataAttachmentSpec = String(config?.data_attachment_spec || DEFAULT_DATA_ATTACHMENT_SPEC).trim();
  const responseStructure = String(config?.response_structure || DEFAULT_RESPONSE_STRUCTURE).trim();
  return [
    'Attached data',
    dataAttachmentSpec,
    '',
    'Expected response structure',
    responseStructure,
    '',
    JSON.stringify(payload, null, 2),
  ].join('\n');
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed.' });
  }

  try {
    const body = await request.json();
    const history = Array.isArray(body?.history) ? body.history.slice(0, 5) : [];
    const exercise = body?.exercise || null;
    const currentDraftSets = Array.isArray(body?.currentDraftSets) ? body.currentDraftSets : [];

    if (!exercise || !history.length) {
      return json(200, { ok: true, advice: '' });
    }

    if (!OPENAI_API_KEY) {
      return json(200, {
        ok: false,
        error: 'Could not generate advice right now.',
      });
    }

    const promptConfig = await loadPromptConfig();
    const prompt = buildPrompt({
      exercise,
      currentDraftSets,
      history,
    }, promptConfig);

    const openAiResponse = await fetch(OPENAI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: [
          {
            role: 'system',
            content: [
              {
                type: 'input_text',
                text: String(promptConfig?.system_prompt || DEFAULT_SYSTEM_PROMPT).trim(),
              },
            ],
          },
          {
            role: 'user',
            content: [{ type: 'input_text', text: prompt }],
          },
        ],
      }),
    });

    const rawText = await openAiResponse.text();
    const parsed = rawText ? JSON.parse(rawText) : {};
    const advice = extractAdviceValue(extractOutputText(parsed, rawText));

    if (!openAiResponse.ok || !advice) {
      return json(200, {
        ok: false,
        error: 'Could not generate advice right now.',
      });
    }

    return json(200, {
      ok: true,
      advice,
    });
  } catch (_error) {
    return json(200, {
      ok: false,
      error: 'Could not generate advice right now.',
    });
  }
});
