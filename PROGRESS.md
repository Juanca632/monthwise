# Progress

Where the work stands, so any machine can pick it up. The developer works on this project from
several computers; local agent memory does not travel, this file does. Update it before every
commit (CLAUDE.md, "Session handoff").

## Now

- Feature: `002` Monthly charts, branch `002-monthly-charts` (pushed to `origin`).
- Done: blocks 1-3 and block 4a (T001-T022, see `specs/002-monthly-charts/tasks.md`).
- Next:
  1. Run the block 4a reviewer (Sonnet, read-only) on the commit
     `feat: add the 002 pace logic, chart geometry, selection and pace texts (US1)`, tasks
     T017-T022, focused on the money logic (`src/domain/pace.ts`, `src/hooks/useMonthSummary.ts`).
     It was stopped before reporting. Fix CRITICAL/MAJOR findings, then commit.
  2. Block 4b (T023-T030): pace chart, card on the summary, Insights pace section, harness
     `paceChart.*`, then remove `US1.test.tsx` from `tests/acceptance/002/pending.js` and make it
     green (35 of 36 fail today, as expected: no UI yet).

## Open decisions

- Spec-tester gap (US1): the card's loading state (label `Loading`, not tappable) cannot be seen
  through the test harness, because `renderApp` resolves after loading. Proposal: accept it, since
  T025's component tests cover it. Waiting for the developer's OK.

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
