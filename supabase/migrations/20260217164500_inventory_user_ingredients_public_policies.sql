-- Allow Food Inventory app flow with local app user identity (non-Supabase-auth session)
-- user scoping is enforced at query level by app_user.id mapping in the app.

drop policy if exists user_ingredients_policy on public.user_ingredients;
drop policy if exists user_ingredients_read_policy on public.user_ingredients;
drop policy if exists user_ingredients_insert_policy on public.user_ingredients;
drop policy if exists user_ingredients_update_policy on public.user_ingredients;
drop policy if exists user_ingredients_delete_policy on public.user_ingredients;

create policy user_ingredients_read_policy on public.user_ingredients
for select to public
using (true);

create policy user_ingredients_insert_policy on public.user_ingredients
for insert to public
with check (true);

create policy user_ingredients_update_policy on public.user_ingredients
for update to public
using (true)
with check (true);

create policy user_ingredients_delete_policy on public.user_ingredients
for delete to public
using (true);
