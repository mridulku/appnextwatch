/* eslint-disable no-console */
const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const PAGE_TITLE = '94th_Academy_Awards';
const AWARD_SHOW = 'Academy Awards';
const CEREMONY_YEAR = 2022;
const FILM_YEAR = 2021;
const WIKI_API = 'https://en.wikipedia.org/w/api.php';
const WIKI_BASE = 'https://en.wikipedia.org';

const CATEGORY_MAP = {
  'Best Picture': 'Best Picture',
  'Best Directing': 'Best Director',
  'Best Actor in a Leading Role': 'Best Actor',
  'Best Actress in a Leading Role': 'Best Actress',
  'Best Actor in a Supporting Role': 'Best Supporting Actor',
  'Best Actress in a Supporting Role': 'Best Supporting Actress',
};

function getEnv(key, fallback = '') {
  const val = process.env[key];
  return val && String(val).trim() ? String(val).trim() : fallback;
}

function slugify(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function fetchWikipediaHtml() {
  const params = new URLSearchParams({
    action: 'parse',
    page: PAGE_TITLE,
    prop: 'text',
    section: '1',
    format: 'json',
    origin: '*',
  });
  const res = await fetch(`${WIKI_API}?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Wikipedia fetch failed: ${res.status}`);
  }
  const json = await res.json();
  return json?.parse?.text?.['*'] || '';
}

function parseCategoryCells(html, $) {
  const table = $('table.wikitable').first();
  if (!table.length) return [];

  const cells = table.find('td, th').toArray();
  return cells.map((cell) => $(cell));
}

function linkFromCell($, cell) {
  const link = $(cell).find('a[href^="/wiki/"]').first();
  if (!link.length) return null;
  const href = link.attr('href');
  const title = link.attr('title') || link.text().trim();
  return {
    title,
    url: `${WIKI_BASE}${href}`,
  };
}

function isWinner(row) {
  return row.find('.winner').length > 0 || row.find('b').length > 0;
}

function parseNominees(cells, $) {
  const parsed = [];

  cells.forEach((cell) => {
    const heading = cell.find('div b a').first().text().trim();
    const category = CATEGORY_MAP[heading];
    if (!category) return;

    const list = cell.find('ul').first();
    if (!list.length) return;

    list.find('li').each((_, li) => {
      const liNode = $(li);
      const winner = isWinner(liNode);
      const movieLink = liNode.find('i a[href^="/wiki/"]').first();
      if (!movieLink.length) return;

      const movie = {
        title: movieLink.attr('title') || movieLink.text().trim(),
        url: `${WIKI_BASE}${movieLink.attr('href')}`,
      };

      if (category === 'Best Picture') {
        parsed.push({
          category,
          movie,
          person: null,
          roleName: null,
          isWinner: winner,
        });
        return;
      }

      const personLink = liNode
        .find('a[href^="/wiki/"]')
        .filter((_, a) => $(a).parents('i').length === 0)
        .first();
      if (!personLink.length) return;

      const person = {
        title: personLink.attr('title') || personLink.text().trim(),
        url: `${WIKI_BASE}${personLink.attr('href')}`,
      };

      const text = liNode.text().replace(/\s+/g, ' ').trim();
      let roleName = null;
      const paren = text.match(/\(([^)]+)\)/);
      if (paren) {
        roleName = paren[1].replace(/^as\s+/i, '').trim();
      } else {
        const asMatch = text.match(/ as ([^–-]+)$/i);
        if (asMatch) roleName = asMatch[1].trim();
      }

      const personType =
        category === 'Best Director'
          ? 'director'
          : category.includes('Actress')
            ? 'actress'
            : 'actor';

      parsed.push({
        category,
        movie,
        person,
        roleName,
        isWinner: winner,
        personType,
      });
    });
  });

  return parsed;
}

async function getOrCreateMovie(supabase, movie) {
  const { data: existing } = await supabase
    .from('movies')
    .select('id')
    .eq('wiki_url', movie.url)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const baseId = slugify(movie.title);
  let id = baseId || `movie-${Date.now()}`;
  const { data: idCheck } = await supabase.from('movies').select('id').eq('id', id).maybeSingle();
  if (idCheck?.id) {
    id = `${id}-${Date.now()}`;
  }

  const insert = await supabase
    .from('movies')
    .insert({
      id,
      title: movie.title,
      year: FILM_YEAR,
      genre: 'Unknown',
      minutes: 'N/A',
      rating: 0,
      color: ['#23283A', '#0E0F14'],
      overview: '',
      wiki_url: movie.url,
      wiki_title: movie.title,
    })
    .select('id')
    .single();

  if (insert.error) throw insert.error;
  return insert.data.id;
}

async function getOrCreatePerson(supabase, person, roleType) {
  const table = roleType === 'director' ? 'directors' : 'actors';
  const { data: existing } = await supabase
    .from(table)
    .select('id')
    .eq('wiki_url', person.url)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const lastName = person.title.split(' ').slice(-1)[0] || person.title;
  const sortName = `${lastName}, ${person.title}`;

  const insert = await supabase
    .from(table)
    .insert({
      name: person.title,
      sort_name: sortName,
      role_type: roleType === 'director' ? undefined : roleType,
      bio: '',
      wiki_url: person.url,
      wiki_title: person.title,
    })
    .select('id')
    .single();

  if (insert.error) throw insert.error;
  return insert.data.id;
}

async function main() {
  const supabaseUrl = getEnv('SUPABASE_URL', getEnv('EXPO_PUBLIC_SUPABASE_URL'));
  const supabaseKey =
    getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or EXPO_PUBLIC_SUPABASE_ANON_KEY).');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  console.log('Fetching Wikipedia page...');
  const html = await fetchWikipediaHtml();

  const $ = cheerio.load(html);
  const categoryCells = parseCategoryCells(html, $);
  if (!categoryCells.length) {
    throw new Error('No category cells found. Wikipedia layout may have changed.');
  }

  const nominees = parseNominees(categoryCells, $);

  console.log(`Parsed ${nominees.length} nominee rows.`);

  const { data: showData, error: showError } = await supabase
    .from('award_shows')
    .upsert({ name: AWARD_SHOW }, { onConflict: 'name' })
    .select('id')
    .single();

  if (showError) throw showError;

  const { data: yearData, error: yearError } = await supabase
    .from('award_years')
    .upsert({ show_id: showData.id, year: CEREMONY_YEAR }, { onConflict: 'show_id,year' })
    .select('id')
    .single();

  if (yearError) throw yearError;

  const categories = Array.from(new Set(Object.values(CATEGORY_MAP)));
  const categoryMap = new Map();

  for (const name of categories) {
    const { data, error } = await supabase
      .from('award_categories')
      .upsert({ show_id: showData.id, name }, { onConflict: 'show_id,name' })
      .select('id,name')
      .single();
    if (error) throw error;
    categoryMap.set(name, data.id);
  }

  await supabase
    .from('award_entries')
    .delete()
    .eq('award_year_id', yearData.id);

  for (const nominee of nominees) {
    const movieId = await getOrCreateMovie(supabase, nominee.movie);
    let actorId = null;
    let directorId = null;

    if (nominee.person) {
      if (nominee.personType === 'director') {
        directorId = await getOrCreatePerson(supabase, nominee.person, 'director');
      } else {
        actorId = await getOrCreatePerson(supabase, nominee.person, nominee.personType);
      }
    }

    if (actorId) {
      await supabase
        .from('movie_actors')
        .upsert(
          {
            movie_id: movieId,
            actor_id: actorId,
            character_name: nominee.roleName || null,
            billing_order: null,
          },
          { onConflict: 'movie_id,actor_id' },
        );
    }

    if (directorId) {
      await supabase
        .from('movie_directors')
        .upsert(
          {
            movie_id: movieId,
            director_id: directorId,
          },
          { onConflict: 'movie_id,director_id' },
        );
    }

    const insert = await supabase.from('award_entries').insert({
      award_year_id: yearData.id,
      award_category_id: categoryMap.get(nominee.category),
      movie_id: movieId,
      actor_id: actorId,
      director_id: directorId,
      is_winner: nominee.isWinner,
      role_name: nominee.roleName,
    });

    if (insert.error) {
      console.error('Insert failed', insert.error);
    }
  }

  console.log('Import complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
