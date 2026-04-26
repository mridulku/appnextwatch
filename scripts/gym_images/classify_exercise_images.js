#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const EXERCISE_DIR = path.join(ROOT_DIR, 'exerciseimages');
const OUTPUT_PATH = path.join(EXERCISE_DIR, 'exercise_image_matches.json');
const REVIEW_PATH = path.join(EXERCISE_DIR, 'exercise_image_review.json');
const OPENAI_ENDPOINT = process.env.OPENAI_ENDPOINT || 'https://api.openai.com/v1/responses';
const OPENAI_MODEL = process.env.OPENAI_MODEL || process.env.EXPO_PUBLIC_OPENAI_MODEL || 'gpt-4.1-mini';
const MIN_CONFIDENCE = 75;

function getEnv(key) {
  return String(process.env[key] || '').trim();
}

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function listSourceImages() {
  return fs
    .readdirSync(EXERCISE_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => /\.(png|jpg|jpeg|webp)$/i.test(name))
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
}

function makeSupabaseClient() {
  const url = getEnv('EXPO_PUBLIC_SUPABASE_URL') || getEnv('SUPABASE_URL');
  const key = getEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY') || getEnv('SUPABASE_ANON_KEY') || getEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    throw new Error('Missing Supabase URL/key for exercise catalog read');
  }
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

async function listCatalogExercises() {
  const client = makeSupabaseClient();
  const response = await client
    .from('catalog_exercises')
    .select('id,name,name_key,type,primary_muscle_group,equipment')
    .is('created_by', null)
    .order('name', { ascending: true });
  if (response.error) throw response.error;
  return response.data || [];
}

function imageToDataUrl(absPath) {
  const ext = path.extname(absPath).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
  const bytes = fs.readFileSync(absPath);
  return `data:${mime};base64,${bytes.toString('base64')}`;
}

function buildPrompt(exerciseCatalog) {
  const catalogPreview = exerciseCatalog
    .map((row) => `${row.name} | type=${row.type || ''} | muscle=${row.primary_muscle_group || ''} | equipment=${row.equipment || ''}`)
    .join('\n');

  return [
    'You are classifying a fitness exercise image against an existing exercise catalog.',
    'Return JSON only. No markdown.',
    'The image may be a screenshot, infographic, tutorial card, or exercise demonstration.',
    'Use OCR if there is visible text, but also use the body position, equipment, and movement shown.',
    'Be conservative. If unsure, say so.',
    'Output schema:',
    '{"detected_exercise_name":"string","best_match_name":"string|null","best_match_id":"string|null","confidence":0,"alternates":[{"name":"string","id":"string","confidence":0}],"reasoning":"string","visible_text":"string|null","is_exercise_image":true}',
    'Rules:',
    '- best_match_name and best_match_id must come only from the catalog below.',
    '- confidence must be 0-100.',
    '- alternates max 3.',
    '- If this is not clearly an exercise image, set is_exercise_image=false.',
    '- If no confident match exists, return best_match_name=null and best_match_id=null.',
    'Catalog:',
    catalogPreview,
  ].join('\n');
}

async function callOpenAI({ prompt, imageDataUrl }) {
  const apiKey = getEnv('EXPO_PUBLIC_OPENAI_API_KEY') || getEnv('OPENAI_API_KEY');
  if (!apiKey) throw new Error('Missing OpenAI API key');

  const payload = {
    model: OPENAI_MODEL,
    input: [
      {
        role: 'system',
        content: [{ type: 'input_text', text: prompt }],
      },
      {
        role: 'user',
        content: [
          { type: 'input_text', text: 'Classify this exercise image and match it to the catalog.' },
          { type: 'input_image', image_url: imageDataUrl },
        ],
      },
    ],
    max_output_tokens: 1400,
  };

  const response = await fetch(OPENAI_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`OPENAI_${response.status}: ${raw}`);
  }
  const parsed = JSON.parse(raw);
  const outputText = Array.isArray(parsed.output)
    ? parsed.output
      .flatMap((entry) => Array.isArray(entry.content) ? entry.content : [])
      .filter((entry) => entry?.type === 'output_text')
      .map((entry) => entry.text || '')
      .join('\n')
      .trim()
    : '';
  if (!outputText) {
    throw new Error('OpenAI returned empty output_text');
  }
  return { raw: parsed, outputText };
}

function safeJsonObject(text) {
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) {
    throw new Error('No JSON object found in model output');
  }
  return JSON.parse(text.slice(first, last + 1));
}

function resolveIds(result, exerciseCatalog) {
  const byName = new Map(exerciseCatalog.map((row) => [normalize(row.name), row]));
  const best = result.best_match_name ? byName.get(normalize(result.best_match_name)) || null : null;
  const alternates = Array.isArray(result.alternates) ? result.alternates : [];
  return {
    ...result,
    best_match_id: best?.id || result.best_match_id || null,
    best_match_name: best?.name || result.best_match_name || null,
    alternates: alternates.slice(0, 3).map((entry) => {
      const match = byName.get(normalize(entry.name));
      return {
        name: match?.name || entry.name || null,
        id: match?.id || entry.id || null,
        confidence: Number(entry.confidence || 0),
      };
    }),
  };
}

async function classifyOne(fileName, prompt, exerciseCatalog) {
  const absPath = path.join(EXERCISE_DIR, fileName);
  const imageDataUrl = imageToDataUrl(absPath);
  const startedAt = Date.now();
  const response = await callOpenAI({ prompt, imageDataUrl });
  const parsed = safeJsonObject(response.outputText);
  const resolved = resolveIds(parsed, exerciseCatalog);
  return {
    file_name: fileName,
    match: resolved,
    meta: {
      ms: Date.now() - startedAt,
      model: OPENAI_MODEL,
    },
  };
}

function resolveUniqueAssignments(results) {
  const byBest = [...results].sort((a, b) => Number(b.match?.confidence || 0) - Number(a.match?.confidence || 0));
  const usedIds = new Set();
  const final = [];

  for (const row of byBest) {
    const candidates = [];
    if (row.match?.best_match_id) {
      candidates.push({
        id: row.match.best_match_id,
        name: row.match.best_match_name,
        confidence: Number(row.match.confidence || 0),
      });
    }
    for (const alternate of row.match?.alternates || []) {
      if (alternate?.id) candidates.push(alternate);
    }

    let chosen = null;
    for (const candidate of candidates) {
      if (!usedIds.has(candidate.id)) {
        chosen = candidate;
        break;
      }
    }

    if (chosen) {
      usedIds.add(chosen.id);
      final.push({
        ...row,
        final_match_id: chosen.id,
        final_match_name: chosen.name,
        final_confidence: Number(chosen.confidence || 0),
      });
    } else {
      final.push({
        ...row,
        final_match_id: null,
        final_match_name: null,
        final_confidence: 0,
      });
    }
  }

  return final.sort((a, b) => a.file_name.localeCompare(b.file_name, 'en', { numeric: true }));
}

function computeMissingExercises(finalResults, exerciseCatalog) {
  const used = new Set(finalResults.map((row) => row.final_match_id).filter(Boolean));
  return exerciseCatalog
    .filter((row) => !used.has(row.id))
    .map((row) => ({ exercise_id: row.id, exercise_name: row.name }));
}

async function main() {
  const files = listSourceImages();
  const exerciseCatalog = await listCatalogExercises();
  const prompt = buildPrompt(exerciseCatalog);
  const rawResults = [];

  for (let i = 0; i < files.length; i += 1) {
    const fileName = files[i];
    try {
      const classified = await classifyOne(fileName, prompt, exerciseCatalog);
      rawResults.push(classified);
      console.log(`[exercise-classify] ${i + 1}/${files.length} ${fileName} -> ${classified.match.best_match_name || 'unmatched'} (${classified.match.confidence})`);
    } catch (error) {
      rawResults.push({
        file_name: fileName,
        error: error.message || String(error),
      });
      console.log(`[exercise-classify] ${i + 1}/${files.length} ${fileName} -> error`);
    }
  }

  const resolvedResults = resolveUniqueAssignments(rawResults.filter((row) => !row.error && row.match));
  const finalResults = rawResults.map((row) => {
    if (row.error || !row.match) return row;
    const resolved = resolvedResults.find((entry) => entry.file_name === row.file_name);
    return resolved || row;
  });

  const review = finalResults.filter((row) => {
    if (row.error) return true;
    if (!row.final_match_id) return true;
    if (Number(row.final_confidence || 0) < MIN_CONFIDENCE) return true;
    return false;
  });

  const missingExercises = computeMissingExercises(finalResults, exerciseCatalog);

  writeJson(OUTPUT_PATH, {
    generated_at: new Date().toISOString(),
    count: finalResults.length,
    min_confidence: MIN_CONFIDENCE,
    missing_exercises: missingExercises,
    items: finalResults,
  });

  writeJson(REVIEW_PATH, {
    generated_at: new Date().toISOString(),
    count: review.length,
    min_confidence: MIN_CONFIDENCE,
    missing_exercises: missingExercises,
    items: review,
  });

  console.log(`[exercise-classify] results: ${path.relative(ROOT_DIR, OUTPUT_PATH)}`);
  console.log(`[exercise-classify] review: ${path.relative(ROOT_DIR, REVIEW_PATH)}`);
  console.log(`[exercise-classify] missing exercises: ${missingExercises.map((row) => row.exercise_name).join(', ') || 'none'}`);
}

main().catch((error) => {
  console.error('[exercise-classify] failed');
  console.error(error.message || error);
  process.exit(1);
});
