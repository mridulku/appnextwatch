# NextWatch PRD

## Changelog
| Version | Date | Author | Notes |
|---|---|---|---|
| 0.1 | 2026-02-16 | Codex (code-grounded draft) | Initial PRD derived from current `appnextwatch` implementation |
| 0.2 | 2026-02-16 | Codex | Repository folderization by navigation/domain (`app/features`, `app/core/*`, `app/data/*`); no intended user-visible behavior change |
| 0.3 | 2026-02-16 | Codex | Added Wellness `Test` tab (Tables + Chat) for Supabase/OpenAI connectivity validation; existing product flows unchanged |
| 0.4 | 2026-02-17 | Codex | Food Inventory now reads/writes Supabase (`user_ingredients` + `catalog_ingredients`) with empty state + catalog picker add/upsert flow |
| 0.5 | 2026-02-17 | Codex | Food Inventory UX polish: remove flow (micro-confirm + delete), Add Item sheet category chips + stepper quantity + catalog-unit lock |
| 0.6 | 2026-02-18 | Codex | Gym Machines now supports Supabase-backed user selection flow (`user_machines`) with empty state, add modal, categorized list, and remove |
| 0.7 | 2026-02-18 | Codex | Reusable catalog-selection pattern extended to Gym Exercises, Food Utensils, and Food Recipes using `user_exercises` + `user_recipes` + shared picker/hook |
| 0.8 | 2026-02-18 | Codex | Wellness catalog/user list rows refactored to reusable Swiggy-style card layout with shared placeholder imagery |
| 0.9 | 2026-02-18 | Codex | Restored image-first selected-card layout and applied cleanup: non-overlapping remove control, compact shared stepper, full-height add modals with compact chips/results for Food Inventory + Gym Machines + Gym Exercises |
| 1.0 | 2026-02-18 | Codex | Introduced `app/ui` design system tokens/components and standardized all catalog/add surfaces on shared full-sheet modal + card/chip primitives |
| 1.1 | 2026-02-18 | Codex | Fixed persistent Add-modal list top-gap by using deterministic ScrollView renderer reset in shared modal layer (`SelectFromCatalogModal`) |
| 1.2 | 2026-02-18 | Codex | Fixed add-modal blank-gap layout by removing bottom-alignment-prone list container rules and using explicit `resultsWrap/resultsScroll/resultsContent` layout contract |
| 1.3 | 2026-02-18 | Codex | Replaced add-sheet flows with dedicated Add screens (Machines/Exercises/Food Items/Recipes/Utensils) and fixed Gym Add Machines navigation crash (`navigation` prop wiring) |

### Implementation Notes
- 2026-02-16: Codebase was reorganized to mirror runtime navigation and module responsibilities:
  - Screen files grouped under `app/features/{movies,wellness,shared}`.
  - Core modules grouped by responsibility under `app/core/{api,storage,integrations,utils,schema}`.
  - Data files grouped by domain under `app/data/{movies,wellness,seeds,supabase}`.
- Product behavior, route names, and user flows are intended to remain unchanged; this is a structural maintainability refactor.
- 2026-02-16: Added a new Wellness `Test` tab with a dedicated stack:
  - `TestHome`: launcher for test tools.
  - `TestTables`: Supabase env/config status, connection check, known-table probes, manual table sample fetch.
  - `TestChat`: OpenAI env/config status and minimal chat connectivity test using existing OpenAI integration.
- Security handling kept explicit:
  - `.env` remains gitignored and not tracked.
  - UI/logs surface key state only as `configured: yes/no` and never print secret values.
- 2026-02-17: Food Inventory behavior changed from local seed persistence to Supabase-backed user inventory:
  - Inventory list fetch: `user_ingredients` joined with `catalog_ingredients`, scoped to mapped `app_users` identity.
  - Empty state is shown when the user has no rows; no placeholder/demo inventory is injected.
  - Add flow is now a searchable catalog picker and upsert-style write (`insert` new, `increment` existing quantity).
  - Quantity steppers update `user_ingredients` rows directly.
- 2026-02-17: Food Inventory interaction model was upgraded:
  - Main row now supports explicit remove affordance (`trash`) and quantity-to-zero path prompts `Remove?` micro-confirm before delete.
  - Add sheet now uses category chips + virtualized catalog list and a quantity stepper; unit is read-only from catalog.
  - Add button label switches to `Update` for existing user rows, and upsert now sets chosen quantity (instead of always incrementing).
- 2026-02-18: Gym → Machines moved from static placeholder to user-specific Supabase state:
  - Empty state appears when user has no selected machines.
  - Add modal supports search + category filtering over `catalog_machines`.
  - Added machine rows are stored in `user_machines` (one row per user+machine).
  - Main list renders user machines grouped by category with remove action.
- 2026-02-18: Reused one catalog-selection implementation across three more sections:
  - Gym → Exercises now uses `catalog_exercises` + `user_exercises` (empty state, add modal, grouped list, remove).
  - Food → Utensils now uses `catalog_utensils` + `user_utensils` with the same user-selection UX model.
  - Food → Recipes is now a saved-list flow backed by `catalog_recipes` + `user_recipes`.
  - Shared modules introduced: `app/hooks/useCatalogSelection.js`, `app/components/catalog/CatalogPickerModal.js`, `app/core/api/catalogSelectionDb.js`.
- 2026-02-18: UI-only card refactor for selection surfaces:
  - Added reusable `CatalogItemCard` with image thumbnail + CTA action pattern.
  - Updated catalog add pickers and user-selected grouped rows for Inventory, Machines, Exercises, Utensils, and Recipes.
  - Introduced shared placeholder asset fallback for item thumbnails (`assets/placeholders/item.png`).
- 2026-02-18: UI cleanup + regression restore for selection surfaces:
  - Restored right-side thumbnail layout for selected cards via shared `SelectedCatalogItemCard`.
  - Standardized remove affordance as a top-right icon control outside image tiles (no overlap).
  - Introduced shared compact `QuantityStepper` and applied it to Inventory card rows and Add Item quantity controls.
  - Upgraded add modals for Inventory/Machines/Exercises to full-height shared modal layout with compact horizontal category chips and larger scrollable results area.
- 2026-02-18: Design SOP + guardrails established:
  - Added `app/ui/tokens.js` as spacing/radius/control/modal single source of truth.
  - Added reusable `app/ui/components/*` (`CatalogItemCard`, `SelectedItemCard`, `CategoryChipsRow`, `QuantityStepper`, `FullSheetModal`).
  - Refactored existing shared component layer (`app/components/*`) to delegate to `app/ui` primitives so Food/Gym surfaces inherit consistent visuals by default.
  - Added enforceable design process doc: `app/docs/design/DESIGN_SOP.md`.
- 2026-02-18: Add-modal layout stability fix:
  - Replaced virtualized in-modal list behavior with deterministic ScrollView mapping in `SelectFromCatalogModal`.
  - Added explicit scroll-to-top reset on modal open/filter/search/data changes to prevent stale offset blank-gap artifacts.
  - Kept image-card UI and near-full-height modal layout unchanged.
- 2026-02-18: Add-modal container layout correction:
  - Removed list reset effects and any bottom-alignment-prone list container behavior.
  - Results area now uses explicit layout contract: `resultsWrap (flex:1)` → `resultsScroll (flex:1)` → `resultsContent` with only small top padding + footer-safe bottom padding.
  - Goal: first card always starts directly below category chips with no large blank vertical block.
- 2026-02-18: Add-catalog flow navigation update:
  - Replaced sheet-based Add flows with dedicated push screens: `AddMachines`, `AddExercises`, `AddFoodItems`, `AddRecipes`, `AddUtensils`.
  - Preserved existing selection/business logic while removing reliance on sheet layout behavior.
  - Fixed Gym Machines runtime crash by wiring `navigation` prop in `GymHomeScreen` before `navigate('AddMachines')`.

> NOTE:
> This PRD is derived only from the current NextWatch app code under `appnextwatch/`.
> Claims below are backed by code references. Items not directly inferable are marked as assumptions/open questions.

## 1. Context
NextWatch is an Expo React Native app that currently operates as a multi-mode product with two active experiences:
- **Movies app mode** (explore reels, directory, chat, lists, profile)
- **Wellness app mode** labeled **Fitness / Food** (sessions, home, gym hub, food hub)

Code references:
- `appnextwatch/App.js`
- `appnextwatch/screens/CategorySelectorScreen.js`

### 1.1 Product Shape Today
- App launches to login (demo credentials flow), then routes by saved category (`movies`, `fitness`, `food`) or shows category selector.
- Movies mode is a bottom-tab app with nested stacks for directory, lists, and profile.
- Wellness mode is a bottom-tab app with `Home`, `Sessions`, `Gym`, `Food`, each with nested stack/hub behavior.

Code references:
- `appnextwatch/screens/LoginScreen.js`
- `appnextwatch/core/categoryMode.js`
- `appnextwatch/App.js`

### 1.2 Core Entities Present in Code
- **Movies domain**: movies, actors, directors, awards, award shows/years/categories/entries, lists.
- **Wellness domain**: workout/cooking sessions, gym machines, exercises, food recipes, pantry inventory, utensils, profile body/food/settings.

Code references:
- `appnextwatch/core/supabaseApi.js`
- `appnextwatch/data/catalog.js`
- `appnextwatch/data/lists.js`
- `appnextwatch/data/gymMachines.js`
- `appnextwatch/data/fitnessExercises.js`
- `appnextwatch/data/foodRecipes.js`
- `appnextwatch/core/foodInventoryStorage.js`
- `appnextwatch/core/foodUtensilsStorage.js`
- `appnextwatch/core/sessionHistoryStorage.js`
- `appnextwatch/core/wellnessProfileStorage.js`

### 1.3 Data Sources and State
- **Primary remote data**: Supabase tables for movies/talent/awards and previews in Data Inspector.
- **Fallback data**: local static datasets if Supabase fetch fails (e.g., movie catalog fallback).
- **AI integration**: OpenAI Responses API used by Chat screen when API key is configured.
- **Local persistence**: AsyncStorage for selected category, session history, food inventory, utensils, profile data.
- **In-memory state**: auth user and preferences context (country/subscriptions).

Code references:
- `appnextwatch/core/supabase.js`
- `appnextwatch/core/supabaseApi.js`
- `appnextwatch/screens/ExploreReelsScreen.js`
- `appnextwatch/screens/MoviesByYearScreen.js`
- `appnextwatch/core/openai.js`
- `appnextwatch/screens/ChatScreen.js`
- `appnextwatch/context/AuthContext.js`
- `appnextwatch/context/PreferencesContext.js`

> ASSUMPTION:
> Intended primary user appears to be a movie enthusiast who also uses personal wellness tools, based on navigation labels and seeded content.

## 2. Problem Statement
The current product scope is broad (Movies + Wellness in one app shell) and functionally rich, but user value is split across multiple journeys with different data models and reliability patterns.

Observed product-level problems from code:
- **Fragmented mode entry**: category selection and saved category routing exist, but mode intent can be unclear once inside nested stacks.
- **Mixed data reliability**: movies/talent rely on Supabase but often fallback to local seed data when remote is unavailable.
- **Limited persistence in auth/preferences**: login session is in-memory only; preferences are in context and not persisted across restarts.
- **No explicit analytics instrumentation layer**: no centralized event tracking module for product telemetry.

Code references:
- `appnextwatch/App.js`
- `appnextwatch/core/categoryMode.js`
- `appnextwatch/screens/ExploreReelsScreen.js`
- `appnextwatch/screens/MoviesByYearScreen.js`
- `appnextwatch/context/AuthContext.js`
- `appnextwatch/context/PreferencesContext.js`

> RISK:
> Without explicit instrumentation and persisted user preferences/session state, feature adoption and funnel drop-offs are hard to measure and improve.

## 3. Value on Solving
### 3.1 User/Product Value (grounded to current app behavior)
- Make Movies and Wellness journeys more predictable from entry to completion.
- Improve trust by reducing fallback inconsistency between local and remote data.
- Preserve user progress (sessions, profile stats, inventory) across app usage.
- Improve decision quality via measurable telemetry (currently mostly absent).

### 3.2 What Value Is Already Demonstrated in Code
- Fast reel-style movie discovery with trailer/clips and detail drill-down.
- Structured wellness workflow: session setup -> guided run -> history summary.
- Practical household utility: pantry/utensil inventory with voice-command simulation and local persistence.

Code references:
- `appnextwatch/screens/ExploreReelsScreen.js`
- `appnextwatch/screens/MovieDetailScreen.js`
- `appnextwatch/screens/SessionsHomeScreen.js`
- `appnextwatch/screens/WorkoutSessionSetupScreen.js`
- `appnextwatch/screens/CookingSessionSetupScreen.js`
- `appnextwatch/screens/ExerciseSessionScreen.js`
- `appnextwatch/screens/CookRecipeScreen.js`
- `appnextwatch/screens/FoodInventoryScreen.js`

### 3.3 Suggested Success Signals (inferred from implemented capabilities)
- Higher completion rate of started workout/cooking sessions.
- Higher percentage of records with persisted session history/profile data.
- Lower fallback rate from Supabase to local seed data in movie surfaces.

> OPEN QUESTION:
> There is no existing analytics sink in code (e.g., Segment/Amplitude/custom collector). Should telemetry be added client-side only, or with backend support?

## 4. Constraints
### 4.1 Constraint/Assumption/Dependency Matrix
| Type | Item | Impact | Evidence |
|---|---|---|---|
| Constraint | Auth is local in-memory against seeded users | User login state resets on app restart | `appnextwatch/context/AuthContext.js`, `appnextwatch/data/users.js` |
| Constraint | Preferences context is not persisted | Country/subscription selections may reset after restart | `appnextwatch/context/PreferencesContext.js` |
| Constraint | Supabase env is optional; app must run without it | Many screens require local fallback paths | `appnextwatch/core/supabase.js`, `appnextwatch/screens/ExploreReelsScreen.js` |
| Constraint | Wellness data model is local-first AsyncStorage | No cross-device sync out of the box | `appnextwatch/core/sessionHistoryStorage.js`, `appnextwatch/core/wellnessProfileStorage.js` |
| Constraint | Session runners are simulation-first | Timer/chat/voice are heuristic rule-based UX, not real STT/coach AI | `appnextwatch/screens/ExerciseSessionScreen.js`, `appnextwatch/screens/CookRecipeScreen.js` |
| Dependency | Supabase schema/tables for movies/awards/talent | Movies directory and data inspector quality depends on DB health | `appnextwatch/data/supabase/schema.sql`, `appnextwatch/core/supabaseApi.js` |
| Dependency | OpenAI API key for chat usefulness | Chat screen degrades without key | `appnextwatch/screens/ChatScreen.js`, `appnextwatch/core/env.js` |
| Assumption | “Fitness / Food” is the canonical combined wellness experience | Navigation currently routes both fitness/food categories to `WellnessApp` | `appnextwatch/App.js`, `appnextwatch/screens/CategorySelectorScreen.js` |

### 4.2 Functional Constraints in Current Implementation
- Deterministic session history model with types/status enforced (`workout|cooking`, `completed|abandoned`).
- Food voice parser supports limited verbs/units with fuzzy item matching and conversion.
- Category-level collapsible browsing in food, utensils, recipes, gym machines, and exercises.

Code references:
- `appnextwatch/core/sessionHistoryStorage.js`
- `appnextwatch/core/foodVoiceParser.js`
- `appnextwatch/components/CollapsibleSection.js`
- `appnextwatch/screens/FoodInventoryScreen.js`
- `appnextwatch/screens/FoodUtensilsScreen.js`
- `appnextwatch/screens/CookHomeScreen.js`
- `appnextwatch/screens/GymHomeScreen.js`
- `appnextwatch/screens/ExercisesHomeScreen.js`

### 4.3 Rollout/Operational Constraints (inferred)
- Feature changes must preserve both mode navigators (`MoviesApp` and `WellnessApp`) and category routing.
- Backward compatibility with existing AsyncStorage keys is important to avoid data loss.

Code references:
- `appnextwatch/App.js`
- `appnextwatch/core/categoryMode.js`
- `appnextwatch/core/sessionHistoryStorage.js`
- `appnextwatch/core/foodInventoryStorage.js`
- `appnextwatch/core/foodUtensilsStorage.js`
- `appnextwatch/core/wellnessProfileStorage.js`

> OPEN QUESTION:
> Should preferences/auth be migrated to persisted storage to align UX with persisted wellness data?

## 5. Broad Flow
### 5.1 End-to-end User Journey (implemented today)
1. User opens app and lands on **Login**.
2. On successful login, app checks saved category.
3. If no saved category, user chooses **Movies** or **Fitness / Food** in Category Selector.
4. App enters selected navigator:
   - **Movies**: `Explore` / `Directory` / `Chat` / `Lists` / `Profile`.
   - **Wellness**: `Home` / `Sessions` / `Gym` / `Food`.
5. User performs deep actions:
   - Movies: reel browse -> movie detail -> clips/rating/notes; directory -> actor/director/awards; chat with OpenAI.
   - Wellness: start workout/cooking session -> run timer/chat/voice simulation -> session summary/history; gym and food hub operations.
6. Data updates persist locally (wellness inventories/history/profile) and/or fetch from Supabase (movies domain).

Code references:
- `appnextwatch/App.js`
- `appnextwatch/screens/LoginScreen.js`
- `appnextwatch/screens/CategorySelectorScreen.js`
- `appnextwatch/screens/ExploreReelsScreen.js`
- `appnextwatch/screens/MovieDetailScreen.js`
- `appnextwatch/screens/DirectoryScreen.js`
- `appnextwatch/screens/ChatScreen.js`
- `appnextwatch/screens/SessionsHomeScreen.js`
- `appnextwatch/screens/ExerciseSessionScreen.js`
- `appnextwatch/screens/CookRecipeScreen.js`
- `appnextwatch/screens/GymHubScreen.js`
- `appnextwatch/screens/FoodHubScreen.js`

### 5.2 Key User Actions Mapped to Routes
- Start workout session: `Home -> Sessions/WorkoutSessionSetup -> WorkoutSessionRun -> SessionSummary`
- Start cooking session: `Sessions/CookingSessionSetup -> CookingSessionRun -> SessionSummary`
- Manage food inventory: `FoodHub (Inventory) -> DB-backed grouped list -> catalog picker add/upsert -> stepper quantity updates`
- Browse gym assets: `GymHub (Machines|Exercises) -> detail screens`

Code references:
- `appnextwatch/screens/WellnessHomeScreen.js`
- `appnextwatch/screens/WorkoutSessionSetupScreen.js`
- `appnextwatch/screens/CookingSessionSetupScreen.js`
- `appnextwatch/screens/FoodInventoryScreen.js`
- `appnextwatch/screens/GymHomeScreen.js`
- `appnextwatch/screens/ExercisesHomeScreen.js`

> NOTE:
> Current broad flow is navigation-driven and local-state heavy; backend-dependent flows are concentrated in Movies + Data Inspector.

## 6. User Stories
| ID | As a… | I want… | So that… | Priority | Acceptance Criteria | Code References |
|---|---|---|---|---|---|---|
| US-01 | Returning user | to log in using demo credentials | I can access app features quickly in dev/demo mode | P0 | Valid seeded credentials set authenticated state and transition away from login | `screens/LoginScreen.js`, `context/AuthContext.js`, `data/users.js` |
| US-02 | Logged-in user | category selection to persist | I can reopen directly into my preferred mode | P0 | Selecting a category saves to AsyncStorage and root navigator starts from saved mode | `screens/CategorySelectorScreen.js`, `core/categoryMode.js`, `App.js` |
| US-03 | Movie explorer | vertical reel discovery with trailers | I can quickly scan movies and open detail | P0 | Reels page loads movies (Supabase fallback local), supports paging, and opens `Movie` route | `screens/ExploreReelsScreen.js`, `core/supabaseApi.js`, `data/catalog.js` |
| US-04 | Movie user | a full movie detail experience | I can rate, note, and browse clips/platform hints | P1 | Detail screen shows metadata, supports rating state and note sheet, supports clip/cinema interactions | `screens/MovieDetailScreen.js`, `data/streaming.js` |
| US-05 | Directory user | curated entry points for movies/talent/awards | I can navigate quickly across content entities | P0 | Directory loads movies/actors/directors/award shows and deep-links into corresponding stacks | `screens/DirectoryScreen.js`, `core/supabaseApi.js`, `App.js` |
| US-06 | Chat user | AI movie assistant responses constrained to catalog context | answers stay relevant to available titles | P1 | Chat builds movie context, calls OpenAI when key exists, and shows errors when missing key | `screens/ChatScreen.js`, `core/openai.js`, `core/env.js` |
| US-07 | Wellness user | a dashboard for today’s meals/workout | I can start key actions from one screen | P1 | Home renders meal/workout cards and `Start` routes to workout session setup | `screens/WellnessHomeScreen.js`, `App.js` |
| US-08 | Session user | to start workout sessions from templates | I can run structured workouts | P0 | Setup screen passes template/session metadata into runner with generated session ID | `screens/WorkoutSessionSetupScreen.js`, `data/sessionSeeds.js`, `core/sessionHistoryStorage.js` |
| US-09 | Session user | to start cooking sessions from meals or recipes | I can run guided cooking with minimal setup | P0 | Setup supports selecting meal or recipe and navigates to cooking runner in session mode | `screens/CookingSessionSetupScreen.js`, `data/sessionSeeds.js`, `data/foodRecipes.js` |
| US-10 | Session user | workout progress logging with timer and set tracking | I can complete and review a session | P0 | Runner supports start/pause/log set/next/finish and writes session history record | `screens/ExerciseSessionScreen.js`, `core/sessionHistoryStorage.js` |
| US-11 | Session user | cooking step guidance with timer/chat/voice simulation | I can complete recipes in session mode | P0 | Cooking runner tracks steps/timer and logs completed/abandoned sessions to history | `screens/CookRecipeScreen.js`, `core/sessionHistoryStorage.js` |
| US-12 | Wellness user | session history grouped by date | I can review completed and abandoned sessions | P0 | Sessions home loads AsyncStorage records, groups by date labels, links to session summary | `screens/SessionsHomeScreen.js`, `screens/SessionSummaryScreen.js`, `core/sessionHistoryStorage.js` |
| US-13 | Food user | pantry management with quick adjust, clean remove flow, and DB-backed catalog add sheet | I can keep inventory updated efficiently with real persisted data and safe deletion UX | P0 | Inventory loads user rows from Supabase, shows empty state when no rows, supports searchable category-filtered catalog picker, uses stepper-based quantity with catalog-locked unit, supports explicit delete and decrement-to-remove confirm, and persists updates immediately | `app/features/wellness/food/FoodInventoryScreen.js`, `app/core/api/foodInventoryDb.js`, `app/core/integrations/supabase.js`, `supabase/migrations/20260217164500_inventory_user_ingredients_public_policies.sql`, `supabase/migrations/20260217195500_user_ingredients_user_ingredient_unique.sql` |
| US-14 | Food user | utensil selection from a shared catalog | I can track kitchen equipment I actually have | P1 | Utensils starts empty, supports catalog search/category add modal, renders grouped user selections, and supports remove with Supabase persistence | `app/features/wellness/food/FoodUtensilsScreen.js`, `app/hooks/useCatalogSelection.js`, `app/core/api/catalogSelectionDb.js`, `supabase/migrations/20260218105000_user_utensils_public_policy.sql` |
| US-15 | Gym user | maintain a personalized machine list from gym catalog | I can plan workouts based on machines actually available to me | P1 | Gym Machines shows empty state when no rows, Add modal lists catalog machines with search/category filters, selected machines persist in `user_machines`, and remove updates list immediately | `app/features/wellness/gym/GymHomeScreen.js`, `app/core/api/gymMachinesDb.js`, `supabase/migrations/20260218084500_add_user_machines.sql` |
| US-16 | User/admin | settings and profile stats persistence | I can retain personal targets and preferences in wellness mode | P1 | Home settings loads/saves profile settings and can reset to defaults | `screens/HomeSettingsScreen.js`, `core/wellnessProfileStorage.js`, `screens/SettingsProfileScreen.js` |
| US-17 | Gym user | save exercises from catalog into my own list | I can keep workout planning focused on relevant movements | P1 | Gym Exercises starts empty, add modal supports search/category filters from `catalog_exercises`, selected rows persist in `user_exercises`, and remove is supported | `app/features/wellness/gym/ExercisesHomeScreen.js`, `app/hooks/useCatalogSelection.js`, `supabase/migrations/20260218102000_add_user_exercises_and_user_recipes.sql` |
| US-18 | Food user | save recipes from catalog into my own list | I can keep a personal short list for repeat cooking | P1 | Food Recipes starts empty, add modal supports meal-type category and search, selected rows persist in `user_recipes`, grouped list supports remove, and recipe detail opens when a local recipe mapping exists | `app/features/wellness/food/CookHomeScreen.js`, `app/hooks/useCatalogSelection.js`, `supabase/migrations/20260218102000_add_user_exercises_and_user_recipes.sql` |

### 6.1 QA Checklist (code-aligned)
- [ ] Login failure/success paths return expected messages and auth transitions.
- [ ] Category selection persists and app relaunch starts expected mode.
- [ ] Movies fetch gracefully falls back to local catalog when Supabase fails.
- [ ] Sessions create consistent history records for completed and abandoned runs.
- [ ] Food voice commands parse verbs/units and clamp invalid removals safely.
- [ ] Gym/Food hubs retain expected segment navigation and detail route integrity.

> OPEN QUESTION:
> Should there be a unified event model (analytics) for key actions such as session start/finish, inventory update, and movie detail engagement? No dedicated analytics module is present today.
