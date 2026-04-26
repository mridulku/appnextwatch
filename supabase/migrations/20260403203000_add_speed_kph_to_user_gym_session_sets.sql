alter table public.user_gym_session_sets
  add column if not exists planned_speed_kph numeric(10,2),
  add column if not exists actual_speed_kph numeric(10,2);

update public.user_gym_session_sets as sets
set
  planned_speed_kph = coalesce(sets.planned_speed_kph, 9),
  actual_speed_kph = coalesce(sets.actual_speed_kph, 9)
from public.user_gym_session_exercises as session_exercises
join public.catalog_exercise_movements as movements
  on movements.id = session_exercises.movement_id
where sets.session_exercise_id = session_exercises.id
  and movements.slug = 'treadmill-run';
