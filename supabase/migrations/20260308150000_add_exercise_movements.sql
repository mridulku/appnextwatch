create table if not exists public.catalog_exercise_movements (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null,
  primary_muscle_group text not null,
  primary_day text not null,
  movement_family text,
  aliases text[] not null default '{}',
  image_url text,
  image_source text,
  image_credit text,
  image_license text,
  image_status text not null default 'pending',
  image_updated_at timestamptz,
  video_youtube_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalog_exercise_movements_category_chk check (category in ('strength', 'cardio', 'mobility')),
  constraint catalog_exercise_movements_primary_day_chk check (primary_day in ('push', 'pull', 'legs', 'general'))
);

create index if not exists idx_catalog_exercise_movements_primary_group
  on public.catalog_exercise_movements(primary_day, primary_muscle_group);

create index if not exists idx_catalog_exercise_movements_slug
  on public.catalog_exercise_movements(slug);

create index if not exists idx_catalog_exercise_movements_aliases
  on public.catalog_exercise_movements using gin (aliases);

drop trigger if exists set_catalog_exercise_movements_updated_at on public.catalog_exercise_movements;
create trigger set_catalog_exercise_movements_updated_at
before update on public.catalog_exercise_movements
for each row execute function public.set_updated_at();

alter table public.catalog_exercises
  add column if not exists movement_id uuid references public.catalog_exercise_movements(id) on delete restrict,
  add column if not exists variant_label text,
  add column if not exists variant_kind text,
  add column if not exists sort_order integer not null default 1,
  add column if not exists is_primary_variant boolean not null default false;

alter table public.catalog_exercises
  drop constraint if exists catalog_exercises_variant_kind_chk;

alter table public.catalog_exercises
  add constraint catalog_exercises_variant_kind_chk
  check (variant_kind is null or variant_kind in ('equipment', 'grip', 'position', 'support', 'load_style', 'mixed'));

create index if not exists idx_catalog_exercises_movement
  on public.catalog_exercises(movement_id, sort_order);

create table if not exists public.muscle_exercise_movement_map (
  id uuid primary key default gen_random_uuid(),
  movement_id uuid not null references public.catalog_exercise_movements(id) on delete cascade,
  muscle_subgroup_id uuid not null references public.muscle_subgroups(id) on delete cascade,
  target_score integer not null,
  aggregation_method text not null default 'max_variant_score',
  variant_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (movement_id, muscle_subgroup_id),
  constraint muscle_exercise_movement_map_target_score_chk check (target_score >= 0 and target_score <= 100)
);

create index if not exists idx_muscle_exercise_movement_map_muscle_score
  on public.muscle_exercise_movement_map(muscle_subgroup_id, target_score desc);

create index if not exists idx_muscle_exercise_movement_map_movement_score
  on public.muscle_exercise_movement_map(movement_id, target_score desc);

create table if not exists public.machine_exercise_movement_map (
  id uuid primary key default gen_random_uuid(),
  movement_id uuid not null references public.catalog_exercise_movements(id) on delete cascade,
  machine_id uuid not null references public.catalog_machines(id) on delete cascade,
  relevance_score integer not null,
  aggregation_method text not null default 'max_variant_score',
  variant_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (movement_id, machine_id),
  constraint machine_exercise_movement_map_relevance_score_chk check (relevance_score >= 0 and relevance_score <= 100)
);

create index if not exists idx_machine_exercise_movement_map_machine_score
  on public.machine_exercise_movement_map(machine_id, relevance_score desc);

create index if not exists idx_machine_exercise_movement_map_movement_score
  on public.machine_exercise_movement_map(movement_id, relevance_score desc);

alter table public.user_gym_session_exercises
  add column if not exists movement_id uuid references public.catalog_exercise_movements(id) on delete restrict;

create index if not exists idx_user_gym_session_exercises_movement
  on public.user_gym_session_exercises(movement_id);

alter table public.catalog_exercise_movements enable row level security;
alter table public.muscle_exercise_movement_map enable row level security;
alter table public.machine_exercise_movement_map enable row level security;

drop policy if exists catalog_exercise_movements_read_policy on public.catalog_exercise_movements;
drop policy if exists catalog_exercise_movements_write_policy on public.catalog_exercise_movements;

create policy catalog_exercise_movements_read_policy
  on public.catalog_exercise_movements
  for select
  to public
  using (true);

create policy catalog_exercise_movements_write_policy
  on public.catalog_exercise_movements
  for all
  to public
  using (true)
  with check (true);

drop policy if exists muscle_exercise_movement_map_read_policy on public.muscle_exercise_movement_map;
drop policy if exists muscle_exercise_movement_map_write_policy on public.muscle_exercise_movement_map;

create policy muscle_exercise_movement_map_read_policy
  on public.muscle_exercise_movement_map
  for select
  to public
  using (true);

create policy muscle_exercise_movement_map_write_policy
  on public.muscle_exercise_movement_map
  for all
  to public
  using (true)
  with check (true);

drop policy if exists machine_exercise_movement_map_read_policy on public.machine_exercise_movement_map;
drop policy if exists machine_exercise_movement_map_write_policy on public.machine_exercise_movement_map;

create policy machine_exercise_movement_map_read_policy
  on public.machine_exercise_movement_map
  for select
  to public
  using (true);

create policy machine_exercise_movement_map_write_policy
  on public.machine_exercise_movement_map
  for all
  to public
  using (true)
  with check (true);

grant select, insert, update, delete on table public.catalog_exercise_movements to anon, authenticated;
grant select, insert, update, delete on table public.muscle_exercise_movement_map to anon, authenticated;
grant select, insert, update, delete on table public.machine_exercise_movement_map to anon, authenticated;

notify pgrst, 'reload schema';
