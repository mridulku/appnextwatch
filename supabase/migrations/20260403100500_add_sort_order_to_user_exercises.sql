alter table public.user_exercises
  add column if not exists sort_order integer;

with ranked as (
  select
    id,
    row_number() over (
      partition by user_id
      order by coalesce(sort_order, 2147483647), created_at, id
    ) as next_sort_order
  from public.user_exercises
)
update public.user_exercises exercise
set sort_order = ranked.next_sort_order
from ranked
where ranked.id = exercise.id
  and exercise.sort_order is distinct from ranked.next_sort_order;

create index if not exists idx_user_exercises_user_sort_order
  on public.user_exercises(user_id, sort_order);

notify pgrst, 'reload schema';
