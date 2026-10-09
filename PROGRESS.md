# Progress

Where the work stands, so any machine can pick it up. The developer works on this project from
several computers; local agent memory does not travel, this file does. Update it before every
commit (CLAUDE.md, "Session handoff").

## Now

- Feature: `002` Monthly charts, branch `002-monthly-charts` (pushed to `origin`).
- Done: blocks 1-3, 4a and 4b (T001-T030, see `specs/002-monthly-charts/tasks.md`). US1 is
  complete in code; its acceptance tests are green and out of `pending.js`.
- Next:
  1. Phone check of block 4b (developer, Expo Go): see "Phone checks pending" below. Fix what
     comes up in fine-tuning mode (AGENTS.md).
  2. Block 5 (T031-T036): Categories vs last month (US2), starting with the `spec-tester` (T031).
- Notes:
  - From 2026-10-09 Claude writes all the code (AGENTS.md); T024 was written by Claude.
  - US1 acceptance gaps accepted on 2026-10-09: the month control checks moved to US4 (T044 says
    so); the edge-case test's day-16 September amount corrected to 80,00 € (by day 16, FR-007).
  - gesture-handler 2.32's `fireGestureHandler` never calls `onTouches*`, so tests drive the pace
    pan's touch callbacks directly (`tests/helpers/paceGesture.ts`).
  - Insights' Categories and Savings trend sections show only their titles until US2 and US3.

## Open decisions

- None.

## Decided

- Spec-tester gap (US1), accepted 2026-10-09: the card's loading state (label `Loading`, not
  tappable) cannot be seen through the test harness, because `renderApp` resolves after loading.
  T025's component tests (`tests/component/paceCard.test.tsx`) cover it instead.

## Phone checks pending

- 001: APK verification T052-T053.
- 002, block 4b: the card on the summary (look, loading, tap opens Insights); Insights pace
  section; on the chart: a tap selects and a second tap hides, a drag follows the finger, a
  vertical swipe that starts on the chart scrolls with no visible delay, after a tap the screen
  still scrolls, a horizontal drag does not scroll, no worklet error; TalkBack reads each day;
  the reveal motion and haptics. If the scroll waits noticeably, see T023's alternative.

## Environment notes

- `gh` may be logged in as `camilo632` while git pushes over SSH as `Juanca632`; `gh pr create`
  then fails with "must be a collaborator". Check `gh auth status` before any `gh` command; if it is
  the wrong account, ask the developer to run `gh auth switch` (never switch it yourself), or give
  them the compare link.
- Approved quality checks (2026-10-08): Stryker over `src/domain/` and `src/data/` once before
  closing 001 (after T052-T053); the `spec-tester` agent from 002 (already in AGENTS.md).
