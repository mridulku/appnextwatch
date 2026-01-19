# AppNextwatch Project Log

Purpose
- This file is the living guide to how the app feels to a user and how that maps to files.
- Each update should help a new reader visualize the UI and follow the data flow.

How to update
- Append a new version section to the Change Log at the end.
- Update the "Current Snapshot" narrative when behavior or structure changes.
- Keep explanations plain and visual, with explicit file references.

---

Current Snapshot (2026-01-11)

What the user sees first
- The app opens into a bottom-tab layout with five main tabs: Explore, Actors, Search, Lists, Profile.
- The center Search tab is visually emphasized with a round floating button.
- There is a sixth tab labeled More that opens a separate toolkit area.
- File map: `App.js` defines the bottom tabs and the extra More stack.

Tab-by-tab user walkthrough

Explore tab (movie discovery)
- On load, the user sees a large hero card with a gradient background and a tagline.
- Beneath it is a horizontal carousel of "Top Picks." Each card shows rating, title, and metadata.
- Tapping a movie card opens the Movie detail screen.
- File map: UI is in `screens/ExploreScreen.js`, data comes from `data/catalog.js` (MOVIES).

Actors tab (browse by actor)
- A vertical list of actor cards appears, each with a circular avatar and "Known for" text.
- The right chevron implies navigation but does not currently link to a detail screen.
- File map: UI is in `screens/ActorsScreen.js`, data comes from `data/catalog.js` (ACTORS).

Search tab (central action)
- The Search tab is a distinct center button in the tab bar.
- The current visual and interaction details are defined in `screens/SearchScreen.js`.
- File map: `screens/SearchScreen.js` (behavior is defined directly in this file).

Lists tab (curated collections)
- The user sees stacked cards labeled as critic collections with a count and CTA button.
- Each card uses a gradient background and a minimal "Explore list" action.
- File map: UI is in `screens/ListsScreen.js`, data comes from `data/catalog.js` (LISTS).

Profile tab (account space)
- The profile view shows user info and related actions (as defined in the file).
- File map: `screens/ProfileScreen.js`.

Movie detail screen (drill-in)
- Reached by tapping a movie in Explore.
- Shows a large gradient hero, title, year/genre/time, rating pill, overview text, and bullet points.
- There is a primary CTA button at the bottom of the content.
- File map: `screens/MovieDetailScreen.js`, data uses `data/catalog.js` (MOVIES).
- Navigation: screen is registered in the root stack in `App.js` as "Movie".

More tab (Legacy toolkit)
- The More tab opens a separate stack with a hub page called "Legacy".
- The Legacy hub shows a short intro plus a grid of tool cards.
- Each tool card routes to one of the legacy utility screens.
- File map: `screens/legacy/LegacyHomeScreen.js` and the More stack in `App.js`.

Legacy toolkit screens (each is a full page)

1) Awards Browser
- UI: year chips across the top, a search field, a Winner card, and nominee cards.
- Tapping any movie opens a modal with details (winner/nominee status).
- Data comes from a local JSON export of Oscars best picture data.
- File map: `screens/legacy/AwardsBrowserScreen.js`, data source `OLD APP/data/oscars_best_picture_2021_2024.json`.

2) DB Viewer
- UI: table list, search bar, expandable JSON tree, selected node details.
- Search can jump to deep paths in JSON; node path can be copied.
- Data is read from a registry that bundles multiple JSON datasets.
- File map: `screens/legacy/DbViewerScreen.js`, registry `OLD APP/data/dbRegistry.js`.

3) Debug Payload
- UI: a "Copy payload" button and a full JSON preview of the OpenAI request body.
- This helps verify exactly what would be sent to OpenAI.
- File map: `screens/legacy/DebugScreen.js`, uses `context/LegacyContext.js`.

4) Detailed Movie (template)
- UI: structured sections with tabs (Why, Quick fit, Related picks).
- Shows a sample movie if no real movie is passed in route params.
- File map: `screens/legacy/DetailedMovieScreen.js`.

5) Inspector
- UI: inputs for start/count, coverage stats for headers, and a row-by-row preview.
- Useful for validating CSV sheet data quality.
- File map: `screens/legacy/InspectorScreen.js`, uses `core/sheet.js`.

6) Recommend
- UI: prompt box, send-mode toggles (All vs Subset), optional count, include-empty toggle.
- When run, it calls OpenAI and renders recommendations or raw output text.
- File map: `screens/legacy/RecommendScreen.js`, uses `core/openai.js` + `core/schema.js`.

Legacy settings panel (shared)
- Appears at the top of most legacy screens.
- Includes CSV URL, Reload button, row/header counts, and model input.
- File map: `screens/legacy/LegacySettingsCard.js`.
- State comes from `context/LegacyContext.js`.

Data flow for the legacy OpenAI features
- CSV URL is stored in LegacyContext and loaded by `core/sheet.js`.
- The parsed rows/headers are passed into `core/schema.js` to build the payload.
- `core/openai.js` sends the payload to the Responses API and parses JSON output.
- Results appear in Recommend; Debug shows the raw payload.

Directory map (top-level)
- `App.js`: Navigation wiring, More stack, and LegacyProvider wrapper.
- `screens/`: Main UI screens for Explore, Actors, Search, Lists, Profile, MovieDetail.
- `screens/legacy/`: Legacy toolkit UI screens + settings card.
- `core/`: Legacy utilities (env, openai, schema, sheet, csv, utils).
- `context/`: LegacyContext state provider.
- `data/`: catalog.js (sample data for main app tabs).
- `theme/`: colors.js (palette shared across screens).
- `OLD APP/`: reference code and datasets from the older web app.

Environment and configuration
- Place `.env` at repo root.
- Required for OpenAI features: `EXPO_PUBLIC_OPENAI_API_KEY`.
- Optional: `EXPO_PUBLIC_OPENAI_MODEL`, `EXPO_PUBLIC_OPENAI_ENDPOINT`, `EXPO_PUBLIC_SHEET_CSV_URL`.

Dependencies of note
- React Navigation for tabs and stacks.
- expo-clipboard used in legacy screens for copy actions.
- expo-linear-gradient used in Explore and Lists UI.

Known constraints / notes
- The legacy UI is adapted from web layouts to mobile-friendly React Native layouts.
- The OLD APP folder is for reference and JSON data imports; it is not a runtime app.

---

Change Log

Version 2 (2026-01-11)
- Rewrote the snapshot into a user-first walkthrough with screen-by-screen visuals and file mapping.

Version 1 (2026-01-11)
- Added Legacy toolkit stack and screens under More tab.
- Added core utilities for OpenAI/CSV payloads and legacy context.
- Added sample catalog data for MOVIES/LISTS/ACTORS.
- Added expo-clipboard dependency.
