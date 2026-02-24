#!/usr/bin/env node
/* eslint-disable no-console */

const { makeSupabaseClient } = require('./common');

function norm(value) {
  return String(value || '').toLowerCase();
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function equipmentCompatibility(machine, exercise) {
  const machineText = `${machine.name} ${machine.zone || ''}`.toLowerCase();
  const eq = norm(exercise.equipment);

  if ((eq.includes('machine') || eq.includes('cable')) && (machineText.includes('machine') || machineText.includes('cable') || machineText.includes('pulley'))) {
    return 16;
  }

  if ((eq.includes('barbell') || eq.includes('dumbbell')) && (machineText.includes('smith') || machineText.includes('bench') || machineText.includes('rack'))) {
    return 10;
  }

  if (eq.includes('bodyweight') && (machineText.includes('assist') || machineText.includes('captain') || machineText.includes('roman'))) {
    return 8;
  }

  return 0;
}

async function main() {
  const client = makeSupabaseClient({ requireServiceRole: true });

  const [exerciseScoresRes, machineScoresRes, exerciseRes, machineRes] = await Promise.all([
    client.from('muscle_exercise_map').select('exercise_id,muscle_subgroup_id,target_score').gte('target_score', 40),
    client.from('muscle_machine_map').select('machine_id,muscle_subgroup_id,target_score').gte('target_score', 40),
    client.from('catalog_exercises').select('id,name,equipment').is('created_by', null),
    client.from('catalog_machines').select('id,name,zone').is('created_by', null),
  ]);

  if (exerciseScoresRes.error) throw exerciseScoresRes.error;
  if (machineScoresRes.error) throw machineScoresRes.error;
  if (exerciseRes.error) throw exerciseRes.error;
  if (machineRes.error) throw machineRes.error;

  const exerciseRows = exerciseRes.data || [];
  const machineRows = machineRes.data || [];

  const exerciseScoreByExercise = {};
  (exerciseScoresRes.data || []).forEach((row) => {
    if (!exerciseScoreByExercise[row.exercise_id]) exerciseScoreByExercise[row.exercise_id] = {};
    exerciseScoreByExercise[row.exercise_id][row.muscle_subgroup_id] = row.target_score;
  });

  const machineScoreByMachine = {};
  (machineScoresRes.data || []).forEach((row) => {
    if (!machineScoreByMachine[row.machine_id]) machineScoreByMachine[row.machine_id] = {};
    machineScoreByMachine[row.machine_id][row.muscle_subgroup_id] = row.target_score;
  });

  const exerciseById = Object.fromEntries(exerciseRows.map((row) => [row.id, row]));
  const machineById = Object.fromEntries(machineRows.map((row) => [row.id, row]));

  const inserts = [];
  Object.entries(machineScoreByMachine).forEach(([machineId, machineVector]) => {
    const machine = machineById[machineId];
    if (!machine) return;

    Object.entries(exerciseScoreByExercise).forEach(([exerciseId, exerciseVector]) => {
      const exercise = exerciseById[exerciseId];
      if (!exercise) return;

      const overlapKeys = Object.keys(machineVector).filter((subgroupId) => exerciseVector[subgroupId]);
      if (!overlapKeys.length) return;

      let overlapScore = 0;
      let maxAligned = 0;
      overlapKeys.forEach((subgroupId) => {
        const eScore = exerciseVector[subgroupId];
        const mScore = machineVector[subgroupId];
        overlapScore += Math.min(eScore, mScore);
        maxAligned = Math.max(maxAligned, (eScore + mScore) / 2);
      });

      const overlapAverage = overlapScore / overlapKeys.length;
      const compatibility = equipmentCompatibility(machine, exercise);
      const relevanceScore = clampScore(maxAligned * 0.7 + overlapAverage * 0.2 + compatibility);

      if (relevanceScore < 45) return;

      inserts.push({
        machine_id: machineId,
        exercise_id: exerciseId,
        relevance_score: relevanceScore,
        mapping_source: 'derived_v1',
      });
    });
  });

  const wipe = await client.from('machine_exercise_map').delete().eq('mapping_source', 'derived_v1');
  if (wipe.error) throw wipe.error;

  const chunkSize = 400;
  for (let index = 0; index < inserts.length; index += chunkSize) {
    const chunk = inserts.slice(index, index + chunkSize);
    const response = await client.from('machine_exercise_map').upsert(chunk, {
      onConflict: 'machine_id,exercise_id',
    });
    if (response.error) throw response.error;
  }

  console.log('[gym-mapping] machine_exercise_map derivation done');
  console.log(`[gym-mapping] machine_exercise_map upserted: ${inserts.length}`);
}

main().catch((error) => {
  console.error('[gym-mapping] derive_machine_exercise_map failed');
  console.error(error?.message || error);
  process.exit(1);
});
