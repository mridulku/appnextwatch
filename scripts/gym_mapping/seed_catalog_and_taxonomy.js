#!/usr/bin/env node
/* eslint-disable no-console */

const {
  EXERCISE_CATALOG,
  MACHINE_CATALOG,
  MUSCLE_TAXONOMY,
  makeSupabaseClient,
  normalizeName,
} = require('./common');

async function ensureCatalogExercise(client, payload) {
  const key = normalizeName(payload.name);
  const existing = await client
    .from('catalog_exercises')
    .select('id,name')
    .eq('name_key', key)
    .is('created_by', null)
    .maybeSingle();

  if (existing.error) throw existing.error;
  if (existing.data?.id) return existing.data;

  const inserted = await client
    .from('catalog_exercises')
    .insert({
      name: payload.name,
      type: payload.type,
      primary_muscle_group: payload.primary_muscle_group,
      equipment: payload.equipment,
      created_by: null,
    })
    .select('id,name')
    .single();

  if (inserted.error) throw inserted.error;
  return inserted.data;
}

async function ensureCatalogMachine(client, payload) {
  const key = normalizeName(payload.name);
  const existing = await client
    .from('catalog_machines')
    .select('id,name')
    .eq('name_key', key)
    .is('created_by', null)
    .maybeSingle();

  if (existing.error) throw existing.error;
  if (existing.data?.id) return existing.data;

  const inserted = await client
    .from('catalog_machines')
    .insert({
      name: payload.name,
      zone: payload.zone,
      primary_muscles: payload.primary_muscles,
      created_by: null,
    })
    .select('id,name')
    .single();

  if (inserted.error) throw inserted.error;
  return inserted.data;
}

async function seedMuscleTaxonomy(client) {
  for (const group of MUSCLE_TAXONOMY) {
    const upsertGroup = await client
      .from('muscles')
      .upsert(
        {
          name: group.name,
          name_key: group.key,
          sort_order: group.sort_order,
        },
        { onConflict: 'name_key' },
      )
      .select('id')
      .single();

    if (upsertGroup.error) throw upsertGroup.error;
    const muscleId = upsertGroup.data.id;

    for (const subgroup of group.subgroups) {
      const upsertSubgroup = await client
        .from('muscle_subgroups')
        .upsert(
          {
            muscle_id: muscleId,
            name: subgroup.name,
            name_key: subgroup.key,
            sort_order: subgroup.sort_order,
          },
          { onConflict: 'muscle_id,name_key' },
        );

      if (upsertSubgroup.error) throw upsertSubgroup.error;
    }
  }
}

async function main() {
  const client = makeSupabaseClient({ requireServiceRole: true });

  for (const exercise of EXERCISE_CATALOG) {
    await ensureCatalogExercise(client, exercise);
  }

  for (const machine of MACHINE_CATALOG) {
    await ensureCatalogMachine(client, machine);
  }

  await seedMuscleTaxonomy(client);

  const [exerciseCount, machineCount, muscleCount, subgroupCount] = await Promise.all([
    client.from('catalog_exercises').select('id', { head: true, count: 'exact' }).is('created_by', null),
    client.from('catalog_machines').select('id', { head: true, count: 'exact' }).is('created_by', null),
    client.from('muscles').select('id', { head: true, count: 'exact' }),
    client.from('muscle_subgroups').select('id', { head: true, count: 'exact' }),
  ]);

  if (exerciseCount.error) throw exerciseCount.error;
  if (machineCount.error) throw machineCount.error;
  if (muscleCount.error) throw muscleCount.error;
  if (subgroupCount.error) throw subgroupCount.error;

  console.log('[gym-mapping] catalog+taxonomy seeded');
  console.log(`[gym-mapping] catalog_exercises: ${exerciseCount.count || 0}`);
  console.log(`[gym-mapping] catalog_machines: ${machineCount.count || 0}`);
  console.log(`[gym-mapping] muscles: ${muscleCount.count || 0}`);
  console.log(`[gym-mapping] muscle_subgroups: ${subgroupCount.count || 0}`);
}

main().catch((error) => {
  console.error('[gym-mapping] seed_catalog_and_taxonomy failed');
  console.error(error?.message || error);
  process.exit(1);
});
