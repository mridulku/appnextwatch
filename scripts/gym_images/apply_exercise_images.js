#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const EXERCISE_DIR = path.join(ROOT_DIR, 'exerciseimages');
const OUTPUT_MAP_PATH = path.join(EXERCISE_DIR, 'exercise_image_mapping.json');
const OUTPUT_APPLIED_PATH = path.join(EXERCISE_DIR, 'exercise_image_applied.json');
const BUCKET = 'gym-catalog-images';

function getEnv(key) {
  return String(process.env[key] || '').trim();
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
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

function loadResolvedPlan() {
  if (!fs.existsSync(OUTPUT_MAP_PATH)) {
    throw new Error(`Missing ${path.relative(ROOT_DIR, OUTPUT_MAP_PATH)}. Run resolve_exercise_image_sequence.js first.`);
  }
  const mapping = JSON.parse(fs.readFileSync(OUTPUT_MAP_PATH, 'utf8'));
  const items = Array.isArray(mapping.items) ? mapping.items : [];
  if (!items.length) {
    throw new Error('Resolved mapping file has no items.');
  }
  return mapping;
}

async function uploadExerciseImage(client, planRow) {
  const absPath = path.join(EXERCISE_DIR, planRow.source_file);
  const bytes = fs.readFileSync(absPath);
  const ext = path.extname(planRow.source_file).toLowerCase();
  const contentType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
  const storagePath = `catalog/exercises/${planRow.exercise_id}${ext || '.png'}`;

  const upload = await client.storage.from(BUCKET).upload(storagePath, bytes, {
    contentType,
    upsert: true,
  });
  if (upload.error) throw upload.error;

  const imageUrl = client.storage.from(BUCKET).getPublicUrl(storagePath)?.data?.publicUrl;
  if (!imageUrl) {
    throw new Error(`Could not generate public URL for ${planRow.exercise_name}`);
  }

  const update = await client
    .from('catalog_exercises')
    .update({
      image_url: imageUrl,
      image_source: 'manual_exercise_screenshot_match',
      image_credit: `Manual exercise screenshot (${planRow.source_file})`,
      image_license: 'user-provided reference image',
      image_status: 'found',
      image_updated_at: new Date().toISOString(),
    })
    .eq('id', planRow.exercise_id);

  if (update.error) throw update.error;

  return {
    ...planRow,
    storage_path: storagePath,
    image_url: imageUrl,
  };
}

async function main() {
  const client = makeSupabaseClient();
  const mapping = loadResolvedPlan();
  const plan = mapping.items.filter((row) => !['manual_review_recommended'].includes(row.validation_status));
  if (!plan.length) {
    throw new Error('No safe exercise image mappings to apply.');
  }

  const applied = [];
  for (let i = 0; i < plan.length; i += 1) {
    const row = await uploadExerciseImage(client, plan[i]);
    applied.push(row);
    console.log(`[exercise-images] ${i + 1}/${plan.length} ${row.exercise_name} <- ${row.source_file}`);
  }

  writeJson(OUTPUT_APPLIED_PATH, {
    generated_at: new Date().toISOString(),
    summary: mapping.summary || null,
    count: applied.length,
    items: applied,
  });

  console.log(`[exercise-images] mapping: ${path.relative(ROOT_DIR, OUTPUT_MAP_PATH)}`);
  console.log(`[exercise-images] applied: ${path.relative(ROOT_DIR, OUTPUT_APPLIED_PATH)}`);
}

main().catch((error) => {
  console.error('[exercise-images] failed');
  console.error(error.message || error);
  process.exit(1);
});
