#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const REVIEW_PATH = path.join(ROOT_DIR, 'machineimages', 'machine_matches_review.json');
const OUTPUT_PATH = path.join(ROOT_DIR, 'machineimages', 'machine_review_applied.json');
const BUCKET = 'gym-catalog-images';

const REVIEW_RESOLUTIONS = {
  'IMG_6634.HEIC': {
    name: 'Abduction/Adduction Machine',
    zone: 'Machines',
    primary_muscles: ['Glutes', 'Hip Adductors', 'Hip Abductors'],
    confidence: 90,
  },
  'IMG_6637.HEIC': {
    name: 'Stair Climber',
    zone: 'Cardio',
    primary_muscles: ['Cardio', 'Legs'],
    confidence: 90,
  },
  'IMG_6647.HEIC': {
    name: 'Decline Bench',
    zone: 'Functional',
    primary_muscles: ['Abs', 'Lower Abs'],
    confidence: 85,
  },
  'IMG_6657.HEIC': {
    name: 'Free Weights Platform',
    zone: 'Free Weights',
    primary_muscles: ['Full Body'],
    confidence: 80,
  },
};

function getEnv(key) {
  return String(process.env[key] || '').trim();
}

function normalize(value) {
  return String(value || '').trim().toLowerCase();
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

async function ensureMachine(client, resolution) {
  const response = await client
    .from('catalog_machines')
    .select('id,name')
    .eq('name_key', normalize(resolution.name))
    .is('created_by', null)
    .maybeSingle();

  if (response.error) throw response.error;
  if (response.data?.id) return response.data;

  const inserted = await client
    .from('catalog_machines')
    .insert({
      name: resolution.name,
      zone: resolution.zone,
      primary_muscles: resolution.primary_muscles,
      created_by: null,
    })
    .select('id,name')
    .single();

  if (inserted.error) throw inserted.error;
  return inserted.data;
}

async function uploadAndApply(client, item, resolution, machine) {
  const absPath = path.join(ROOT_DIR, item.converted_path);
  const bytes = fs.readFileSync(absPath);
  const filePath = `catalog/machines/${machine.id}.jpg`;

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
      image_source: 'gym_photo_review',
      image_credit: `Local gym photo (${item.source_file})`,
      image_license: 'private gym photo',
      image_status: 'found',
      image_updated_at: new Date().toISOString(),
    })
    .eq('id', machine.id);

  if (update.error) throw update.error;

  return {
    source_file: item.source_file,
    machine_id: machine.id,
    machine_name: machine.name,
    confidence: resolution.confidence,
    image_url: publicUrl,
  };
}

async function main() {
  if (!fs.existsSync(REVIEW_PATH)) {
    throw new Error(`Missing review file: ${REVIEW_PATH}`);
  }

  const payload = readJson(REVIEW_PATH);
  const client = makeSupabaseClient();
  const applied = [];

  for (const item of payload.items || []) {
    const resolution = REVIEW_RESOLUTIONS[item.source_file];
    if (!resolution) continue;
    const machine = await ensureMachine(client, resolution);
    const result = await uploadAndApply(client, item, resolution, machine);
    applied.push(result);
    console.log(`[machine-review] ${result.machine_name} <- ${result.source_file}`);
  }

  writeJson(OUTPUT_PATH, {
    generated_at: new Date().toISOString(),
    count: applied.length,
    items: applied,
  });

  console.log(`[machine-review] applied ${applied.length} review photos`);
  console.log(`[machine-review] output: ${path.relative(ROOT_DIR, OUTPUT_PATH)}`);
}

main().catch((error) => {
  console.error('[machine-review] failed');
  console.error(error.message || error);
  process.exit(1);
});
