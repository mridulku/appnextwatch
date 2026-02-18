# Design SOP — NextWatch Wellness UI

## Scope
This SOP applies to wellness selection surfaces and add flows:
- Food → Inventory
- Gym → Machines
- Gym → Exercises
- Any future screen that follows catalog selection pattern

## Single Source Of Truth
- Tokens: `app/ui/tokens.js`
- Reusable UI components: `app/ui/components/*`

## Mandatory Rules
1. No magic numbers for spacing/radius/control sizes in feature screens.
Use `app/ui/tokens.js` values.
2. All selected-list rows must use `SelectedItemCard`.
3. All add flows must use:
`FullSheetModal` + `CatalogItemCard` + `CategoryChipsRow`.
4. Preserve image-card layout:
- text on left
- thumbnail on right
- actions in dedicated control area
5. Any visual exception must be documented in session notes before merge.

## Selection List Rules
- Remove/trash controls must not overlap thumbnail.
- Quantity stepper (if used) must be compact and aligned.
- Card height should remain stable and avoid stretched layouts.

## Add Modal Rules
- Must use near full-height sheet (target 80%–92%).
- Chips are compact horizontal pills and must scroll horizontally.
- Results list must be primary body content (min 60% visible height target).
- Done button must stay reachable in sticky footer.

## Visual QA Checklist
- [ ] No overlap between remove icon and thumbnails.
- [ ] All action buttons are reachable on iPhone small/medium screens.
- [ ] Modal list area has enough visible height for comfortable scan.
- [ ] Category chips are compact and scroll horizontally.
- [ ] Consistent card padding/radius/typography across Inventory, Machines, Exercises.

## Regression Prevention
If a change breaks image-card structure:
1. Revert to last known good card layout.
2. Re-apply changes incrementally on shared UI components.
3. Do not simplify to text-only list as a quick fix.
