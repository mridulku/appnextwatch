-- init_wellness_food_gym
create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Catalog tables
create table if not exists public.catalog_ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_key text generated always as (lower(name)) stored,
  category text,
  unit_type text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.catalog_utensils (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_key text generated always as (lower(name)) stored,
  category text,
  note text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.catalog_recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_key text generated always as (lower(name)) stored,
  meal_type text,
  servings integer,
  total_minutes integer,
  difficulty text,
  instructions text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.catalog_recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.catalog_recipes(id) on delete cascade,
  ingredient_id uuid not null references public.catalog_ingredients(id) on delete restrict,
  amount numeric(10,2),
  unit text,
  created_at timestamptz not null default now(),
  unique(recipe_id, ingredient_id)
);

create table if not exists public.catalog_exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_key text generated always as (lower(name)) stored,
  type text,
  primary_muscle_group text,
  equipment text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.catalog_machines (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_key text generated always as (lower(name)) stored,
  zone text,
  primary_muscles text[],
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.metric_definitions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_key text generated always as (lower(name)) stored,
  unit text,
  metric_type text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- User overlays
create table if not exists public.user_ingredients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  ingredient_id uuid references public.catalog_ingredients(id) on delete set null,
  custom_name text,
  quantity numeric(10,2) not null default 0,
  unit_type text,
  low_stock_threshold numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_ingredients_name_or_catalog_chk check (ingredient_id is not null or custom_name is not null)
);

create table if not exists public.user_utensils (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  utensil_id uuid references public.catalog_utensils(id) on delete set null,
  custom_name text,
  count integer not null default 0,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_utensils_name_or_catalog_chk check (utensil_id is not null or custom_name is not null)
);

create table if not exists public.user_metric_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  metric_definition_id uuid not null references public.metric_definitions(id) on delete cascade,
  target_value numeric(12,2) not null,
  period text,
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, metric_definition_id)
);

-- Logs / observations
create table if not exists public.metric_observations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  metric_definition_id uuid not null references public.metric_definitions(id) on delete cascade,
  observed_at timestamptz not null default now(),
  value numeric(12,2) not null,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  status text not null default 'completed',
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_seconds integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  workout_session_id uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_id uuid references public.catalog_exercises(id) on delete set null,
  set_index integer not null,
  reps integer,
  weight_kg numeric(10,2),
  rpe numeric(4,2),
  created_at timestamptz not null default now()
);

-- Unique constraints for global vs private catalog rows
create unique index if not exists catalog_ingredients_global_name_uq
  on public.catalog_ingredients(name_key)
  where created_by is null;
create unique index if not exists catalog_ingredients_user_name_uq
  on public.catalog_ingredients(created_by, name_key)
  where created_by is not null;

create unique index if not exists catalog_utensils_global_name_uq
  on public.catalog_utensils(name_key)
  where created_by is null;
create unique index if not exists catalog_utensils_user_name_uq
  on public.catalog_utensils(created_by, name_key)
  where created_by is not null;

create unique index if not exists catalog_recipes_global_name_uq
  on public.catalog_recipes(name_key)
  where created_by is null;
create unique index if not exists catalog_recipes_user_name_uq
  on public.catalog_recipes(created_by, name_key)
  where created_by is not null;

create unique index if not exists catalog_exercises_global_name_uq
  on public.catalog_exercises(name_key)
  where created_by is null;
create unique index if not exists catalog_exercises_user_name_uq
  on public.catalog_exercises(created_by, name_key)
  where created_by is not null;

create unique index if not exists catalog_machines_global_name_uq
  on public.catalog_machines(name_key)
  where created_by is null;
create unique index if not exists catalog_machines_user_name_uq
  on public.catalog_machines(created_by, name_key)
  where created_by is not null;

create unique index if not exists metric_definitions_global_name_uq
  on public.metric_definitions(name_key)
  where created_by is null;
create unique index if not exists metric_definitions_user_name_uq
  on public.metric_definitions(created_by, name_key)
  where created_by is not null;

-- Performance indexes
create index if not exists idx_catalog_recipe_ingredients_recipe_id on public.catalog_recipe_ingredients(recipe_id);
create index if not exists idx_catalog_recipe_ingredients_ingredient_id on public.catalog_recipe_ingredients(ingredient_id);

create index if not exists idx_user_ingredients_user_id on public.user_ingredients(user_id);
create index if not exists idx_user_ingredients_ingredient_id on public.user_ingredients(ingredient_id);

create index if not exists idx_user_utensils_user_id on public.user_utensils(user_id);
create index if not exists idx_user_utensils_utensil_id on public.user_utensils(utensil_id);

create index if not exists idx_user_metric_targets_user_id on public.user_metric_targets(user_id);
create index if not exists idx_user_metric_targets_metric_id on public.user_metric_targets(metric_definition_id);

create index if not exists idx_metric_observations_user_id on public.metric_observations(user_id);
create index if not exists idx_metric_observations_metric_id on public.metric_observations(metric_definition_id);
create index if not exists idx_metric_observations_observed_at on public.metric_observations(observed_at);

create index if not exists idx_workout_sessions_user_id on public.workout_sessions(user_id);
create index if not exists idx_workout_sessions_started_at on public.workout_sessions(started_at);

create index if not exists idx_workout_sets_user_id on public.workout_sets(user_id);
create index if not exists idx_workout_sets_session_id on public.workout_sets(workout_session_id);
create index if not exists idx_workout_sets_exercise_id on public.workout_sets(exercise_id);

-- updated_at triggers
create trigger set_catalog_ingredients_updated_at
before update on public.catalog_ingredients
for each row execute function public.set_updated_at();

create trigger set_catalog_utensils_updated_at
before update on public.catalog_utensils
for each row execute function public.set_updated_at();

create trigger set_catalog_recipes_updated_at
before update on public.catalog_recipes
for each row execute function public.set_updated_at();

create trigger set_catalog_exercises_updated_at
before update on public.catalog_exercises
for each row execute function public.set_updated_at();

create trigger set_catalog_machines_updated_at
before update on public.catalog_machines
for each row execute function public.set_updated_at();

create trigger set_metric_definitions_updated_at
before update on public.metric_definitions
for each row execute function public.set_updated_at();

create trigger set_user_ingredients_updated_at
before update on public.user_ingredients
for each row execute function public.set_updated_at();

create trigger set_user_utensils_updated_at
before update on public.user_utensils
for each row execute function public.set_updated_at();

create trigger set_user_metric_targets_updated_at
before update on public.user_metric_targets
for each row execute function public.set_updated_at();

create trigger set_workout_sessions_updated_at
before update on public.workout_sessions
for each row execute function public.set_updated_at();

-- RLS
alter table public.catalog_ingredients enable row level security;
alter table public.catalog_utensils enable row level security;
alter table public.catalog_recipes enable row level security;
alter table public.catalog_recipe_ingredients enable row level security;
alter table public.catalog_exercises enable row level security;
alter table public.catalog_machines enable row level security;
alter table public.metric_definitions enable row level security;
alter table public.user_ingredients enable row level security;
alter table public.user_utensils enable row level security;
alter table public.user_metric_targets enable row level security;
alter table public.metric_observations enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.workout_sets enable row level security;

-- Catalog policies: global readable + creator-private rows
create policy catalog_ingredients_read_policy on public.catalog_ingredients
for select to public
using (created_by is null or created_by = auth.uid());
create policy catalog_ingredients_write_policy on public.catalog_ingredients
for all to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

create policy catalog_utensils_read_policy on public.catalog_utensils
for select to public
using (created_by is null or created_by = auth.uid());
create policy catalog_utensils_write_policy on public.catalog_utensils
for all to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

create policy catalog_recipes_read_policy on public.catalog_recipes
for select to public
using (created_by is null or created_by = auth.uid());
create policy catalog_recipes_write_policy on public.catalog_recipes
for all to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

create policy catalog_recipe_ingredients_read_policy on public.catalog_recipe_ingredients
for select to public
using (
  exists (
    select 1
    from public.catalog_recipes r
    where r.id = recipe_id
      and (r.created_by is null or r.created_by = auth.uid())
  )
);
create policy catalog_recipe_ingredients_write_policy on public.catalog_recipe_ingredients
for all to authenticated
using (
  exists (
    select 1
    from public.catalog_recipes r
    where r.id = recipe_id
      and r.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.catalog_recipes r
    where r.id = recipe_id
      and r.created_by = auth.uid()
  )
);

create policy catalog_exercises_read_policy on public.catalog_exercises
for select to public
using (created_by is null or created_by = auth.uid());
create policy catalog_exercises_write_policy on public.catalog_exercises
for all to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

create policy catalog_machines_read_policy on public.catalog_machines
for select to public
using (created_by is null or created_by = auth.uid());
create policy catalog_machines_write_policy on public.catalog_machines
for all to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

create policy metric_definitions_read_policy on public.metric_definitions
for select to public
using (created_by is null or created_by = auth.uid());
create policy metric_definitions_write_policy on public.metric_definitions
for all to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

-- User overlay + logs policies
create policy user_ingredients_policy on public.user_ingredients
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy user_utensils_policy on public.user_utensils
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy user_metric_targets_policy on public.user_metric_targets
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy metric_observations_policy on public.metric_observations
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy workout_sessions_policy on public.workout_sessions
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy workout_sets_policy on public.workout_sets
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
