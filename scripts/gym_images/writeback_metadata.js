#!/usr/bin/env node
/* eslint-disable no-console */
const {
  MIRROR_RESULTS_PATH,
  makeSupabaseClient,
  nowIso,
  readJson,
} = require('./common');

function tableForEntity(entity) {
  if (entity === 'exercises') return 'catalog_exercises';
  if (entity === 'machines') return 'catalog_machines';
  if (entity === 'muscles') return 'muscles';
  return 'muscle_subgroups';
}

async function updateOne(client, row) {
  const table = tableForEntity(row.entity);
  const patch = {
    image_url: row.image_url || null,
    image_source: row.image_source || null,
    image_credit: row.image_credit || null,
    image_license: row.image_license || null,
    image_status: row.status || 'pending',
    image_updated_at: nowIso(),
  };

  const response = await client
    .from(table)
    .update(patch)
    .eq('id', row.id)
    .select('id')
    .single();

  if (response.error) throw response.error;
  return response.data;
}

async function main() {
  const payload = readJson(MIRROR_RESULTS_PATH, null);
  if (!payload || !Array.isArray(payload.items)) {
    throw new Error(`Missing mirror results file: ${MIRROR_RESULTS_PATH}`);
  }

  const client = makeSupabaseClient({ requireServiceRole: true });
  const updatable = payload.items.filter((row) => ['found', 'pending', 'missing', 'rejected'].includes(row.status));

  let success = 0;
  let failed = 0;
  for (let i = 0; i < updatable.length; i += 1) {
    const row = updatable[i];
    try {
      await updateOne(client, row);
      success += 1;
    } catch (error) {
      failed += 1;
      console.error(`[gym-images] writeback failed entity=${row.entity} id=${row.id}: ${error?.message || error}`);
    }
  }

  console.log(`[gym-images] writeback complete success=${success} failed=${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error('[gym-images] writeback_metadata failed');
  console.error(error?.message || error);
  process.exit(1);
});
