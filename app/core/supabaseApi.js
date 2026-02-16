import { getSupabaseClient } from './supabase';

const MOVIE_COLUMNS =
  'id,title,year,genre,minutes,rating,color,overview,trailer_url,trailer_iframe,clips,wiki_url,wiki_title,wiki_page_id,wiki_image_url';

function getClientOrError() {
  const client = getSupabaseClient();
  if (!client) {
    return { client: null, error: new Error('Supabase client not configured.') };
  }
  return { client, error: null };
}

export async function fetchMovies() {
  const { client, error } = getClientOrError();
  if (error) return { data: null, error };

  const response = await client
    .from('movies')
    .select(MOVIE_COLUMNS)
    .order('rating', { ascending: false });

  return response;
}

export async function fetchMovieById(id) {
  const { client, error } = getClientOrError();
  if (error) return { data: null, error };

  const response = await client.from('movies').select(MOVIE_COLUMNS).eq('id', id).single();
  return response;
}

export async function createMovie(payload) {
  const { client, error } = getClientOrError();
  if (error) return { data: null, error };

  const response = await client.from('movies').insert(payload).select(MOVIE_COLUMNS).single();
  return response;
}

export async function updateMovie(id, payload) {
  const { client, error } = getClientOrError();
  if (error) return { data: null, error };

  const response = await client
    .from('movies')
    .update(payload)
    .eq('id', id)
    .select(MOVIE_COLUMNS)
    .single();
  return response;
}

export async function deleteMovie(id) {
  const { client, error } = getClientOrError();
  if (error) return { data: null, error };

  const response = await client.from('movies').delete().eq('id', id);
  return response;
}

export async function fetchAwards() {
  const { client, error } = getClientOrError();
  if (error) return { data: null, error };

  const response = await client
    .from('awards')
    .select('id,year,category,winner,movie:movie_id(id,title)')
    .order('year', { ascending: false });

  return response;
}

export async function createAward(payload) {
  const { client, error } = getClientOrError();
  if (error) return { data: null, error };

  const response = await client
    .from('awards')
    .insert(payload)
    .select('id,year,category,winner,movie:movie_id(id,title)')
    .single();
  return response;
}

export async function updateAward(id, payload) {
  const { client, error } = getClientOrError();
  if (error) return { data: null, error };

  const response = await client
    .from('awards')
    .update(payload)
    .eq('id', id)
    .select('id,year,category,winner,movie:movie_id(id,title)')
    .single();
  return response;
}

export async function deleteAward(id) {
  const { client, error } = getClientOrError();
  if (error) return { data: null, error };

  const response = await client.from('awards').delete().eq('id', id);
  return response;
}

export async function fetchTablePreview(table, limit = 5) {
  const { client, error } = getClientOrError();
  if (error) return { data: null, error };

  const response = await client.from(table).select('*').limit(limit);
  return response;
}

export async function fetchActors({ roleType, limit = 6 } = {}) {
  const { client, error } = getClientOrError();
  if (error) return { data: null, error };

  let query = client
    .from('actors')
    .select('id,name,sort_name,role_type,bio,wiki_url,wiki_title,wiki_page_id,wiki_image_url')
    .order('sort_name', { ascending: true })
    .limit(limit);

  if (roleType) {
    query = query.eq('role_type', roleType);
  }

  const response = await query;
  return response;
}

export async function fetchDirectors(limit = 6) {
  const { client, error } = getClientOrError();
  if (error) return { data: null, error };

  const response = await client
    .from('directors')
    .select('id,name,sort_name,bio,wiki_url,wiki_title,wiki_page_id,wiki_image_url')
    .order('sort_name', { ascending: true })
    .limit(limit);
  return response;
}

export async function fetchActorById(id) {
  const { client, error } = getClientOrError();
  if (error) return { data: null, error };

  const response = await client
    .from('actors')
    .select('id,name,sort_name,role_type,bio,wiki_url,wiki_title,wiki_page_id,wiki_image_url')
    .eq('id', id)
    .single();
  return response;
}

export async function fetchDirectorById(id) {
  const { client, error } = getClientOrError();
  if (error) return { data: null, error };

  const response = await client
    .from('directors')
    .select('id,name,sort_name,bio,wiki_url,wiki_title,wiki_page_id,wiki_image_url')
    .eq('id', id)
    .single();
  return response;
}

export async function updateMovieWikiImage(id, payload) {
  const { client, error } = getClientOrError();
  if (error) return { data: null, error };

  const response = await client.from('movies').update(payload).eq('id', id);
  return response;
}

export async function updateActorWikiImage(id, payload) {
  const { client, error } = getClientOrError();
  if (error) return { data: null, error };

  const response = await client.from('actors').update(payload).eq('id', id);
  return response;
}

export async function updateDirectorWikiImage(id, payload) {
  const { client, error } = getClientOrError();
  if (error) return { data: null, error };

  const response = await client.from('directors').update(payload).eq('id', id);
  return response;
}

export async function fetchActorCredits(actorId) {
  const { client, error } = getClientOrError();
  if (error) return { data: null, error };

  const response = await client
    .from('movie_actors')
    .select(
      'character_name,billing_order,movie:movie_id(id,title,year,genre,minutes,rating,color,overview,trailer_url,trailer_iframe)',
    )
    .eq('actor_id', actorId)
    .order('year', { foreignTable: 'movie', ascending: false });
  return response;
}

export async function fetchDirectorCredits(directorId) {
  const { client, error } = getClientOrError();
  if (error) return { data: null, error };

  const response = await client
    .from('movie_directors')
    .select('movie:movie_id(id,title,year,genre,minutes,rating,color,overview,trailer_url,trailer_iframe)')
    .eq('director_id', directorId)
    .order('year', { foreignTable: 'movie', ascending: false });
  return response;
}

export async function fetchAwardShows() {
  const { client, error } = getClientOrError();
  if (error) return { data: null, error };

  const response = await client
    .from('award_shows')
    .select('id,name')
    .order('name', { ascending: true });
  return response;
}

export async function fetchAwardYears(showId) {
  const { client, error } = getClientOrError();
  if (error) return { data: null, error };

  const response = await client
    .from('award_years')
    .select('id,year')
    .eq('show_id', showId)
    .order('year', { ascending: false });
  return response;
}

export async function fetchAwardCategoriesForYear(awardYearId) {
  const { client, error } = getClientOrError();
  if (error) return { data: null, error };

  const response = await client
    .from('award_entries')
    .select('award_category:award_category_id(id,name)')
    .eq('award_year_id', awardYearId);
  return response;
}

export async function fetchAwardEntries(awardYearId, awardCategoryId) {
  const { client, error } = getClientOrError();
  if (error) return { data: null, error };

  const response = await client
    .from('award_entries')
    .select(
      'id,is_winner,movie:movie_id(id,title,year),actor:actor_id(id,name),director:director_id(id,name)',
    )
    .eq('award_year_id', awardYearId)
    .eq('award_category_id', awardCategoryId)
    .order('is_winner', { ascending: false });
  return response;
}
