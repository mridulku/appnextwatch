-- Align user_utensils access with local app-user identity pattern used in Wellness app.

drop policy if exists user_utensils_policy on public.user_utensils;
drop policy if exists user_utensils_read_policy on public.user_utensils;
drop policy if exists user_utensils_insert_policy on public.user_utensils;
drop policy if exists user_utensils_update_policy on public.user_utensils;
drop policy if exists user_utensils_delete_policy on public.user_utensils;

create policy user_utensils_read_policy on public.user_utensils
for select to public
using (true);

create policy user_utensils_insert_policy on public.user_utensils
for insert to public
with check (true);

create policy user_utensils_update_policy on public.user_utensils
for update to public
using (true)
with check (true);

create policy user_utensils_delete_policy on public.user_utensils
for delete to public
using (true);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.user_utensils to anon, authenticated;

notify pgrst, 'reload schema';
