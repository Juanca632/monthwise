# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]

<!--
  Keep this file around 100 lines (AGENTS.md, "Doc budget"). Plan only what the code or the data
  needs; visual and motion details are settled on the phone. Write defaults in one line and ask
  the developer only real decisions (libraries, data model, money rules, cost).
-->

## Summary

[The requirement and the technical approach, in a few lines.]

## Technical Context

[Only what changes for this feature: new dependencies, storage, platform constraints. The base
stack is in AGENTS.md.]

## Constitution Check

[One line per principle: pass, or the exception and why (also in Complexity Tracking).]

## Dependencies

[Each new dependency: what it solves and why the platform or existing code is not enough
(Principle IV). "None" if none.]

## Data

[Only when the data changes: tables or columns, migration, money fields in integer cents.
Otherwise delete this section.]

## Approach

[Modules and files touched, following `app/ → ui/ and hooks/ → data/ and domain/`, and the
decisions a reader needs to understand the code. Link to `research.md` only if it exists.]

## Testing

[What is unit-tested (every money calculation), integration-tested and covered by the
spec-tester's acceptance tests.]

## Documentation (this feature)

```text
specs/[###-feature]/
├── spec.md
├── plan.md        # this file
├── research.md    # only when choosing between libraries or approaches with real trade-offs
├── contracts/     # public surface the spec-tester needs: module paths, screen texts, labels
├── design.md      # features with UI: intent, hierarchy, states, mockups
└── tasks.md
```

## Complexity Tracking

> Fill ONLY if the Constitution Check has exceptions.

| Exception | Why needed | Simpler alternative rejected because |
|-----------|------------|--------------------------------------|
