alter table public.user_audio_clips
  alter column storage_path drop not null;

alter table public.user_audio_clips
  add column if not exists parts_count integer not null default 0,
  add column if not exists total_duration_ms integer not null default 0,
  add column if not exists started_at timestamptz,
  add column if not exists ended_at timestamptz;

create table if not exists public.user_audio_clip_segments (
  id uuid primary key default gen_random_uuid(),
  clip_id uuid not null references public.user_audio_clips(id) on delete cascade,
  user_id uuid not null,
  segment_index integer not null,
  storage_path text not null unique,
  bucket text not null default 'user-audio',
  file_name text not null,
  mime_type text,
  duration_ms integer,
  size_bytes bigint,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  transcript_text text,
  transcribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clip_id, segment_index)
);

create index if not exists idx_user_audio_clip_segments_clip_index
  on public.user_audio_clip_segments(clip_id, segment_index);

create index if not exists idx_user_audio_clip_segments_user_created
  on public.user_audio_clip_segments(user_id, created_at desc);

alter table public.user_audio_clip_segments enable row level security;

drop policy if exists user_audio_clip_segments_read_policy on public.user_audio_clip_segments;
drop policy if exists user_audio_clip_segments_insert_policy on public.user_audio_clip_segments;
drop policy if exists user_audio_clip_segments_update_policy on public.user_audio_clip_segments;
drop policy if exists user_audio_clip_segments_delete_policy on public.user_audio_clip_segments;

create policy user_audio_clip_segments_read_policy on public.user_audio_clip_segments
for select to public
using (true);

create policy user_audio_clip_segments_insert_policy on public.user_audio_clip_segments
for insert to public
with check (true);

create policy user_audio_clip_segments_update_policy on public.user_audio_clip_segments
for update to public
using (true)
with check (true);

create policy user_audio_clip_segments_delete_policy on public.user_audio_clip_segments
for delete to public
using (true);

drop trigger if exists set_user_audio_clip_segments_updated_at on public.user_audio_clip_segments;
create trigger set_user_audio_clip_segments_updated_at
before update on public.user_audio_clip_segments
for each row execute function public.set_updated_at();

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.user_audio_clip_segments to anon, authenticated;

notify pgrst, 'reload schema';
