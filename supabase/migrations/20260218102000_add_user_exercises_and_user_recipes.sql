create table if not exists public.user_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  exercise_id uuid not null references public.catalog_exercises(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, exercise_id)
);

create table if not exists public.user_recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  recipe_id uuid not null references public.catalog_recipes(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, recipe_id)
);

create index if not exists idx_user_exercises_user_id on public.user_exercises(user_id);
create index if not exists idx_user_exercises_exercise_id on public.user_exercises(exercise_id);

create index if not exists idx_user_recipes_user_id on public.user_recipes(user_id);
create index if not exists idx_user_recipes_recipe_id on public.user_recipes(recipe_id);

alter table public.user_exercises enable row level security;
alter table public.user_recipes enable row level security;

drop policy if exists user_exercises_policy on public.user_exercises;
drop policy if exists user_exercises_read_policy on public.user_exercises;
drop policy if exists user_exercises_insert_policy on public.user_exercises;
drop policy if exists user_exercises_update_policy on public.user_exercises;
drop policy if exists user_exercises_delete_policy on public.user_exercises;

create policy user_exercises_read_policy on public.user_exercises
for select to public
using (true);

create policy user_exercises_insert_policy on public.user_exercises
for insert to public
with check (true);

create policy user_exercises_update_policy on public.user_exercises
for update to public
using (true)
with check (true);

create policy user_exercises_delete_policy on public.user_exercises
for delete to public
using (true);

drop policy if exists user_recipes_policy on public.user_recipes;
drop policy if exists user_recipes_read_policy on public.user_recipes;
drop policy if exists user_recipes_insert_policy on public.user_recipes;
drop policy if exists user_recipes_update_policy on public.user_recipes;
drop policy if exists user_recipes_delete_policy on public.user_recipes;

create policy user_recipes_read_policy on public.user_recipes
for select to public
using (true);

create policy user_recipes_insert_policy on public.user_recipes
for insert to public
with check (true);

create policy user_recipes_update_policy on public.user_recipes
for update to public
using (true)
with check (true);

create policy user_recipes_delete_policy on public.user_recipes
for delete to public
using (true);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.user_exercises to anon, authenticated;
grant select, insert, update, delete on table public.user_recipes to anon, authenticated;

notify pgrst, 'reload schema';
