#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const MUSCLE_DIR = path.join(ROOT_DIR, 'muscleimages');
const MATCHES_PATH = path.join(MUSCLE_DIR, 'muscle_image_matches.json');
const OUTPUT_MAP_PATH = path.join(MUSCLE_DIR, 'muscle_image_mapping.json');
const OUTPUT_APPLIED_PATH = path.join(MUSCLE_DIR, 'muscle_image_applied.json');
const BUCKET = 'gym-catalog-images';
const MIN_CONFIDENCE = 75;

function getEnv(key) {
  return String(process.env[key] || '').trim();
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
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

function buildResolvedPlan(matchesPayload) {
  const rows = matchesPayload.items || [];
  const unresolved = rows.filter((row) => !row.final_match_id || Number(row.final_confidence || 0) < MIN_CONFIDENCE);
  if (unresolved.length) {
    throw new Error(`Muscle image review still required for ${unresolved.length} item(s). Run classifier and inspect muscle_image_review.json first.`);
  }

  return rows.map((row, index) => ({
    order_index: index + 1,
    source_file: row.file_name,
    muscle_id: row.match?.best_match_parent ? undefined : undefined,
    muscle_name: row.final_match_parent,
    subgroup_id: row.final_match_id,
    subgroup_name: row.final_match_name,
  }));
}

async function uploadSubgroupImage(client, planRow) {
  const absPath = path.join(MUSCLE_DIR, planRow.source_file);
  const bytes = fs.readFileSync(absPath);
  const ext = path.extname(planRow.source_file).toLowerCase();
  const contentType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
  const storagePath = `catalog/subgroups/${planRow.subgroup_id}${ext || '.png'}`;

  const upload = await client.storage.from(BUCKET).upload(storagePath, bytes, {
    contentType,
    upsert: true,
  });
  if (upload.error) throw upload.error;

  const imageUrl = client.storage.from(BUCKET).getPublicUrl(storagePath)?.data?.publicUrl;
  if (!imageUrl) throw new Error(`Could not generate public URL for ${planRow.subgroup_name}`);

  const nowIso = new Date().toISOString();

  const subgroupUpdate = await client
    .from('muscle_subgroups')
    .update({
      image_url: imageUrl,
      image_source: 'manual_screenshot_match',
      image_credit: `Manual muscle screenshot (${planRow.source_file})`,
      image_license: 'user-provided reference image',
      image_status: 'found',
      image_updated_at: nowIso,
    })
    .eq('id', planRow.subgroup_id);

  if (subgroupUpdate.error) throw subgroupUpdate.error;

  return {
    ...planRow,
    storage_path: storagePath,
    image_url: imageUrl,
  };
}

async function applyParentMuscleImages(client, appliedRows) {
  const { data: subgroups, error } = await client
    .from('muscle_subgroups')
    .select('id,muscle_id')
    .in('id', appliedRows.map((row) => row.subgroup_id));

  if (error) throw error;
  const muscleBySubgroup = new Map((subgroups || []).map((row) => [row.id, row.muscle_id]));

  const seen = new Map();
  for (const row of appliedRows) {
    const muscleId = muscleBySubgroup.get(row.subgroup_id);
    if (muscleId && !seen.has(muscleId)) {
      seen.set(muscleId, { ...row, muscle_id: muscleId });
    }
  }

  for (const row of seen.values()) {
    const update = await client
      .from('muscles')
      .update({
        image_url: row.image_url,
        image_source: 'manual_screenshot_match',
        image_credit: `Representative subgroup screenshot (${row.source_file})`,
        image_license: 'user-provided reference image',
        image_status: 'found',
        image_updated_at: new Date().toISOString(),
      })
      .eq('id', row.muscle_id);

    if (update.error) throw update.error;
  }
}

async function main() {
  const client = makeSupabaseClient();
  if (!fs.existsSync(MATCHES_PATH)) {
    throw new Error(`Missing muscle image matches file: ${MATCHES_PATH}`);
  }
  const matchesPayload = readJson(MATCHES_PATH);
  const plan = buildResolvedPlan(matchesPayload);

  writeJson(OUTPUT_MAP_PATH, {
    generated_at: new Date().toISOString(),
    min_confidence: MIN_CONFIDENCE,
    count: plan.length,
    items: plan,
  });

  const applied = [];
  for (let i = 0; i < plan.length; i += 1) {
    const row = await uploadSubgroupImage(client, plan[i]);
    applied.push(row);
    console.log(`[muscle-images] ${i + 1}/${plan.length} ${row.subgroup_name} <- ${row.source_file}`);
  }

  await applyParentMuscleImages(client, applied);

  writeJson(OUTPUT_APPLIED_PATH, {
    generated_at: new Date().toISOString(),
    count: applied.length,
    items: applied,
  });

  console.log(`[muscle-images] mapping: ${path.relative(ROOT_DIR, OUTPUT_MAP_PATH)}`);
  console.log(`[muscle-images] applied: ${path.relative(ROOT_DIR, OUTPUT_APPLIED_PATH)}`);
}

main().catch((error) => {
  console.error('[muscle-images] failed');
  console.error(error.message || error);
  process.exit(1);
});
