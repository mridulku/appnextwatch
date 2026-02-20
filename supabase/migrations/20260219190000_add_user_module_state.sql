create table if not exists public.user_module_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  module_key text not null,
  is_ready boolean not null default false,
  updated_at timestamptz not null default now(),
  unique(user_id, module_key),
  constraint user_module_state_module_key_check
    check (
      module_key in (
        'food_inventory',
        'food_recipes',
        'food_utensils',
        'gym_machines',
        'gym_exercises'
      )
    )
);

create index if not exists idx_user_module_state_user_id on public.user_module_state(user_id);
create index if not exists idx_user_module_state_module_key on public.user_module_state(module_key);

alter table public.user_module_state enable row level security;

drop policy if exists user_module_state_read_policy on public.user_module_state;
drop policy if exists user_module_state_insert_policy on public.user_module_state;
drop policy if exists user_module_state_update_policy on public.user_module_state;
drop policy if exists user_module_state_delete_policy on public.user_module_state;

create policy user_module_state_read_policy on public.user_module_state
for select to public
using (true);

create policy user_module_state_insert_policy on public.user_module_state
for insert to public
with check (true);

create policy user_module_state_update_policy on public.user_module_state
for update to public
using (true)
with check (true);

create policy user_module_state_delete_policy on public.user_module_state
for delete to public
using (true);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.user_module_state to anon, authenticated;

notify pgrst, 'reload schema';
