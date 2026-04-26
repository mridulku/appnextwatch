#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const MUSCLE_DIR = path.join(ROOT_DIR, 'muscleimages');
const OUTPUT_PATH = path.join(MUSCLE_DIR, 'muscle_image_matches.json');
const REVIEW_PATH = path.join(MUSCLE_DIR, 'muscle_image_review.json');
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

function readDirImages() {
  return fs
    .readdirSync(MUSCLE_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => /\.(png|jpg|jpeg|webp)$/i.test(name))
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function makeSupabaseClient() {
  const url = getEnv('EXPO_PUBLIC_SUPABASE_URL') || getEnv('SUPABASE_URL');
  const key = getEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY') || getEnv('SUPABASE_ANON_KEY') || getEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    throw new Error('Missing Supabase URL/key for taxonomy read');
  }
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

async function listMuscleSubgroups() {
  const client = makeSupabaseClient();
  const response = await client
    .from('muscle_subgroups')
    .select('id,name,name_key,sort_order,muscles(id,name,name_key,sort_order)')
    .order('name', { ascending: true });
  if (response.error) throw response.error;
  return response.data || [];
}

function imageToDataUrl(absPath) {
  const bytes = fs.readFileSync(absPath);
  const ext = path.extname(absPath).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
  return `data:${mime};base64,${bytes.toString('base64')}`;
}

function buildPrompt(subgroups) {
  const catalogPreview = subgroups
    .map((row) => `${row.name} | parent=${row.muscles?.name || ''} | id=${row.id}`)
    .join('\n');

  return [
    'You are classifying an anatomy/muscle reference image against an exact muscle subgroup catalog.',
    'Return JSON only. No markdown.',
    'The image may include labels, highlighted anatomy, or screenshot UI text.',
    'Choose the single best exact subgroup from the catalog below.',
    'Be conservative and use visible evidence from the image.',
    'Output schema:',
    '{"detected_subgroup_name":"string","best_match_name":"string|null","best_match_id":"string|null","confidence":0,"alternates":[{"name":"string","id":"string","confidence":0}],"reasoning":"string","visible_text":"string|null","is_muscle_reference_image":true}',
    'Rules:',
    '- best_match_name and best_match_id must come only from the catalog below.',
    '- confidence must be 0-100.',
    '- alternates max 3.',
    '- If the image is not a muscle reference, set is_muscle_reference_image=false.',
    '- If no confident exact match exists, return best_match_name=null and best_match_id=null.',
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
          { type: 'input_text', text: 'Classify this muscle screenshot against the exact subgroup catalog.' },
          { type: 'input_image', image_url: imageDataUrl },
        ],
      },
    ],
    max_output_tokens: 1200,
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
  if (!outputText) throw new Error('OpenAI returned empty output_text');
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

function resolveIds(result, subgroups) {
  const byName = new Map(subgroups.map((row) => [normalize(row.name), row]));
  const best = result.best_match_name ? byName.get(normalize(result.best_match_name)) || null : null;
  const alternates = Array.isArray(result.alternates) ? result.alternates : [];
  return {
    ...result,
    best_match_id: best?.id || result.best_match_id || null,
    best_match_name: best?.name || result.best_match_name || null,
    best_match_parent: best?.muscles?.name || null,
    alternates: alternates.slice(0, 3).map((entry) => {
      const match = byName.get(normalize(entry.name));
      return {
        name: match?.name || entry.name || null,
        id: match?.id || entry.id || null,
        parent: match?.muscles?.name || null,
        confidence: Number(entry.confidence || 0),
      };
    }),
  };
}

async function classifyOne(fileName, prompt, subgroups) {
  const absPath = path.join(MUSCLE_DIR, fileName);
  const imageDataUrl = imageToDataUrl(absPath);
  const startedAt = Date.now();
  const response = await callOpenAI({ prompt, imageDataUrl });
  const parsed = safeJsonObject(response.outputText);
  const resolved = resolveIds(parsed, subgroups);
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
        parent: row.match.best_match_parent || null,
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
        final_match_parent: chosen.parent || null,
        final_confidence: Number(chosen.confidence || 0),
      });
    } else {
      final.push({
        ...row,
        final_match_id: null,
        final_match_name: null,
        final_match_parent: null,
        final_confidence: 0,
      });
    }
  }

  return final.sort((a, b) => a.file_name.localeCompare(b.file_name, 'en', { numeric: true }));
}

function buildRemainingSubgroups(allSubgroups, usedIds) {
  return allSubgroups.filter((row) => !usedIds.has(row.id));
}

async function refineUnresolved(results, allSubgroups) {
  const locked = results.filter((row) => row.final_match_id && Number(row.final_confidence || 0) >= MIN_CONFIDENCE);
  const unresolved = results.filter((row) => !row.final_match_id || Number(row.final_confidence || 0) < MIN_CONFIDENCE);

  if (!unresolved.length) return results;

  let remainingSubgroups = buildRemainingSubgroups(allSubgroups, new Set(locked.map((row) => row.final_match_id)));
  const refinedByFile = new Map();

  for (const row of unresolved) {
    if (!remainingSubgroups.length) {
      refinedByFile.set(row.file_name, row);
      continue;
    }

    try {
      const prompt = buildPrompt(remainingSubgroups);
      const absPath = path.join(MUSCLE_DIR, row.file_name);
      const imageDataUrl = imageToDataUrl(absPath);
      const startedAt = Date.now();
      const response = await callOpenAI({ prompt, imageDataUrl });
      const parsed = safeJsonObject(response.outputText);
      const resolved = resolveIds(parsed, remainingSubgroups);
      const refined = {
        ...row,
        refined_match: resolved,
        final_match_id: resolved.best_match_id || null,
        final_match_name: resolved.best_match_name || null,
        final_match_parent: resolved.best_match_parent || null,
        final_confidence: Number(resolved.confidence || 0),
        refine_meta: {
          ms: Date.now() - startedAt,
          model: OPENAI_MODEL,
        },
      };
      if (refined.final_match_id) {
        remainingSubgroups = remainingSubgroups.filter((candidate) => candidate.id !== refined.final_match_id);
      }
      refinedByFile.set(row.file_name, refined);
      console.log(`[muscle-classify:refine] ${row.file_name} -> ${refined.final_match_name || 'unmatched'} (${refined.final_confidence})`);
    } catch (error) {
      refinedByFile.set(row.file_name, {
        ...row,
        refine_error: error.message || String(error),
      });
      console.log(`[muscle-classify:refine] ${row.file_name} -> error`);
    }
  }

  return results.map((row) => refinedByFile.get(row.file_name) || row);
}

async function main() {
  const subgroups = await listMuscleSubgroups();
  const files = readDirImages();
  const prompt = buildPrompt(subgroups);
  const rawResults = [];

  for (let i = 0; i < files.length; i += 1) {
    const fileName = files[i];
    try {
      const classified = await classifyOne(fileName, prompt, subgroups);
      rawResults.push(classified);
      console.log(`[muscle-classify] ${i + 1}/${files.length} ${fileName} -> ${classified.match.best_match_name || 'unmatched'} (${classified.match.confidence})`);
    } catch (error) {
      rawResults.push({
        file_name: fileName,
        error: error.message || String(error),
      });
      console.log(`[muscle-classify] ${i + 1}/${files.length} ${fileName} -> error`);
    }
  }

  const resolvedResults = resolveUniqueAssignments(rawResults.filter((row) => !row.error && row.match));
  let finalResults = rawResults.map((row) => {
    if (row.error || !row.match) return row;
    const resolved = resolvedResults.find((entry) => entry.file_name === row.file_name);
    return resolved || row;
  });

  finalResults = await refineUnresolved(finalResults, subgroups);

  const review = finalResults.filter((row) => {
    if (row.error) return true;
    if (!row.final_match_id) return true;
    if (Number(row.final_confidence || 0) < MIN_CONFIDENCE) return true;
    return false;
  });

  writeJson(OUTPUT_PATH, {
    generated_at: new Date().toISOString(),
    count: finalResults.length,
    min_confidence: MIN_CONFIDENCE,
    items: finalResults,
  });

  writeJson(REVIEW_PATH, {
    generated_at: new Date().toISOString(),
    count: review.length,
    min_confidence: MIN_CONFIDENCE,
    items: review,
  });

  console.log(`[muscle-classify] results: ${path.relative(ROOT_DIR, OUTPUT_PATH)}`);
  console.log(`[muscle-classify] review: ${path.relative(ROOT_DIR, REVIEW_PATH)}`);
}

main().catch((error) => {
  console.error('[muscle-classify] failed');
  console.error(error.message || error);
  process.exit(1);
});
