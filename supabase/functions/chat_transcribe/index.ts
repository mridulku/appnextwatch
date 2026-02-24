const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || Deno.env.get('SB_OPENAI_API_KEY') || '';
const OPENAI_TRANSCRIBE_ENDPOINT =
  Deno.env.get('OPENAI_TRANSCRIBE_ENDPOINT') || 'https://api.openai.com/v1/audio/transcriptions';
const TRANSCRIBE_MODEL = Deno.env.get('OPENAI_TRANSCRIBE_MODEL') || 'whisper-1';
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed' });
  }

  if (!OPENAI_API_KEY) {
    return json(500, { ok: false, error: 'OPENAI_API_KEY is not configured on the Edge Function' });
  }

  const start = Date.now();

  try {
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('multipart/form-data')) {
      return json(400, { ok: false, error: 'Expected multipart/form-data request body' });
    }

    const formData = await req.formData();
    const audioEntry = formData.get('audio');
    const languageEntry = formData.get('language');
    const promptEntry = formData.get('prompt');

    if (!(audioEntry instanceof File)) {
      return json(400, { ok: false, error: 'Missing audio file in form field "audio"' });
    }

    if (!audioEntry.size || audioEntry.size <= 0) {
      return json(400, { ok: false, error: 'Audio file is empty' });
    }

    if (audioEntry.size > MAX_AUDIO_BYTES) {
      return json(413, {
        ok: false,
        error: `Audio file too large. Max allowed is ${Math.floor(MAX_AUDIO_BYTES / (1024 * 1024))} MB`,
      });
    }

    const openAiForm = new FormData();
    openAiForm.append('model', TRANSCRIBE_MODEL);

    const language = typeof languageEntry === 'string' ? languageEntry.trim() : '';
    if (language) openAiForm.append('language', language);

    const prompt = typeof promptEntry === 'string' ? promptEntry.trim() : '';
    if (prompt) openAiForm.append('prompt', prompt);

    openAiForm.append('response_format', 'json');
    openAiForm.append('file', audioEntry, audioEntry.name || 'recording.m4a');

    const openAiResp = await fetch(OPENAI_TRANSCRIBE_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: openAiForm,
    });

    const rawText = await openAiResp.text();
    let parsed: Record<string, unknown> | null = null;
    try {
      parsed = rawText ? JSON.parse(rawText) : null;
    } catch {
      parsed = null;
    }

    if (!openAiResp.ok) {
      return json(openAiResp.status, {
        ok: false,
        error:
          (parsed?.error as { message?: string } | undefined)?.message ||
          `Transcription request failed (${openAiResp.status})`,
      });
    }

    const text = typeof parsed?.text === 'string' ? parsed.text.trim() : '';
    if (!text) {
      return json(422, { ok: false, error: 'Transcription returned empty text' });
    }

    return json(200, {
      ok: true,
      text,
      meta: {
        model: TRANSCRIBE_MODEL,
        ms: Date.now() - start,
      },
    });
  } catch (error) {
    return json(500, {
      ok: false,
      error: error instanceof Error ? error.message : 'Unexpected transcription error',
    });
  }
});
