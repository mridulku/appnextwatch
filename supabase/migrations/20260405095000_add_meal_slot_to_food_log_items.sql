alter table public.user_food_log_items
add column if not exists meal_slot text;

update public.user_food_log_items as item
set meal_slot = case
  when recipe.meal_type = 'Dinner' then 'Dinner'
  when recipe.meal_type in ('Lunch', 'Lunch / Dinner') then 'Lunch'
  when recipe.meal_type = 'Breakfast' then 'Breakfast'
  when recipe.meal_type = 'Snacks' then 'Snacks'
  else 'Other'
end
from public.catalog_recipes as recipe
where recipe.id = item.recipe_id
  and (item.meal_slot is null or item.meal_slot = '');

alter table public.user_food_log_items
alter column meal_slot set default 'Other';
