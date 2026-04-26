insert into public.catalog_exercises (
  name,
  type,
  primary_muscle_group,
  equipment,
  created_by,
  movement_id,
  variant_label,
  variant_kind,
  sort_order,
  is_primary_variant
)
select
  'Goblet Sumo Squat',
  'compound',
  'Legs',
  'Dumbbell',
  null,
  movement.id,
  'Goblet Sumo Dumbbell',
  'position',
  4,
  false
from public.catalog_exercise_movements movement
where movement.slug = 'squat'
  and not exists (
    select 1
    from public.catalog_exercises exercise
    where lower(exercise.name) = 'goblet sumo squat'
      and exercise.created_by is null
  );

update public.catalog_exercise_movements
set aliases = (
  select array(
    select distinct alias
    from unnest(coalesce(catalog_exercise_movements.aliases, '{}'::text[]) || array['Goblet Sumo Squat', 'Dumbbell Sumo Squat']) as alias
    order by alias
  )
)
where slug = 'squat';

update public.catalog_exercises
set sort_order = 5
where lower(name) = 'smith squat'
  and created_by is null
  and sort_order = 4;

update public.user_gym_session_exercises session_exercise
set
  exercise_id = exercise.id,
  movement_id = exercise.movement_id
from public.catalog_exercises exercise
cross join public.user_gym_sessions session
where lower(exercise.name) = 'goblet sumo squat'
  and exercise.created_by is null
  and session.id = session_exercise.session_id
  and session.session_date = date '2026-03-15'
  and coalesce(session.title, '') = 'Leg day'
  and session_exercise.sort_order = 3;
