/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { makeSupabaseClient } = require('../gym_mapping/common');

const ROOT = path.resolve(__dirname, '..', '..');
const OUTPUT_DIR = path.join(ROOT, 'machineimages');
const APPLIED_PATH = path.join(OUTPUT_DIR, 'machine_matches_applied.json');
const REVIEW_PATH = path.join(OUTPUT_DIR, 'machine_review_applied.json');
const RESULT_PATH = path.join(OUTPUT_DIR, 'machine_prune_result.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadKeepNames() {
  const applied = readJson(APPLIED_PATH);
  const review = readJson(REVIEW_PATH);
  const names = new Set();

  for (const item of applied.items || []) {
    if (item.machine_name) names.add(item.machine_name);
  }
  for (const item of review.items || []) {
    if (item.machine_name) names.add(item.machine_name);
  }

  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

async function main() {
  const supabase = makeSupabaseClient({ requireServiceRole: true });
  const keepNames = loadKeepNames();

  if (!keepNames.length) {
    throw new Error('No keep names found from applied machine photo outputs.');
  }

  const { data: rows, error } = await supabase
    .from('catalog_machines')
    .select('id, name, image_url')
    .order('name', { ascending: true });

  if (error) {
    throw error;
  }

  const keepSet = new Set(keepNames);
  const keepRows = rows.filter((row) => keepSet.has(row.name));
  const deleteRows = rows.filter((row) => !keepSet.has(row.name));

  if (keepRows.length !== keepNames.length) {
    const missing = keepNames.filter((name) => !keepRows.find((row) => row.name === name));
    throw new Error(`Keep-set mismatch. Missing rows in catalog_machines: ${missing.join(', ')}`);
  }

  if (deleteRows.length) {
    const deleteIds = deleteRows.map((row) => row.id);
    const { error: deleteError } = await supabase
      .from('catalog_machines')
      .delete()
      .in('id', deleteIds);

    if (deleteError) {
      throw deleteError;
    }
  }

  const result = {
    generated_at: new Date().toISOString(),
    kept_count: keepRows.length,
    deleted_count: deleteRows.length,
    kept_names: keepRows.map((row) => row.name),
    deleted_names: deleteRows.map((row) => row.name),
  };

  fs.writeFileSync(RESULT_PATH, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`[gym-machines] kept=${result.kept_count} deleted=${result.deleted_count}`);
  console.log(`[gym-machines] wrote ${path.relative(ROOT, RESULT_PATH)}`);
}

main().catch((error) => {
  console.error('[gym-machines] prune failed');
  console.error(error.message || error);
  process.exit(1);
});
