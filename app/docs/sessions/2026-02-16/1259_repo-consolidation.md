# Session Notes — 2026-02-16 12:59 — App Folder Consolidation + Archive Sweep
- Tag: nw-2026-02-16-1259-docs-repo-structure
- Commit: TBD
- Previous tag: nw-2026-02-16-0952-docs-session-ledger
- Codex chat link: N/A
- Local transcript pointer: Unknown (likely under ~/.codex; path not verified)

## 1) What I asked Codex to do
- Consolidate active code/docs under a single `app/` top-level folder while keeping infra at repo root.
- Identify active runtime surfaces from `App.js` and archive unused screens without deleting.
- Preserve runtime behavior and finish with one commit + annotated tag.

## 2) How the conversation progressed (chronological)
- Computed transitive dependency closure from `App.js` to identify reachable modules.
- Listed active vs unreachable screens with evidence from import graph.
- Created `app/` and moved runtime folders (`screens`, `components`, `core`, `context`, `data`, `theme`, `docs`).
- Moved `App.js` to `app/App.js` and updated `index.js` import.
- Archived 13 unreachable screens into `archive/unused_screens/`.
- Ran static unresolved-import scan excluding archive; result: 0 unresolved imports.
- Updated docs paths and references in Start Here, AI context (sections 1-2), and SOP path pointers.
- Prepared session ledger updates (`WORKLOG`, `INDEX`, `LATEST`).

## 3) Decisions made
- Decision: Move docs into `app/docs`.
- Reason: Match single active app surface objective.
- Tradeoff: Required path updates in SOP and index docs.

- Decision: Keep `assets/` at repo root.
- Reason: Expo config (`app.json`) expects root-relative asset paths.
- Tradeoff: Not all non-infra folders live under `app/`.

- Decision: Archive-first for unused screens.
- Reason: Safer than delete; preserves rollback ability.
- Tradeoff: Archived files have intentionally broken relative imports.

## 4) Work completed (repo changes)
- SOP changes:
  - Updated path references from `docs/...` to `app/docs/...`.
- New files:
  - This session note file.
- Behavior impact:
  - No intended runtime behavior change; structural reorganization only.

## 5) What we considered but did NOT do
- Did not move `assets/` to `app/assets` to avoid Expo path regressions.
- Did not delete archived screens.
- Did not introduce dependency graph tooling; used in-repo static script checks.

## 6) Open questions / next session plan
- Validate runtime by launching Expo iOS after folder move.
- Optionally add an import-lint script that ignores `archive/`.
- Decide long-term policy for archived files (retain vs prune by milestone).
