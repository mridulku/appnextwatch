#!/usr/bin/env node
/* eslint-disable no-console */

const { spawnSync } = require('child_process');

const steps = [
  'scripts/gym_mapping/seed_catalog_and_taxonomy.js',
  'scripts/gym_mapping/generate_scores.js',
  'scripts/gym_mapping/derive_machine_exercise_map.js',
  'scripts/gym_mapping/validate_coverage.js',
];

for (const step of steps) {
  console.log(`[seed-muscles] running ${step}`);
  const result = spawnSync(process.execPath, [step], {
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

console.log('[seed-muscles] complete');
