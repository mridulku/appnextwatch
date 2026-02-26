alter table public.user_audio_clips
add column if not exists transcript_text text,
add column if not exists transcribed_at timestamptz;

notify pgrst, 'reload schema';
