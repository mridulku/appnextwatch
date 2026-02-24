#!/usr/bin/env node
/* eslint-disable no-console */

const { makeSupabaseClient } = require('./common');

async function main() {
  const client = makeSupabaseClient();

  const [subgroupsRes, exerciseMapRes, machineMapRes, exerciseCatalogRes, machineCatalogRes] = await Promise.all([
    client.from('muscle_subgroups').select('id,name,name_key,muscle_id,muscles(name,name_key)').order('name', { ascending: true }),
    client.from('muscle_exercise_map').select('muscle_subgroup_id,target_score').gte('target_score', 40),
    client.from('muscle_machine_map').select('muscle_subgroup_id,target_score').gte('target_score', 40),
    client.from('catalog_exercises').select('id', { head: true, count: 'exact' }).is('created_by', null),
    client.from('catalog_machines').select('id', { head: true, count: 'exact' }).is('created_by', null),
  ]);

  if (subgroupsRes.error) throw subgroupsRes.error;
  if (exerciseMapRes.error) throw exerciseMapRes.error;
  if (machineMapRes.error) throw machineMapRes.error;
  if (exerciseCatalogRes.error) throw exerciseCatalogRes.error;
  if (machineCatalogRes.error) throw machineCatalogRes.error;

  const exerciseCounts = {};
  (exerciseMapRes.data || []).forEach((row) => {
    exerciseCounts[row.muscle_subgroup_id] = (exerciseCounts[row.muscle_subgroup_id] || 0) + 1;
  });

  const machineCounts = {};
  (machineMapRes.data || []).forEach((row) => {
    machineCounts[row.muscle_subgroup_id] = (machineCounts[row.muscle_subgroup_id] || 0) + 1;
  });

  const violations = [];
  (subgroupsRes.data || []).forEach((subgroup) => {
    const exerciseCount = exerciseCounts[subgroup.id] || 0;
    const machineCount = machineCounts[subgroup.id] || 0;
    if (exerciseCount < 3 || machineCount < 1) {
      violations.push({
        subgroup: subgroup.name,
        group: subgroup.muscles?.name || subgroup.muscle_id,
        exerciseCount,
        machineCount,
      });
    }
  });

  console.log('[gym-mapping] coverage report');
  console.log(`[gym-mapping] catalog_exercises total: ${exerciseCatalogRes.count || 0}`);
  console.log(`[gym-mapping] catalog_machines total: ${machineCatalogRes.count || 0}`);

  if (!violations.length) {
    console.log('[gym-mapping] coverage OK (all subgroups >=3 exercises and >=1 machine).');
    return;
  }

  console.log('[gym-mapping] coverage gaps:');
  violations.forEach((v) => {
    console.log(` - ${v.group} / ${v.subgroup}: exercises=${v.exerciseCount}, machines=${v.machineCount}`);
  });
  process.exit(1);
}

main().catch((error) => {
  console.error('[gym-mapping] validate_coverage failed');
  console.error(error?.message || error);
  process.exit(1);
});
