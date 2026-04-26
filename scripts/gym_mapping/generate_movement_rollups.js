#!/usr/bin/env node
/* eslint-disable no-console */

const { makeSupabaseClient } = require('./common');

function aggregateMax(rows, keyFn, valueFn) {
  const map = new Map();
  for (const row of rows || []) {
    const key = keyFn(row);
    if (!key) continue;
    const current = map.get(key);
    const nextValue = valueFn(row);
    if (!current) {
      map.set(key, {
        ...row,
        _maxValue: nextValue,
        _variantIds: new Set([row.exercise_id].filter(Boolean)),
      });
      continue;
    }
    current._variantIds.add(row.exercise_id);
    if (nextValue > current._maxValue) {
      current._maxValue = nextValue;
      Object.assign(current, row);
    }
  }
  return [...map.values()];
}

async function upsertInBatches(client, table, rows, onConflict) {
  const chunkSize = 400;
  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    const response = await client.from(table).upsert(chunk, { onConflict });
    if (response.error) throw response.error;
  }
}

async function main() {
  const client = makeSupabaseClient({ requireServiceRole: true });

  const [exercisesRes, muscleMapRes, machineMapRes] = await Promise.all([
    client.from('catalog_exercises').select('id,movement_id').not('movement_id', 'is', null).is('created_by', null),
    client.from('muscle_exercise_map').select('exercise_id,muscle_subgroup_id,target_score').gte('target_score', 40),
    client.from('machine_exercise_map').select('exercise_id,machine_id,relevance_score').gte('relevance_score', 45),
  ]);

  if (exercisesRes.error) throw exercisesRes.error;
  if (muscleMapRes.error) throw muscleMapRes.error;
  if (machineMapRes.error) throw machineMapRes.error;

  const movementByExerciseId = Object.fromEntries((exercisesRes.data || []).map((row) => [row.id, row.movement_id]));

  const movementMuscleRows = aggregateMax(
    (muscleMapRes.data || [])
      .map((row) => ({
        ...row,
        movement_id: movementByExerciseId[row.exercise_id] || null,
      }))
      .filter((row) => row.movement_id),
    (row) => `${row.movement_id}:${row.muscle_subgroup_id}`,
    (row) => Number(row.target_score || 0),
  ).map((row) => ({
    movement_id: row.movement_id,
    muscle_subgroup_id: row.muscle_subgroup_id,
    target_score: Number(row.target_score || 0),
    aggregation_method: 'max_variant_score',
    variant_count: row._variantIds?.size || 1,
  }));

  const movementMachineRows = aggregateMax(
    (machineMapRes.data || [])
      .map((row) => ({
        ...row,
        movement_id: movementByExerciseId[row.exercise_id] || null,
      }))
      .filter((row) => row.movement_id),
    (row) => `${row.movement_id}:${row.machine_id}`,
    (row) => Number(row.relevance_score || 0),
  ).map((row) => ({
    movement_id: row.movement_id,
    machine_id: row.machine_id,
    relevance_score: Number(row.relevance_score || 0),
    aggregation_method: 'max_variant_score',
    variant_count: row._variantIds?.size || 1,
  }));

  const wipeMuscle = await client.from('muscle_exercise_movement_map').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (wipeMuscle.error) throw wipeMuscle.error;

  const wipeMachine = await client.from('machine_exercise_movement_map').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (wipeMachine.error) throw wipeMachine.error;

  await upsertInBatches(client, 'muscle_exercise_movement_map', movementMuscleRows, 'movement_id,muscle_subgroup_id');
  await upsertInBatches(client, 'machine_exercise_movement_map', movementMachineRows, 'movement_id,machine_id');

  console.log('[gym-mapping] movement rollups generated');
  console.log(`[gym-mapping] muscle_exercise_movement_map upserted: ${movementMuscleRows.length}`);
  console.log(`[gym-mapping] machine_exercise_movement_map upserted: ${movementMachineRows.length}`);
}

main().catch((error) => {
  console.error('[gym-mapping] generate_movement_rollups failed');
  console.error(error?.message || error);
  process.exit(1);
});
