/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const ARTIFACT_DIR = path.join(ROOT_DIR, 'app', 'docs', 'catalog_images');
const CANDIDATES_PATH = path.join(ARTIFACT_DIR, 'candidates.json');
const SELECTIONS_PATH = path.join(ARTIFACT_DIR, 'selections.json');
const MIRROR_RESULTS_PATH = path.join(ARTIFACT_DIR, 'mirror_results.json');
const REVIEW_QUEUE_PATH = path.join(ARTIFACT_DIR, 'review_queue.json');
const REPORT_PATH = path.join(ARTIFACT_DIR, 'report.json');
const BUCKET = 'gym-catalog-images';

function getEnv(key, fallback = '') {
  const value = process.env[key];
  return value && String(value).trim() ? String(value).trim() : fallback;
}

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function slugify(value) {
  return normalize(value).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function nowIso() {
  return new Date().toISOString();
}

function sha256(input) {
  return crypto.createHash('sha256').update(String(input || '')).digest('hex');
}

function safeJsonParse(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch (_error) {
    return fallback;
  }
}

function ensureArtifactDir() {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

function writeJson(filePath, value) {
  ensureArtifactDir();
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  const raw = fs.readFileSync(filePath, 'utf8');
  return safeJsonParse(raw, fallback);
}

function extFromMime(mimeType) {
  const mime = normalize(mimeType);
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  return 'jpg';
}

function isAllowedImageMime(mimeType) {
  const mime = normalize(mimeType);
  return (
    mime.includes('image/jpeg')
    || mime.includes('image/jpg')
    || mime.includes('image/png')
    || mime.includes('image/webp')
  );
}

function looksLikeAllowedImageUrl(url) {
  const value = String(url || '').toLowerCase();
  if (!value) return false;
  const clean = value.split('?')[0];
  return (
    clean.endsWith('.jpg')
    || clean.endsWith('.jpeg')
    || clean.endsWith('.png')
    || clean.endsWith('.webp')
  );
}

function makeSupabaseClient({ requireServiceRole = false } = {}) {
  const url = getEnv('EXPO_PUBLIC_SUPABASE_URL', getEnv('SUPABASE_URL'));
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = getEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY', getEnv('SUPABASE_ANON_KEY'));
  const key = serviceRoleKey || anonKey;

  if (!url || !key) {
    throw new Error('Missing Supabase env. Set EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or anon key).');
  }
  if (requireServiceRole && !serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for gym image write scripts.');
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

async function fetchJson(url, headers = {}) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'appnextwatch-gym-image-bot/1.0',
      ...headers,
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return response.json();
}

async function fetchArrayBuffer(url, headers = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'appnextwatch-gym-image-bot/1.0',
      ...headers,
    },
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  const contentType = response.headers.get('content-type') || '';
  const arrayBuffer = await response.arrayBuffer();
  return { contentType, arrayBuffer };
}

async function listGymImageTargets(client, { includeFound = false } = {}) {
  const [exercisesRes, machinesRes, musclesRes, subgroupsRes] = await Promise.all([
    client.from('catalog_exercises').select('id,name,name_key,type,primary_muscle_group,equipment,image_status,image_url').is('created_by', null),
    client.from('catalog_machines').select('id,name,name_key,zone,primary_muscles,image_status,image_url').is('created_by', null),
    client.from('muscles').select('id,name,name_key,image_status,image_url'),
    client.from('muscle_subgroups').select('id,name,name_key,muscle_id,image_status,image_url,muscles(name,name_key)'),
  ]);

  if (exercisesRes.error) throw exercisesRes.error;
  if (machinesRes.error) throw machinesRes.error;
  if (musclesRes.error) throw musclesRes.error;
  if (subgroupsRes.error) throw subgroupsRes.error;

  const rows = [
    ...(exercisesRes.data || []).map((row) => ({ entity: 'exercises', ...row })),
    ...(machinesRes.data || []).map((row) => ({ entity: 'machines', ...row })),
    ...(musclesRes.data || []).map((row) => ({ entity: 'muscles', ...row })),
    ...(subgroupsRes.data || []).map((row) => ({
      entity: 'subgroups',
      ...row,
      parent_name: row?.muscles?.name || null,
      parent_name_key: row?.muscles?.name_key || null,
    })),
  ];

  if (includeFound) return rows;
  return rows.filter((row) => !row.image_url || normalize(row.image_status) !== 'found');
}

module.exports = {
  ARTIFACT_DIR,
  BUCKET,
  CANDIDATES_PATH,
  MIRROR_RESULTS_PATH,
  REPORT_PATH,
  REVIEW_QUEUE_PATH,
  SELECTIONS_PATH,
  ensureArtifactDir,
  extFromMime,
  isAllowedImageMime,
  looksLikeAllowedImageUrl,
  fetchArrayBuffer,
  fetchJson,
  getEnv,
  listGymImageTargets,
  makeSupabaseClient,
  normalize,
  nowIso,
  readJson,
  sha256,
  slugify,
  writeJson,
};
