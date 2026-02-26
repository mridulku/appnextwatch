create table if not exists public.user_audio_clips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  storage_path text not null unique,
  bucket text not null default 'user-audio',
  file_name text not null,
  mime_type text,
  duration_ms integer,
  size_bytes bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_audio_clips_user_created
  on public.user_audio_clips(user_id, created_at desc);

alter table public.user_audio_clips enable row level security;

drop policy if exists user_audio_clips_read_policy on public.user_audio_clips;
drop policy if exists user_audio_clips_insert_policy on public.user_audio_clips;
drop policy if exists user_audio_clips_update_policy on public.user_audio_clips;
drop policy if exists user_audio_clips_delete_policy on public.user_audio_clips;

create policy user_audio_clips_read_policy on public.user_audio_clips
for select to public
using (true);

create policy user_audio_clips_insert_policy on public.user_audio_clips
for insert to public
with check (true);

create policy user_audio_clips_update_policy on public.user_audio_clips
for update to public
using (true)
with check (true);

create policy user_audio_clips_delete_policy on public.user_audio_clips
for delete to public
using (true);

drop trigger if exists set_user_audio_clips_updated_at on public.user_audio_clips;
create trigger set_user_audio_clips_updated_at
before update on public.user_audio_clips
for each row execute function public.set_updated_at();

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.user_audio_clips to anon, authenticated;

insert into storage.buckets (id, name, public)
values ('user-audio', 'user-audio', false)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public;

drop policy if exists user_audio_bucket_select on storage.objects;
drop policy if exists user_audio_bucket_insert on storage.objects;
drop policy if exists user_audio_bucket_update on storage.objects;
drop policy if exists user_audio_bucket_delete on storage.objects;

create policy user_audio_bucket_select on storage.objects
for select to public
using (bucket_id = 'user-audio');

create policy user_audio_bucket_insert on storage.objects
for insert to public
with check (bucket_id = 'user-audio');

create policy user_audio_bucket_update on storage.objects
for update to public
using (bucket_id = 'user-audio')
with check (bucket_id = 'user-audio');

create policy user_audio_bucket_delete on storage.objects
for delete to public
using (bucket_id = 'user-audio');

notify pgrst, 'reload schema';
