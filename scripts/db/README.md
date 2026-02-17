# Supabase DB Workflow

1. Install Supabase CLI on macOS: `brew install supabase/tap/supabase`
2. Verify install: `supabase --version`
3. Authenticate once: `supabase login`
4. Confirm auth works: `supabase projects list`
5. Link this repo to your project: `supabase link --project-ref <PROJECT_REF>`
6. From repo root, run: `./scripts/db/setup_and_apply_supabase.sh`
7. Script runs: migration push, catalog seed, and verification queries (best effort)
8. Script never prints secret values; it prints only presence/status messages
9. If CLI lacks `supabase db query`, the script prints an exact manual seed command
10. Keep `.env` untracked and gitignored before committing
