#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs/promises');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'app', 'docs', 'catalog_snapshot');
const JSON_OUTPUT_PATH = path.join(OUTPUT_DIR, 'catalog_snapshot.json');
const MD_OUTPUT_PATH = path.join(OUTPUT_DIR, 'catalog_snapshot.md');

const TABLE_CONFIG = {
  machines: {
    table: 'catalog_machines',
    select: 'id,name,name_key,zone,primary_muscles',
    sortFields: ['zone', 'name', 'id'],
    mapRow: (row) => ({
      id: row.id,
      name: row.name,
      name_key: row.name_key,
      zone: normalizeText(row.zone),
      primary_muscles: Array.isArray(row.primary_muscles) ? row.primary_muscles : [],
    }),
  },
  exercises: {
    table: 'catalog_exercises',
    select: 'id,name,name_key,type,primary_muscle_group,equipment',
    sortFields: ['primary_muscle_group', 'name', 'id'],
    mapRow: (row) => ({
      id: row.id,
      name: row.name,
      name_key: row.name_key,
      type: normalizeText(row.type),
      primary_muscle_group: normalizeText(row.primary_muscle_group),
      equipment: normalizeText(row.equipment),
    }),
  },
  inventory_items: {
    table: 'catalog_ingredients',
    select: 'id,name,name_key,category,unit_type',
    sortFields: ['category', 'name', 'id'],
    mapRow: (row) => ({
      id: row.id,
      name: row.name,
      name_key: row.name_key,
      category: normalizeText(row.category),
      unit_type: normalizeText(row.unit_type),
    }),
  },
  recipes: {
    table: 'catalog_recipes',
    select: 'id,name,name_key,meal_type,servings,total_minutes,difficulty',
    sortFields: ['meal_type', 'name', 'id'],
    mapRow: (row) => ({
      id: row.id,
      name: row.name,
      name_key: row.name_key,
      meal_type: normalizeText(row.meal_type),
      servings: row.servings ?? null,
      total_minutes: row.total_minutes ?? null,
      difficulty: normalizeText(row.difficulty),
    }),
  },
  utensils: {
    table: 'catalog_utensils',
    select: 'id,name,name_key,category,note',
    sortFields: ['category', 'name', 'id'],
    mapRow: (row) => ({
      id: row.id,
      name: row.name,
      name_key: row.name_key,
      category: normalizeText(row.category),
      note: normalizeText(row.note),
    }),
  },
};

function getEnv(key, fallback = '') {
  const value = process.env[key];
  return value && String(value).trim() ? String(value).trim() : fallback;
}

function normalizeText(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length ? normalized : null;
}

function escapeMarkdownCell(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\|/g, '\\|');
}

function maskSupabaseUrl(url) {
  if (!url) return 'not-set';
  try {
    const parsed = new URL(url);
    const host = parsed.hostname || '';
    if (host.length <= 8) {
      return `${parsed.protocol}//${host}`;
    }
    return `${parsed.protocol}//${host.slice(0, 4)}...${host.slice(-4)}`;
  } catch (_error) {
    const trimmed = String(url);
    if (trimmed.length <= 12) return '***';
    return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
  }
}

function rowComparator(sortFields) {
  return (a, b) => {
    for (const field of sortFields) {
      const left = a[field];
      const right = b[field];
      const leftValue = left === null || left === undefined ? '' : String(left).toLowerCase();
      const rightValue = right === null || right === undefined ? '' : String(right).toLowerCase();
      if (leftValue < rightValue) return -1;
      if (leftValue > rightValue) return 1;
    }
    return 0;
  };
}

async function fetchAllRows(client, table, select) {
  const pageSize = 1000;
  let from = 0;
  const rows = [];

  while (true) {
    const { data, error } = await client
      .from(table)
      .select(select)
      .range(from, from + pageSize - 1);

    if (error) throw error;
    const chunk = data || [];
    rows.push(...chunk);
    if (chunk.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

function buildDerivedCategoriesAndTags(tables) {
  const categories = [];
  const tags = [];
  const categorySeen = new Set();
  const tagSeen = new Set();

  function addCategory(entity, field, value) {
    const normalized = normalizeText(value);
    if (!normalized) return;
    const key = `${entity}:${field}:${normalized.toLowerCase()}`;
    if (categorySeen.has(key)) return;
    categorySeen.add(key);
    categories.push({ entity, field, value: normalized });
  }

  function addTag(entity, field, value) {
    const normalized = normalizeText(value);
    if (!normalized) return;
    const key = `${entity}:${field}:${normalized.toLowerCase()}`;
    if (tagSeen.has(key)) return;
    tagSeen.add(key);
    tags.push({ entity, field, value: normalized });
  }

  tables.machines.forEach((row) => {
    addCategory('machines', 'zone', row.zone);
    (row.primary_muscles || []).forEach((muscle) => addTag('machines', 'primary_muscles', muscle));
  });

  tables.exercises.forEach((row) => {
    addCategory('exercises', 'primary_muscle_group', row.primary_muscle_group);
    addTag('exercises', 'type', row.type);
    addTag('exercises', 'equipment', row.equipment);
  });

  tables.inventory_items.forEach((row) => {
    addCategory('inventory_items', 'category', row.category);
    addTag('inventory_items', 'unit_type', row.unit_type);
  });

  tables.recipes.forEach((row) => {
    addCategory('recipes', 'meal_type', row.meal_type);
    addTag('recipes', 'difficulty', row.difficulty);
  });

  tables.utensils.forEach((row) => {
    addCategory('utensils', 'category', row.category);
  });

  categories.sort((a, b) =>
    `${a.entity}:${a.field}:${a.value}`.localeCompare(`${b.entity}:${b.field}:${b.value}`),
  );
  tags.sort((a, b) =>
    `${a.entity}:${a.field}:${a.value}`.localeCompare(`${b.entity}:${b.field}:${b.value}`),
  );

  return { categories, tags };
}

function toMarkdownTable(rows, columns) {
  if (!rows || !rows.length) return '_No rows._';
  const header = `| ${columns.join(' | ')} |`;
  const divider = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => {
    const values = columns.map((column) => {
      const value = row[column];
      if (Array.isArray(value)) return escapeMarkdownCell(value.join(', '));
      return escapeMarkdownCell(value);
    });
    return `| ${values.join(' | ')} |`;
  });
  return [header, divider, ...body].join('\n');
}

function buildMarkdown(snapshot) {
  const lines = [];
  lines.push('# Catalog Snapshot');
  lines.push('');
  lines.push(`- Generated at: ${snapshot.generated_at}`);
  lines.push(`- Source: ${snapshot.env.source}`);
  lines.push(`- Supabase URL: ${snapshot.env.supabase_url}`);
  lines.push('');
  lines.push('## Counts');
  lines.push('');
  lines.push('| Entity | Count |');
  lines.push('| --- | ---: |');
  Object.entries(snapshot.counts).forEach(([entity, count]) => {
    lines.push(`| ${entity} | ${count} |`);
  });

  const tableSections = [
    { title: 'Machines', key: 'machines', columns: ['id', 'name', 'zone', 'primary_muscles'] },
    {
      title: 'Exercises',
      key: 'exercises',
      columns: ['id', 'name', 'primary_muscle_group', 'type', 'equipment'],
    },
    {
      title: 'Inventory Items',
      key: 'inventory_items',
      columns: ['id', 'name', 'category', 'unit_type'],
    },
    {
      title: 'Recipes',
      key: 'recipes',
      columns: ['id', 'name', 'meal_type', 'servings', 'total_minutes', 'difficulty'],
    },
    { title: 'Utensils', key: 'utensils', columns: ['id', 'name', 'category', 'note'] },
    { title: 'Categories (derived)', key: 'categories', columns: ['entity', 'field', 'value'] },
    { title: 'Tags (derived)', key: 'tags', columns: ['entity', 'field', 'value'] },
  ];

  tableSections.forEach((section) => {
    lines.push('');
    lines.push(`## ${section.title}`);
    lines.push('');
    lines.push(toMarkdownTable(snapshot.tables[section.key], section.columns));
  });

  lines.push('');
  lines.push('> NOTE: `categories` and `tags` are derived from catalog row fields; no dedicated category/tag tables were found in migrations.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function buildClientCandidates() {
  const primaryUrl =
    getEnv('EXPO_PUBLIC_SUPABASE_URL') ||
    getEnv('SUPABASE_URL');
  const primaryKey =
    getEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY') ||
    getEnv('SUPABASE_ANON_KEY');

  const localUrl =
    getEnv('SUPABASE_LOCAL_URL') ||
    getEnv('LOCAL_SUPABASE_URL') ||
    'http://127.0.0.1:54321';
  const localKey =
    getEnv('SUPABASE_LOCAL_ANON_KEY') ||
    getEnv('LOCAL_SUPABASE_ANON_KEY');

  const candidates = [];

  if (primaryUrl && primaryKey) {
    candidates.push({
      source: primaryUrl.includes('127.0.0.1') || primaryUrl.includes('localhost') ? 'local' : 'remote',
      url: primaryUrl,
      key: primaryKey,
      label: 'primary env',
    });
  }

  if (localUrl && localKey) {
    const duplicate = candidates.some((candidate) => candidate.url === localUrl && candidate.key === localKey);
    if (!duplicate) {
      candidates.push({
        source: 'local',
        url: localUrl,
        key: localKey,
        label: 'local fallback',
      });
    }
  }

  return candidates;
}

async function connectClient(candidates) {
  if (!candidates.length) {
    throw new Error('No Supabase credentials found. Set EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_ANON_KEY (or local fallback vars).');
  }

  const failures = [];

  for (const candidate of candidates) {
    const client = createClient(candidate.url, candidate.key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const probe = await client
      .from('catalog_ingredients')
      .select('id', { count: 'exact', head: true });

    if (!probe.error) {
      return { client, source: candidate.source, url: candidate.url, label: candidate.label };
    }

    failures.push(
      `${candidate.label} (${candidate.source}) -> catalog_ingredients probe failed: ${probe.error.message}`,
    );
  }

  throw new Error(
    [
      'Unable to connect to catalog data source.',
      ...failures,
      'Minimal fix: ensure remote Supabase read access, or set SUPABASE_LOCAL_URL + SUPABASE_LOCAL_ANON_KEY for a running local stack.',
    ].join('\n'),
  );
}

async function exportSnapshot() {
  const candidates = await buildClientCandidates();
  const { client, source, url } = await connectClient(candidates);

  const tables = {};

  for (const [key, config] of Object.entries(TABLE_CONFIG)) {
    try {
      const rows = await fetchAllRows(client, config.table, config.select);
      const mapped = rows.map(config.mapRow).sort(rowComparator(config.sortFields));
      tables[key] = mapped;
    } catch (error) {
      throw new Error(
        `Failed to read table "${config.table}" for entity "${key}": ${error.message}\nMinimal fix: check RLS/select grants for this catalog table or run against a local Supabase dev DB.`,
      );
    }
  }

  const derived = buildDerivedCategoriesAndTags(tables);
  tables.categories = derived.categories;
  tables.tags = derived.tags;

  const counts = Object.fromEntries(
    Object.entries(tables).map(([key, rows]) => [key, Array.isArray(rows) ? rows.length : 0]),
  );

  const snapshot = {
    generated_at: new Date().toISOString(),
    env: {
      source,
      supabase_url: maskSupabaseUrl(url),
    },
    tables,
    counts,
  };

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(JSON_OUTPUT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  await fs.writeFile(MD_OUTPUT_PATH, buildMarkdown(snapshot), 'utf8');

  console.log(`[catalog-snapshot] Connected source: ${snapshot.env.source}`);
  console.log('[catalog-snapshot] Counts:');
  Object.entries(snapshot.counts).forEach(([entity, count]) => {
    console.log(`  - ${entity}: ${count}`);
  });
  console.log(`[catalog-snapshot] Wrote: ${JSON_OUTPUT_PATH}`);
  console.log(`[catalog-snapshot] Wrote: ${MD_OUTPUT_PATH}`);
}

exportSnapshot().catch((error) => {
  console.error('[catalog-snapshot] Export failed');
  console.error(error.message || error);
  process.exit(1);
});
