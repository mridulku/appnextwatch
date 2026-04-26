create table if not exists public.user_food_log_item_ingredients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  food_log_item_id uuid not null references public.user_food_log_items(id) on delete cascade,
  ingredient_id uuid not null references public.catalog_ingredients(id) on delete restrict,
  amount numeric(10,2) not null,
  unit text not null,
  calories_kcal numeric(10,2),
  protein_g numeric(10,2),
  carbs_g numeric(10,2),
  fat_g numeric(10,2),
  nutrition_basis_amount numeric(10,2),
  nutrition_basis_unit text,
  sort_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_food_log_item_ingredients_item_order
  on public.user_food_log_item_ingredients(food_log_item_id, sort_order);

alter table public.user_food_log_item_ingredients enable row level security;

drop policy if exists user_food_log_item_ingredients_read_policy on public.user_food_log_item_ingredients;
drop policy if exists user_food_log_item_ingredients_insert_policy on public.user_food_log_item_ingredients;
drop policy if exists user_food_log_item_ingredients_update_policy on public.user_food_log_item_ingredients;
drop policy if exists user_food_log_item_ingredients_delete_policy on public.user_food_log_item_ingredients;

create policy user_food_log_item_ingredients_read_policy on public.user_food_log_item_ingredients
  for select using (true);

create policy user_food_log_item_ingredients_insert_policy on public.user_food_log_item_ingredients
  for insert with check (true);

create policy user_food_log_item_ingredients_update_policy on public.user_food_log_item_ingredients
  for update using (true) with check (true);

create policy user_food_log_item_ingredients_delete_policy on public.user_food_log_item_ingredients
  for delete using (true);

drop trigger if exists set_user_food_log_item_ingredients_updated_at on public.user_food_log_item_ingredients;
create trigger set_user_food_log_item_ingredients_updated_at
before update on public.user_food_log_item_ingredients
for each row execute function public.set_updated_at();

grant select, insert, update, delete on table public.user_food_log_item_ingredients to anon, authenticated;
