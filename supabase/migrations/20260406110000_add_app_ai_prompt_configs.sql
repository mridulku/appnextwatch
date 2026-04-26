create table if not exists public.app_ai_prompt_configs (
  id uuid primary key default gen_random_uuid(),
  scope_key text not null,
  use_case_key text not null unique,
  title text not null,
  subtitle text,
  system_prompt text not null,
  data_attachment_spec text not null,
  response_structure text not null,
  enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_app_ai_prompt_configs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_app_ai_prompt_configs_updated_at on public.app_ai_prompt_configs;
create trigger trg_app_ai_prompt_configs_updated_at
before update on public.app_ai_prompt_configs
for each row
execute function public.set_app_ai_prompt_configs_updated_at();

alter table public.app_ai_prompt_configs disable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'app_ai_prompt_configs_scope_key_check'
  ) then
    alter table public.app_ai_prompt_configs
      add constraint app_ai_prompt_configs_scope_key_check
      check (scope_key in ('gym', 'food', 'movies', 'global'));
  end if;
end $$;

insert into public.app_ai_prompt_configs (
  scope_key,
  use_case_key,
  title,
  subtitle,
  system_prompt,
  data_attachment_spec,
  response_structure,
  enabled,
  sort_order
)
values (
  'gym',
  'exercise_history_recommendation',
  'Exercise history recommendation',
  'Used by the Create Session AI advice widget.',
  'You are a concise gym progression assistant. Use only the provided exercise identity, measurement metadata, current draft, and historical sessions. Do not invent numbers or sessions. Do not give medical advice or injury diagnosis. Give one short paragraph, maximum 45 words. If the data is sparse or inconsistent, suggest a conservative repeat or a small adjustment only.',
  'The attached payload includes: 1) exercise identity: movement name, variant name, primary muscle, and equipment; 2) measurement metadata used for interpreting reps, weight, speed, and step settings; 3) current draft sets from the builder after any prefilling or edits; 4) the last up to 5 historical sessions for the exact exercise variant, each with session date and ordered set rows.',
  '{"advice":"string"} Return exactly one short paragraph in the advice field. No bullets. No JSON commentary outside this structure.',
  true,
  0
)
on conflict (use_case_key) do update
set
  title = excluded.title,
  subtitle = excluded.subtitle,
  system_prompt = excluded.system_prompt,
  data_attachment_spec = excluded.data_attachment_spec,
  response_structure = excluded.response_structure,
  enabled = excluded.enabled,
  sort_order = excluded.sort_order,
  updated_at = timezone('utc', now());
