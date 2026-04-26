# Session Note — 2026-02-26 14:44 IST

## Summary
Implemented wellness-first navigation by removing category-based app entry and embedding Movies as a primary tab in Wellness.

## Changes
- Removed saved-category startup branching from root navigator.
- Authenticated users now always land in `WellnessApp`.
- Added `Movies` as a Wellness bottom tab (`Gym`, `Food`, `Movies`, `Test`) using existing `MoviesAppNavigator`.
- Removed category-switch UI from:
  - shared settings screen (`Switch app mode`)
  - movie profile (`Change Category`)
- Kept movie internal tab structure unchanged.

## Files
- `app/App.js`
- `app/features/shared/settings/SettingsProfileScreen.js`
- `app/features/movies/profile/ProfileScreen.js`
- `app/docs/prd/NEXTWATCH_PRD.md`

## Validation
- `node --check app/App.js`
- `node --check app/features/shared/settings/SettingsProfileScreen.js`
- `node --check app/features/movies/profile/ProfileScreen.js`
- `npx expo export --platform ios`

## Risks / Follow-ups
- `categoryMode` storage module remains in repo but is no longer used at runtime; can be cleaned up in a dedicated maintenance pass.
- Consider flattening nested movie bottom tabs into a segmented wellness-style surface later if desired.
