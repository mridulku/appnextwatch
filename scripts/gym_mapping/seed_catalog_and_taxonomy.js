#!/usr/bin/env node
/* eslint-disable no-console */

const {
  EXERCISE_CATALOG,
  EXERCISE_MOVEMENT_CATALOG,
  MACHINE_CATALOG,
  MUSCLE_TAXONOMY,
  makeSupabaseClient,
  normalizeName,
} = require('./common');

async function ensureCatalogExerciseMovement(client, movement) {
  const payload = {
    slug: movement.slug,
    name: movement.name,
    category: movement.category,
    primary_muscle_group: movement.primary_muscle_group,
    primary_day: movement.primary_day,
    movement_family: movement.movement_family || null,
    aliases: Array.isArray(movement.aliases) ? movement.aliases : [],
  };

  const response = await client
    .from('catalog_exercise_movements')
    .upsert(payload, { onConflict: 'slug' })
    .select('id,slug,name,image_url,image_source,image_credit,image_license,image_status,image_updated_at,video_youtube_id')
    .single();

  if (response.error) throw response.error;
  return response.data;
}

async function ensureCatalogExercise(client, payload) {
  const key = normalizeName(payload.name);
  const existing = await client
    .from('catalog_exercises')
    .select('id,name,image_url,image_source,image_credit,image_license,image_status,image_updated_at')
    .eq('name_key', key)
    .is('created_by', null)
    .maybeSingle();

  if (existing.error) throw existing.error;

  const nextPayload = {
    name: payload.name,
    type: payload.type,
    primary_muscle_group: payload.primary_muscle_group,
    equipment: payload.equipment,
    movement_id: payload.movement_id,
    variant_label: payload.variant_label,
    variant_kind: payload.variant_kind,
    sort_order: payload.sort_order,
    is_primary_variant: payload.is_primary_variant,
    created_by: null,
  };

  if (existing.data?.id) {
    const updated = await client
      .from('catalog_exercises')
      .update(nextPayload)
      .eq('id', existing.data.id)
      .select('id,name,image_url,image_source,image_credit,image_license,image_status,image_updated_at')
      .single();

    if (updated.error) throw updated.error;
    return updated.data;
  }

  const inserted = await client
    .from('catalog_exercises')
    .insert(nextPayload)
    .select('id,name,image_url,image_source,image_credit,image_license,image_status,image_updated_at')
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
  if (existing.data?.id) {
    const updated = await client
      .from('catalog_machines')
      .update({
        name: payload.name,
        zone: payload.zone,
        primary_muscles: payload.primary_muscles,
      })
      .eq('id', existing.data.id)
      .select('id,name')
      .single();
    if (updated.error) throw updated.error;
    return updated.data;
  }

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

async function backfillMovementImages(client, movementRowsBySlug, variantRowsBySlug) {
  for (const movement of EXERCISE_MOVEMENT_CATALOG) {
    const currentMovement = movementRowsBySlug[movement.slug];
    if (!currentMovement?.id) continue;
    if (currentMovement.image_url) continue;

    const primaryVariant = (variantRowsBySlug[movement.slug] || []).find((row) => row.is_primary_variant) ||
      (variantRowsBySlug[movement.slug] || [])[0];
    if (!primaryVariant?.image_url) continue;

    const response = await client
      .from('catalog_exercise_movements')
      .update({
        image_url: primaryVariant.image_url,
        image_source: primaryVariant.image_source || null,
        image_credit: primaryVariant.image_credit || null,
        image_license: primaryVariant.image_license || null,
        image_status: primaryVariant.image_status || 'found',
        image_updated_at: primaryVariant.image_updated_at || new Date().toISOString(),
      })
      .eq('id', currentMovement.id);

    if (response.error) throw response.error;
  }
}

async function backfillSessionExerciseMovementIds(client) {
  const response = await client.rpc('exec_sql', {
    sql: `
      update public.user_gym_session_exercises as session_exercise
      set movement_id = exercise.movement_id
      from public.catalog_exercises as exercise
      where session_exercise.exercise_id = exercise.id
        and session_exercise.movement_id is distinct from exercise.movement_id;
    `,
  });

  if (!response.error) return;

  const fallback = await client
    .from('user_gym_session_exercises')
    .select('id,exercise_id')
    .is('movement_id', null);

  if (fallback.error) throw fallback.error;
  const rows = fallback.data || [];
  if (!rows.length) return;

  const exerciseIds = [...new Set(rows.map((row) => row.exercise_id).filter(Boolean))];
  if (!exerciseIds.length) return;
  const exerciseRes = await client
    .from('catalog_exercises')
    .select('id,movement_id')
    .in('id', exerciseIds);
  if (exerciseRes.error) throw exerciseRes.error;
  const movementByExerciseId = Object.fromEntries((exerciseRes.data || []).map((row) => [row.id, row.movement_id]));

  for (const row of rows) {
    const movementId = movementByExerciseId[row.exercise_id];
    if (!movementId) continue;
    const update = await client
      .from('user_gym_session_exercises')
      .update({ movement_id: movementId })
      .eq('id', row.id);
    if (update.error) throw update.error;
  }
}

async function main() {
  const client = makeSupabaseClient({ requireServiceRole: true });

  const movementRowsBySlug = {};
  for (const movement of EXERCISE_MOVEMENT_CATALOG) {
    const row = await ensureCatalogExerciseMovement(client, movement);
    movementRowsBySlug[movement.slug] = row;
  }

  const variantRowsBySlug = {};
  for (const movement of EXERCISE_MOVEMENT_CATALOG) {
    const movementRow = movementRowsBySlug[movement.slug];
    variantRowsBySlug[movement.slug] = [];
    for (const variant of movement.variants || []) {
      const row = await ensureCatalogExercise(client, {
        name: variant.source_name,
        type: variant.type,
        primary_muscle_group: variant.primary_muscle_group || movement.primary_muscle_group,
        equipment: variant.equipment,
        movement_id: movementRow.id,
        variant_label: variant.variant_label,
        variant_kind: variant.variant_kind,
        sort_order: Number(variant.sort_order || 1),
        is_primary_variant: Boolean(variant.is_primary_variant),
      });
      variantRowsBySlug[movement.slug].push({
        ...row,
        is_primary_variant: Boolean(variant.is_primary_variant),
      });
    }
  }

  for (const machine of MACHINE_CATALOG) {
    await ensureCatalogMachine(client, machine);
  }

  await seedMuscleTaxonomy(client);
  await backfillMovementImages(client, movementRowsBySlug, variantRowsBySlug);
  await backfillSessionExerciseMovementIds(client);

  const [movementCount, exerciseCount, machineCount, muscleCount, subgroupCount] = await Promise.all([
    client.from('catalog_exercise_movements').select('id', { head: true, count: 'exact' }),
    client.from('catalog_exercises').select('id', { head: true, count: 'exact' }).is('created_by', null),
    client.from('catalog_machines').select('id', { head: true, count: 'exact' }).is('created_by', null),
    client.from('muscles').select('id', { head: true, count: 'exact' }),
    client.from('muscle_subgroups').select('id', { head: true, count: 'exact' }),
  ]);

  if (movementCount.error) throw movementCount.error;
  if (exerciseCount.error) throw exerciseCount.error;
  if (machineCount.error) throw machineCount.error;
  if (muscleCount.error) throw muscleCount.error;
  if (subgroupCount.error) throw subgroupCount.error;

  console.log('[gym-mapping] catalog+taxonomy seeded');
  console.log(`[gym-mapping] catalog_exercise_movements: ${movementCount.count || 0}`);
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
