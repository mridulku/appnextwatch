-- seed_catalog.sql
-- Inserts only global catalog + metric rows (created_by is null)

-- Ingredients (~30)
insert into public.catalog_ingredients (name, category, unit_type, created_by)
select v.name, v.category, v.unit_type, null::uuid
from (
  values
    ('Potato', 'Vegetables', 'kg'),
    ('Tomato', 'Vegetables', 'kg'),
    ('Onion', 'Vegetables', 'kg'),
    ('Ginger', 'Vegetables', 'g'),
    ('Garlic', 'Vegetables', 'g'),
    ('Spinach', 'Vegetables', 'bunch'),
    ('Capsicum', 'Vegetables', 'pcs'),
    ('Carrot', 'Vegetables', 'kg'),
    ('Peas', 'Vegetables', 'g'),
    ('Green Chili', 'Vegetables', 'pcs'),
    ('Salt', 'Spices', 'g'),
    ('Turmeric', 'Spices', 'g'),
    ('Red Chili Powder', 'Spices', 'g'),
    ('Coriander Powder', 'Spices', 'g'),
    ('Garam Masala', 'Spices', 'g'),
    ('Cumin Seeds', 'Spices', 'g'),
    ('Mustard Seeds', 'Spices', 'g'),
    ('Black Pepper', 'Spices', 'g'),
    ('Rice', 'Staples', 'kg'),
    ('Atta', 'Staples', 'kg'),
    ('Toor Dal', 'Staples', 'kg'),
    ('Moong Dal', 'Staples', 'kg'),
    ('Poha', 'Staples', 'kg'),
    ('Oats', 'Staples', 'kg'),
    ('Egg', 'Protein', 'pcs'),
    ('Chicken Breast', 'Protein', 'kg'),
    ('Paneer', 'Protein', 'g'),
    ('Milk', 'Dairy', 'ml'),
    ('Curd', 'Dairy', 'g'),
    ('Olive Oil', 'Oils', 'ml')
) as v(name, category, unit_type)
where not exists (
  select 1 from public.catalog_ingredients ci
  where ci.name_key = lower(v.name)
    and ci.created_by is null
);

-- Utensils (~10)
insert into public.catalog_utensils (name, category, note, created_by)
select v.name, v.category, v.note, null::uuid
from (
  values
    ('Frying Pan', 'Pans', 'Daily saute and shallow fry'),
    ('Kadai', 'Pans', 'Deep cooking and curries'),
    ('Saucepan', 'Pans', 'Boiling and simmering'),
    ('Chef Knife', 'Knives', 'General chopping'),
    ('Paring Knife', 'Knives', 'Fine cutting work'),
    ('Pressure Cooker', 'Appliances', 'Dal and rice fast cook'),
    ('Mixer Grinder', 'Appliances', 'Grinding masalas and purees'),
    ('Spatula', 'Tools', 'Stir and flip'),
    ('Measuring Cups', 'Tools', 'Portion consistency'),
    ('Storage Container', 'Containers', 'Prep and leftovers')
) as v(name, category, note)
where not exists (
  select 1 from public.catalog_utensils cu
  where cu.name_key = lower(v.name)
    and cu.created_by is null
);

-- Exercises (~10)
insert into public.catalog_exercises (name, type, primary_muscle_group, equipment, created_by)
select v.name, v.type, v.primary_muscle_group, v.equipment, null::uuid
from (
  values
    ('Bench Press', 'compound', 'Chest', 'Barbell'),
    ('Incline Dumbbell Press', 'compound', 'Chest', 'Dumbbell'),
    ('Lat Pulldown', 'compound', 'Back', 'Cable'),
    ('Seated Cable Row', 'compound', 'Back', 'Cable'),
    ('Back Squat', 'compound', 'Legs', 'Barbell'),
    ('Leg Press', 'compound', 'Legs', 'Machine'),
    ('Shoulder Press', 'compound', 'Shoulders', 'Dumbbell'),
    ('Lateral Raise', 'isolation', 'Shoulders', 'Dumbbell'),
    ('Biceps Curl', 'isolation', 'Arms', 'Dumbbell'),
    ('Triceps Pushdown', 'isolation', 'Arms', 'Cable')
) as v(name, type, primary_muscle_group, equipment)
where not exists (
  select 1 from public.catalog_exercises ce
  where ce.name_key = lower(v.name)
    and ce.created_by is null
);

-- Machines (~10)
insert into public.catalog_machines (name, zone, primary_muscles, created_by)
select v.name, v.zone, v.primary_muscles, null::uuid
from (
  values
    ('Bench Press Station', 'Free Weights', array['Chest','Triceps']),
    ('Incline Bench', 'Free Weights', array['Chest','Shoulders']),
    ('Lat Pulldown Machine', 'Cable', array['Lats','Upper Back']),
    ('Seated Row Machine', 'Cable', array['Mid Back','Lats']),
    ('Pec Deck', 'Machines', array['Chest']),
    ('Leg Press Machine', 'Machines', array['Quads','Glutes']),
    ('Leg Extension Machine', 'Machines', array['Quads']),
    ('Leg Curl Machine', 'Machines', array['Hamstrings']),
    ('Treadmill', 'Cardio', array['Cardio']),
    ('Rowing Machine', 'Cardio', array['Back','Cardio'])
) as v(name, zone, primary_muscles)
where not exists (
  select 1 from public.catalog_machines cm
  where cm.name_key = lower(v.name)
    and cm.created_by is null
);

-- Recipes (~5)
insert into public.catalog_recipes (name, meal_type, servings, total_minutes, difficulty, instructions, created_by)
select v.name, v.meal_type, v.servings, v.total_minutes, v.difficulty, v.instructions, null::uuid
from (
  values
    ('Bread Omelette', 'Breakfast', 1, 12, 'Easy', 'Beat eggs with onion, cook omelette, fold with toasted bread.'),
    ('Veg Poha', 'Breakfast', 2, 20, 'Easy', 'Rinse poha, temper spices, cook with onion and peas.'),
    ('Dal Tadka', 'Lunch', 3, 35, 'Medium', 'Boil dal, prepare tadka, combine and simmer.'),
    ('Paneer Stir Fry', 'Dinner', 2, 25, 'Easy', 'Saute paneer with vegetables and spices.'),
    ('Chicken Rice Bowl', 'Dinner', 2, 30, 'Medium', 'Cook chicken masala and serve over steamed rice.')
) as v(name, meal_type, servings, total_minutes, difficulty, instructions)
where not exists (
  select 1 from public.catalog_recipes cr
  where cr.name_key = lower(v.name)
    and cr.created_by is null
);

-- Recipe ingredient mapping
insert into public.catalog_recipe_ingredients (recipe_id, ingredient_id, amount, unit)
select r.id, i.id, m.amount, m.unit
from (
  values
    ('Bread Omelette', 'Egg', 2, 'pcs'),
    ('Bread Omelette', 'Onion', 50, 'g'),
    ('Bread Omelette', 'Salt', 2, 'g'),
    ('Veg Poha', 'Poha', 150, 'g'),
    ('Veg Poha', 'Onion', 60, 'g'),
    ('Veg Poha', 'Peas', 40, 'g'),
    ('Dal Tadka', 'Toor Dal', 200, 'g'),
    ('Dal Tadka', 'Onion', 70, 'g'),
    ('Dal Tadka', 'Tomato', 80, 'g'),
    ('Paneer Stir Fry', 'Paneer', 250, 'g'),
    ('Paneer Stir Fry', 'Capsicum', 80, 'g'),
    ('Paneer Stir Fry', 'Onion', 70, 'g'),
    ('Chicken Rice Bowl', 'Chicken Breast', 300, 'g'),
    ('Chicken Rice Bowl', 'Rice', 200, 'g'),
    ('Chicken Rice Bowl', 'Ginger', 15, 'g')
) as m(recipe_name, ingredient_name, amount, unit)
join public.catalog_recipes r on r.name_key = lower(m.recipe_name) and r.created_by is null
join public.catalog_ingredients i on i.name_key = lower(m.ingredient_name) and i.created_by is null
where not exists (
  select 1
  from public.catalog_recipe_ingredients cri
  where cri.recipe_id = r.id and cri.ingredient_id = i.id
);

-- Metric definitions baseline
insert into public.metric_definitions (name, unit, metric_type, created_by)
select v.name, v.unit, v.metric_type, null::uuid
from (
  values
    ('calories', 'kcal', 'nutrition'),
    ('protein', 'g', 'nutrition'),
    ('carbs', 'g', 'nutrition'),
    ('fat', 'g', 'nutrition'),
    ('weight', 'kg', 'body'),
    ('body_fat', '%', 'body'),
    ('workout_volume', 'kg', 'fitness')
) as v(name, unit, metric_type)
where not exists (
  select 1 from public.metric_definitions md
  where md.name_key = lower(v.name)
    and md.created_by is null
);
