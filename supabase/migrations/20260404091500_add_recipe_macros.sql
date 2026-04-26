alter table public.catalog_recipes
  add column if not exists protein_g numeric(10,2),
  add column if not exists carbs_g numeric(10,2),
  add column if not exists fat_g numeric(10,2);

update public.catalog_recipes
set
  protein_g = case name_key
    when 'bread_omelette' then 22
    when 'veg_poha' then 7
    when 'dal_tadka' then 12
    when 'paneer_stir_fry' then 31
    when 'chicken_rice_bowl' then 42
    else coalesce(protein_g, 0)
  end,
  carbs_g = case name_key
    when 'bread_omelette' then 32
    when 'veg_poha' then 52
    when 'dal_tadka' then 20
    when 'paneer_stir_fry' then 16
    when 'chicken_rice_bowl' then 56
    else coalesce(carbs_g, 0)
  end,
  fat_g = case name_key
    when 'bread_omelette' then 18
    when 'veg_poha' then 9
    when 'dal_tadka' then 14
    when 'paneer_stir_fry' then 34
    when 'chicken_rice_bowl' then 18
    else coalesce(fat_g, 0)
  end
where name_key in (
  'bread_omelette',
  'veg_poha',
  'dal_tadka',
  'paneer_stir_fry',
  'chicken_rice_bowl'
);
