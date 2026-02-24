alter table public.muscle_exercise_map
  add column if not exists target_score integer not null default 0,
  add column if not exists mapping_source text not null default 'rule_v1';

alter table public.muscle_machine_map
  add column if not exists target_score integer not null default 0,
  add column if not exists mapping_source text not null default 'rule_v1';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'muscle_exercise_map_target_score_check'
  ) then
    alter table public.muscle_exercise_map
      add constraint muscle_exercise_map_target_score_check
      check (target_score >= 0 and target_score <= 100);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'muscle_machine_map_target_score_check'
  ) then
    alter table public.muscle_machine_map
      add constraint muscle_machine_map_target_score_check
      check (target_score >= 0 and target_score <= 100);
  end if;
end $$;

create index if not exists idx_muscle_exercise_map_exercise_score
  on public.muscle_exercise_map(exercise_id, target_score desc);

create index if not exists idx_muscle_exercise_map_subgroup_score
  on public.muscle_exercise_map(muscle_subgroup_id, target_score desc);

create index if not exists idx_muscle_machine_map_machine_score
  on public.muscle_machine_map(machine_id, target_score desc);

notify pgrst, 'reload schema';
