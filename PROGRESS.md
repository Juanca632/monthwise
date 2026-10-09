# Progress

Where the work stands, so any machine can pick it up. The developer works on this project from
several computers; local agent memory does not travel, this file does. Update it before every
commit (CLAUDE.md, "Session handoff").

## Now

- Feature: `002` Monthly charts, branch `002-monthly-charts` (pushed to `origin`).
- Done: blocks 1-3, block 4a (T001-T022) and, of block 4b, T023 to T027 (see
  `specs/002-monthly-charts/tasks.md`).
- Next:
  0. Done (2026-10-09): lighter workflow in `AGENTS.md` ("How we work"), `CLAUDE.md`, the
     `sdd-reviewer` and `design-reviewer` agents, and the plan and tasks templates. No
     constitution change was needed. Everything applies to the rest of 002; only its existing
     docs are not rewritten. Block 4b is UI: no code reviewer. T024 (`ChartDetail.tsx`) is the
     developer-written piece; T056 (design review of the implemented UI) is dropped.
  1. Done (2026-10-09): block 4a reviewer (Sonnet). No CRITICAL or MAJOR findings. Fixed: the
     `dayDetail` guard for days below 1. Accepted MINORs: the two hook reads are not one SQL
     snapshot (a later focus refetch corrects it), no unmount guard (same as 001), a month after
     today is treated as past (unreachable: the picker stops at today).
  2. Block 4b, remaining: T028 (Insights pace section), T029 (harness `paceChart.*`,
     reusing `tests/helpers/paceGesture.ts`), T030 (remove `US1.test.tsx` from
     `tests/acceptance/002/pending.js` and make it green). UI block: no code reviewer.
     Note: gesture-handler 2.32's `fireGestureHandler` never calls `onTouches*`, so tests drive the
     pace pan's touch callbacks directly (`tests/helpers/paceGesture.ts`), as T029 allows.

## Open decisions

- None.

## Decided

- Spec-tester gap (US1), accepted 2026-10-09: the card's loading state (label `Loading`, not
  tappable) cannot be seen through the test harness, because `renderApp` resolves after loading.
  T025's component tests (`tests/component/paceCard.test.tsx`) cover it instead.

## Phone checks pending

- 001: APK verification T052-T053.
- 002: block 4b checks listed in tasks.md (T023 gestures, TalkBack days).

## Environment notes

- `gh` may be logged in as `camilo632` while git pushes over SSH as `Juanca632`; `gh pr create`
  then fails with "must be a collaborator". Check `gh auth status` before any `gh` command; if it is
  the wrong account, ask the developer to run `gh auth switch` (never switch it yourself), or give
  them the compare link.
- Approved quality checks (2026-10-08): Stryker over `src/domain/` and `src/data/` once before
  closing 001 (after T052-T053); the `spec-tester` agent from 002 (already in AGENTS.md).
