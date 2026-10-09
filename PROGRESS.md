# Progress

Where the work stands, so any machine can pick it up. The developer works on this project from
several computers; local agent memory does not travel, this file does. Update it before every
commit (CLAUDE.md, "Session handoff").

## Now

- Feature: `002` Monthly charts, branch `002-monthly-charts` (pushed to `origin`).
- Done: blocks 1-3, 4a and 4b (T001-T030, see `specs/002-monthly-charts/tasks.md`). US1 is
  complete in code; its acceptance tests are green and out of `pending.js`.
- Next:
  1. Done (2026-10-09): block 4b phone check, all fine.
  2. Block 5 (T031-T036, US2 categories) done, acceptance tests green. Code review (Sonnet,
     2026-10-09): no CRITICAL or MAJOR; two edge tests added; accepted MINOR: the category cast
     relies on the database CHECK.
  3. Done (2026-10-09): block 5 phone check after the redesign, all fine.
  4. Block 6 (T037-T043, US3 savings trend) done, acceptance tests green. The trend was
     simplified first (developer, 2026-10-09): one saved bar per month, no legend. Code review
     (money: `src/domain/trend.ts`) runs before the phone check.
  5. Then block 7 (T044-T052, US4 month picker). Its spec-tester (T044) must also cover the month
     control checks that US1 and US3 left to US4.
- Notes:
  - From 2026-10-09 Claude writes all the code (AGENTS.md); T024 was written by Claude.
  - US3 acceptance gaps accepted on 2026-10-09: month control checks moved to US4, as US1's; US1's
    "no ·" checks scoped to the day detail (the trend headline has its own "·"); a US3 test that
    expected trend columns together with "No data yet" now expects no chart (contract, Section 3).
  - US1 acceptance gaps accepted on 2026-10-09: the month control checks moved to US4 (T044 says
    so); the edge-case test's day-16 September amount corrected to 80,00 € (by day 16, FR-007).
  - gesture-handler 2.32's `fireGestureHandler` never calls `onTouches*`, so tests drive the pace
    pan's touch callbacks directly (`tests/helpers/paceGesture.ts`).
  - Design feedback (2026-10-09): follow Revolut for every screen, minimal and easy to read
    (design.md, Direction). Categories redesigned: compact list, first 3 + Show all, no "New".
  - The harness now renders at font scale 1.0 (React Native's Jest mock says 2); contract updated.

## Open decisions

- None.

## Decided

- Spec-tester gap (US1), accepted 2026-10-09: the card's loading state (label `Loading`, not
  tappable) cannot be seen through the test harness, because `renderApp` resolves after loading.
  T025's component tests (`tests/component/paceCard.test.tsx`) cover it instead.

## Phone checks pending

- 001: APK verification T052-T053.
- 002, block 6: the Savings trend card (headline, one bar per month, up in blue, down in red,
  "No data" months), tapping a month (detail, View month), the bars growing on first open.

## Environment notes

- `gh` may be logged in as `camilo632` while git pushes over SSH as `Juanca632`; `gh pr create`
  then fails with "must be a collaborator". Check `gh auth status` before any `gh` command; if it is
  the wrong account, ask the developer to run `gh auth switch` (never switch it yourself), or give
  them the compare link.
- Approved quality checks (2026-10-08): Stryker over `src/domain/` and `src/data/` once before
  closing 001 (after T052-T053); the `spec-tester` agent from 002 (already in AGENTS.md).
