insert into public.movies (id, title, year, genre, minutes, rating, color, overview)
values
  (
    'shawshank',
    'The Shawshank Redemption',
    1994,
    'Drama',
    '142 min',
    9.3,
    '{"#323A4B","#12141C"}',
    'Two men bond inside Shawshank State Penitentiary, clinging to hope and dignity.'
  ),
  (
    'parasite',
    'Parasite',
    2019,
    'Thriller',
    '132 min',
    8.5,
    '{"#3A2A2A","#151018"}',
    'A poor family infiltrates a wealthy household, setting off a dark chain of events.'
  ),
  (
    'spirited-away',
    'Spirited Away',
    2001,
    'Fantasy',
    '125 min',
    8.6,
    '{"#2B3A3D","#0F1418"}',
    'A young girl navigates a spirit world to save her parents.'
  ),
  (
    'moonlight',
    'Moonlight',
    2016,
    'Drama',
    '111 min',
    7.4,
    '{"#1B2C3C","#0C1117"}',
    'A tender portrait of identity and belonging across three chapters of life.'
  ),
  (
    'arrival',
    'Arrival',
    2016,
    'Sci-Fi',
    '116 min',
    7.9,
    '{"#263546","#10131A"}',
    'A linguist races to understand extraterrestrial visitors before conflict erupts.'
  )
on conflict (id) do update set
  title = excluded.title,
  year = excluded.year,
  genre = excluded.genre,
  minutes = excluded.minutes,
  rating = excluded.rating,
  color = excluded.color,
  overview = excluded.overview;

delete from public.awards
where year in (1995, 2017, 2020) and category = 'Best Picture';

insert into public.awards (year, category, winner, movie_id, metadata)
values
  (1995, 'Best Picture', 'The Shawshank Redemption', 'shawshank', '{"ceremony": 67}'),
  (2017, 'Best Picture', 'Moonlight', 'moonlight', '{"ceremony": 89}'),
  (2020, 'Best Picture', 'Parasite', 'parasite', '{"ceremony": 92}');

insert into public.actors (id, name, sort_name, role_type, bio)
values
  ('b9f6a8e1-0d47-4b1a-9d7c-8f4b6a01a111', 'Tim Robbins', 'Robbins, Tim', 'actor', 'Known for The Shawshank Redemption.'),
  ('b9f6a8e1-0d47-4b1a-9d7c-8f4b6a01a112', 'Morgan Freeman', 'Freeman, Morgan', 'actor', 'Narrator and co-lead in The Shawshank Redemption.'),
  ('b9f6a8e1-0d47-4b1a-9d7c-8f4b6a01a113', 'Song Kang-ho', 'Song, Kang-ho', 'actor', 'Lead actor in Parasite.'),
  ('b9f6a8e1-0d47-4b1a-9d7c-8f4b6a01a114', 'Mahershala Ali', 'Ali, Mahershala', 'actor', 'Key performance in Moonlight.'),
  ('b9f6a8e1-0d47-4b1a-9d7c-8f4b6a01a115', 'Amy Adams', 'Adams, Amy', 'actress', 'Lead actor in Arrival.'),
  ('b9f6a8e1-0d47-4b1a-9d7c-8f4b6a01a116', 'Saoirse Ronan', 'Ronan, Saoirse', 'actress', 'Acclaimed for thoughtful character work.'),
  ('b9f6a8e1-0d47-4b1a-9d7c-8f4b6a01a117', 'Viola Davis', 'Davis, Viola', 'actress', 'Known for intense dramatic roles.')
on conflict (id) do update set
  name = excluded.name,
  sort_name = excluded.sort_name,
  role_type = excluded.role_type,
  bio = excluded.bio;

insert into public.directors (id, name, sort_name, bio)
values
  ('c5f73dbe-3df1-4b7d-9e7a-88f5b3a2b201', 'Frank Darabont', 'Darabont, Frank', 'Director of The Shawshank Redemption.'),
  ('c5f73dbe-3df1-4b7d-9e7a-88f5b3a2b202', 'Bong Joon-ho', 'Bong, Joon-ho', 'Director of Parasite.'),
  ('c5f73dbe-3df1-4b7d-9e7a-88f5b3a2b203', 'Hayao Miyazaki', 'Miyazaki, Hayao', 'Director of Spirited Away.'),
  ('c5f73dbe-3df1-4b7d-9e7a-88f5b3a2b204', 'Barry Jenkins', 'Jenkins, Barry', 'Director of Moonlight.'),
  ('c5f73dbe-3df1-4b7d-9e7a-88f5b3a2b205', 'Denis Villeneuve', 'Villeneuve, Denis', 'Director of Arrival.')
on conflict (id) do update set
  name = excluded.name,
  sort_name = excluded.sort_name,
  bio = excluded.bio;

insert into public.movie_actors (movie_id, actor_id, character_name, billing_order)
values
  ('shawshank', 'b9f6a8e1-0d47-4b1a-9d7c-8f4b6a01a111', 'Andy Dufresne', 1),
  ('shawshank', 'b9f6a8e1-0d47-4b1a-9d7c-8f4b6a01a112', 'Ellis Boyd "Red" Redding', 2),
  ('parasite', 'b9f6a8e1-0d47-4b1a-9d7c-8f4b6a01a113', 'Kim Ki-taek', 1),
  ('spirited-away', 'b9f6a8e1-0d47-4b1a-9d7c-8f4b6a01a116', 'Chihiro (inspired casting)', 1),
  ('moonlight', 'b9f6a8e1-0d47-4b1a-9d7c-8f4b6a01a114', 'Juan', 1),
  ('arrival', 'b9f6a8e1-0d47-4b1a-9d7c-8f4b6a01a115', 'Louise Banks', 1)
on conflict (movie_id, actor_id) do update set
  character_name = excluded.character_name,
  billing_order = excluded.billing_order;

insert into public.movie_directors (movie_id, director_id)
values
  ('shawshank', 'c5f73dbe-3df1-4b7d-9e7a-88f5b3a2b201'),
  ('parasite', 'c5f73dbe-3df1-4b7d-9e7a-88f5b3a2b202'),
  ('spirited-away', 'c5f73dbe-3df1-4b7d-9e7a-88f5b3a2b203'),
  ('moonlight', 'c5f73dbe-3df1-4b7d-9e7a-88f5b3a2b204'),
  ('arrival', 'c5f73dbe-3df1-4b7d-9e7a-88f5b3a2b205')
on conflict (movie_id, director_id) do nothing;

with upserted_shows as (
  insert into public.award_shows (id, name)
  values
    ('0f4a1c6f-4c1b-4b4c-9f0c-4d2b8a3d1a11'::uuid, 'Academy Awards'),
    ('0f4a1c6f-4c1b-4b4c-9f0c-4d2b8a3d1a12'::uuid, 'Golden Globe Awards')
  on conflict (name) do update set
    name = excluded.name
  returning id, name
)
insert into public.award_years (id, show_id, year)
select
  '7b7c03f2-6a3b-4f06-8f2d-6dce7bce2010'::uuid,
  s.id,
  2020
from upserted_shows s
where s.name = 'Academy Awards'
union all
select
  '7b7c03f2-6a3b-4f06-8f2d-6dce7bce2011'::uuid,
  s.id,
  2020
from upserted_shows s
where s.name = 'Golden Globe Awards'
on conflict (show_id, year) do update set
  year = excluded.year;

insert into public.award_categories (id, show_id, name)
values
  ('9f1d9af0-1b0b-4c6a-8b28-1c8efb2e4a01'::uuid, (select id from public.award_shows where name = 'Academy Awards'), 'Best Picture'),
  ('9f1d9af0-1b0b-4c6a-8b28-1c8efb2e4a02'::uuid, (select id from public.award_shows where name = 'Academy Awards'), 'Best Actor'),
  ('9f1d9af0-1b0b-4c6a-8b28-1c8efb2e4a03'::uuid, (select id from public.award_shows where name = 'Academy Awards'), 'Best Actress'),
  ('9f1d9af0-1b0b-4c6a-8b28-1c8efb2e4a04'::uuid, (select id from public.award_shows where name = 'Academy Awards'), 'Best Supporting Actor'),
  ('9f1d9af0-1b0b-4c6a-8b28-1c8efb2e4a05'::uuid, (select id from public.award_shows where name = 'Academy Awards'), 'Best Supporting Actress'),
  ('9f1d9af0-1b0b-4c6a-8b28-1c8efb2e4a06'::uuid, (select id from public.award_shows where name = 'Academy Awards'), 'Best Director'),
  ('9f1d9af0-1b0b-4c6a-8b28-1c8efb2e4b01'::uuid, (select id from public.award_shows where name = 'Golden Globe Awards'), 'Best Picture'),
  ('9f1d9af0-1b0b-4c6a-8b28-1c8efb2e4b02'::uuid, (select id from public.award_shows where name = 'Golden Globe Awards'), 'Best Actor'),
  ('9f1d9af0-1b0b-4c6a-8b28-1c8efb2e4b03'::uuid, (select id from public.award_shows where name = 'Golden Globe Awards'), 'Best Actress'),
  ('9f1d9af0-1b0b-4c6a-8b28-1c8efb2e4b04'::uuid, (select id from public.award_shows where name = 'Golden Globe Awards'), 'Best Supporting Actor'),
  ('9f1d9af0-1b0b-4c6a-8b28-1c8efb2e4b05'::uuid, (select id from public.award_shows where name = 'Golden Globe Awards'), 'Best Supporting Actress'),
  ('9f1d9af0-1b0b-4c6a-8b28-1c8efb2e4b06'::uuid, (select id from public.award_shows where name = 'Golden Globe Awards'), 'Best Director')
on conflict (show_id, name) do update set
  name = excluded.name;

delete from public.award_entries
where award_year_id in (
  select ay.id
  from public.award_years ay
  join public.award_shows s on s.id = ay.show_id
  where (s.name = 'Academy Awards' and ay.year = 2020)
     or (s.name = 'Golden Globe Awards' and ay.year = 2020)
);

with academy_year as (
  select ay.id
  from public.award_years ay
  join public.award_shows s on s.id = ay.show_id
  where s.name = 'Academy Awards' and ay.year = 2020
),
golden_year as (
  select ay.id
  from public.award_years ay
  join public.award_shows s on s.id = ay.show_id
  where s.name = 'Golden Globe Awards' and ay.year = 2020
),
academy_categories as (
  select ac.id, ac.name
  from public.award_categories ac
  join public.award_shows s on s.id = ac.show_id
  where s.name = 'Academy Awards'
),
golden_categories as (
  select ac.id, ac.name
  from public.award_categories ac
  join public.award_shows s on s.id = ac.show_id
  where s.name = 'Golden Globe Awards'
),
entries as (
  select 'Academy Awards'::text as show_name, 'Best Picture'::text as category_name, 'parasite'::text as movie_id, null::uuid as actor_id, null::uuid as director_id, true as is_winner, null::text as role_name
  union all select 'Academy Awards', 'Best Picture', 'moonlight', null, null, false, null
  union all select 'Academy Awards', 'Best Actor', null, 'b9f6a8e1-0d47-4b1a-9d7c-8f4b6a01a113'::uuid, null, true, null
  union all select 'Academy Awards', 'Best Actor', null, 'b9f6a8e1-0d47-4b1a-9d7c-8f4b6a01a111'::uuid, null, false, null
  union all select 'Academy Awards', 'Best Actress', null, 'b9f6a8e1-0d47-4b1a-9d7c-8f4b6a01a115'::uuid, null, true, null
  union all select 'Academy Awards', 'Best Actress', null, 'b9f6a8e1-0d47-4b1a-9d7c-8f4b6a01a117'::uuid, null, false, null
  union all select 'Academy Awards', 'Best Supporting Actor', null, 'b9f6a8e1-0d47-4b1a-9d7c-8f4b6a01a114'::uuid, null, true, null
  union all select 'Academy Awards', 'Best Supporting Actor', null, 'b9f6a8e1-0d47-4b1a-9d7c-8f4b6a01a112'::uuid, null, false, null
  union all select 'Academy Awards', 'Best Supporting Actress', null, 'b9f6a8e1-0d47-4b1a-9d7c-8f4b6a01a117'::uuid, null, true, null
  union all select 'Academy Awards', 'Best Supporting Actress', null, 'b9f6a8e1-0d47-4b1a-9d7c-8f4b6a01a116'::uuid, null, false, null
  union all select 'Academy Awards', 'Best Director', null, null, 'c5f73dbe-3df1-4b7d-9e7a-88f5b3a2b202'::uuid, true, null
  union all select 'Academy Awards', 'Best Director', null, null, 'c5f73dbe-3df1-4b7d-9e7a-88f5b3a2b204'::uuid, false, null
  union all select 'Golden Globe Awards', 'Best Picture', 'parasite', null, null, true, null
  union all select 'Golden Globe Awards', 'Best Picture', 'arrival', null, null, false, null
  union all select 'Golden Globe Awards', 'Best Actor', null, 'b9f6a8e1-0d47-4b1a-9d7c-8f4b6a01a111'::uuid, null, true, null
  union all select 'Golden Globe Awards', 'Best Actor', null, 'b9f6a8e1-0d47-4b1a-9d7c-8f4b6a01a113'::uuid, null, false, null
  union all select 'Golden Globe Awards', 'Best Actress', null, 'b9f6a8e1-0d47-4b1a-9d7c-8f4b6a01a115'::uuid, null, true, null
  union all select 'Golden Globe Awards', 'Best Actress', null, 'b9f6a8e1-0d47-4b1a-9d7c-8f4b6a01a117'::uuid, null, false, null
  union all select 'Golden Globe Awards', 'Best Supporting Actor', null, 'b9f6a8e1-0d47-4b1a-9d7c-8f4b6a01a114'::uuid, null, true, null
  union all select 'Golden Globe Awards', 'Best Supporting Actor', null, 'b9f6a8e1-0d47-4b1a-9d7c-8f4b6a01a112'::uuid, null, false, null
  union all select 'Golden Globe Awards', 'Best Supporting Actress', null, 'b9f6a8e1-0d47-4b1a-9d7c-8f4b6a01a117'::uuid, null, true, null
  union all select 'Golden Globe Awards', 'Best Supporting Actress', null, 'b9f6a8e1-0d47-4b1a-9d7c-8f4b6a01a116'::uuid, null, false, null
  union all select 'Golden Globe Awards', 'Best Director', null, null, 'c5f73dbe-3df1-4b7d-9e7a-88f5b3a2b202'::uuid, true, null
  union all select 'Golden Globe Awards', 'Best Director', null, null, 'c5f73dbe-3df1-4b7d-9e7a-88f5b3a2b205'::uuid, false, null
)
insert into public.award_entries (
  award_year_id,
  award_category_id,
  movie_id,
  actor_id,
  director_id,
  is_winner,
  role_name
)
select
  case
    when e.show_name = 'Academy Awards' then (select id from academy_year)
    else (select id from golden_year)
  end as award_year_id,
  case
    when e.show_name = 'Academy Awards' then (select id from academy_categories where name = e.category_name)
    else (select id from golden_categories where name = e.category_name)
  end as award_category_id,
  e.movie_id,
  e.actor_id,
  e.director_id,
  e.is_winner,
  e.role_name
from entries e;

update public.movies
set
  wiki_url = 'https://en.wikipedia.org/wiki/The_Shawshank_Redemption',
  wiki_title = 'The Shawshank Redemption',
  clips = '[
    {"id":"shawshank-trailer","title":"Official Trailer","type":"trailer","youtubeId":"6hB3S9bIaco"},
    {"id":"shawshank-scene","title":"Hope Scene","type":"scene","youtubeId":"nm8yY6byG78","startSeconds":45}
  ]'::jsonb
where id = 'shawshank';

update public.movies
set
  wiki_url = 'https://en.wikipedia.org/wiki/Parasite_(film)',
  wiki_title = 'Parasite',
  clips = '[
    {"id":"parasite-trailer","title":"Official Trailer","type":"trailer","youtubeId":"5xH0HfJHsaY"},
    {"id":"parasite-interview","title":"Bong Joon-ho Interview","type":"interview","youtubeId":"kR4X_JjQyQw"}
  ]'::jsonb
where id = 'parasite';

update public.movies
set
  wiki_url = 'https://en.wikipedia.org/wiki/Spirited_Away',
  wiki_title = 'Spirited Away',
  clips = '[
    {"id":"spirited-trailer","title":"Official Trailer","type":"trailer","youtubeId":"ByXuk9QqQkk"},
    {"id":"spirited-bts","title":"Behind the Scenes","type":"bts","youtubeId":"F9iV7XH6B5M"}
  ]'::jsonb
where id = 'spirited-away';

update public.movies
set
  wiki_url = 'https://en.wikipedia.org/wiki/Moonlight_(2016_film)',
  wiki_title = 'Moonlight',
  clips = '[
    {"id":"moonlight-trailer","title":"Official Trailer","type":"trailer","youtubeId":"9NJj12tJzqc"},
    {"id":"moonlight-scene","title":"Beach Scene","type":"scene","youtubeId":"J2aVwhCLojY","startSeconds":20}
  ]'::jsonb
where id = 'moonlight';

update public.movies
set
  wiki_url = 'https://en.wikipedia.org/wiki/Arrival_(film)',
  wiki_title = 'Arrival',
  clips = '[
    {"id":"arrival-trailer","title":"Official Trailer","type":"trailer","youtubeId":"tFMo3UJ4B4g"},
    {"id":"arrival-interview","title":"Denis Villeneuve Interview","type":"interview","youtubeId":"AMgyWT075KY"}
  ]'::jsonb
where id = 'arrival';

update public.directors
set
  wiki_url = 'https://en.wikipedia.org/wiki/Frank_Darabont',
  wiki_title = 'Frank Darabont'
where id = 'c5f73dbe-3df1-4b7d-9e7a-88f5b3a2b201';

update public.directors
set
  wiki_url = 'https://en.wikipedia.org/wiki/Bong_Joon-ho',
  wiki_title = 'Bong Joon-ho'
where id = 'c5f73dbe-3df1-4b7d-9e7a-88f5b3a2b202';

update public.directors
set
  wiki_url = 'https://en.wikipedia.org/wiki/Hayao_Miyazaki',
  wiki_title = 'Hayao Miyazaki'
where id = 'c5f73dbe-3df1-4b7d-9e7a-88f5b3a2b203';

update public.directors
set
  wiki_url = 'https://en.wikipedia.org/wiki/Barry_Jenkins',
  wiki_title = 'Barry Jenkins'
where id = 'c5f73dbe-3df1-4b7d-9e7a-88f5b3a2b204';

update public.directors
set
  wiki_url = 'https://en.wikipedia.org/wiki/Denis_Villeneuve',
  wiki_title = 'Denis Villeneuve'
where id = 'c5f73dbe-3df1-4b7d-9e7a-88f5b3a2b205';

update public.actors
set
  wiki_url = 'https://en.wikipedia.org/wiki/Tim_Robbins',
  wiki_title = 'Tim Robbins'
where id = 'b9f6a8e1-0d47-4b1a-9d7c-8f4b6a01a111';

update public.actors
set
  wiki_url = 'https://en.wikipedia.org/wiki/Morgan_Freeman',
  wiki_title = 'Morgan Freeman'
where id = 'b9f6a8e1-0d47-4b1a-9d7c-8f4b6a01a112';

update public.actors
set
  wiki_url = 'https://en.wikipedia.org/wiki/Song_Kang-ho',
  wiki_title = 'Song Kang-ho'
where id = 'b9f6a8e1-0d47-4b1a-9d7c-8f4b6a01a113';

update public.actors
set
  wiki_url = 'https://en.wikipedia.org/wiki/Mahershala_Ali',
  wiki_title = 'Mahershala Ali'
where id = 'b9f6a8e1-0d47-4b1a-9d7c-8f4b6a01a114';

update public.actors
set
  wiki_url = 'https://en.wikipedia.org/wiki/Amy_Adams',
  wiki_title = 'Amy Adams'
where id = 'b9f6a8e1-0d47-4b1a-9d7c-8f4b6a01a115';

update public.actors
set
  wiki_url = 'https://en.wikipedia.org/wiki/Saoirse_Ronan',
  wiki_title = 'Saoirse Ronan'
where id = 'b9f6a8e1-0d47-4b1a-9d7c-8f4b6a01a116';

update public.actors
set
  wiki_url = 'https://en.wikipedia.org/wiki/Viola_Davis',
  wiki_title = 'Viola Davis'
where id = 'b9f6a8e1-0d47-4b1a-9d7c-8f4b6a01a117';
