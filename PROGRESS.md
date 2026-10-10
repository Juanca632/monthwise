# Progress

Where the work stands, so any machine can pick it up. The developer works on this project from
several computers; local agent memory does not travel, this file does. Update it before every
commit (CLAUDE.md, "Session handoff").

## Now

- Feature: `002` Monthly charts, branch `002-monthly-charts` (pushed to `origin`).
- Done: blocks 1-8 (T001-T058, see `specs/002-monthly-charts/tasks.md`). All four stories are
  complete in code with their acceptance tests green; fine-tuning on the phone (2026-10-09) is
  approved for now (the developer may come back to it later; reference: Revolut, minimal, clear,
  color with meaning).
- Block 8 (2026-10-10): "Seed 7 months" in the dev tools, the `insights-ready` timing, the SC-001
  test through the repository (`tests/integration/insightsReference.test.ts`), Stryker on the
  002 files (`specs/002-monthly-charts/mutation-results.md`: four real gaps fixed with tests),
  docs (AGENTS.md status and testing, plan.md changes). Code review (Sonnet, 2026-10-10): no
  CRITICAL or MAJOR; three MINORs fixed (a timing test that could not fail, the month compare,
  a wrong comment in `handedPace.ts`).
- Next: block 9 (T059-T062), with the developer:
  1. T059 phone pass in Expo Go (`EXPO_PUBLIC_DEV_TOOLS=1 npm start`): quickstart Manual
     scenarios 1-8 and the T023 gesture checks; results in `specs/002-monthly-charts/device-checks.md`.
  2. T060 preview APK: SC-002 with "Seed 7 months" (`adb logcat | grep monthwise`, three runs,
     `insights-ready` <= 1000 ms) in `perf-results.md`; SC-005 network check.
  3. T061 usability sessions (at least three people, run by the developer).
  4. T062 PR into `develop` when the developer asks.
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
  - Stryker: a full run over every file and suite takes about 2 h 30 min; run it on the changed
    files with only unit and integration tests (how in `specs/002-monthly-charts/mutation-results.md`).

## Open decisions

- None.

## Decided

- Spec-tester gap (US1), accepted 2026-10-09: the card's loading state (label `Loading`, not
  tappable) cannot be seen through the test harness, because `renderApp` resolves after loading.
  T025's component tests (`tests/component/paceCard.test.tsx`) cover it instead.

## Phone checks pending

- 001: APK verification T052-T053.
- 002, fine-tuning: checked live by the developer through 2026-10-09; recheck after more tweaks.
- 002, block 8: the "Seed 7 months" dev tools button (both seed buttons disabled while one runs),
  and the `insights-ready` line in logcat on the preview APK (T060).
- 002, block 7: the month control on the balance card and on Insights, the picker (year arrows,
  unavailable months, This month, Close, back, tap outside), the month change motion.
- 002, block 6: the Savings trend card (headline, one bar per month, up in blue, down in red,
  "No data" months), tapping a month (detail, View month), the bars growing on first open.

## Environment notes

- `.nvmrc` pins Node 22 (`nvm use` picks it up on each machine).
- `gh` may be logged in as `camilo632` while git pushes over SSH as `Juanca632`; `gh pr create`
  then fails with "must be a collaborator". Check `gh auth status` before any `gh` command; if it is
  the wrong account, ask the developer to run `gh auth switch` (never switch it yourself), or give
  them the compare link.
- Approved quality checks (2026-10-08): Stryker over `src/domain/` and `src/data/` once before
  closing 001 (after T052-T053); the `spec-tester` agent from 002 (already in AGENTS.md).
