# SOP: Codex Session Operating Procedure (NextWatch Repo)

## Purpose
This SOP defines how Codex should operate in this repository during each session to keep delivery, traceability, and documentation consistent.

## Scope
Applies to all code, config, docs, and navigation/behavior updates inside this repository.

## Core Rules (Mandatory)
1. Commit to `main` only.
2. Whenever behavior changes, update `app/docs/prd/NEXTWATCH_PRD.md`.
3. At end of every working session, append one entry to `app/docs/log/WORKLOG.md`.
4. Determine a meaningful session tag name based on repo state + actual changes.
5. Create and push the tag when possible; if not possible, print exact commands for user.
6. Keep tags meaningful and not too frequent.
7. Recommended tagging cadence: one tag per day or one per milestone.

> NOTE:
> "Behavior change" means any user-visible flow, navigation, state behavior, API integration behavior, business rule, or persisted-data behavior change.

## Branch and Commit Policy
- Target branch: `main`.
- Do not create feature branches unless user explicitly asks.
- Keep commits focused and traceable:
  - One logical change set per commit.
  - Commit message should include area + intent.

Suggested commit format:
- `feat(wellness): add grouped collapsible categories for gym machines`
- `fix(sessions): persist abandoned cooking sessions on exit`
- `docs(prd): align wellness flow and session behavior`

## PRD Update Policy
When behavior changes, always update:
- `app/docs/prd/NEXTWATCH_PRD.md`

Minimum required PRD refresh:
- Affected section(s) in Context / Broad Flow / User Stories / Constraints.
- Code references for changed behavior.
- Any new assumptions or open questions.

PRD update checklist:
- [ ] User journey still accurate.
- [ ] Navigation references are current.
- [ ] State/storage behavior is accurate.
- [ ] New/changed acceptance criteria reflected.

## Worklog Policy
Always append one new entry to:
- `app/docs/log/WORKLOG.md`

Recommended entry format:
```
## YYYY-MM-DD - Session <short-id>
- Summary:
- Changes:
- Files:
- Behavior impact:
- Validation performed:
- Follow-ups / risks:
- Tag:
```

If `app/docs/log/WORKLOG.md` does not exist:
- Create it with a top-level heading `# Worklog` and append the current session entry.

## Session Notes Artifact
Each session must create a markdown notes artifact at:
- `app/docs/sessions/YYYY-MM-DD/HHMM_<slug>.md`

Minimum requirement:
- `<slug>` should be short and meaningful for the session focus.
- Session notes must be linkable from both `app/docs/log/WORKLOG.md` and `app/docs/sessions/INDEX.md`.

## Tagging Policy
### Goal
Tags should represent stable, meaningful milestones.

### Frequency Guidance
- Preferred: one tag per day or per milestone.
- Avoid tagging every micro-commit.

### Tag Naming Convention
Use a descriptive, time-aware format:
- `nw-YYYY-MM-DD-HHMM-<slug>`

Tag fields must be evidence-based:
- `HHMM` must use `Asia/Kolkata` local time.
- `<slug>` must be max 2-3 tokens.
- `<slug>` must start with `<area>`, where `<area>` is selected from this fixed enum only:
  - `movies | feed | search | watchlist | profile | navigation | data | storage | ui | docs`
- Remaining slug token(s) should be derived from:
  1. main commit message slug (preferred), or
  2. highest-impact changed folder slug (fallback).
- Do not invent slug tokens not supported by actual changes.

Examples:
- `nw-2026-02-16-0951-feed-taste-polish`
- `nw-2026-02-16-1030-watchlist-flow`
- `nw-2026-02-17-0915-navigation-home-reorder`

Tag naming decision inputs:
- Current date + time (`Asia/Kolkata`)
- Primary area changed (must match the fixed enum above)
- Slug source (commit-message slug first, folder slug fallback)

### Tag Decision Algorithm (Deterministic)
Rules:
- Tag at most once per **session checkpoint**.
- If a tag for the same date exists, additional tags are allowed only when `HHMM` differs.
- Tag when user explicitly asks for a checkpoint, provided at least one trigger is true:
  - `T1` Any user-facing flow changed (navigation/screens/core behavior)
  - `T2` Storage/persistence behavior changed
  - `T3` API/data source integration changed
  - `T4` PRD section `Broad Flow` or `User Stories` changed materially (not formatting-only)
- Do **not** recommend/create a tag if only:
  - `N1` Formatting/docs edits
  - `N2` Refactor with no behavior change
  - `N3` Dependency bumps that do not affect runtime behavior
- If tagging is recommended, Codex must explicitly state which `T#` trigger(s) were met.

Deterministic steps:
1. Resolve current date in `Asia/Kolkata`.
2. Resolve current `HHMM` in `Asia/Kolkata`.
3. Check if a tag with same date+HHMM already exists.
4. Classify changes against `T#` / `N#`.
5. Recommend `YES` only when `(any T# true) AND (user requested checkpoint or milestone checkpoint is required)`.
6. If date+HHMM collision occurs, bump HHMM to current minute and re-evaluate.
7. If only `N#` conditions are true, recommend `NO` and document rationale.

### Tag Execution
Preferred flow:
1. Ensure working tree is in intended state.
2. Create annotated tag.
3. Push commit(s) to `main`.
4. Push tag.

Commands:
```bash
git checkout main
git pull --ff-only
git add <files>
git commit -m "<message>"
git push origin main

git tag -a <tag-name> -m "<tag-note>"
git push origin <tag-name>
```

If tag push is not possible (permissions/network/auth):
- Print exact commands for user to run (copy-paste ready), including chosen `<tag-name>`.
- Never claim a tag was created/pushed unless terminal output confirms it.

## End-of-Session Checklist
- [ ] Changes are committed to `main`.
- [ ] `app/docs/prd/NEXTWATCH_PRD.md` updated if behavior changed.
- [ ] `app/docs/log/WORKLOG.md` appended.
- [ ] Session tag name chosen.
- [ ] Tag created/pushed OR exact commands provided to user.
- [ ] Validation steps documented in worklog.

## Required End-of-Session Output (Codex)
Codex must always output a final structured block containing:
- Commit(s) created (`hash + message`) OR explicit statement that commit was not created.
- PRD updated: `yes/no`; if yes, list changed section names.
- Worklog appended: `yes/no`.
- Tag name (or `TBD`) and tag recommendation: `YES/NO`.
- Push status for `main` and tag: `success/failed/not-attempted` (truthful).
- If `YES`: include `triggering T# reason(s) + exact copy-paste commands`.
- If `NO`: include one-line rationale.
- If `.gitignore` changed: include one sentence in the session note explaining why, and list what was excluded.

## Failure Handling
If any mandatory step cannot be completed:
1. Clearly state what failed.
2. State why it failed.
3. Provide exact manual commands for the user.
4. Record the pending action in `app/docs/log/WORKLOG.md`.

> RISK:
> Skipping PRD/worklog/tag hygiene causes drift between code, documentation, and release history.

## Operator Notes
- Keep this SOP practical and enforceable.
- Do not over-tag.
- Prefer milestone tags that help future rollback, demos, and release notes.
