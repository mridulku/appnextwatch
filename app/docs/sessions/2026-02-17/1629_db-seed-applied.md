# Session Notes — 2026-02-17 16:29 — DB Seed Applied via Session Pooler
- Tag: nw-20260217-1629-db-seed-applied
- Commit: TBD
- Previous tag: nw-2026-02-16-1619-test-tab-supabase-openai
- Codex chat link: N/A
- Local transcript pointer: Unknown

## Connection target used (no password)
- Host: `aws-1-ap-south-1.pooler.supabase.com`
- Port: `5432`
- User: `postgres.ytkuqigyltxusbiuxuyn`
- DB: `postgres`

## Commands run (password redacted)
```bash
cd /Users/mridulpant/Documents/DevFiles/appnextwatch
export PGPASSWORD='<redacted>'

psql -h aws-1-ap-south-1.pooler.supabase.com -p 5432 -U postgres.ytkuqigyltxusbiuxuyn -d postgres -c "select tablename ..."
psql -h aws-1-ap-south-1.pooler.supabase.com -p 5432 -U postgres.ytkuqigyltxusbiuxuyn -d postgres -c "select count(*) ..."
psql -h aws-1-ap-south-1.pooler.supabase.com -p 5432 -U postgres.ytkuqigyltxusbiuxuyn -d postgres -c "select ... limit 3"
```

## Verification results
### Tables found (migration + seed relevant)
- `catalog_exercises`
- `catalog_ingredients`
- `catalog_machines`
- `catalog_recipe_ingredients`
- `catalog_recipes`
- `catalog_utensils`
- `metric_definitions`
- `metric_observations`
- `user_ingredients`
- `user_metric_targets`
- `user_utensils`
- `workout_sessions`
- `workout_sets`

### Seeded table counts
- `catalog_ingredients`: 30
- `catalog_utensils`: 10
- `catalog_recipes`: 5
- `catalog_recipe_ingredients`: 15
- `catalog_exercises`: 10
- `catalog_machines`: 10
- `metric_definitions`: 7

### Sample rows (non-sensitive catalog)
- `catalog_ingredients`:
  - `Atta | Staples | kg`
  - `Black Pepper | Spices | g`
  - `Capsicum | Vegetables | pcs`
- `catalog_recipes`:
  - `Bread Omelette | Breakfast | 12`
  - `Chicken Rice Bowl | Dinner | 30`
  - `Dal Tadka | Lunch | 35`
- `catalog_exercises`:
  - `Back Squat | compound | Legs | Barbell`
  - `Bench Press | compound | Chest | Barbell`
  - `Biceps Curl | isolation | Arms | Dumbbell`

## Gotchas discovered
- Previous direct DB hostname flow had DNS/connectivity issues in prior attempts.
- Session pooler endpoint worked for verification queries in this session.

## Notes
- PRD was not updated because this session was infra/DB verification only (no user-visible behavior change).
