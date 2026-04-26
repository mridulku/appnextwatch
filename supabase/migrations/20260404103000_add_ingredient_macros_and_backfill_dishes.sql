alter table public.catalog_ingredients
  add column if not exists calories_kcal numeric(10,2),
  add column if not exists protein_g numeric(10,2),
  add column if not exists carbs_g numeric(10,2),
  add column if not exists fat_g numeric(10,2),
  add column if not exists nutrition_basis_amount numeric(10,2),
  add column if not exists nutrition_basis_unit text;

update public.catalog_ingredients
set
  nutrition_basis_amount = case
    when lower(coalesce(unit_type, '')) = 'pcs' then 1
    when lower(coalesce(unit_type, '')) = 'bunch' then 1
    when lower(coalesce(unit_type, '')) in ('ml', 'litre') then 100
    else 100
  end,
  nutrition_basis_unit = case
    when lower(coalesce(unit_type, '')) = 'kg' then 'g'
    when lower(coalesce(unit_type, '')) = 'litre' then 'ml'
    else lower(coalesce(unit_type, 'g'))
  end
where nutrition_basis_amount is null
   or nutrition_basis_unit is null;

update public.catalog_ingredients
set calories_kcal = v.calories_kcal,
    protein_g = v.protein_g,
    carbs_g = v.carbs_g,
    fat_g = v.fat_g,
    nutrition_basis_amount = v.nutrition_basis_amount,
    nutrition_basis_unit = v.nutrition_basis_unit
from (
  values
    ('Potato', 77, 2.0, 17.0, 0.1, 100, 'g'),
    ('Tomato', 18, 0.9, 3.9, 0.2, 100, 'g'),
    ('Onion', 40, 1.1, 9.3, 0.1, 100, 'g'),
    ('Ginger', 80, 1.8, 17.8, 0.8, 100, 'g'),
    ('Garlic', 149, 6.4, 33.1, 0.5, 100, 'g'),
    ('Spinach', 23, 2.9, 3.6, 0.4, 100, 'g'),
    ('Capsicum', 31, 1.0, 6.0, 0.3, 100, 'g'),
    ('Carrot', 41, 0.9, 9.6, 0.2, 100, 'g'),
    ('Peas', 81, 5.4, 14.5, 0.4, 100, 'g'),
    ('Green Chili', 40, 2.0, 8.8, 0.2, 100, 'g'),
    ('Salt', 0, 0, 0, 0, 100, 'g'),
    ('Turmeric', 312, 9.7, 67.1, 3.3, 100, 'g'),
    ('Red Chili Powder', 282, 12.0, 50.0, 14.0, 100, 'g'),
    ('Coriander Powder', 298, 12.4, 55.0, 17.8, 100, 'g'),
    ('Garam Masala', 379, 15.0, 50.0, 15.0, 100, 'g'),
    ('Cumin Seeds', 375, 17.8, 44.2, 22.3, 100, 'g'),
    ('Mustard Seeds', 508, 26.1, 28.1, 36.2, 100, 'g'),
    ('Black Pepper', 251, 10.4, 64.0, 3.3, 100, 'g'),
    ('Rice', 365, 7.1, 80.0, 0.7, 100, 'g'),
    ('Atta', 364, 11.8, 72.0, 1.7, 100, 'g'),
    ('Toor Dal', 343, 22.3, 62.7, 1.7, 100, 'g'),
    ('Moong Dal', 347, 24.0, 63.0, 1.2, 100, 'g'),
    ('Poha', 374, 6.7, 76.9, 1.1, 100, 'g'),
    ('Oats', 389, 16.9, 66.3, 6.9, 100, 'g'),
    ('Egg', 72, 6.3, 0.4, 4.8, 1, 'pcs'),
    ('Chicken Breast', 165, 31.0, 0.0, 3.6, 100, 'g'),
    ('Paneer', 265, 18.3, 1.2, 20.8, 100, 'g'),
    ('Milk', 61, 3.2, 4.8, 3.3, 100, 'ml'),
    ('Curd', 61, 3.5, 4.7, 3.3, 100, 'g'),
    ('Olive Oil', 884, 0.0, 0.0, 100.0, 100, 'ml')
) as v(name, calories_kcal, protein_g, carbs_g, fat_g, nutrition_basis_amount, nutrition_basis_unit)
where public.catalog_ingredients.name = v.name;

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
