create table if not exists public.muscles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  name_key text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.muscle_subgroups (
  id uuid primary key default gen_random_uuid(),
  muscle_id uuid not null references public.muscles(id) on delete cascade,
  name text not null,
  name_key text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (muscle_id, name_key)
);

create table if not exists public.muscle_exercise_map (
  id uuid primary key default gen_random_uuid(),
  muscle_subgroup_id uuid not null references public.muscle_subgroups(id) on delete cascade,
  exercise_id uuid not null references public.catalog_exercises(id) on delete cascade,
  is_primary boolean not null default true,
  created_at timestamptz not null default now(),
  unique (muscle_subgroup_id, exercise_id)
);

create table if not exists public.muscle_machine_map (
  id uuid primary key default gen_random_uuid(),
  muscle_subgroup_id uuid not null references public.muscle_subgroups(id) on delete cascade,
  machine_id uuid not null references public.catalog_machines(id) on delete cascade,
  is_primary boolean not null default true,
  created_at timestamptz not null default now(),
  unique (muscle_subgroup_id, machine_id)
);

create index if not exists idx_muscles_sort_order on public.muscles(sort_order);
create index if not exists idx_muscle_subgroups_muscle_id on public.muscle_subgroups(muscle_id);
create index if not exists idx_muscle_subgroups_sort_order on public.muscle_subgroups(sort_order);
create index if not exists idx_muscle_exercise_map_subgroup on public.muscle_exercise_map(muscle_subgroup_id);
create index if not exists idx_muscle_exercise_map_exercise on public.muscle_exercise_map(exercise_id);
create index if not exists idx_muscle_machine_map_subgroup on public.muscle_machine_map(muscle_subgroup_id);
create index if not exists idx_muscle_machine_map_machine on public.muscle_machine_map(machine_id);

alter table public.muscles enable row level security;
alter table public.muscle_subgroups enable row level security;
alter table public.muscle_exercise_map enable row level security;
alter table public.muscle_machine_map enable row level security;

drop policy if exists muscles_read_policy on public.muscles;
drop policy if exists muscles_write_policy on public.muscles;
drop policy if exists muscle_subgroups_read_policy on public.muscle_subgroups;
drop policy if exists muscle_subgroups_write_policy on public.muscle_subgroups;
drop policy if exists muscle_exercise_map_read_policy on public.muscle_exercise_map;
drop policy if exists muscle_exercise_map_write_policy on public.muscle_exercise_map;
drop policy if exists muscle_machine_map_read_policy on public.muscle_machine_map;
drop policy if exists muscle_machine_map_write_policy on public.muscle_machine_map;

create policy muscles_read_policy on public.muscles for select to public using (true);
create policy muscles_write_policy on public.muscles for all to public using (true) with check (true);

create policy muscle_subgroups_read_policy on public.muscle_subgroups for select to public using (true);
create policy muscle_subgroups_write_policy on public.muscle_subgroups for all to public using (true) with check (true);

create policy muscle_exercise_map_read_policy on public.muscle_exercise_map for select to public using (true);
create policy muscle_exercise_map_write_policy on public.muscle_exercise_map for all to public using (true) with check (true);

create policy muscle_machine_map_read_policy on public.muscle_machine_map for select to public using (true);
create policy muscle_machine_map_write_policy on public.muscle_machine_map for all to public using (true) with check (true);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.muscles to anon, authenticated;
grant select, insert, update, delete on table public.muscle_subgroups to anon, authenticated;
grant select, insert, update, delete on table public.muscle_exercise_map to anon, authenticated;
grant select, insert, update, delete on table public.muscle_machine_map to anon, authenticated;

notify pgrst, 'reload schema';
