-- Enforce one inventory row per (user_id, ingredient_id)

with ranked as (
  select
    id,
    row_number() over (
      partition by user_id, ingredient_id
      order by created_at desc nulls last, id desc
    ) as rn
  from public.user_ingredients
  where ingredient_id is not null
)
delete from public.user_ingredients ui
using ranked r
where ui.id = r.id
  and r.rn > 1;

create unique index if not exists user_ingredients_user_ingredient_uidx
  on public.user_ingredients(user_id, ingredient_id)
  where ingredient_id is not null;
