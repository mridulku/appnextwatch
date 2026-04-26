#!/usr/bin/env node
/* eslint-disable no-console */
const {
  CANDIDATES_PATH,
  getEnv,
  isAllowedImageMime,
  looksLikeAllowedImageUrl,
  listGymImageTargets,
  makeSupabaseClient,
  normalize,
  nowIso,
  writeJson,
  fetchJson,
} = require('./common');

function getFlags() {
  const args = process.argv.slice(2);
  return {
    includeFound: args.includes('--all'),
  };
}

function buildQueries(item) {
  const base = String(item?.name || '');
  const queries = [];
  if (item.entity === 'exercises') {
    queries.push(`${base} gym exercise`);
    queries.push(`${base} workout`);
  } else if (item.entity === 'machines') {
    queries.push(`${base} gym machine`);
    queries.push(`${base} fitness equipment`);
  } else if (item.entity === 'muscles') {
    queries.push(`${base} muscle anatomy`);
    queries.push(`${base} muscle`);
  } else {
    queries.push(`${base} muscle anatomy`);
    if (item?.parent_name) queries.push(`${item.parent_name} ${base} muscle`);
  }

  const unique = [];
  const seen = new Set();
  queries.forEach((q) => {
    const next = q.trim();
    if (!next || seen.has(next)) return;
    seen.add(next);
    unique.push(next);
  });
  return unique.slice(0, 3);
}

async function fetchWikimediaCandidates(query) {
  const encoded = encodeURIComponent(query);
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encoded}&gsrnamespace=6&gsrlimit=8&prop=imageinfo&iiprop=url|mime|size|extmetadata&format=json&origin=*`;

  try {
    const json = await fetchJson(url);
    const pages = Object.values(json?.query?.pages || {});
    return pages
      .map((page) => {
        const info = Array.isArray(page?.imageinfo) ? page.imageinfo[0] : null;
        if (!info?.url) return null;
        const license = info?.extmetadata?.LicenseShortName?.value || info?.extmetadata?.License?.value || '';
        const artist = info?.extmetadata?.Artist?.value || '';
        const credit = info?.extmetadata?.Credit?.value || '';
        return {
          source: 'wikimedia',
          title: page?.title || '',
          description: page?.title || '',
          url: info.url,
          thumb_url: info.thumburl || info.url,
          width: Number(info.width || 0),
          height: Number(info.height || 0),
          mime_type: info.mime || '',
          license: String(license).replace(/<[^>]+>/g, ''),
          credit: String(artist || credit).replace(/<[^>]+>/g, ''),
          query,
        };
      })
      .filter(Boolean)
      .filter((candidate) => {
        if (!looksLikeAllowedImageUrl(candidate.url)) return false;
        if (!isAllowedImageMime(candidate.mime_type)) return false;
        return true;
      });
  } catch (error) {
    return [{ source: 'wikimedia', error: error?.message || 'wikimedia_failed', query }];
  }
}

async function fetchUnsplashCandidates(query, accessKey) {
  if (!accessKey) return [];
  const encoded = encodeURIComponent(query);
  const url = `https://api.unsplash.com/search/photos?query=${encoded}&per_page=8&orientation=squarish&client_id=${accessKey}`;

  try {
    const json = await fetchJson(url);
    return (json?.results || [])
      .map((item) => ({
        source: 'unsplash',
        title: item?.alt_description || query,
        description: item?.description || item?.alt_description || '',
        url: item?.urls?.regular || item?.urls?.full || item?.urls?.small || '',
        thumb_url: item?.urls?.small || item?.urls?.thumb || '',
        width: Number(item?.width || 0),
        height: Number(item?.height || 0),
        mime_type: 'image/jpeg',
        license: 'Unsplash License',
        credit: item?.user?.name || '',
        query,
        unsplash_id: item?.id || '',
      }))
      .filter((candidate) => candidate.url && isAllowedImageMime(candidate.mime_type));
  } catch (error) {
    return [{ source: 'unsplash', error: error?.message || 'unsplash_failed', query }];
  }
}

async function main() {
  const flags = getFlags();
  const accessKey = getEnv('UNSPLASH_ACCESS_KEY');
  const client = makeSupabaseClient({ requireServiceRole: false });
  const targets = await listGymImageTargets(client, { includeFound: flags.includeFound });
  const collectedAt = nowIso();

  console.log(`[gym-images] targets: ${targets.length}`);
  const items = [];

  for (let i = 0; i < targets.length; i += 1) {
    const item = targets[i];
    const queries = buildQueries(item);
    const candidates = [];

    for (const query of queries) {
      const [wiki, unsplash] = await Promise.all([
        fetchWikimediaCandidates(query),
        fetchUnsplashCandidates(query, accessKey),
      ]);
      [...wiki, ...unsplash]
        .filter((candidate) => candidate && candidate.url && !candidate.error)
        .forEach((candidate) => candidates.push(candidate));
    }

    const deduped = [];
    const seen = new Set();
    candidates.forEach((candidate) => {
      const key = normalize(candidate.url);
      if (!key || seen.has(key)) return;
      seen.add(key);
      deduped.push(candidate);
    });

    items.push({
      id: item.id,
      entity: item.entity,
      name: item.name,
      name_key: item.name_key,
      parent_name: item.parent_name || null,
      metadata: {
        type: item.type || null,
        primary_muscle_group: item.primary_muscle_group || null,
        zone: item.zone || null,
        primary_muscles: item.primary_muscles || null,
      },
      queries,
      candidates: deduped.slice(0, 20),
    });

    if ((i + 1) % 10 === 0 || i === targets.length - 1) {
      console.log(`[gym-images] collected ${i + 1}/${targets.length}`);
    }
  }

  const payload = {
    collected_at: collectedAt,
    include_found: flags.includeFound,
    unsplash_enabled: Boolean(accessKey),
    item_count: items.length,
    items,
  };
  writeJson(CANDIDATES_PATH, payload);
  console.log(`[gym-images] wrote ${CANDIDATES_PATH}`);
}

main().catch((error) => {
  console.error('[gym-images] collect_candidates failed');
  console.error(error?.message || error);
  process.exit(1);
});
