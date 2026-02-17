#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
MIGRATION_DIR="$ROOT_DIR/supabase/migrations"
SEED_FILE="$ROOT_DIR/supabase/seed/seed_catalog.sql"

info() { printf "\n[db-setup] %s\n" "$1"; }
warn() { printf "\n[db-setup][warn] %s\n" "$1"; }
err() { printf "\n[db-setup][error] %s\n" "$1" >&2; }

if ! command -v supabase >/dev/null 2>&1; then
  err "Supabase CLI is not installed."
  echo "Install on macOS:" 
  echo "  brew install supabase/tap/supabase"
  echo "Then verify:" 
  echo "  supabase --version"
  exit 1
fi

if [ ! -d "$MIGRATION_DIR" ]; then
  err "Missing migrations directory: $MIGRATION_DIR"
  exit 1
fi

if [ ! -f "$SEED_FILE" ]; then
  err "Missing seed file: $SEED_FILE"
  exit 1
fi

info "Security checks"
if git -C "$ROOT_DIR" ls-files --error-unmatch .env >/dev/null 2>&1; then
  warn ".env appears tracked by git. Untracking now (local file retained)."
  git -C "$ROOT_DIR" rm --cached .env >/dev/null
  warn "Review and commit the untrack change before pushing."
else
  info ".env tracked by git: no"
fi

if ! git -C "$ROOT_DIR" check-ignore -q .env; then
  warn ".env is not currently ignored by gitignore rules. Add '.env' to .gitignore before committing."
else
  info ".env ignored by gitignore: yes"
fi

info "Checking Supabase authentication"
if ! supabase projects list >/dev/null 2>&1; then
  err "Supabase CLI is not authenticated."
  echo "Run these commands first:" 
  echo "  supabase login"
  echo "  supabase projects list"
  exit 1
fi

info "Checking project link"
PROJECT_REF=""
if [ -f "$ROOT_DIR/supabase/config.toml" ]; then
  PROJECT_REF="$(awk -F '"' '/project_id\s*=\s*"/{print $2; exit}' "$ROOT_DIR/supabase/config.toml" || true)"
fi

if [ -z "$PROJECT_REF" ]; then
  warn "No linked project found in supabase/config.toml"
  read -r -p "Enter Supabase project ref: " PROJECT_REF
  if [ -z "$PROJECT_REF" ]; then
    err "Project ref is required to continue."
    exit 1
  fi
  supabase link --project-ref "$PROJECT_REF"
fi

info "Applying migrations (safe, non-destructive)"
supabase db push

info "Applying catalog seed"
if supabase db --help 2>/dev/null | grep -q "query"; then
  supabase db query --file "$SEED_FILE"
else
  warn "This Supabase CLI version does not expose 'supabase db query'."
  warn "Run this manually after upgrading CLI:"
  echo "  supabase db query --file supabase/seed/seed_catalog.sql"
fi

info "Verification checks"
VERIFY_SQL="$(mktemp)"
cat > "$VERIFY_SQL" <<'SQL'
select 'catalog_ingredients' as table_name, count(*) as total from public.catalog_ingredients
union all select 'catalog_utensils', count(*) from public.catalog_utensils
union all select 'catalog_recipes', count(*) from public.catalog_recipes
union all select 'catalog_recipe_ingredients', count(*) from public.catalog_recipe_ingredients
union all select 'catalog_exercises', count(*) from public.catalog_exercises
union all select 'catalog_machines', count(*) from public.catalog_machines
union all select 'metric_definitions', count(*) from public.metric_definitions
order by table_name;

select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'user_ingredients',
    'user_utensils',
    'user_metric_targets',
    'metric_observations',
    'workout_sessions',
    'workout_sets'
  )
order by tablename;
SQL

if supabase db --help 2>/dev/null | grep -q "query"; then
  supabase db query --file "$VERIFY_SQL"
else
  warn "Verification query skipped because 'supabase db query' is unavailable in this CLI version."
fi

rm -f "$VERIFY_SQL"
info "Done."
