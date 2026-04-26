#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const SOURCE_DIR = path.join(ROOT_DIR, 'machineimages');
const OUTPUT_DIR = path.join(SOURCE_DIR, 'converted');
const MANIFEST_PATH = path.join(SOURCE_DIR, 'manifest.json');
const MAX_WIDTH = 1600;

function runSips(args) {
  const result = spawnSync('/usr/bin/sips', args, { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `sips failed: ${args.join(' ')}`);
  }
  return result.stdout;
}

function parseDimension(output, key) {
  const line = String(output || '')
    .split('\n')
    .find((entry) => entry.includes(`${key}:`));
  if (!line) return null;
  const value = Number(line.split(':').pop().trim());
  return Number.isFinite(value) ? value : null;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function listHeicFiles() {
  if (!fs.existsSync(SOURCE_DIR)) {
    throw new Error(`Missing folder: ${SOURCE_DIR}`);
  }
  return fs.readdirSync(SOURCE_DIR)
    .filter((name) => /\.hei[cf]$/i.test(name))
    .sort((a, b) => a.localeCompare(b));
}

function readDimensions(filePath) {
  const output = runSips(['-g', 'pixelWidth', '-g', 'pixelHeight', filePath]);
  return {
    width: parseDimension(output, 'pixelWidth'),
    height: parseDimension(output, 'pixelHeight'),
  };
}

function convertFile(fileName, index) {
  const sourcePath = path.join(SOURCE_DIR, fileName);
  const baseName = path.parse(fileName).name;
  const outputName = `${String(index + 1).padStart(2, '0')}_${baseName}.jpg`;
  const outputPath = path.join(OUTPUT_DIR, outputName);

  runSips(['-s', 'format', 'jpeg', sourcePath, '--out', outputPath]);
  runSips(['-Z', String(MAX_WIDTH), outputPath]);

  const original = readDimensions(sourcePath);
  const converted = readDimensions(outputPath);
  const sizeBytes = fs.statSync(outputPath).size;

  return {
    source_file: fileName,
    source_path: path.relative(ROOT_DIR, sourcePath),
    converted_file: outputName,
    converted_path: path.relative(ROOT_DIR, outputPath),
    original_width: original.width,
    original_height: original.height,
    converted_width: converted.width,
    converted_height: converted.height,
    converted_size_bytes: sizeBytes,
  };
}

function main() {
  ensureDir(OUTPUT_DIR);
  const files = listHeicFiles();
  if (!files.length) {
    console.log('[machine-photos] no HEIC files found');
    return;
  }

  const items = files.map((fileName, index) => convertFile(fileName, index));
  const payload = {
    generated_at: new Date().toISOString(),
    source_dir: path.relative(ROOT_DIR, SOURCE_DIR),
    output_dir: path.relative(ROOT_DIR, OUTPUT_DIR),
    count: items.length,
    items,
  };

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(payload, null, 2));
  console.log(`[machine-photos] converted ${items.length} images`);
  console.log(`[machine-photos] manifest: ${path.relative(ROOT_DIR, MANIFEST_PATH)}`);
}

main();
