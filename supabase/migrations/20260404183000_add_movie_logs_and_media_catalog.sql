create table if not exists public.catalog_media_titles (
  id text primary key,
  title text not null,
  media_type text not null check (media_type in ('movie', 'tv_show')),
  release_year integer,
  source_movie_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_movie_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  log_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, log_date)
);

create table if not exists public.user_movie_log_items (
  id uuid primary key default gen_random_uuid(),
  movie_log_id uuid not null references public.user_movie_logs(id) on delete cascade,
  media_title_id text not null references public.catalog_media_titles(id) on delete restrict,
  media_type text not null check (media_type in ('movie', 'tv_show')),
  platform_id text,
  platform_name text,
  sort_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_catalog_media_titles_type_title
  on public.catalog_media_titles(media_type, title);

create index if not exists idx_user_movie_logs_user_date
  on public.user_movie_logs(user_id, log_date desc);

create index if not exists idx_user_movie_log_items_log_order
  on public.user_movie_log_items(movie_log_id, sort_order);

insert into public.catalog_media_titles (id, title, media_type, release_year, source_movie_id)
select
  m.id,
  m.title,
  'movie',
  m.year,
  m.id
from public.movies m
on conflict (id) do update
set
  title = excluded.title,
  media_type = excluded.media_type,
  release_year = excluded.release_year,
  source_movie_id = excluded.source_movie_id;

insert into public.catalog_media_titles (id, title, media_type, release_year)
values
  ('tv-severance', 'Severance', 'tv_show', 2022),
  ('tv-the-bear', 'The Bear', 'tv_show', 2022),
  ('tv-dark', 'Dark', 'tv_show', 2017),
  ('tv-succession', 'Succession', 'tv_show', 2018),
  ('tv-breaking-bad', 'Breaking Bad', 'tv_show', 2008)
on conflict (id) do nothing;

alter table public.catalog_media_titles enable row level security;
alter table public.user_movie_logs enable row level security;
alter table public.user_movie_log_items enable row level security;

drop policy if exists catalog_media_titles_read_policy on public.catalog_media_titles;
drop policy if exists catalog_media_titles_write_policy on public.catalog_media_titles;
create policy catalog_media_titles_read_policy on public.catalog_media_titles
  for select to public using (true);
create policy catalog_media_titles_write_policy on public.catalog_media_titles
  for all to public using (true) with check (true);

drop policy if exists user_movie_logs_read_policy on public.user_movie_logs;
drop policy if exists user_movie_logs_write_policy on public.user_movie_logs;
create policy user_movie_logs_read_policy on public.user_movie_logs
  for select to public using (true);
create policy user_movie_logs_write_policy on public.user_movie_logs
  for all to public using (true) with check (true);

drop policy if exists user_movie_log_items_read_policy on public.user_movie_log_items;
drop policy if exists user_movie_log_items_write_policy on public.user_movie_log_items;
create policy user_movie_log_items_read_policy on public.user_movie_log_items
  for select to public using (true);
create policy user_movie_log_items_write_policy on public.user_movie_log_items
  for all to public using (true) with check (true);

drop trigger if exists set_catalog_media_titles_updated_at on public.catalog_media_titles;
create trigger set_catalog_media_titles_updated_at
before update on public.catalog_media_titles
for each row execute function public.set_updated_at();

drop trigger if exists set_user_movie_logs_updated_at on public.user_movie_logs;
create trigger set_user_movie_logs_updated_at
before update on public.user_movie_logs
for each row execute function public.set_updated_at();

drop trigger if exists set_user_movie_log_items_updated_at on public.user_movie_log_items;
create trigger set_user_movie_log_items_updated_at
before update on public.user_movie_log_items
for each row execute function public.set_updated_at();

grant select, insert, update, delete on table public.catalog_media_titles to anon, authenticated;
grant select, insert, update, delete on table public.user_movie_logs to anon, authenticated;
grant select, insert, update, delete on table public.user_movie_log_items to anon, authenticated;

notify pgrst, 'reload schema';
