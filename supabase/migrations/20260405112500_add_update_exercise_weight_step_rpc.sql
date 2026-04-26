create or replace function public.update_catalog_exercise_weight_step(
  p_exercise_id uuid,
  p_weight_step_kg numeric
)
returns table (
  id uuid,
  weight_step_kg numeric
)
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.catalog_exercises
  set weight_step_kg = p_weight_step_kg
  where catalog_exercises.id = p_exercise_id;

  return query
  select ce.id, ce.weight_step_kg
  from public.catalog_exercises ce
  where ce.id = p_exercise_id;
end;
$$;

revoke all on function public.update_catalog_exercise_weight_step(uuid, numeric) from public;
grant execute on function public.update_catalog_exercise_weight_step(uuid, numeric) to anon;
grant execute on function public.update_catalog_exercise_weight_step(uuid, numeric) to authenticated;
