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
- [`screens/`](../screens/) - Primary feature screens and user-facing flows.
- [`components/`](../components/) - Reusable UI primitives and shared visual building blocks.
- [`core/`](../core/) - APIs, storage wrappers, parsers, env helpers, and app utilities.
- [`context/`](../context/) - Cross-screen React Context state (auth and preferences).
- [`data/`](../data/) - Seed datasets and SQL bootstrapping files.
- [`theme/`](../theme/) - Shared theme tokens (colors).
- [`scripts/`](../../scripts/) - One-off repo scripts (data import helpers).

## 3) Common Navigation Hotspots
- [`App.js`](../App.js)
- [`context/AuthContext.js`](../context/AuthContext.js)
- [`context/PreferencesContext.js`](../context/PreferencesContext.js)
- [`core/categoryMode.js`](../core/categoryMode.js)
- [`core/supabaseApi.js`](../core/supabaseApi.js)
- [`core/sessionHistoryStorage.js`](../core/sessionHistoryStorage.js)
- [`core/foodInventoryStorage.js`](../core/foodInventoryStorage.js)
- [`core/foodUtensilsStorage.js`](../core/foodUtensilsStorage.js)
- [`core/wellnessProfileStorage.js`](../core/wellnessProfileStorage.js)
- [`core/fitnessLogStorage.js`](../core/fitnessLogStorage.js)

## 4) “Where is X?” (quick answers)
- Where are screens wired? -> [`App.js`](../App.js)
- Where is auth login state handled? -> [`context/AuthContext.js`](../context/AuthContext.js)
- Where is category mode saved/routed? -> [`core/categoryMode.js`](../core/categoryMode.js)
- Where is persistence logic? -> [`core/`](../core/) (see `*Storage.js` files)
- Where is wellness profile stored? -> [`core/wellnessProfileStorage.js`](../core/wellnessProfileStorage.js)
- Where is session history stored? -> [`core/sessionHistoryStorage.js`](../core/sessionHistoryStorage.js)
- Where is Supabase data access? -> [`core/supabaseApi.js`](../core/supabaseApi.js)

## 5) Repo Commands (run from repo root)
- `cd /Users/mridulpant/Documents/DevFiles/appnextwatch`
- `npm install`
- `npm run ios`
- `npm run android`
