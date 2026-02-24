create table if not exists public.user_gym_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  status text not null default 'not_started',
  session_date date,
  duration_min integer,
  est_calories integer,
  why_note text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_gym_sessions_status_chk check (status in ('not_started', 'in_progress', 'complete'))
);

create table if not exists public.user_gym_session_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  session_id uuid not null references public.user_gym_sessions(id) on delete cascade,
  exercise_id uuid not null references public.catalog_exercises(id) on delete restrict,
  sort_order integer not null,
  created_at timestamptz not null default now()
);

create table if not exists public.user_gym_session_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  session_exercise_id uuid not null references public.user_gym_session_exercises(id) on delete cascade,
  set_index integer not null,
  planned_reps integer,
  planned_weight_kg numeric(10,2),
  actual_reps integer,
  actual_weight_kg numeric(10,2),
  logged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(session_exercise_id, set_index)
);

create index if not exists idx_user_gym_sessions_user_created
  on public.user_gym_sessions(user_id, created_at desc);

create index if not exists idx_user_gym_session_exercises_session_order
  on public.user_gym_session_exercises(session_id, sort_order);

create index if not exists idx_user_gym_session_sets_exercise_order
  on public.user_gym_session_sets(session_exercise_id, set_index);

alter table public.user_gym_sessions enable row level security;
alter table public.user_gym_session_exercises enable row level security;
alter table public.user_gym_session_sets enable row level security;

drop policy if exists user_gym_sessions_read_policy on public.user_gym_sessions;
drop policy if exists user_gym_sessions_insert_policy on public.user_gym_sessions;
drop policy if exists user_gym_sessions_update_policy on public.user_gym_sessions;
drop policy if exists user_gym_sessions_delete_policy on public.user_gym_sessions;

create policy user_gym_sessions_read_policy on public.user_gym_sessions
for select to public
using (true);

create policy user_gym_sessions_insert_policy on public.user_gym_sessions
for insert to public
with check (true);

create policy user_gym_sessions_update_policy on public.user_gym_sessions
for update to public
using (true)
with check (true);

create policy user_gym_sessions_delete_policy on public.user_gym_sessions
for delete to public
using (true);

drop policy if exists user_gym_session_exercises_read_policy on public.user_gym_session_exercises;
drop policy if exists user_gym_session_exercises_insert_policy on public.user_gym_session_exercises;
drop policy if exists user_gym_session_exercises_update_policy on public.user_gym_session_exercises;
drop policy if exists user_gym_session_exercises_delete_policy on public.user_gym_session_exercises;

create policy user_gym_session_exercises_read_policy on public.user_gym_session_exercises
for select to public
using (true);

create policy user_gym_session_exercises_insert_policy on public.user_gym_session_exercises
for insert to public
with check (true);

create policy user_gym_session_exercises_update_policy on public.user_gym_session_exercises
for update to public
using (true)
with check (true);

create policy user_gym_session_exercises_delete_policy on public.user_gym_session_exercises
for delete to public
using (true);

drop policy if exists user_gym_session_sets_read_policy on public.user_gym_session_sets;
drop policy if exists user_gym_session_sets_insert_policy on public.user_gym_session_sets;
drop policy if exists user_gym_session_sets_update_policy on public.user_gym_session_sets;
drop policy if exists user_gym_session_sets_delete_policy on public.user_gym_session_sets;

create policy user_gym_session_sets_read_policy on public.user_gym_session_sets
for select to public
using (true);

create policy user_gym_session_sets_insert_policy on public.user_gym_session_sets
for insert to public
with check (true);

create policy user_gym_session_sets_update_policy on public.user_gym_session_sets
for update to public
using (true)
with check (true);

create policy user_gym_session_sets_delete_policy on public.user_gym_session_sets
for delete to public
using (true);

drop trigger if exists set_user_gym_sessions_updated_at on public.user_gym_sessions;
create trigger set_user_gym_sessions_updated_at
before update on public.user_gym_sessions
for each row execute function public.set_updated_at();

drop trigger if exists set_user_gym_session_sets_updated_at on public.user_gym_session_sets;
create trigger set_user_gym_session_sets_updated_at
before update on public.user_gym_session_sets
for each row execute function public.set_updated_at();

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.user_gym_sessions to anon, authenticated;
grant select, insert, update, delete on table public.user_gym_session_exercises to anon, authenticated;
grant select, insert, update, delete on table public.user_gym_session_sets to anon, authenticated;

notify pgrst, 'reload schema';
