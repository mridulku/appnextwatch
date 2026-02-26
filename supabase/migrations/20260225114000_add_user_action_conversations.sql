create table if not exists public.user_action_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  domain text not null default 'gym',
  intent text,
  status text not null default 'needs_clarification',
  draft jsonb not null default '{}'::jsonb,
  issues jsonb not null default '[]'::jsonb,
  last_user_message text,
  last_assistant_message text,
  executed_result jsonb,
  executed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_action_conversations_status_chk
    check (status in ('needs_clarification', 'ready_to_execute', 'executed', 'failed'))
);

create table if not exists public.user_action_turns (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.user_action_conversations(id) on delete cascade,
  user_id uuid not null,
  role text not null,
  kind text not null default 'message',
  content text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint user_action_turns_role_chk check (role in ('user', 'assistant', 'system'))
);

create index if not exists idx_user_action_conversations_user_updated
  on public.user_action_conversations(user_id, updated_at desc);

create index if not exists idx_user_action_turns_conversation_created
  on public.user_action_turns(conversation_id, created_at asc);

alter table public.user_action_conversations enable row level security;
alter table public.user_action_turns enable row level security;

drop policy if exists user_action_conversations_read_policy on public.user_action_conversations;
drop policy if exists user_action_conversations_insert_policy on public.user_action_conversations;
drop policy if exists user_action_conversations_update_policy on public.user_action_conversations;
drop policy if exists user_action_conversations_delete_policy on public.user_action_conversations;

create policy user_action_conversations_read_policy on public.user_action_conversations
for select to public
using (true);

create policy user_action_conversations_insert_policy on public.user_action_conversations
for insert to public
with check (true);

create policy user_action_conversations_update_policy on public.user_action_conversations
for update to public
using (true)
with check (true);

create policy user_action_conversations_delete_policy on public.user_action_conversations
for delete to public
using (true);

drop policy if exists user_action_turns_read_policy on public.user_action_turns;
drop policy if exists user_action_turns_insert_policy on public.user_action_turns;
drop policy if exists user_action_turns_update_policy on public.user_action_turns;
drop policy if exists user_action_turns_delete_policy on public.user_action_turns;

create policy user_action_turns_read_policy on public.user_action_turns
for select to public
using (true);

create policy user_action_turns_insert_policy on public.user_action_turns
for insert to public
with check (true);

create policy user_action_turns_update_policy on public.user_action_turns
for update to public
using (true)
with check (true);

create policy user_action_turns_delete_policy on public.user_action_turns
for delete to public
using (true);

drop trigger if exists set_user_action_conversations_updated_at on public.user_action_conversations;
create trigger set_user_action_conversations_updated_at
before update on public.user_action_conversations
for each row execute function public.set_updated_at();

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.user_action_conversations to anon, authenticated;
grant select, insert, update, delete on table public.user_action_turns to anon, authenticated;

notify pgrst, 'reload schema';
