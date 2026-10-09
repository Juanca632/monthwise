---

description: "Task list template for feature implementation"
---

# Tasks: [FEATURE NAME]

**Input**: `specs/[###-feature-name]/` (spec.md, plan.md, contracts/)

<!--
  Keep this file around 150 lines (AGENTS.md, "Doc budget").
  - One or two lines per task: what, where (file path), which test. Link to the spec or
    contract section instead of restating signatures, texts or test cases.
  - Conventions shared by every task go once, in the section below.
  - Every behavior change has a test task or a test named in its task; money is unit-tested.
  - Each user story phase starts with its spec-tester task and ends with its acceptance tests green.
  - Replace every placeholder; delete phases that are not needed.
-->

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependencies)
- **[Story]**: user story from spec.md (US1, US2...)

## Conventions for every task

- [Only what is specific to this feature; the general rules live in AGENTS.md and the
  constitution.]
- After each task: `npm test`, `npm run lint` and `npm run typecheck` pass.

---

## Phase 1: Setup and foundation

- [ ] T001 [What, in which file; which test]

---

## Phase 2: User Story 1 - [Title] (P1)

**Goal**: [one line] · **Phone check**: [one line, if any]

- [ ] T00X [US1] spec-tester writes `tests/acceptance/[###]/US1.test.tsx` from spec.md and contracts/
- [ ] T00X [P] [US1] [What, in which file; which test] (contract: [section])
- [ ] T00X [US1] Acceptance tests for US1 green

---

[One phase per user story, same shape]

---

## Phase N: Wrap-up

- [ ] T0XX [Docs or cleanup the feature needs; phone checks pass]

## Dependencies

[Only the non-obvious ones, one line each. Phases run in order; [P] tasks inside a phase can run
in parallel.]
