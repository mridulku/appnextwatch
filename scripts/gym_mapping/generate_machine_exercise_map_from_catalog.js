#!/usr/bin/env node
/* eslint-disable no-console */

const { makeSupabaseClient, normalizeName } = require('./common');
const { MACHINE_MOVEMENT_CATALOG } = require('./machineMovementCatalog');

function findByName(rows, name, label) {
  const key = normalizeName(name);
  const row = rows.find((entry) => normalizeName(entry.name) === key);
  if (!row) {
    throw new Error(`Unknown ${label}: ${name}`);
  }
  return row;
}

async function main() {
  const client = makeSupabaseClient({ requireServiceRole: true });

  const [machinesRes, movementsRes, variantsRes] = await Promise.all([
    client.from('catalog_machines').select('id,name').is('created_by', null),
    client.from('catalog_exercise_movements').select('id,slug,name'),
    client
      .from('catalog_exercises')
      .select('id,name,movement_id,variant_label')
      .is('created_by', null),
  ]);

  if (machinesRes.error) throw machinesRes.error;
  if (movementsRes.error) throw movementsRes.error;
  if (variantsRes.error) throw variantsRes.error;

  const machines = machinesRes.data || [];
  const movements = movementsRes.data || [];
  const variants = variantsRes.data || [];
  const movementBySlug = Object.fromEntries((movements || []).map((row) => [row.slug, row]));

  const inserts = [];
  for (const machineSpec of MACHINE_MOVEMENT_CATALOG) {
    const machine = findByName(machines, machineSpec.machine_name, 'machine_name');
    for (const allowed of machineSpec.allowed_movements || []) {
      const movement = movementBySlug[allowed.movement_slug];
      if (!movement) {
        throw new Error(`Unknown movement_slug: ${allowed.movement_slug}`);
      }

      let movementVariants = variants.filter((row) => row.movement_id === movement.id);
      if (Array.isArray(allowed.allowed_variant_labels) && allowed.allowed_variant_labels.length) {
        movementVariants = movementVariants.filter((row) => allowed.allowed_variant_labels.includes(row.variant_label));
      }
      if (Array.isArray(allowed.allowed_variant_names) && allowed.allowed_variant_names.length) {
        movementVariants = movementVariants.filter((row) => allowed.allowed_variant_names.includes(row.name));
      }

      if (!movementVariants.length) {
        throw new Error(
          `No variants found for movement_slug=${allowed.movement_slug} on machine=${machineSpec.machine_name}`,
        );
      }

      for (const variant of movementVariants) {
        inserts.push({
          machine_id: machine.id,
          exercise_id: variant.id,
          relevance_score: Number(allowed.relevance_score || 80),
          mapping_source: 'curated_v2',
        });
      }
    }
  }

  const wipe = await client.from('machine_exercise_map').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (wipe.error) throw wipe.error;

  const chunkSize = 400;
  for (let index = 0; index < inserts.length; index += chunkSize) {
    const chunk = inserts.slice(index, index + chunkSize);
    const response = await client.from('machine_exercise_map').upsert(chunk, {
      onConflict: 'machine_id,exercise_id',
    });
    if (response.error) throw response.error;
  }

  console.log('[gym-mapping] curated machine_exercise_map generated');
  console.log(`[gym-mapping] machine_exercise_map upserted: ${inserts.length}`);
}

main().catch((error) => {
  console.error('[gym-mapping] generate_machine_exercise_map_from_catalog failed');
  console.error(error?.message || error);
  process.exit(1);
});
