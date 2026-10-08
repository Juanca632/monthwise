# Acceptance tests for 002

Black-box tests written by the `spec-tester` agent (`.claude/agents/spec-tester.md`) from
`specs/002-monthly-charts/spec.md` and `contracts/` only, never from `src/`. They drive the app
through the harness in `tests/helpers/app.tsx` (contract: `contracts/test-harness.md`).

- One file per user story: `US1.test.tsx` … `US4.test.tsx`. Test names start with the scenario,
  FR or edge-case ID they check.
- **Never edit a test to match the code.** A failing test is either a bug (fix the code) or a gap
  in the spec or contract: gaps go to the developer, the spec or contract is fixed first, and only
  then the test.
- While a story is in progress its file is listed in `pending.js`, so `npm test` (and CI) skips
  it. `npm run test:acceptance` runs every acceptance file, pending or not. The story ends with
  its file green and removed from `pending.js`.
