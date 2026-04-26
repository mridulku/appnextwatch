#!/usr/bin/env node
/* eslint-disable no-console */
const { spawnSync } = require('child_process');
const path = require('path');

const scriptDir = __dirname;

function run(scriptName, args = []) {
  const scriptPath = path.join(scriptDir, scriptName);
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function main() {
  run('score_and_pick.js');
  run('mirror_to_storage.js');
  run('writeback_metadata.js');
}

main();
