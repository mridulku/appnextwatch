# AI Context — NextWatch

## 1. Repository Overview
- **High-level app purpose (from code):** Multi-mode React Native app with two active user-facing modes:
  - `Movies` mode: discovery reels, directory (movies/actors/directors/awards), chat assistant, curated lists, profile/data views.
  - `Fitness / Food` mode (wellness cockpit): home dashboard, session setup/run/history, gym hub, food hub.
- **Primary entry points:**
  - `index.js` (repo root) registers `App` from `app/App.js`.
  - `app/App.js` defines all navigators, auth gate, category routing, and root app composition (`AuthProvider`, `PreferencesProvider`, `NavigationContainer`).
- **Platform/runtime target:** Expo + React Native (`expo` SDK 54), iOS/Android/native dev client (`package.json`, `ios/`, `expo run:ios`, `expo run:android`).
- **State management approach:**
  - Local component state (`useState`, `useMemo`, `useEffect`) is primary.
  - Lightweight context state for auth and movie preferences (`app/context/AuthContext.js`, `app/context/PreferencesContext.js`).
  - Local persistence via AsyncStorage wrappers in `app/core/storage/`.
- **Navigation structure type:** React Navigation nested architecture:
  - Root stack -> category selector + app-mode containers.
  - Bottom tabs for mode-level navigation.
  - Per-tab native stacks for detail/setup flows.

## 2. Directory Structure (Explained)

| Path | Responsibility | Notes |
|------|---------------|-------|
| `app/App.js` | Root navigation composition and auth/category-based app entry | Defines Movies + Wellness tab stacks and shared stack options |
| `index.js` | Expo bootstrap | Registers `App` via `registerRootComponent` |
| `app/features/movies/` | Movies-mode screen modules | Grouped by tab/flow: `explore`, `directory`, `lists`, `chat`, `profile`, `shared` |
| `app/features/wellness/` | Wellness-mode screen modules | Grouped by tab/flow: `home`, `sessions`, `gym`, `food`, `shared` |
| `app/features/shared/` | Shared cross-mode screens | Auth/category/debug/settings routing surfaces |
| `app/components/` | Reusable UI building blocks | Includes `CollapsibleSection`, `YouTubeEmbed`, media helpers |
| `app/context/` | Global React Context providers | `AuthContext` and `PreferencesContext` only |
| `app/core/api/` | API-facing modules | Supabase query API + Wiki API + sheet API helpers |
| `app/core/storage/` | AsyncStorage persistence modules | Category mode, inventory, utensils, profile, session history, fitness log |
| `app/core/integrations/` | Client integrations | OpenAI and Supabase client setup |
| `app/core/utils/` | Utility helpers | CSV and general helper functions |
| `app/core/schema/` | Schema/payload helper modules | Prompt/debug schema helpers |
| `app/core/env.js` | Runtime env resolution | Reads Expo/Vite env keys |
| `app/data/movies/` | Movies domain seed/static data | Catalog, lists, streaming metadata |
| `app/data/wellness/` | Wellness domain seed/static data | Exercises, recipes, gym machines |
| `app/data/seeds/` | Cross-domain seed fixtures | Session templates, demo users |
| `app/data/supabase/` | SQL bootstrap assets | schema + seed SQL files |
| `app/theme/` | Design tokens | Single color palette file used app-wide |
| `scripts/` | One-off data import scripts | Example: awards import script |
| `app/docs/` | Product/ops/project docs | PRD, SOP, worklog, session notes, and this context file |
| `ios/` | Native iOS project artifacts | Present for native builds/dev client |
| `assets/` | App icons/splash/static assets | Standard Expo asset set |
| `app.json` / `eas.json` | Expo/EAS configuration | Build/runtime metadata |
| `package.json` | Dependencies + scripts | No heavy global state libraries present |

## 3. Core Runtime Flow
1. **Boot + provider mount**
   - `index.js` -> `App.js` -> wraps app with `AuthProvider`, `PreferencesProvider`, and `NavigationContainer`.
2. **Auth gate**
   - `RootNavigator` reads `isAuthenticated` from `AuthContext`.
   - If not authenticated, only `Login` stack is rendered.
3. **Category hydration + initial route selection**
   - After login, `getSavedCategory()` (AsyncStorage key `appnextwatch:selected_category`) determines initial route:
     - `MoviesApp`, `WellnessApp`, or `CategorySelector` fallback.
4. **Mode entry**
   - Category selector (`CategorySelectorScreen`) persists chosen mode via `saveCategory()` and resets navigation to target app container.
5. **Feature data hydration**
   - Movies screens primarily call `core/api/supabaseApi.js`; fallback to local `data/movies/catalog.js` when unavailable.
   - Wellness screens load local AsyncStorage-backed domain state (inventory, utensils, profile, session history).
6. **Persistence write-back**
   - Wellness feature screens write updated local state to AsyncStorage through dedicated storage modules.
7. **Side effects**
   - Directory flow hydrates missing wiki images via Wikipedia REST summary API and writes URLs back to Supabase.
   - Chat flow calls OpenAI Responses API when API key is configured.

## 4. Core Entities & Data Models
- **Auth User**
  - Source: `data/users.js` (`USERS` demo list).
  - Shape in session: `{ id, name, username }`.
  - Defined/used: `context/AuthContext.js`.
- **Movie domain**
  - Core entities: `movies`, `actors`, `directors`, awards (`award_shows`, `award_years`, `award_entries`).
  - Source priority: Supabase tables via `core/api/supabaseApi.js` with local catalog fallback in some screens.
  - Example movie fields: `id, title, year, genre, minutes, rating, overview, trailer_url, clips, wiki_*`.
- **Wellness profile**
  - Persistent object key: `appnextwatch:wellness_profile`.
  - Shape: `{ body, food, settings }` from `core/storage/wellnessProfileStorage.js`.
  - Body: height/weight/body fat/targets/trend. Food: macro targets + weekly history. Settings: units/preferences/reminders.
- **Food inventory**
  - Persistent key: `food_inventory_v1`.
  - Item fields: `id, name, category, unitType, quantity, lowStockThreshold, icon`.
  - Seed + storage: `core/storage/foodInventoryStorage.js`.
- **Food utensils inventory**
  - Persistent key: `appnextwatch:food_utensils_inventory`.
  - Item fields: `id, name, category, count, note, icon`.
  - Seed + storage: `core/storage/foodUtensilsStorage.js`.
- **Session history (workout/cooking)**
  - Persistent key: `appnextwatch:session_history_v1`.
  - Record fields: `id, type, title, startedAt, endedAt, durationSeconds, status, summary`.
  - Storage API: `core/storage/sessionHistoryStorage.js`.
- **Workout templates + meal session options**
  - `data/sessionSeeds.js` (`WORKOUT_SESSION_TEMPLATES`, `TODAY_COOKING_MEAL_OPTIONS`).

## 5. Navigation & Screen Relationships
- **Root stack (`App.js`)**
  - `Login` -> authenticated stack with `CategorySelector`, `MoviesApp`, `WellnessApp` (+ aliases `FitnessApp`, `FoodApp`), and shared `Movie` detail route.
- **Movies bottom tabs**
  - `Explore` (reels feed), `Directory` (stack), `Chat`, `Lists` (stack), `Profile` (stack).
- **Wellness bottom tabs (current)**
  - `Home`, `Sessions`, `Gym`, `Food`.
- **Wellness tab stacks**
  - `Home` stack: `WellnessHome` -> `HomeSettings`.
  - `Sessions` stack: `SessionHome` -> setup screens -> run screens (`ExerciseSessionScreen`, `CookRecipeScreen`) -> `SessionSummary`.
  - `Gym` stack: `GymHub` -> `GymMachineDetail` -> `ExerciseDetail`.
  - `Food` stack: `FoodHub` -> `CookRecipe`.
- **Hub internals (segmented in-screen, not navigator tabs)**
  - `GymHub`: `Machines | Exercises | My Stats`.
  - `FoodHub`: `Inventory | Recipes | Utensils | My Stats`.
- **Param passing patterns (examples)**
  - Session setup -> runner: `sessionId`, `sessionTitle`, `startedAt`, template/recipe payload.
  - List/card -> detail: IDs via route params (`machineId`, `exerciseId`, `recipeId`, `actorId`, etc.).
- **Shared components used across features**
  - `components/CollapsibleSection.js` drives expandable category sections in food/gym/recipes.

## 6. State & Persistence
- **Where state lives**
  - Most state is screen-local (`useState`).
  - Auth and movie preference context are global via React Context.
- **Update mechanisms**
  - UI actions mutate local state, then persist using AsyncStorage wrappers in `core`.
  - Session runners synthesize history records and append via `addSessionToHistory()`.
- **Persistence modules and keys**
  - `core/storage/categoryMode.js` -> `appnextwatch:selected_category`.
  - `core/storage/wellnessProfileStorage.js` -> `appnextwatch:wellness_profile`.
  - `core/storage/foodInventoryStorage.js` -> `food_inventory_v1`.
  - `core/storage/foodUtensilsStorage.js` -> `appnextwatch:food_utensils_inventory`.
  - `core/storage/sessionHistoryStorage.js` -> `appnextwatch:session_history_v1`.
  - `core/storage/fitnessLogStorage.js` -> `fitness_workout_log_v1` (legacy/secondary usage).
- **Known coupling points**
  - `CookRecipeScreen` doubles as recipe detail and cooking session runner (controlled by `route.params?.sessionMode`).
  - Some screens still contain navigation fallbacks referencing route names like `Library` in parent navigation traversal.

## 7. Invariants & Design Constraints
> INVARIANT:
> Auth gate remains first: unauthenticated users must land on `Login` only.

> INVARIANT:
> Category selection drives initial post-login route and is persisted via `appnextwatch:selected_category`.

> INVARIANT:
> Wellness session records must stay appendable/readable by `core/storage/sessionHistoryStorage.js` normalized shape.

> CONSTRAINT:
> Supabase features depend on `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`; without them, many movie/directory screens fall back partially or warn.

> CONSTRAINT:
> OpenAI chat requires `EXPO_PUBLIC_OPENAI_API_KEY` (and optional endpoint/model env vars).

> CONSTRAINT:
> App uses a single palette (`theme/colors.js`); screens are visually coupled to these tokens.

> CONSTRAINT:
> No centralized store (Redux/Zustand/etc.); cross-feature state sharing relies on route params, context, and duplicated local hydration patterns.

## 8. Known Technical Risks
- Mixed responsibility in some screens:
  - `CookRecipeScreen` handles both non-session recipe viewing and session logging behavior.
- Potential navigation fragility:
  - Some detail screens try parent navigation fallbacks that may reference older route names.
- Persistence key drift risk:
  - Multiple AsyncStorage keys across features without a centralized key registry.
- Data source inconsistency risk:
  - Movies screens can run from Supabase or fallback seeds; behavior/data completeness differs by environment.
- Repetition risk:
  - Similar hydration/save logic is repeated across multiple screens (profile, utensils, inventory).

## 9. How to Safely Modify This Repo (For Future AI)
- **When adding a new screen**
  - Add screen under `features/<mode>/<flow>/`.
  - Wire route explicitly in the correct stack/tab inside `App.js`.
  - Pass params by stable IDs, not large mutable objects when avoidable.
- **When modifying navigation**
  - Validate root auth/category flow (`Login` -> `CategorySelector`/mode entry) first.
  - Preserve existing route names consumed by `navigation.navigate(...)` calls.
- **When updating data models**
  - Update corresponding storage normalizers in `core/storage/*` to keep backward compatibility.
  - Preserve required fields for session summaries (`summary.timeline`, counts, status).
- **When touching state logic**
  - Keep hydration (`load*`) and persistence (`save*`) guards (`hydrated` flags) to avoid writing defaults before load.
  - Ensure session-runner cleanup effects do not double-log abandoned/completed records.
- **When updating PRD/docs**
  - If behavior changes, align `docs/prd/NEXTWATCH_PRD.md` and append `docs/log/WORKLOG.md` per repo SOP.

## 10. Unknowns / Gaps
> UNKNOWN:
> There is no explicit automated test suite or CI definition in the inspected files, so regression guarantees are manual.

> UNKNOWN:
> Production auth model beyond demo credentials is not present in repo code (`data/users.js` is static).

> ASSUMPTION:
> The active product direction is the merged Movies + Wellness app in `app/App.js`; archived legacy screens remain under `archive/unused_screens/` unless re-wired.

> ASSUMPTION:
> Analytics/event tracking is currently not implemented as a dedicated layer; no explicit analytics module or event schema was found in runtime code paths.
