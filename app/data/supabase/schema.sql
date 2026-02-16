-- Run this in the Supabase SQL editor to create tables + policies.

create extension if not exists "pgcrypto";

create table if not exists public.movies (
  id text primary key,
  title text not null,
  year integer not null,
  genre text not null,
  minutes text not null,
  rating numeric(3,1) not null,
  color text[] not null default '{}'::text[],
  overview text,
  trailer_url text,
  trailer_iframe text,
  clips jsonb not null default '[]'::jsonb,
  wiki_url text,
  wiki_title text,
  wiki_page_id integer,
  wiki_image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.awards (
  id uuid primary key default gen_random_uuid(),
  year integer not null,
  category text not null,
  winner text not null,
  movie_id text references public.movies(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.actors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_name text not null,
  role_type text not null default 'actor',
  bio text,
  wiki_url text,
  wiki_title text,
  wiki_page_id integer,
  wiki_image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.directors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_name text not null,
  bio text,
  wiki_url text,
  wiki_title text,
  wiki_page_id integer,
  wiki_image_url text,
  created_at timestamptz not null default now()
);

alter table public.movies
  add column if not exists wiki_image_url text;

alter table public.actors
  add column if not exists wiki_image_url text;

alter table public.directors
  add column if not exists wiki_image_url text;

create table if not exists public.movie_actors (
  id uuid primary key default gen_random_uuid(),
  movie_id text not null references public.movies(id) on delete cascade,
  actor_id uuid not null references public.actors(id) on delete cascade,
  character_name text,
  billing_order integer,
  created_at timestamptz not null default now(),
  unique (movie_id, actor_id)
);

create table if not exists public.movie_directors (
  id uuid primary key default gen_random_uuid(),
  movie_id text not null references public.movies(id) on delete cascade,
  director_id uuid not null references public.directors(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (movie_id, director_id)
);

create table if not exists public.award_shows (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table if not exists public.award_years (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references public.award_shows(id) on delete cascade,
  year integer not null,
  unique (show_id, year)
);

create table if not exists public.award_categories (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references public.award_shows(id) on delete cascade,
  name text not null,
  unique (show_id, name)
);

create table if not exists public.award_entries (
  id uuid primary key default gen_random_uuid(),
  award_year_id uuid not null references public.award_years(id) on delete cascade,
  award_category_id uuid not null references public.award_categories(id) on delete cascade,
  movie_id text references public.movies(id) on delete set null,
  actor_id uuid references public.actors(id) on delete set null,
  director_id uuid references public.directors(id) on delete set null,
  is_winner boolean not null default false,
  role_name text,
  created_at timestamptz not null default now(),
  constraint award_entries_recipient check (
    movie_id is not null or actor_id is not null or director_id is not null
  )
);

create table if not exists public.raw_awards (
  id uuid primary key default gen_random_uuid(),
  film_year integer,
  ceremony_year integer,
  ceremony_number integer,
  category text,
  canon_category text,
  person_name text,
  film_title text,
  role_name text,
  is_winner boolean,
  source_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  username text not null unique,
  created_at timestamptz not null default now()
);

alter table public.movies enable row level security;
alter table public.awards enable row level security;
alter table public.actors enable row level security;
alter table public.directors enable row level security;
alter table public.movie_actors enable row level security;
alter table public.movie_directors enable row level security;
alter table public.award_shows enable row level security;
alter table public.award_years enable row level security;
alter table public.award_categories enable row level security;
alter table public.award_entries enable row level security;
alter table public.raw_awards enable row level security;
alter table public.app_users enable row level security;

alter table public.movies
  add column if not exists wiki_url text,
  add column if not exists wiki_title text,
  add column if not exists wiki_page_id integer,
  add column if not exists clips jsonb not null default '[]'::jsonb;

alter table public.actors
  add column if not exists wiki_url text,
  add column if not exists wiki_title text,
  add column if not exists wiki_page_id integer;

alter table public.directors
  add column if not exists wiki_url text,
  add column if not exists wiki_title text,
  add column if not exists wiki_page_id integer;

alter table public.award_entries
  add column if not exists role_name text;

alter table public.raw_awards
  add column if not exists film_year integer,
  add column if not exists ceremony_year integer,
  add column if not exists ceremony_number integer,
  add column if not exists category text,
  add column if not exists canon_category text,
  add column if not exists person_name text,
  add column if not exists film_title text,
  add column if not exists role_name text,
  add column if not exists is_winner boolean,
  add column if not exists source_url text;

drop policy if exists "Public movies read" on public.movies;
drop policy if exists "Public movies write" on public.movies;
drop policy if exists "Public movies update" on public.movies;
drop policy if exists "Public movies delete" on public.movies;

drop policy if exists "Public awards read" on public.awards;
drop policy if exists "Public awards write" on public.awards;
drop policy if exists "Public awards update" on public.awards;
drop policy if exists "Public awards delete" on public.awards;

drop policy if exists "Public actors read" on public.actors;
drop policy if exists "Public actors write" on public.actors;
drop policy if exists "Public actors update" on public.actors;
drop policy if exists "Public actors delete" on public.actors;

drop policy if exists "Public directors read" on public.directors;
drop policy if exists "Public directors write" on public.directors;
drop policy if exists "Public directors update" on public.directors;
drop policy if exists "Public directors delete" on public.directors;

drop policy if exists "Public movie actors read" on public.movie_actors;
drop policy if exists "Public movie actors write" on public.movie_actors;
drop policy if exists "Public movie actors update" on public.movie_actors;
drop policy if exists "Public movie actors delete" on public.movie_actors;

drop policy if exists "Public movie directors read" on public.movie_directors;
drop policy if exists "Public movie directors write" on public.movie_directors;
drop policy if exists "Public movie directors update" on public.movie_directors;
drop policy if exists "Public movie directors delete" on public.movie_directors;

drop policy if exists "Public award shows read" on public.award_shows;
drop policy if exists "Public award shows write" on public.award_shows;
drop policy if exists "Public award shows update" on public.award_shows;
drop policy if exists "Public award shows delete" on public.award_shows;

drop policy if exists "Public award years read" on public.award_years;
drop policy if exists "Public award years write" on public.award_years;
drop policy if exists "Public award years update" on public.award_years;
drop policy if exists "Public award years delete" on public.award_years;

drop policy if exists "Public award categories read" on public.award_categories;
drop policy if exists "Public award categories write" on public.award_categories;
drop policy if exists "Public award categories update" on public.award_categories;
drop policy if exists "Public award categories delete" on public.award_categories;

drop policy if exists "Public award entries read" on public.award_entries;
drop policy if exists "Public award entries write" on public.award_entries;
drop policy if exists "Public award entries update" on public.award_entries;
drop policy if exists "Public award entries delete" on public.award_entries;
drop policy if exists "Public raw awards read" on public.raw_awards;
drop policy if exists "Public raw awards write" on public.raw_awards;
drop policy if exists "Public raw awards update" on public.raw_awards;
drop policy if exists "Public raw awards delete" on public.raw_awards;

drop policy if exists "Public users read" on public.app_users;
drop policy if exists "Public users write" on public.app_users;
drop policy if exists "Public users update" on public.app_users;
drop policy if exists "Public users delete" on public.app_users;

create policy "Public movies read" on public.movies for select using (true);
create policy "Public movies write" on public.movies for insert with check (true);
create policy "Public movies update" on public.movies for update using (true) with check (true);
create policy "Public movies delete" on public.movies for delete using (true);

create policy "Public awards read" on public.awards for select using (true);
create policy "Public awards write" on public.awards for insert with check (true);
create policy "Public awards update" on public.awards for update using (true) with check (true);
create policy "Public awards delete" on public.awards for delete using (true);

create policy "Public actors read" on public.actors for select using (true);
create policy "Public actors write" on public.actors for insert with check (true);
create policy "Public actors update" on public.actors for update using (true) with check (true);
create policy "Public actors delete" on public.actors for delete using (true);

create policy "Public directors read" on public.directors for select using (true);
create policy "Public directors write" on public.directors for insert with check (true);
create policy "Public directors update" on public.directors for update using (true) with check (true);
create policy "Public directors delete" on public.directors for delete using (true);

create policy "Public movie actors read" on public.movie_actors for select using (true);
create policy "Public movie actors write" on public.movie_actors for insert with check (true);
create policy "Public movie actors update" on public.movie_actors for update using (true) with check (true);
create policy "Public movie actors delete" on public.movie_actors for delete using (true);

create policy "Public movie directors read" on public.movie_directors for select using (true);
create policy "Public movie directors write" on public.movie_directors for insert with check (true);
create policy "Public movie directors update" on public.movie_directors for update using (true) with check (true);
create policy "Public movie directors delete" on public.movie_directors for delete using (true);

create policy "Public award shows read" on public.award_shows for select using (true);
create policy "Public award shows write" on public.award_shows for insert with check (true);
create policy "Public award shows update" on public.award_shows for update using (true) with check (true);
create policy "Public award shows delete" on public.award_shows for delete using (true);

create policy "Public award years read" on public.award_years for select using (true);
create policy "Public award years write" on public.award_years for insert with check (true);
create policy "Public award years update" on public.award_years for update using (true) with check (true);
create policy "Public award years delete" on public.award_years for delete using (true);

create policy "Public award categories read" on public.award_categories for select using (true);
create policy "Public award categories write" on public.award_categories for insert with check (true);
create policy "Public award categories update" on public.award_categories for update using (true) with check (true);
create policy "Public award categories delete" on public.award_categories for delete using (true);

create policy "Public award entries read" on public.award_entries for select using (true);
create policy "Public award entries write" on public.award_entries for insert with check (true);
create policy "Public award entries update" on public.award_entries for update using (true) with check (true);
create policy "Public award entries delete" on public.award_entries for delete using (true);

create policy "Public raw awards read" on public.raw_awards for select using (true);
create policy "Public raw awards write" on public.raw_awards for insert with check (true);
create policy "Public raw awards update" on public.raw_awards for update using (true) with check (true);
create policy "Public raw awards delete" on public.raw_awards for delete using (true);

create policy "Public users read" on public.app_users for select using (true);
create policy "Public users write" on public.app_users for insert with check (true);
create policy "Public users update" on public.app_users for update using (true) with check (true);
create policy "Public users delete" on public.app_users for delete using (true);
