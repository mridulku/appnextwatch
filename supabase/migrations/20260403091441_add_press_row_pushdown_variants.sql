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
  'Dumbbell Flat Press',
  'compound',
  'Chest',
  'Dumbbell',
  null,
  movement.id,
  'Dumbbell',
  'equipment',
  2,
  false
from public.catalog_exercise_movements movement
where movement.slug = 'flat-press'
  and not exists (
    select 1
    from public.catalog_exercises exercise
    where lower(exercise.name) = 'dumbbell flat press'
      and exercise.created_by is null
  );

update public.catalog_exercises
set sort_order = 3
where lower(name) = 'smith flat press'
  and created_by is null
  and sort_order = 2;

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
  'Decline Dumbbell Press',
  'compound',
  'Chest',
  'Dumbbell',
  null,
  movement.id,
  'Dumbbell',
  'equipment',
  2,
  false
from public.catalog_exercise_movements movement
where movement.slug = 'decline-press'
  and not exists (
    select 1
    from public.catalog_exercises exercise
    where lower(exercise.name) = 'decline dumbbell press'
      and exercise.created_by is null
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
  'Dumbbell Upright Row',
  'compound',
  'Shoulders',
  'Dumbbell',
  null,
  movement.id,
  'Dumbbell',
  'equipment',
  2,
  false
from public.catalog_exercise_movements movement
where movement.slug = 'upright-row'
  and not exists (
    select 1
    from public.catalog_exercises exercise
    where lower(exercise.name) = 'dumbbell upright row'
      and exercise.created_by is null
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
  'Dumbbell Triceps Pushdown',
  'isolation',
  'Arms',
  'Dumbbell',
  null,
  movement.id,
  'Dumbbell',
  'equipment',
  2,
  false
from public.catalog_exercise_movements movement
where movement.slug = 'triceps-pushdown'
  and not exists (
    select 1
    from public.catalog_exercises exercise
    where lower(exercise.name) = 'dumbbell triceps pushdown'
      and exercise.created_by is null
  );

update public.catalog_exercise_movements
set aliases = (
  select array(
    select distinct alias
    from unnest(
      coalesce(catalog_exercise_movements.aliases, '{}'::text[]) || array[
        'Dumbbell Flat Press',
        'Decline Dumbbell Press',
        'Dumbbell Upright Row',
        'Dumbbell Triceps Pushdown'
      ]
    ) as alias
    order by alias
  )
)
where slug in ('flat-press', 'decline-press', 'upright-row', 'triceps-pushdown');
