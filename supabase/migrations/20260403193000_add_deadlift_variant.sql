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
  'deadlift',
  'Deadlift',
  'strength',
  'Legs',
  'legs',
  'hinge',
  array['Conventional Deadlift'],
  'pending'
where not exists (
  select 1
  from public.catalog_exercise_movements movement
  where movement.slug = 'deadlift'
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
  'Deadlift',
  'compound',
  'Legs',
  'Barbell',
  null,
  movement.id,
  'Barbell',
  'equipment',
  1,
  true
from public.catalog_exercise_movements movement
where movement.slug = 'deadlift'
  and not exists (
    select 1
    from public.catalog_exercises exercise
    where lower(exercise.name) = 'deadlift'
      and exercise.created_by is null
  );

notify pgrst, 'reload schema';
