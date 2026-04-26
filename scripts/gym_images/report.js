#!/usr/bin/env node
/* eslint-disable no-console */
const {
  REPORT_PATH,
  makeSupabaseClient,
  nowIso,
  writeJson,
} = require('./common');

async function statusCounts(client, table) {
  const response = await client.from(table).select('image_status');
  if (response.error) throw response.error;
  const rows = response.data || [];
  const counts = rows.reduce((acc, row) => {
    const key = String(row?.image_status || 'pending');
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  return {
    total: rows.length,
    found: counts.found || 0,
    pending: counts.pending || 0,
    missing: counts.missing || 0,
    rejected: counts.rejected || 0,
  };
}

function pct(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 10000) / 100;
}

async function main() {
  const client = makeSupabaseClient({ requireServiceRole: false });
  const [exercises, machines, muscles, subgroups] = await Promise.all([
    statusCounts(client, 'catalog_exercises'),
    statusCounts(client, 'catalog_machines'),
    statusCounts(client, 'muscles'),
    statusCounts(client, 'muscle_subgroups'),
  ]);

  const payload = {
    generated_at: nowIso(),
    coverage: {
      exercises: { ...exercises, found_pct: pct(exercises.found, exercises.total) },
      machines: { ...machines, found_pct: pct(machines.found, machines.total) },
      muscles: { ...muscles, found_pct: pct(muscles.found, muscles.total) },
      subgroups: { ...subgroups, found_pct: pct(subgroups.found, subgroups.total) },
    },
  };
  writeJson(REPORT_PATH, payload);

  console.log('[gym-images] coverage');
  Object.entries(payload.coverage).forEach(([key, value]) => {
    console.log(`- ${key}: found ${value.found}/${value.total} (${value.found_pct}%), pending=${value.pending}, missing=${value.missing}, rejected=${value.rejected}`);
  });
}

main().catch((error) => {
  console.error('[gym-images] report failed');
  console.error(error?.message || error);
  process.exit(1);
});
