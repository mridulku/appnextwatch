# NextWatch PRD

## Changelog
| Version | Date | Author | Notes |
|---|---|---|---|
| 0.1 | 2026-02-16 | Codex (code-grounded draft) | Initial PRD derived from current `appnextwatch` implementation |
| 0.2 | 2026-02-16 | Codex | Repository folderization by navigation/domain (`app/features`, `app/core/*`, `app/data/*`); no intended user-visible behavior change |
| 0.3 | 2026-02-16 | Codex | Added Wellness `Test` tab (Tables + Chat) for Supabase/OpenAI connectivity validation; existing product flows unchanged |

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
- Manage food inventory: `FoodHub (Inventory) -> voice modal/manual add/stepper updates`
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
| US-13 | Food user | pantry management with quick adjust + voice parsing | I can keep inventory updated efficiently | P0 | Inventory supports steppers, add item, voice command parse/interpret/confirm, low-stock hints | `screens/FoodInventoryScreen.js`, `core/foodVoiceParser.js`, `core/foodInventoryStorage.js` |
| US-14 | Food user | utensil inventory management | I can track kitchen equipment counts and notes | P1 | Utensils supports category sections, add/edit modal, count steppers, persistence | `screens/FoodUtensilsScreen.js`, `core/foodUtensilsStorage.js` |
| US-15 | Gym user | browsable machine and exercise libraries with details | I can plan and execute workouts with context | P1 | Gym hub switches segments, supports collapsible grouped lists, and navigates to detail screens | `screens/GymHubScreen.js`, `screens/GymHomeScreen.js`, `screens/ExercisesHomeScreen.js`, `screens/GymMachineDetailScreen.js`, `screens/ExerciseDetailScreen.js` |
| US-16 | User/admin | settings and profile stats persistence | I can retain personal targets and preferences in wellness mode | P1 | Home settings loads/saves profile settings and can reset to defaults | `screens/HomeSettingsScreen.js`, `core/wellnessProfileStorage.js`, `screens/SettingsProfileScreen.js` |

### 6.1 QA Checklist (code-aligned)
- [ ] Login failure/success paths return expected messages and auth transitions.
- [ ] Category selection persists and app relaunch starts expected mode.
- [ ] Movies fetch gracefully falls back to local catalog when Supabase fails.
- [ ] Sessions create consistent history records for completed and abandoned runs.
- [ ] Food voice commands parse verbs/units and clamp invalid removals safely.
- [ ] Gym/Food hubs retain expected segment navigation and detail route integrity.

> OPEN QUESTION:
> Should there be a unified event model (analytics) for key actions such as session start/finish, inventory update, and movie detail engagement? No dedicated analytics module is present today.
