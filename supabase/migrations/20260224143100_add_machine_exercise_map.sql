create table if not exists public.machine_exercise_map (
  id uuid primary key default gen_random_uuid(),
  machine_id uuid not null references public.catalog_machines(id) on delete cascade,
  exercise_id uuid not null references public.catalog_exercises(id) on delete cascade,
  relevance_score integer not null,
  mapping_source text not null default 'derived_v1',
  created_at timestamptz not null default now(),
  unique (machine_id, exercise_id),
  constraint machine_exercise_map_relevance_score_check check (relevance_score >= 0 and relevance_score <= 100)
);

create index if not exists idx_machine_exercise_map_machine_score
  on public.machine_exercise_map(machine_id, relevance_score desc);

create index if not exists idx_machine_exercise_map_exercise_score
  on public.machine_exercise_map(exercise_id, relevance_score desc);

alter table public.machine_exercise_map enable row level security;

drop policy if exists machine_exercise_map_read_policy on public.machine_exercise_map;
drop policy if exists machine_exercise_map_write_policy on public.machine_exercise_map;

create policy machine_exercise_map_read_policy
  on public.machine_exercise_map
  for select
  to public
  using (true);

create policy machine_exercise_map_write_policy
  on public.machine_exercise_map
  for all
  to public
  using (true)
  with check (true);

grant select, insert, update, delete on table public.machine_exercise_map to anon, authenticated;

notify pgrst, 'reload schema';
