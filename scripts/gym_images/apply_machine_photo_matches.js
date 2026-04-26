#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const MATCHES_PATH = path.join(ROOT_DIR, 'machineimages', 'machine_matches.json');
const OUTPUT_PATH = path.join(ROOT_DIR, 'machineimages', 'machine_matches_applied.json');
const BUCKET = 'gym-catalog-images';
const MIN_CONFIDENCE = 85;

function getEnv(key) {
  return String(process.env[key] || '').trim();
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function makeSupabaseClient() {
  const url = getEnv('EXPO_PUBLIC_SUPABASE_URL') || getEnv('SUPABASE_URL');
  const key = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or Supabase URL');
  }
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function chooseBestPerMachine(items) {
  const grouped = new Map();

  for (const item of items) {
    const match = item.match;
    if (!match?.best_match_id) continue;
    if (Number(match.confidence || 0) < MIN_CONFIDENCE) continue;
    const current = grouped.get(match.best_match_id);
    const candidateSize = fs.statSync(path.join(ROOT_DIR, item.converted_path)).size;
    if (!current) {
      grouped.set(match.best_match_id, { ...item, _size: candidateSize });
      continue;
    }
    const currentConfidence = Number(current.match?.confidence || 0);
    const nextConfidence = Number(match.confidence || 0);
    if (nextConfidence > currentConfidence || (nextConfidence === currentConfidence && candidateSize > current._size)) {
      grouped.set(match.best_match_id, { ...item, _size: candidateSize });
    }
  }

  return [...grouped.values()];
}

async function uploadOne(client, item) {
  const match = item.match;
  const absPath = path.join(ROOT_DIR, item.converted_path);
  const bytes = fs.readFileSync(absPath);
  const filePath = `catalog/machines/${match.best_match_id}.jpg`;

  const upload = await client.storage.from(BUCKET).upload(filePath, bytes, {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (upload.error) throw upload.error;

  const publicUrl = client.storage.from(BUCKET).getPublicUrl(filePath)?.data?.publicUrl;
  if (!publicUrl) throw new Error('Could not generate public URL');

  const update = await client
    .from('catalog_machines')
    .update({
      image_url: publicUrl,
      image_source: 'gym_photo_match',
      image_credit: `Local gym photo (${item.source_file})`,
      image_license: 'private gym photo',
      image_status: 'found',
      image_updated_at: new Date().toISOString(),
    })
    .eq('id', match.best_match_id);

  if (update.error) throw update.error;

  return {
    machine_id: match.best_match_id,
    machine_name: match.best_match_name,
    confidence: match.confidence,
    source_file: item.source_file,
    converted_path: item.converted_path,
    image_url: publicUrl,
  };
}

async function main() {
  if (!fs.existsSync(MATCHES_PATH)) {
    throw new Error(`Missing machine matches file: ${MATCHES_PATH}`);
  }

  const payload = readJson(MATCHES_PATH);
  const selected = chooseBestPerMachine(payload.items || []);
  const client = makeSupabaseClient();
  const applied = [];

  for (let i = 0; i < selected.length; i += 1) {
    const item = selected[i];
    const result = await uploadOne(client, item);
    applied.push(result);
    console.log(`[machine-apply] ${i + 1}/${selected.length} ${result.machine_name} <- ${result.source_file}`);
  }

  writeJson(OUTPUT_PATH, {
    generated_at: new Date().toISOString(),
    min_confidence: MIN_CONFIDENCE,
    count: applied.length,
    items: applied,
  });

  console.log(`[machine-apply] applied ${applied.length} machine photos`);
  console.log(`[machine-apply] output: ${path.relative(ROOT_DIR, OUTPUT_PATH)}`);
}

main().catch((error) => {
  console.error('[machine-apply] failed');
  console.error(error.message || error);
  process.exit(1);
});
