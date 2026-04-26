alter table public.catalog_recipes
  add column if not exists calories_kcal integer;

update public.catalog_recipes
set calories_kcal = case name_key
  when 'bread omelette' then 380
  when 'veg poha' then 320
  when 'dal tadka' then 260
  when 'paneer stir fry' then 520
  when 'chicken rice bowl' then 620
  else calories_kcal
end
where calories_kcal is null;

create table if not exists public.user_food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  log_date date not null,
  total_calories integer not null default 0,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, log_date)
);

create table if not exists public.user_food_log_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  food_log_id uuid not null references public.user_food_logs(id) on delete cascade,
  recipe_id uuid not null references public.catalog_recipes(id) on delete restrict,
  servings numeric(8,2) not null default 1,
  sort_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_food_logs_user_date
  on public.user_food_logs(user_id, log_date desc);

create index if not exists idx_user_food_log_items_log_order
  on public.user_food_log_items(food_log_id, sort_order);

alter table public.user_food_logs enable row level security;
alter table public.user_food_log_items enable row level security;

drop policy if exists user_food_logs_read_policy on public.user_food_logs;
drop policy if exists user_food_logs_insert_policy on public.user_food_logs;
drop policy if exists user_food_logs_update_policy on public.user_food_logs;
drop policy if exists user_food_logs_delete_policy on public.user_food_logs;

create policy user_food_logs_read_policy on public.user_food_logs
  for select using (true);

create policy user_food_logs_insert_policy on public.user_food_logs
  for insert with check (true);

create policy user_food_logs_update_policy on public.user_food_logs
  for update using (true) with check (true);

create policy user_food_logs_delete_policy on public.user_food_logs
  for delete using (true);

drop policy if exists user_food_log_items_read_policy on public.user_food_log_items;
drop policy if exists user_food_log_items_insert_policy on public.user_food_log_items;
drop policy if exists user_food_log_items_update_policy on public.user_food_log_items;
drop policy if exists user_food_log_items_delete_policy on public.user_food_log_items;

create policy user_food_log_items_read_policy on public.user_food_log_items
  for select using (true);

create policy user_food_log_items_insert_policy on public.user_food_log_items
  for insert with check (true);

create policy user_food_log_items_update_policy on public.user_food_log_items
  for update using (true) with check (true);

create policy user_food_log_items_delete_policy on public.user_food_log_items
  for delete using (true);

drop trigger if exists set_user_food_logs_updated_at on public.user_food_logs;
create trigger set_user_food_logs_updated_at
before update on public.user_food_logs
for each row execute function public.set_updated_at();

drop trigger if exists set_user_food_log_items_updated_at on public.user_food_log_items;
create trigger set_user_food_log_items_updated_at
before update on public.user_food_log_items
for each row execute function public.set_updated_at();

grant select, insert, update, delete on table public.user_food_logs to anon, authenticated;
grant select, insert, update, delete on table public.user_food_log_items to anon, authenticated;
