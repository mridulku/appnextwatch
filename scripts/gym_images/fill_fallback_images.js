#!/usr/bin/env node
/* eslint-disable no-console */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const BUCKET = 'gym-catalog-images';

const FALLBACKS = {
  exercises: [
    'https://picsum.photos/id/102/1200/1200.jpg',
    'https://picsum.photos/id/321/1200/1200.jpg',
    'https://picsum.photos/id/433/1200/1200.jpg',
    'https://picsum.photos/id/838/1200/1200.jpg',
  ],
  machines: [
    'https://picsum.photos/id/1005/1200/1200.jpg',
    'https://picsum.photos/id/1011/1200/1200.jpg',
    'https://picsum.photos/id/1067/1200/1200.jpg',
    'https://picsum.photos/id/1074/1200/1200.jpg',
  ],
  muscles: [
    'https://picsum.photos/id/1080/1200/1200.jpg',
    'https://picsum.photos/id/1081/1200/1200.jpg',
    'https://picsum.photos/id/1082/1200/1200.jpg',
    'https://picsum.photos/id/1084/1200/1200.jpg',
  ],
};

function getEnv(key) {
  return String(process.env[key] || '').trim();
}

function createSupabase() {
  const url = getEnv('EXPO_PUBLIC_SUPABASE_URL') || getEnv('SUPABASE_URL');
  const key = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

async function fetchBytes(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'appnextwatch-fallback-fill/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const ab = await res.arrayBuffer();
  return new Uint8Array(ab);
}

async function ensureFallbackPool(client) {
  const publicUrls = { exercises: [], machines: [], muscles: [], subgroups: [] };

  for (const [entity, urls] of Object.entries(FALLBACKS)) {
    for (let i = 0; i < urls.length; i += 1) {
      const sourceUrl = urls[i];
      const filePath = `fallback/${entity}/${i + 1}.jpg`;
      const bytes = await fetchBytes(sourceUrl);
      const upload = await client.storage.from(BUCKET).upload(filePath, bytes, {
        contentType: 'image/jpeg',
        upsert: true,
      });
      if (upload.error) throw upload.error;
      const publicUrl = client.storage.from(BUCKET).getPublicUrl(filePath)?.data?.publicUrl;
      if (!publicUrl) throw new Error(`Could not make public URL for ${filePath}`);
      publicUrls[entity].push(publicUrl);
    }
  }

  publicUrls.subgroups = [...publicUrls.muscles];
  return publicUrls;
}

async function fillTable(client, table, entityKey, idField = 'id') {
  const pool = entityKey;
  const response = await client.from(table).select(`${idField},image_url`).order(idField, { ascending: true });
  if (response.error) throw response.error;
  return response.data || [];
}

async function applyFill(client, table, rows, urls, sourceLabel) {
  let updated = 0;
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    if (row.image_url) continue;
    const imageUrl = urls[i % urls.length];
    const patch = {
      image_url: imageUrl,
      image_source: sourceLabel,
      image_credit: 'Unsplash photographer',
      image_license: 'Unsplash License',
      image_status: 'found',
      image_updated_at: new Date().toISOString(),
    };
    const up = await client.from(table).update(patch).eq('id', row.id);
    if (up.error) throw up.error;
    updated += 1;
  }
  return updated;
}

async function main() {
  const client = createSupabase();
  console.log('[fallback-fill] uploading fallback pool...');
  const pools = await ensureFallbackPool(client);

  const [exerciseRows, machineRows, muscleRows, subgroupRows] = await Promise.all([
    fillTable(client, 'catalog_exercises', 'exercises'),
    fillTable(client, 'catalog_machines', 'machines'),
    fillTable(client, 'muscles', 'muscles'),
    fillTable(client, 'muscle_subgroups', 'subgroups'),
  ]);

  const [exUpdated, maUpdated, muUpdated, suUpdated] = await Promise.all([
    applyFill(client, 'catalog_exercises', exerciseRows, pools.exercises, 'unsplash_fallback'),
    applyFill(client, 'catalog_machines', machineRows, pools.machines, 'unsplash_fallback'),
    applyFill(client, 'muscles', muscleRows, pools.muscles, 'unsplash_fallback'),
    applyFill(client, 'muscle_subgroups', subgroupRows, pools.subgroups, 'unsplash_fallback'),
  ]);

  console.log(`[fallback-fill] updated exercises=${exUpdated} machines=${maUpdated} muscles=${muUpdated} subgroups=${suUpdated}`);
}

main().catch((error) => {
  console.error('[fallback-fill] failed', error?.message || error);
  process.exit(1);
});
