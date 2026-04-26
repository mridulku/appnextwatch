insert into public.catalog_exercise_movements (
  slug,
  name,
  category,
  primary_muscle_group,
  primary_day,
  movement_family,
  aliases,
  image_status
)
select
  't-bar-row',
  'T-Bar Row',
  'strength',
  'Back',
  'pull',
  'row',
  array['T Bar Row'],
  'pending'
where not exists (
  select 1
  from public.catalog_exercise_movements movement
  where movement.slug = 't-bar-row'
);

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
  'T-Bar Row',
  'compound',
  'Back',
  'Barbell',
  null,
  movement.id,
  'T-Bar',
  'equipment',
  1,
  true
from public.catalog_exercise_movements movement
where movement.slug = 't-bar-row'
  and not exists (
    select 1
    from public.catalog_exercises exercise
    where lower(exercise.name) = 't-bar row'
      and exercise.created_by is null
  );

with demo_user as (
  select id
  from public.app_users
  where username = 'demo user'
  limit 1
),
favorite_targets(name, position) as (
  values
    ('Lat Pulldown', 1),
    ('Seated Cable Row', 2),
    ('Bent Over Barbell Row', 3),
    ('Back Extension', 4),
    ('Single Arm Dumbbell Row', 5),
    ('Hammer Curl', 6),
    ('Biceps Curl', 7)
),
target_exercises as (
  select
    exercise.id as exercise_id,
    favorite_targets.position
  from favorite_targets
  join public.catalog_exercises exercise
    on lower(exercise.name) = lower(favorite_targets.name)
   and exercise.created_by is null
),
current_max as (
  select
    demo_user.id as user_id,
    coalesce(max(user_exercise.sort_order), 0) as max_sort_order
  from demo_user
  left join public.user_exercises user_exercise
    on user_exercise.user_id = demo_user.id
  group by demo_user.id
),
missing_targets as (
  select
    current_max.user_id,
    target_exercises.exercise_id,
    current_max.max_sort_order
      + row_number() over (order by target_exercises.position) as next_sort_order
  from current_max
  join target_exercises on true
  where not exists (
    select 1
    from public.user_exercises user_exercise
    where user_exercise.user_id = current_max.user_id
      and user_exercise.exercise_id = target_exercises.exercise_id
  )
)
insert into public.user_exercises (
  user_id,
  exercise_id,
  sort_order
)
select
  user_id,
  exercise_id,
  next_sort_order
from missing_targets;

notify pgrst, 'reload schema';
