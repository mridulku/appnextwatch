import { getSupabaseClient } from '../integrations/supabase';

function getClientOrThrow() {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client not configured');
  return client;
}

function sortByNumberKey(list, key) {
  return [...(list || [])].sort((a, b) => Number(a?.[key] || 0) - Number(b?.[key] || 0));
}

function mapTitleRow(row) {
  return {
    id: row.id,
    title: row.title,
    mediaType: row.media_type,
    releaseYear: row.release_year,
    sourceMovieId: row.source_movie_id || null,
  };
}

function mapLogRow(row) {
  const items = sortByNumberKey(row?.user_movie_log_items || [], 'sort_order').map((item) => ({
    id: item.id,
    mediaTitleId: item.media_title_id,
    title: item?.catalog_media_title?.title || 'Title',
    mediaType: item.media_type,
    releaseYear: item?.catalog_media_title?.release_year || null,
    sourceMovieId: item?.catalog_media_title?.source_movie_id || null,
    platformId: item.platform_id || '',
    platformName: item.platform_name || '',
    sortOrder: Number(item?.sort_order || 0),
  }));

  return {
    id: row.id,
    dateISO: row.log_date,
    itemCount: items.length,
    movieCount: items.filter((item) => item.mediaType === 'movie').length,
    showCount: items.filter((item) => item.mediaType === 'tv_show').length,
    items,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listCatalogMediaTitles({ mediaType = 'all', search = '' } = {}) {
  const client = getClientOrThrow();
  let query = client
    .from('catalog_media_titles')
    .select('id,title,media_type,release_year,source_movie_id')
    .order('title', { ascending: true });

  if (mediaType && mediaType !== 'all') {
    query = query.eq('media_type', mediaType);
  }

  const normalizedSearch = String(search || '').trim();
  if (normalizedSearch) {
    query = query.ilike('title', `%${normalizedSearch}%`);
  }

  const response = await query;
  if (response.error) throw response.error;
  return (response.data || []).map(mapTitleRow);
}

export async function getCatalogMediaTitleById(id) {
  const client = getClientOrThrow();
  const response = await client
    .from('catalog_media_titles')
    .select('id,title,media_type,release_year,source_movie_id')
    .eq('id', id)
    .maybeSingle();

  if (response.error) throw response.error;
  return response.data ? mapTitleRow(response.data) : null;
}

export async function createCatalogMediaTitle({ title, mediaType, releaseYear }) {
  const client = getClientOrThrow();
  const slug = String(title || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const prefix = mediaType === 'tv_show' ? 'tv' : 'movie';
  const id = `${prefix}-${slug || Date.now()}`;

  const response = await client
    .from('catalog_media_titles')
    .insert({
      id,
      title: String(title || '').trim(),
      media_type: mediaType,
      release_year: releaseYear || null,
    })
    .select('id,title,media_type,release_year,source_movie_id')
    .maybeSingle();

  if (response.error) throw response.error;
  return mapTitleRow(response.data);
}

export async function updateCatalogMediaTitle(id, { title, mediaType, releaseYear }) {
  const client = getClientOrThrow();
  const response = await client
    .from('catalog_media_titles')
    .update({
      title: String(title || '').trim(),
      media_type: mediaType,
      release_year: releaseYear || null,
    })
    .eq('id', id)
    .select('id,title,media_type,release_year,source_movie_id')
    .maybeSingle();

  if (response.error) throw response.error;
  return mapTitleRow(response.data);
}

export async function listUserMovieLogs(userId) {
  const client = getClientOrThrow();
  const response = await client
    .from('user_movie_logs')
    .select(`
      id,
      log_date,
      created_at,
      updated_at,
      user_movie_log_items(
        id,
        media_title_id,
        media_type,
        platform_id,
        platform_name,
        sort_order,
        catalog_media_title:catalog_media_titles(
          id,
          title,
          media_type,
          release_year,
          source_movie_id
        )
      )
    `)
    .eq('user_id', userId)
    .order('log_date', { ascending: false });

  if (response.error) throw response.error;
  return (response.data || []).map(mapLogRow);
}

export async function getUserMovieLogByDate(userId, dateISO) {
  const client = getClientOrThrow();
  const response = await client
    .from('user_movie_logs')
    .select(`
      id,
      log_date,
      created_at,
      updated_at,
      user_movie_log_items(
        id,
        media_title_id,
        media_type,
        platform_id,
        platform_name,
        sort_order,
        catalog_media_title:catalog_media_titles(
          id,
          title,
          media_type,
          release_year,
          source_movie_id
        )
      )
    `)
    .eq('user_id', userId)
    .eq('log_date', dateISO)
    .maybeSingle();

  if (response.error) throw response.error;
  return response.data ? mapLogRow(response.data) : null;
}

export async function saveMovieLog({ userId, dateISO, items }) {
  const client = getClientOrThrow();
  const safeItems = items || [];

  if (!safeItems.length) {
    const existing = await client
      .from('user_movie_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('log_date', dateISO)
      .maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data?.id) {
      const deleted = await client.from('user_movie_logs').delete().eq('id', existing.data.id);
      if (deleted.error) throw deleted.error;
    }
    return null;
  }

  const upserted = await client
    .from('user_movie_logs')
    .upsert({ user_id: userId, log_date: dateISO }, { onConflict: 'user_id,log_date' })
    .select('id,log_date')
    .maybeSingle();
  if (upserted.error) throw upserted.error;

  const logId = upserted.data.id;
  const deletedItems = await client.from('user_movie_log_items').delete().eq('movie_log_id', logId);
  if (deletedItems.error) throw deletedItems.error;

  const payload = safeItems.map((item, index) => ({
    movie_log_id: logId,
    media_title_id: item.mediaTitleId,
    media_type: item.mediaType,
    platform_id: item.platformId || null,
    platform_name: item.platformName || null,
    sort_order: index + 1,
  }));

  const inserted = await client
    .from('user_movie_log_items')
    .insert(payload)
    .select('id');
  if (inserted.error) throw inserted.error;

  return getUserMovieLogByDate(userId, dateISO);
}
