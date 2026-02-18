-- Ensure anon/authenticated can access user_machines and force PostgREST cache refresh.

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.user_machines to anon, authenticated;

notify pgrst, 'reload schema';
