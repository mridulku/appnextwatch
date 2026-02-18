create table if not exists public.user_machines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  machine_id uuid not null references public.catalog_machines(id) on delete cascade,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  unique(user_id, machine_id)
);

create index if not exists idx_user_machines_user_id on public.user_machines(user_id);
create index if not exists idx_user_machines_machine_id on public.user_machines(machine_id);

alter table public.user_machines enable row level security;

drop policy if exists user_machines_policy on public.user_machines;
drop policy if exists user_machines_read_policy on public.user_machines;
drop policy if exists user_machines_insert_policy on public.user_machines;
drop policy if exists user_machines_update_policy on public.user_machines;
drop policy if exists user_machines_delete_policy on public.user_machines;

create policy user_machines_read_policy on public.user_machines
for select to public
using (true);

create policy user_machines_insert_policy on public.user_machines
for insert to public
with check (true);

create policy user_machines_update_policy on public.user_machines
for update to public
using (true)
with check (true);

create policy user_machines_delete_policy on public.user_machines
for delete to public
using (true);
