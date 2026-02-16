import { safeTrim, prettyJSON } from '../utils/utils';

const EXPECTED_COLUMNS = [
  'Title',
  'Expectation Before Watching',
  'What Worked (free text)',
  'What Didn\'t Work (free text)',
  'One Honest Sentence (the real reason)',
  'Would Rewatch? (Yes / No / Maybe)',
  'Context Watched (Alone / With someone / Mood)',
];

export function buildDebugPayload({
  model,
  prompt,
  rows,
  headers,
  sendMode,
  subsetCount,
  includeEmptyFields,
}) {
  const normalizedHeaders = new Set((headers || []).map((h) => safeTrim(h)));

  const cols = EXPECTED_COLUMNS.filter((c) => normalizedHeaders.has(c));

  const used = sendMode === 'subset'
    ? rows.slice(0, Math.max(0, subsetCount))
    : rows;

  const datasetForModel = used.map((r) => {
    const obj = { __rowIndex: r.__rowIndex };
    for (const c of cols) {
      const v = r[c];
      if (includeEmptyFields) obj[c] = v ?? '';
      else if (safeTrim(v) !== '') obj[c] = v;
    }
    return obj;
  });

  const system = `
Return STRICT JSON (no markdown). Schema:
{
  "recommendations": [
    {
      "title": string,
      "why_from_my_notes": string,
      "confidence": "low" | "medium" | "high",
      "rowIndex": number
    }
  ],
  "notes": string
}

Rules:
- Recommend ONLY titles outside the dataset.
- The dataset is supposed to help you know what sort of movies i like
`.trim();

  const user = `
USER REQUEST:
${prompt}

DATASET:
${prettyJSON(datasetForModel)}
`.trim();

  return {
    model: model || 'gpt-5.2',
    input: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.4,
  };
}
