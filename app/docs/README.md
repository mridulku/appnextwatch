# NextWatch — Start Here

## 1) Daily Working Set (open these first)
- [`App.js`](../App.js)
- [`app/docs/prd/NEXTWATCH_PRD.md`](./prd/NEXTWATCH_PRD.md)
- [`app/docs/AI_CONTEXT.md`](./AI_CONTEXT.md)
- [`app/docs/SOP.md`](./SOP.md)
- [`app/docs/log/WORKLOG.md`](./log/WORKLOG.md)
- [`app/docs/sessions/INDEX.md`](./sessions/INDEX.md)
- [`app/docs/sessions/LATEST.md`](./sessions/LATEST.md)

## 2) Main Code Surfaces
- [`features/`](../features/) - Screen code grouped by mode (`movies`, `wellness`) and shared flows.
- [`components/`](../components/) - Reusable UI primitives and shared visual building blocks.
- [`core/`](../core/) - Runtime modules split by responsibility (`api`, `storage`, `integrations`, `utils`, `schema`).
- [`context/`](../context/) - Cross-screen React Context state (auth and preferences).
- [`data/`](../data/) - Domain-grouped data (`movies`, `wellness`, `seeds`, `supabase`).
- [`theme/`](../theme/) - Shared theme tokens (colors).
- [`scripts/`](../../scripts/) - One-off repo scripts (data import helpers).

## 3) Common Navigation Hotspots
- [`App.js`](../App.js)
- [`context/AuthContext.js`](../context/AuthContext.js)
- [`context/PreferencesContext.js`](../context/PreferencesContext.js)
- [`core/storage/categoryMode.js`](../core/storage/categoryMode.js)
- [`core/api/supabaseApi.js`](../core/api/supabaseApi.js)
- [`core/storage/sessionHistoryStorage.js`](../core/storage/sessionHistoryStorage.js)
- [`core/storage/foodInventoryStorage.js`](../core/storage/foodInventoryStorage.js)
- [`core/storage/foodUtensilsStorage.js`](../core/storage/foodUtensilsStorage.js)
- [`core/storage/wellnessProfileStorage.js`](../core/storage/wellnessProfileStorage.js)
- [`core/storage/fitnessLogStorage.js`](../core/storage/fitnessLogStorage.js)

## 4) “Where is X?” (quick answers)
- Where are screens wired? -> [`App.js`](../App.js)
- Where is auth login state handled? -> [`context/AuthContext.js`](../context/AuthContext.js)
- Where is category mode saved/routed? -> [`core/storage/categoryMode.js`](../core/storage/categoryMode.js)
- Where is persistence logic? -> [`core/storage/`](../core/storage/) (storage modules)
- Where is wellness profile stored? -> [`core/storage/wellnessProfileStorage.js`](../core/storage/wellnessProfileStorage.js)
- Where is session history stored? -> [`core/storage/sessionHistoryStorage.js`](../core/storage/sessionHistoryStorage.js)
- Where is Supabase data access? -> [`core/api/supabaseApi.js`](../core/api/supabaseApi.js)

## 5) Repo Commands (run from repo root)
- `cd /Users/mridulpant/Documents/DevFiles/appnextwatch`
- `npm install`
- `npm run ios`
- `npm run android`
