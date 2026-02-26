create table if not exists public.user_action_executions (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.user_action_conversations(id) on delete cascade,
  user_id uuid not null,
  action_type text not null,
  idempotency_key text not null unique,
  snapshot_hash text not null,
  status text not null default 'executing',
  receipt jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_action_executions_status_chk check (status in ('executing', 'done', 'failed'))
);

create index if not exists idx_user_action_executions_user_created
  on public.user_action_executions(user_id, created_at desc);

create index if not exists idx_user_action_executions_conversation
  on public.user_action_executions(conversation_id, created_at desc);

alter table public.user_action_executions enable row level security;

drop policy if exists user_action_executions_read_policy on public.user_action_executions;
drop policy if exists user_action_executions_insert_policy on public.user_action_executions;
drop policy if exists user_action_executions_update_policy on public.user_action_executions;
drop policy if exists user_action_executions_delete_policy on public.user_action_executions;

create policy user_action_executions_read_policy on public.user_action_executions
for select to public
using (true);

create policy user_action_executions_insert_policy on public.user_action_executions
for insert to public
with check (true);

create policy user_action_executions_update_policy on public.user_action_executions
for update to public
using (true)
with check (true);

create policy user_action_executions_delete_policy on public.user_action_executions
for delete to public
using (true);

drop trigger if exists set_user_action_executions_updated_at on public.user_action_executions;
create trigger set_user_action_executions_updated_at
before update on public.user_action_executions
for each row execute function public.set_updated_at();

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.user_action_executions to anon, authenticated;

notify pgrst, 'reload schema';
