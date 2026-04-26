#!/usr/bin/env node
/* eslint-disable no-console */
const {
  BUCKET,
  MIRROR_RESULTS_PATH,
  SELECTIONS_PATH,
  extFromMime,
  fetchArrayBuffer,
  isAllowedImageMime,
  looksLikeAllowedImageUrl,
  makeSupabaseClient,
  normalize,
  nowIso,
  readJson,
  writeJson,
} = require('./common');

function getFlags() {
  const args = process.argv.slice(2);
  return {
    includePending: args.includes('--include-pending'),
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, attempts = 3) {
  let lastError = null;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fetchArrayBuffer(url);
    } catch (error) {
      lastError = error;
      const message = String(error?.message || '');
      const isRateLimit = message.includes('HTTP 429');
      const isTransient = isRateLimit || message.includes('HTTP 502') || message.includes('HTTP 503') || message.includes('HTTP 504');
      if (!isTransient || i === attempts - 1) break;
      const waitMs = isRateLimit ? 1200 * (i + 1) : 500 * (i + 1);
      await sleep(waitMs);
    }
  }
  throw lastError || new Error('download_failed');
}

function entityFolder(entity) {
  if (entity === 'exercises') return 'exercises';
  if (entity === 'machines') return 'machines';
  if (entity === 'muscles') return 'muscles';
  return 'subgroups';
}

async function main() {
  const flags = getFlags();
  const payload = readJson(SELECTIONS_PATH, null);
  if (!payload || !Array.isArray(payload.items)) {
    throw new Error(`Missing selections file: ${SELECTIONS_PATH}`);
  }

  const client = makeSupabaseClient({ requireServiceRole: true });
  const startedAt = nowIso();
  const results = [];

  for (let i = 0; i < payload.items.length; i += 1) {
    const item = payload.items[i];
    const shouldProcess = item.status === 'found' || (flags.includePending && item.status === 'pending');
    if (!shouldProcess || !item?.chosen?.url) {
      results.push({
        entity: item.entity,
        id: item.id,
        name: item.name,
        status: item.status === 'missing' ? 'missing' : 'pending',
        error: item.status === 'missing' ? 'no_candidate' : 'awaiting_review',
      });
      continue;
    }

    try {
      const candidates = [item?.chosen, ...(Array.isArray(item?.alternates) ? item.alternates : [])]
        .filter((candidate) => candidate && candidate.url);
      const boundedCandidates = candidates.slice(0, 3);

      if (!boundedCandidates.length) {
        throw new Error('no_usable_candidates');
      }

      let selected = null;
      let contentType = '';
      let arrayBuffer = null;
      let lastDownloadError = null;

      for (const candidate of boundedCandidates) {
        if (!looksLikeAllowedImageUrl(candidate.url)) continue;
        try {
          // Global throttle to reduce upstream rate limit hits.
          await sleep(200);
          const response = await fetchWithRetry(candidate.url, 3);
          selected = candidate;
          contentType = response.contentType;
          arrayBuffer = response.arrayBuffer;
          break;
        } catch (error) {
          lastDownloadError = error;
        }
      }

      if (!selected || !arrayBuffer) {
        throw (lastDownloadError || new Error('download_failed_all_candidates'));
      }

      const mimeType = contentType || selected.mime_type || 'image/jpeg';
      if (!isAllowedImageMime(mimeType)) {
        throw new Error(`unsupported_mime:${mimeType}`);
      }
      const ext = extFromMime(mimeType);
      const filePath = `catalog/${entityFolder(item.entity)}/${item.id}.${ext}`;
      const bytes = new Uint8Array(arrayBuffer);

      if (!bytes.byteLength || bytes.byteLength < 1024) {
        throw new Error('downloaded_image_too_small');
      }

      const upload = await client.storage.from(BUCKET).upload(filePath, bytes, {
        contentType: mimeType,
        upsert: true,
      });
      if (upload.error) throw upload.error;

      const publicUrl = client.storage.from(BUCKET).getPublicUrl(filePath)?.data?.publicUrl || null;
      if (!publicUrl) throw new Error('public_url_missing');

      results.push({
        entity: item.entity,
        id: item.id,
        name: item.name,
        status: normalize(item.status) === 'found' ? 'found' : 'pending',
        confidence: item.confidence,
        storage_path: filePath,
        image_url: publicUrl,
        image_source: selected.source || null,
        image_credit: selected.credit || null,
        image_license: selected.license || null,
        mime_type: mimeType,
        size_bytes: bytes.byteLength,
        source_url: selected.url,
      });
    } catch (error) {
      results.push({
        entity: item.entity,
        id: item.id,
        name: item.name,
        status: 'rejected',
        error: error?.message || 'mirror_failed',
      });
    }

    if ((i + 1) % 10 === 0 || i === payload.items.length - 1) {
      console.log(`[gym-images] mirrored ${i + 1}/${payload.items.length}`);
    }
  }

  writeJson(MIRROR_RESULTS_PATH, {
    mirrored_at: nowIso(),
    started_at: startedAt,
    include_pending: flags.includePending,
    bucket: BUCKET,
    item_count: results.length,
    items: results,
  });

  const found = results.filter((row) => row.status === 'found').length;
  const pending = results.filter((row) => row.status === 'pending').length;
  const rejected = results.filter((row) => row.status === 'rejected').length;
  const missing = results.filter((row) => row.status === 'missing').length;
  console.log(`[gym-images] mirror complete found=${found} pending=${pending} rejected=${rejected} missing=${missing}`);
}

main().catch((error) => {
  console.error('[gym-images] mirror_to_storage failed');
  console.error(error?.message || error);
  process.exit(1);
});
