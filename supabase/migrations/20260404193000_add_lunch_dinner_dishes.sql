insert into public.catalog_ingredients (
  name,
  category,
  unit_type,
  calories_kcal,
  protein_g,
  carbs_g,
  fat_g,
  nutrition_basis_amount,
  nutrition_basis_unit,
  created_by
)
select v.name, v.category, v.unit_type, v.calories_kcal, v.protein_g, v.carbs_g, v.fat_g, v.nutrition_basis_amount, v.nutrition_basis_unit, null::uuid
from (
  values
    ('Pasta', 'Staples', 'g', 371, 13.0, 75.0, 1.5, 100, 'g')
) as v(name, category, unit_type, calories_kcal, protein_g, carbs_g, fat_g, nutrition_basis_amount, nutrition_basis_unit)
where not exists (
  select 1
  from public.catalog_ingredients ci
  where ci.name_key = lower(v.name)
    and ci.created_by is null
);

update public.catalog_recipes
set meal_type = 'Lunch / Dinner'
where created_by is null
  and meal_type in ('Lunch', 'Dinner');

insert into public.catalog_recipes (
  name,
  meal_type,
  servings,
  total_minutes,
  difficulty,
  instructions,
  created_by
)
select v.name, v.meal_type, v.servings, v.total_minutes, v.difficulty, v.instructions, null::uuid
from (
  values
    ('Boiled Rice', 'Lunch / Dinner', 1, 20, 'Easy', 'Plain boiled rice portion.'),
    ('Stir-Fried Vegetables', 'Lunch / Dinner', 1, 20, 'Easy', 'Saute capsicum, onion, and tomato with a little oil.'),
    ('Fried Paneer', 'Lunch / Dinner', 1, 15, 'Easy', 'Shallow fry paneer with a little oil.'),
    ('Fried Chicken', 'Lunch / Dinner', 1, 18, 'Easy', 'Cook chicken in a little oil until done.'),
    ('Pasta', 'Lunch / Dinner', 1, 20, 'Easy', 'Cook pasta and toss with onion, tomato, capsicum, and oil.'),
    ('Roti', 'Lunch / Dinner', 1, 10, 'Easy', 'One plain roti.')
) as v(name, meal_type, servings, total_minutes, difficulty, instructions)
where not exists (
  select 1
  from public.catalog_recipes cr
  where cr.name_key = lower(v.name)
    and cr.created_by is null
);

insert into public.catalog_recipe_ingredients (recipe_id, ingredient_id, amount, unit)
select r.id, i.id, m.amount, m.unit
from (
  values
    ('Boiled Rice', 'Rice', 60, 'g'),
    ('Stir-Fried Vegetables', 'Capsicum', 150, 'g'),
    ('Stir-Fried Vegetables', 'Onion', 140, 'g'),
    ('Stir-Fried Vegetables', 'Tomato', 160, 'g'),
    ('Stir-Fried Vegetables', 'Olive Oil', 10, 'ml'),
    ('Fried Paneer', 'Paneer', 100, 'g'),
    ('Fried Paneer', 'Olive Oil', 5, 'ml'),
    ('Fried Chicken', 'Chicken Breast', 100, 'g'),
    ('Fried Chicken', 'Olive Oil', 5, 'ml'),
    ('Pasta', 'Capsicum', 100, 'g'),
    ('Pasta', 'Onion', 70, 'g'),
    ('Pasta', 'Tomato', 80, 'g'),
    ('Pasta', 'Pasta', 100, 'g'),
    ('Pasta', 'Olive Oil', 10, 'ml'),
    ('Roti', 'Atta', 30, 'g')
) as m(recipe_name, ingredient_name, amount, unit)
join public.catalog_recipes r
  on r.name_key = lower(m.recipe_name)
 and r.created_by is null
join public.catalog_ingredients i
  on i.name_key = lower(m.ingredient_name)
 and i.created_by is null
where not exists (
  select 1
  from public.catalog_recipe_ingredients cri
  where cri.recipe_id = r.id
    and cri.ingredient_id = i.id
);

with ingredient_totals as (
  select
    cri.recipe_id,
    sum(
      case
        when ci.nutrition_basis_amount is null or ci.nutrition_basis_amount = 0 then 0
        else (
          coalesce(ci.calories_kcal, 0) *
          (
            case
              when lower(coalesce(cri.unit, '')) = lower(coalesce(ci.nutrition_basis_unit, '')) then coalesce(cri.amount, 0)
              when lower(coalesce(cri.unit, '')) = 'kg' and lower(coalesce(ci.nutrition_basis_unit, '')) = 'g' then coalesce(cri.amount, 0) * 1000
              when lower(coalesce(cri.unit, '')) = 'g' and lower(coalesce(ci.nutrition_basis_unit, '')) = 'kg' then coalesce(cri.amount, 0) / 1000
              when lower(coalesce(cri.unit, '')) = 'litre' and lower(coalesce(ci.nutrition_basis_unit, '')) = 'ml' then coalesce(cri.amount, 0) * 1000
              when lower(coalesce(cri.unit, '')) = 'ml' and lower(coalesce(ci.nutrition_basis_unit, '')) = 'litre' then coalesce(cri.amount, 0) / 1000
              else 0
            end
          ) / ci.nutrition_basis_amount
        )
      end
    ) as total_calories,
    sum(
      case
        when ci.nutrition_basis_amount is null or ci.nutrition_basis_amount = 0 then 0
        else (
          coalesce(ci.protein_g, 0) *
          (
            case
              when lower(coalesce(cri.unit, '')) = lower(coalesce(ci.nutrition_basis_unit, '')) then coalesce(cri.amount, 0)
              when lower(coalesce(cri.unit, '')) = 'kg' and lower(coalesce(ci.nutrition_basis_unit, '')) = 'g' then coalesce(cri.amount, 0) * 1000
              when lower(coalesce(cri.unit, '')) = 'g' and lower(coalesce(ci.nutrition_basis_unit, '')) = 'kg' then coalesce(cri.amount, 0) / 1000
              when lower(coalesce(cri.unit, '')) = 'litre' and lower(coalesce(ci.nutrition_basis_unit, '')) = 'ml' then coalesce(cri.amount, 0) * 1000
              when lower(coalesce(cri.unit, '')) = 'ml' and lower(coalesce(ci.nutrition_basis_unit, '')) = 'litre' then coalesce(cri.amount, 0) / 1000
              else 0
            end
          ) / ci.nutrition_basis_amount
        )
      end
    ) as total_protein,
    sum(
      case
        when ci.nutrition_basis_amount is null or ci.nutrition_basis_amount = 0 then 0
        else (
          coalesce(ci.carbs_g, 0) *
          (
            case
              when lower(coalesce(cri.unit, '')) = lower(coalesce(ci.nutrition_basis_unit, '')) then coalesce(cri.amount, 0)
              when lower(coalesce(cri.unit, '')) = 'kg' and lower(coalesce(ci.nutrition_basis_unit, '')) = 'g' then coalesce(cri.amount, 0) * 1000
              when lower(coalesce(cri.unit, '')) = 'g' and lower(coalesce(ci.nutrition_basis_unit, '')) = 'kg' then coalesce(cri.amount, 0) / 1000
              when lower(coalesce(cri.unit, '')) = 'litre' and lower(coalesce(ci.nutrition_basis_unit, '')) = 'ml' then coalesce(cri.amount, 0) * 1000
              when lower(coalesce(cri.unit, '')) = 'ml' and lower(coalesce(ci.nutrition_basis_unit, '')) = 'litre' then coalesce(cri.amount, 0) / 1000
              else 0
            end
          ) / ci.nutrition_basis_amount
        )
      end
    ) as total_carbs,
    sum(
      case
        when ci.nutrition_basis_amount is null or ci.nutrition_basis_amount = 0 then 0
        else (
          coalesce(ci.fat_g, 0) *
          (
            case
              when lower(coalesce(cri.unit, '')) = lower(coalesce(ci.nutrition_basis_unit, '')) then coalesce(cri.amount, 0)
              when lower(coalesce(cri.unit, '')) = 'kg' and lower(coalesce(ci.nutrition_basis_unit, '')) = 'g' then coalesce(cri.amount, 0) * 1000
              when lower(coalesce(cri.unit, '')) = 'g' and lower(coalesce(ci.nutrition_basis_unit, '')) = 'kg' then coalesce(cri.amount, 0) / 1000
              when lower(coalesce(cri.unit, '')) = 'litre' and lower(coalesce(ci.nutrition_basis_unit, '')) = 'ml' then coalesce(cri.amount, 0) * 1000
              when lower(coalesce(cri.unit, '')) = 'ml' and lower(coalesce(ci.nutrition_basis_unit, '')) = 'litre' then coalesce(cri.amount, 0) / 1000
              else 0
            end
          ) / ci.nutrition_basis_amount
        )
      end
    ) as total_fat
  from public.catalog_recipe_ingredients cri
  join public.catalog_ingredients ci on ci.id = cri.ingredient_id
  group by cri.recipe_id
)
update public.catalog_recipes cr
set
  calories_kcal = round(coalesce(it.total_calories, 0) / greatest(coalesce(cr.servings, 1), 1)),
  protein_g = round((coalesce(it.total_protein, 0) / greatest(coalesce(cr.servings, 1), 1))::numeric, 1),
  carbs_g = round((coalesce(it.total_carbs, 0) / greatest(coalesce(cr.servings, 1), 1))::numeric, 1),
  fat_g = round((coalesce(it.total_fat, 0) / greatest(coalesce(cr.servings, 1), 1))::numeric, 1)
from ingredient_totals it
where cr.id = it.recipe_id;
