import { OPENAI_ENDPOINT } from './env';
import { safeTrim } from './utils';

const DEFAULT_ENDPOINT = 'https://api.openai.com/v1/responses';

export async function callOpenAI({ apiKey, payload }) {
  const endpoint = (OPENAI_ENDPOINT || DEFAULT_ENDPOINT).trim();

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...payload,
      text: { format: { type: 'json_object' } },
    }),
  });

  const rawText = await res.text();
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${rawText}`);

  let obj;
  try {
    obj = JSON.parse(rawText);
  } catch {
    return { rawText, extractedOutputText: '', strictJson: null };
  }

  const outText =
    obj?.output_text ||
    obj?.output?.[0]?.content?.find((c) => c?.type === 'output_text')?.text ||
    '';

  let strictJson = null;
  if (safeTrim(outText)) {
    try {
      strictJson = JSON.parse(outText);
    } catch {
      strictJson = null;
    }
  }

  return { rawText, extractedOutputText: outText, strictJson };
}
