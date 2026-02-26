alter table public.user_audio_clips
  add column if not exists gym_session_id uuid references public.user_gym_sessions(id) on delete set null;

create index if not exists idx_user_audio_clips_user_session_created
  on public.user_audio_clips(user_id, gym_session_id, created_at desc);

notify pgrst, 'reload schema';
