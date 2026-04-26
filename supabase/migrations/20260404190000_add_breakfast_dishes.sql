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
    ('Butter', 'Dairy', 'g', 717, 0.9, 0.1, 81.1, 100, 'g'),
    ('Bread', 'Staples', 'pcs', 66, 2.0, 12.3, 0.8, 1, 'pcs'),
    ('Milk Powder', 'Dairy', 'g', 496, 24.0, 38.0, 26.0, 100, 'g')
) as v(name, category, unit_type, calories_kcal, protein_g, carbs_g, fat_g, nutrition_basis_amount, nutrition_basis_unit)
where not exists (
  select 1
  from public.catalog_ingredients ci
  where ci.name_key = lower(v.name)
    and ci.created_by is null
);

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
    ('Boiled Eggs', 'Breakfast', 1, 10, 'Easy', 'Two whole boiled eggs.'),
    ('Omelet', 'Breakfast', 1, 10, 'Easy', 'Two eggs cooked with a little butter.'),
    ('Butter Bread', 'Breakfast', 1, 5, 'Easy', 'Two bread slices with butter.'),
    ('Tea', 'Breakfast', 1, 5, 'Easy', 'Tea with milk powder.')
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
    ('Boiled Eggs', 'Egg', 2, 'pcs'),
    ('Omelet', 'Egg', 2, 'pcs'),
    ('Omelet', 'Butter', 5, 'g'),
    ('Butter Bread', 'Bread', 2, 'pcs'),
    ('Butter Bread', 'Butter', 10, 'g'),
    ('Tea', 'Milk Powder', 15, 'g')
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
where cr.id = it.recipe_id
  and cr.name in ('Boiled Eggs', 'Omelet', 'Butter Bread', 'Tea');
