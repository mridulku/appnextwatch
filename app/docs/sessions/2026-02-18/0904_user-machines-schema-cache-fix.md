# Session Notes — 2026-02-18 09:04 — user_machines schema cache fix
- Tag: TBD
- Commit: TBD
- Previous tag: nw-20260218-0855-gym-machines-catalog-flow
- Codex chat link: N/A
- Local transcript pointer: Unknown

## Goal
Fix runtime error: `Could not find the table 'public.user_machines' in the schema cache` in Gym Machines flow.

## What happened
- Migration created `user_machines`, but REST schema cache and grants were not fully aligned for app anon client access.

## Fix applied
- Executed DB-side fix immediately:
  - grant schema usage and table CRUD permissions to `anon` and `authenticated`
  - trigger PostgREST schema cache reload (`notify pgrst, 'reload schema'`)
- Added durable migration:
  - `supabase/migrations/20260218090000_user_machines_grants_and_schema_reload.sql`

## Verification
- Anonymous client probe passed:
  - `catalog_machines` read: success
  - `user_machines` insert/read: success
  - sample row returned with joined machine name

## Files changed
- `supabase/migrations/20260218090000_user_machines_grants_and_schema_reload.sql`
- `app/docs/log/WORKLOG.md`
- `app/docs/sessions/INDEX.md`
- `app/docs/sessions/LATEST.md`
- `app/docs/sessions/2026-02-18/0904_user-machines-schema-cache-fix.md`
