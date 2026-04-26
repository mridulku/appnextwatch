#!/usr/bin/env node
/* eslint-disable no-console */
const {
  CANDIDATES_PATH,
  REVIEW_QUEUE_PATH,
  SELECTIONS_PATH,
  isAllowedImageMime,
  looksLikeAllowedImageUrl,
  normalize,
  nowIso,
  readJson,
  slugify,
  writeJson,
} = require('./common');

const MIN_DIMENSION = 600;
const AUTO_APPROVE_THRESHOLD = 80;

function tokenSet(...parts) {
  const text = parts
    .flat()
    .map((part) => normalize(part))
    .join(' ');
  return new Set(text.split(/[^a-z0-9]+/).filter(Boolean));
}

function scoreCandidate(item, candidate) {
  const reasons = [];
  let score = 0;

  const width = Number(candidate.width || 0);
  const height = Number(candidate.height || 0);
  if (width >= MIN_DIMENSION && height >= MIN_DIMENSION) {
    score += 20;
  } else {
    reasons.push('low_resolution');
  }

  const mime = normalize(candidate.mime_type);
  if (isAllowedImageMime(mime)) {
    score += 8;
  } else {
    score -= 25;
    reasons.push('unsupported_mime');
  }

  if (!looksLikeAllowedImageUrl(candidate?.url)) {
    score -= 30;
    reasons.push('non_image_url');
  }

  const itemTokens = tokenSet(item.name, item.name_key, item.parent_name, item?.metadata?.type, item?.metadata?.zone);
  const candidateTokens = tokenSet(candidate.title, candidate.description, candidate.query);
  let overlap = 0;
  itemTokens.forEach((token) => {
    if (candidateTokens.has(token)) overlap += 1;
  });
  score += Math.min(34, overlap * 4);

  const title = normalize(candidate.title);
  if (title.includes(normalize(item.name))) score += 14;
  if (title.includes('gym') || title.includes('exercise') || title.includes('muscle')) score += 8;

  if (item.entity === 'machines' && (title.includes('machine') || title.includes('equipment'))) score += 8;
  if (item.entity === 'muscles' && (title.includes('anatomy') || title.includes('muscle'))) score += 8;
  if (item.entity === 'subgroups' && (title.includes('anatomy') || title.includes('muscle'))) score += 8;

  if (candidate.source === 'wikimedia') score += 5;
  if (candidate.source === 'unsplash') score += 4;

  const noisyTokens = ['logo', 'poster', 'meme', 'wallpaper', 'text', 'manual', 'journal', 'report', 'proceedings', 'dictionary'];
  if (noisyTokens.some((token) => title.includes(token))) {
    score -= 10;
    reasons.push('possibly_non_catalog_style');
  }

  const boundedScore = Math.max(0, Math.min(100, Math.round(score)));
  return {
    ...candidate,
    score: boundedScore,
    reasons,
  };
}

function pickBest(item) {
  const candidates = Array.isArray(item?.candidates) ? item.candidates : [];
  if (!candidates.length) {
    return {
      status: 'missing',
      confidence: 0,
      chosen: null,
      alternates: [],
      reason_flags: ['no_candidates'],
    };
  }

  const scored = candidates
    .map((candidate) => scoreCandidate(item, candidate))
    .sort((a, b) => b.score - a.score);

  const chosen = scored[0] || null;
  const confidence = chosen ? chosen.score : 0;
  const status = confidence >= AUTO_APPROVE_THRESHOLD ? 'found' : 'pending';
  const reasonFlags = [...new Set((chosen?.reasons || []).concat(status === 'pending' ? ['low_confidence'] : []))];

  return {
    status,
    confidence,
    chosen,
    alternates: scored.slice(1, 6),
    reason_flags: reasonFlags,
  };
}

function main() {
  const payload = readJson(CANDIDATES_PATH, null);
  if (!payload || !Array.isArray(payload.items)) {
    throw new Error(`Missing candidates file: ${CANDIDATES_PATH}`);
  }

  const reviewedAt = nowIso();
  const selections = payload.items.map((item) => {
    const result = pickBest(item);
    const record = {
      id: item.id,
      entity: item.entity,
      name: item.name,
      name_key: item.name_key || slugify(item.name),
      parent_name: item.parent_name || null,
      metadata: item.metadata || {},
      status: result.status,
      confidence: result.confidence,
      chosen: result.chosen,
      alternates: result.alternates,
      reason_flags: result.reason_flags,
    };
    return record;
  });

  const reviewQueue = selections
    .filter((row) => row.status === 'pending')
    .map((row) => ({
      entity: row.entity,
      id: row.id,
      name: row.name,
      confidence: row.confidence,
      reason_flags: row.reason_flags,
      chosen: row.chosen,
      alternates: row.alternates,
    }));

  writeJson(SELECTIONS_PATH, {
    scored_at: reviewedAt,
    threshold: AUTO_APPROVE_THRESHOLD,
    item_count: selections.length,
    items: selections,
  });
  writeJson(REVIEW_QUEUE_PATH, {
    generated_at: reviewedAt,
    pending_count: reviewQueue.length,
    items: reviewQueue,
  });

  const found = selections.filter((row) => row.status === 'found').length;
  const pending = selections.filter((row) => row.status === 'pending').length;
  const missing = selections.filter((row) => row.status === 'missing').length;
  console.log(`[gym-images] scored=${selections.length} found=${found} pending=${pending} missing=${missing}`);
}

try {
  main();
} catch (error) {
  console.error('[gym-images] score_and_pick failed');
  console.error(error?.message || error);
  process.exit(1);
}
