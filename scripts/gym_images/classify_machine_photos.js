#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const MACHINE_DIR = path.join(ROOT_DIR, 'machineimages');
const MANIFEST_PATH = path.join(MACHINE_DIR, 'manifest.json');
const OUTPUT_PATH = path.join(MACHINE_DIR, 'machine_matches.json');
const REVIEW_PATH = path.join(MACHINE_DIR, 'machine_matches_review.json');
const OPENAI_ENDPOINT = process.env.OPENAI_ENDPOINT || 'https://api.openai.com/v1/responses';
const OPENAI_MODEL = process.env.OPENAI_MODEL || process.env.EXPO_PUBLIC_OPENAI_MODEL || 'gpt-4.1-mini';

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

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function makeSupabaseClient() {
  const url = getEnv('EXPO_PUBLIC_SUPABASE_URL') || getEnv('SUPABASE_URL');
  const key = getEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY') || getEnv('SUPABASE_ANON_KEY') || getEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    throw new Error('Missing Supabase URL/key for catalog read');
  }
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

async function listCatalogMachines() {
  const client = makeSupabaseClient();
  const response = await client
    .from('catalog_machines')
    .select('id,name,name_key,zone,primary_muscles')
    .is('created_by', null)
    .order('name', { ascending: true });
  if (response.error) throw response.error;
  return response.data || [];
}

function imageToDataUrl(absPath) {
  const bytes = fs.readFileSync(absPath);
  return `data:image/jpeg;base64,${bytes.toString('base64')}`;
}

function buildPrompt(machineCatalog) {
  const catalogPreview = machineCatalog
    .map((row) => `${row.name} | zone=${row.zone || ''} | muscles=${Array.isArray(row.primary_muscles) ? row.primary_muscles.join('/') : ''}`)
    .join('\n');

  return [
    'You are classifying a gym machine photo against an existing machine catalog.',
    'Return JSON only. No markdown.',
    'Be conservative. If unsure, say so.',
    'Output schema:',
    '{"detected_machine_name":"string","best_match_name":"string|null","best_match_id":"string|null","confidence":0,"alternates":[{"name":"string","id":"string","confidence":0}],"reasoning":"string","visible_brand_or_model":"string|null","is_machine_photo":true}',
    'Rules:',
    '- best_match_name and best_match_id must come only from the catalog below.',
    '- confidence must be 0-100.',
    '- alternates max 3.',
    '- If this is not clearly a machine photo, set is_machine_photo=false.',
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
          { type: 'input_text', text: 'Classify this machine photo and match it to the catalog.' },
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

function resolveIds(result, machineCatalog) {
  const byName = new Map(machineCatalog.map((row) => [normalize(row.name), row]));
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

async function classifyOne(item, prompt, machineCatalog) {
  const absPath = path.join(ROOT_DIR, item.converted_path);
  const imageDataUrl = imageToDataUrl(absPath);
  const startedAt = Date.now();
  const response = await callOpenAI({ prompt, imageDataUrl });
  const parsed = safeJsonObject(response.outputText);
  const resolved = resolveIds(parsed, machineCatalog);
  return {
    filename: item.converted_file,
    source_file: item.source_file,
    converted_path: item.converted_path,
    match: resolved,
    meta: {
      ms: Date.now() - startedAt,
      model: OPENAI_MODEL,
    },
  };
}

async function main() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(`Missing manifest: ${MANIFEST_PATH}`);
  }

  const manifest = readJson(MANIFEST_PATH);
  const machineCatalog = await listCatalogMachines();
  const prompt = buildPrompt(machineCatalog);
  const results = [];

  for (let i = 0; i < manifest.items.length; i += 1) {
    const item = manifest.items[i];
    try {
      const classified = await classifyOne(item, prompt, machineCatalog);
      results.push(classified);
      console.log(`[machine-classify] ${i + 1}/${manifest.items.length} ${item.converted_file} -> ${classified.match.best_match_name || 'unmatched'} (${classified.match.confidence})`);
    } catch (error) {
      results.push({
        filename: item.converted_file,
        source_file: item.source_file,
        converted_path: item.converted_path,
        error: error.message || String(error),
      });
      console.log(`[machine-classify] ${i + 1}/${manifest.items.length} ${item.converted_file} -> error`);
    }
  }

  const review = results.filter((row) => row.error || !row.match?.best_match_id || Number(row.match?.confidence || 0) < 75);

  writeJson(OUTPUT_PATH, {
    generated_at: new Date().toISOString(),
    count: results.length,
    items: results,
  });
  writeJson(REVIEW_PATH, {
    generated_at: new Date().toISOString(),
    count: review.length,
    items: review,
  });

  console.log(`[machine-classify] results: ${path.relative(ROOT_DIR, OUTPUT_PATH)}`);
  console.log(`[machine-classify] review: ${path.relative(ROOT_DIR, REVIEW_PATH)}`);
}

main().catch((error) => {
  console.error('[machine-classify] failed');
  console.error(error.message || error);
  process.exit(1);
});
