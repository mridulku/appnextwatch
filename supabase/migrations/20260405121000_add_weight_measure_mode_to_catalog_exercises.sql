alter table public.catalog_exercises
add column if not exists weight_measure_mode text not null default 'steps',
add column if not exists weight_fixed_values jsonb not null default '[]'::jsonb;

alter table public.catalog_exercises
drop constraint if exists catalog_exercises_weight_measure_mode_check;

alter table public.catalog_exercises
add constraint catalog_exercises_weight_measure_mode_check
check (weight_measure_mode in ('steps', 'fixed'));

create or replace function public.update_catalog_exercise_measurement_settings(
  p_exercise_id uuid,
  p_weight_step_kg numeric,
  p_weight_measure_mode text,
  p_weight_fixed_values jsonb
)
returns table (
  id uuid,
  weight_step_kg numeric,
  weight_measure_mode text,
  weight_fixed_values jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.catalog_exercises
  set
    weight_step_kg = coalesce(p_weight_step_kg, weight_step_kg),
    weight_measure_mode = coalesce(p_weight_measure_mode, weight_measure_mode),
    weight_fixed_values = coalesce(p_weight_fixed_values, weight_fixed_values)
  where catalog_exercises.id = p_exercise_id;

  return query
  select
    ce.id,
    ce.weight_step_kg,
    ce.weight_measure_mode,
    ce.weight_fixed_values
  from public.catalog_exercises ce
  where ce.id = p_exercise_id;
end;
$$;

revoke all on function public.update_catalog_exercise_measurement_settings(uuid, numeric, text, jsonb) from public;
grant execute on function public.update_catalog_exercise_measurement_settings(uuid, numeric, text, jsonb) to anon;
grant execute on function public.update_catalog_exercise_measurement_settings(uuid, numeric, text, jsonb) to authenticated;
